from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy import select, delete, func
from passlib.context import CryptContext
from app.models.order import Order
from app.models.product import Product
from app.models.order_item import OrderItem
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdateAdmin
from datetime import datetime, timezone
from sqlalchemy import extract

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def get_users(db: AsyncSession) -> list[User]:
    result = await db.execute(select(User).where(User.is_approved == True))
    return result.scalars().all()

async def get_user_by_id(db: AsyncSession, user_id: int):
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()

async def get_by_email(db: AsyncSession, email: str) -> User | None:
    result = await db.execute(
        select(User)
        .options(selectinload(User.role)) 
        .where(User.email == email)
    )
    return result.scalar_one_or_none()

async def get_user_stats(
    db: AsyncSession,
    user_id: int,
    year: Optional[int] = None,
    month: Optional[int] = None
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        return None

    # По умолчанию — текущий месяц и год
    now = datetime.now(timezone.utc)
    year = year or now.year
    month = month or now.month

    query = (
        select(
            func.count(Order.id).label("orders_count"),
            func.coalesce(func.sum(Order.total_price), 0).label("total_income")
        )
        .where(
            Order.user_id == user_id,
            extract("year", Order.created_at) == year,
            extract("month", Order.created_at) == month
        )
    )
    result = await db.execute(query)
    stats = result.one()

    return {
        "orders_count": int(stats.orders_count),
        "total_income": float(stats.total_income)
    }

def safe_div(a: float, b: int) -> float:
    return round(a / b, 2) if b else 0

async def get_detailed_user_stats(db: AsyncSession, user_id: int, year: Optional[int] = None, month: Optional[int] = None) -> Optional[dict]:
    from datetime import date, datetime, timezone

    # По умолчанию: текущий месяц
    today = date.today()
    year = year or today.year
    month = month or today.month

    start_date = datetime(year, month, 1, tzinfo=timezone.utc)
    if month == 12:
        end_date = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
    else:
        end_date = datetime(year, month + 1, 1, tzinfo=timezone.utc)

    user_result = await db.execute(select(User).where(User.id == user_id))
    user = user_result.scalar_one_or_none()
    if not user:
        return None

    query = (
        select(
            func.count(Order.id),
            func.coalesce(func.sum(Order.total_price), 0),
            func.coalesce(func.avg(Order.total_price), 0)
        )
        .where(Order.user_id == user_id)
        .where(Order.created_at >= start_date, Order.created_at < end_date)
    )
    res = await db.execute(query)
    orders_count, total_income, avg_check = res.one()

    subq_items = (
        select(OrderItem.order_id, func.sum(OrderItem.quantity).label("total_items"))
        .join(Order, Order.id == OrderItem.order_id)
        .where(Order.user_id == user_id)
        .where(Order.created_at >= start_date, Order.created_at < end_date)
        .group_by(OrderItem.order_id)
        .subquery()
    )
    res2 = await db.execute(select(func.avg(subq_items.c.total_items)))
    avg_items_per_order = res2.scalar() or 0

    client_type_query = (
        select(func.count(), Order.customer_id)
        .select_from(Order)
        .where(Order.user_id == user_id)
        .where(Order.created_at >= start_date, Order.created_at < end_date)
        .group_by(Order.customer_id)
    )
    res3 = await db.execute(client_type_query)
    orders_by_clients = [
        {"customer_id": row[1], "orders": row[0]} for row in res3.fetchall()
    ]

    top_products_query = (
        select(Product.name, func.sum(OrderItem.quantity).label("total_sold"))
        .join(OrderItem, Product.id == OrderItem.product_id)
        .join(Order, Order.id == OrderItem.order_id)
        .where(Order.user_id == user_id)
        .where(Order.created_at >= start_date, Order.created_at < end_date)
        .group_by(Product.name)
        .order_by(func.sum(OrderItem.quantity).desc())
        .limit(5)
    )
    res4 = await db.execute(top_products_query)
    top_products = [dict(name=name, total_sold=qty) for name, qty in res4.fetchall()]

    canceled_query = (
        select(func.count())
        .select_from(Order)
        .where(Order.user_id == user_id)
        .where(Order.status_id == 4)
        .where(Order.created_at >= start_date, Order.created_at < end_date)
    )
    canceled_count = (await db.execute(canceled_query)).scalar() or 0

    return {
        "orders_count": orders_count,
        "total_income": float(total_income),
        "avg_check": float(avg_check),
        "avg_items_per_order": round(avg_items_per_order, 2),
        "orders_by_clients": orders_by_clients,
        "top_products": top_products,
        "canceled_orders": canceled_count,
        "canceled_share": round(canceled_count / orders_count, 2) if orders_count else 0
    }

async def create_user(db: AsyncSession, user_data: UserCreate):
    hashed_password = pwd_context.hash(user_data.password)
    db_user = User(
        email=user_data.email,
        hashed_password=hashed_password,
        full_name=user_data.full_name,
        phone=user_data.phone,
        role_id=user_data.role_id,
        position_id=user_data.position_id,
        salary_base=user_data.salary_base  
    )
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    return db_user

async def update_user_admin(db: AsyncSession, user_id: int, data: UserUpdateAdmin) -> Optional[User]:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        return None
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(user, key, value)
    await db.commit()
    await db.refresh(user)
    return user

async def update_user_self(
    db: AsyncSession, user_id: int, data: dict
) -> Optional[User]:
    allowed_fields = {"full_name", "email", "phone"}  
    filtered_data = {k: v for k, v in data.items() if k in allowed_fields}

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        return None
    for key, value in filtered_data.items():
        setattr(user, key, value)
    await db.commit()
    await db.refresh(user)
    return user

async def list_pending_users(db: AsyncSession):
    result = await db.execute(select(User).where(User.is_approved == False))
    return result.scalars().all()

async def approve_user(db: AsyncSession, user_id: int):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user:
        user.is_approved = True
        await db.commit()
        await db.refresh(user)
    return user

async def delete_user(db: AsyncSession, user_id: int):
    await db.execute(delete(User).where(User.id == user_id))
    await db.commit()
import csv
import io
from dataclasses import dataclass, field
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import and_, exists, select, func
from sqlalchemy.orm import selectinload
from fastapi import HTTPException

from app.models.brand import Brand
from app.models.category import Category
from app.models.product import Product
from app.models.product_stock import ProductStock
from app.models.subcategory import Subcategory
from app.schemas.product import ProductCreate
from app.utils.barcode_utils import generate_qr_base64, validate_ean13, generate_sku


def _build_filters(
    *,
    name: Optional[str] = None,
    sku: Optional[str] = None,
    barcode: Optional[str] = None,
    brand_id: Optional[int] = None,
    category_id: Optional[int] = None,
    subcategory_id: Optional[int] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    min_cost_price: Optional[float] = None,
    max_cost_price: Optional[float] = None,
) -> list:
    filters = []
    if name:
        filters.append(Product.name.ilike(f"%{name}%"))
    if sku:
        filters.append(Product.sku.ilike(f"%{sku}%"))
    if barcode:
        filters.append(Product.barcode.ilike(f"%{barcode}%"))
    if brand_id:
        filters.append(Product.brand_id == brand_id)
    if category_id:
        filters.append(Product.category_id == category_id)
    if subcategory_id:
        filters.append(Product.subcategory_id == subcategory_id)
    if min_price is not None:
        filters.append(Product.price >= min_price)
    if max_price is not None:
        filters.append(Product.price <= max_price)
    if min_cost_price is not None:
        filters.append(Product.cost_price >= min_cost_price)
    if max_cost_price is not None:
        filters.append(Product.cost_price <= max_cost_price)
    return filters


async def get_filtered(
    db: AsyncSession,
    name: Optional[str] = None,
    sku: Optional[str] = None,
    barcode: Optional[str] = None,
    brand_id: Optional[int] = None,
    category_id: Optional[int] = None,
    subcategory_id: Optional[int] = None,
    available_quantity_min: Optional[int] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    min_cost_price: Optional[float] = None,
    max_cost_price: Optional[float] = None,
    skip: int = 0,
    limit: int = 100,
) -> list[Product]:
    query = select(Product).options(
        selectinload(Product.category),
        selectinload(Product.subcategory),
        selectinload(Product.brand),
    )

    filters = _build_filters(
        name=name, sku=sku, barcode=barcode, brand_id=brand_id,
        category_id=category_id, subcategory_id=subcategory_id,
        min_price=min_price, max_price=max_price,
        min_cost_price=min_cost_price, max_cost_price=max_cost_price,
    )

    if filters:
        query = query.where(and_(*filters))

    result = await db.execute(query.order_by(Product.name))
    products = result.scalars().all()

    filtered_products = []
    for product in products:
        stock_query = await db.execute(
            select(func.coalesce(func.sum(ProductStock.quantity), 0))
            .where(ProductStock.product_id == product.id)
        )
        available_quantity = stock_query.scalar()
        product.available_quantity = available_quantity
        product.qr_code = generate_qr_base64(product.sku or str(product.id))

        if available_quantity_min is not None and available_quantity < available_quantity_min:
            continue

        filtered_products.append(product)

    return filtered_products[skip : skip + limit]


async def get_by_id(db: AsyncSession, product_id: int) -> Optional[Product]:
    result = await db.execute(
        select(Product)
        .where(Product.id == product_id)
        .options(
            selectinload(Product.category),
            selectinload(Product.subcategory),
            selectinload(Product.brand),
        )
    )
    product = result.scalar_one_or_none()
    if product:
        product.qr_code = generate_qr_base64(product.sku or str(product.id))

        stock_query = await db.execute(
            select(func.coalesce(func.sum(ProductStock.quantity), 0))
            .where(ProductStock.product_id == product.id)
        )
        product.available_quantity = stock_query.scalar()

    return product


async def _attach_computed_fields(db: AsyncSession, product: Product) -> Product:
    product.qr_code = generate_qr_base64(product.sku or str(product.id))
    stock_query = await db.execute(
        select(func.coalesce(func.sum(ProductStock.quantity), 0))
        .where(ProductStock.product_id == product.id)
    )
    product.available_quantity = stock_query.scalar()
    return product


async def get_by_code(db: AsyncSession, code: str) -> Optional[Product]:
    """Ищет товар по отсканированному коду: сначала SKU, затем штрихкод,
    и наконец по ID (если код состоит только из цифр — так закодированы
    QR-коды товаров без SKU)."""
    code = code.strip()
    if not code:
        return None

    base_query = select(Product).options(
        selectinload(Product.category),
        selectinload(Product.subcategory),
        selectinload(Product.brand),
    )

    for condition in _scan_lookup_conditions(code):
        result = await db.execute(base_query.where(condition))
        product = result.scalar_one_or_none()
        if product:
            return await _attach_computed_fields(db, product)

    return None


def _scan_lookup_conditions(code: str):
    conditions = [Product.sku == code, Product.barcode == code]
    if code.isdigit():
        conditions.append(Product.id == int(code))
    return conditions


async def create(db: AsyncSession, data: ProductCreate):
    if data.barcode and not validate_ean13(data.barcode):
        raise HTTPException(status_code=400, detail="Невалидный EAN‑13 штрихкод")

    sku = data.sku or generate_sku()

    exists_query = await db.execute(
        select(exists().where(Product.sku == sku))
    )
    if exists_query.scalar():
        raise HTTPException(status_code=400, detail="Такой SKU уже существует")

    new_product = Product(**data.model_dump())
    new_product.sku = sku

    db.add(new_product)
    await db.commit()
    await db.refresh(new_product)
    return new_product

async def update(db: AsyncSession, product_id: int, data: dict):
    query = await db.execute(select(Product).where(Product.id == product_id))
    product = query.scalar_one_or_none()
    if not product:
        return None

    for field, value in data.items():
        setattr(product, field, value)

    await db.commit()
    await db.refresh(product)
    return product

async def delete(db: AsyncSession, product_id: int):
    product = await get_by_id(db, product_id)
    if product:
        await db.delete(product)
        await db.commit()


async def get_all_for_export(db: AsyncSession) -> list[Product]:
    """Used by the legacy CSV export — kept untouched for backward compatibility."""
    result = await db.execute(select(Product).order_by(Product.name))
    return result.scalars().all()


async def get_export_rows(
    db: AsyncSession,
    *,
    name: Optional[str] = None,
    sku: Optional[str] = None,
    barcode: Optional[str] = None,
    brand_id: Optional[int] = None,
    category_id: Optional[int] = None,
    subcategory_id: Optional[int] = None,
    available_quantity_min: Optional[int] = None,
    available_quantity_max: Optional[int] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    min_cost_price: Optional[float] = None,
    max_cost_price: Optional[float] = None,
) -> list[dict]:
    """Returns export-ready rows for the Excel export (name lookups resolved, stock aggregated in bulk)."""
    query = select(Product).options(
        selectinload(Product.category),
        selectinload(Product.subcategory),
        selectinload(Product.brand),
    )

    filters = _build_filters(
        name=name, sku=sku, barcode=barcode, brand_id=brand_id,
        category_id=category_id, subcategory_id=subcategory_id,
        min_price=min_price, max_price=max_price,
        min_cost_price=min_cost_price, max_cost_price=max_cost_price,
    )
    if filters:
        query = query.where(and_(*filters))

    result = await db.execute(query.order_by(Product.name))
    products = result.scalars().all()

    stock_by_product = await _bulk_available_quantity(db, [p.id for p in products])

    rows = []
    for p in products:
        available_quantity = stock_by_product.get(p.id, 0)
        if available_quantity_min is not None and available_quantity < available_quantity_min:
            continue
        if available_quantity_max is not None and available_quantity > available_quantity_max:
            continue
        rows.append({
            "sku": p.sku,
            "name": p.name,
            "category": p.category.name if p.category else "",
            "subcategory": p.subcategory.name if p.subcategory else "",
            "brand": p.brand.name if p.brand else "",
            "price": p.price,
            "cost_price": p.cost_price,
            "barcode": p.barcode,
            "available_quantity": available_quantity,
            "description": p.description,
            "detail": p.detail,
        })
    return rows


async def _bulk_available_quantity(db: AsyncSession, product_ids: list[int]) -> dict[int, int]:
    if not product_ids:
        return {}
    result = await db.execute(
        select(ProductStock.product_id, func.coalesce(func.sum(ProductStock.quantity), 0))
        .where(ProductStock.product_id.in_(product_ids))
        .group_by(ProductStock.product_id)
    )
    return {product_id: int(qty) for product_id, qty in result.all()}


async def import_from_csv(db: AsyncSession, content: bytes) -> dict:
    text = content.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))
    created = updated = 0
    errors: list[str] = []

    for i, row in enumerate(reader, start=2):
        try:
            name = (row.get("name") or "").strip()
            if not name:
                errors.append(f"Строка {i}: пустое поле name")
                continue

            def _float(v: str) -> float:
                try:
                    return float(v) if v and v.strip() else 0.0
                except ValueError:
                    return 0.0

            def _int(v: str):
                s = (v or "").strip()
                return int(s) if s else None

            sku = (row.get("sku") or "").strip() or None
            cost_price = _float(row.get("cost_price", ""))
            price = _float(row.get("price", ""))
            barcode = (row.get("barcode") or "").strip() or None
            description = (row.get("description") or "").strip() or None
            detail = (row.get("detail") or "").strip() or None
            category_id = _int(row.get("category_id", ""))
            subcategory_id = _int(row.get("subcategory_id", ""))
            brand_id = _int(row.get("brand_id", ""))

            existing = None
            if sku:
                res = await db.execute(select(Product).where(Product.sku == sku))
                existing = res.scalar_one_or_none()

            if existing:
                existing.name = name
                existing.cost_price = cost_price
                existing.price = price
                existing.description = description
                existing.detail = detail
                existing.barcode = barcode
                existing.category_id = category_id
                existing.subcategory_id = subcategory_id
                existing.brand_id = brand_id
                updated += 1
            else:
                new_sku = sku or generate_sku()
                db.add(Product(
                    name=name, cost_price=cost_price, price=price,
                    sku=new_sku, barcode=barcode, description=description,
                    detail=detail, category_id=category_id,
                    subcategory_id=subcategory_id, brand_id=brand_id,
                ))
                created += 1
        except Exception as exc:
            errors.append(f"Строка {i}: {exc}")

    await db.commit()
    return {"created": created, "updated": updated, "errors": errors}


@dataclass
class ImportRowResult:
    row: int
    sku: Optional[str]
    name: Optional[str]
    action: str  # "create" | "update" | "error"
    errors: list = field(default_factory=list)
    data: dict = field(default_factory=dict)


async def _load_catalog_name_maps(db: AsyncSession):
    cat_rows = (await db.execute(select(Category.id, Category.name))).all()
    sub_rows = (await db.execute(select(Subcategory.id, Subcategory.name, Subcategory.category_id))).all()
    brand_rows = (await db.execute(select(Brand.id, Brand.name))).all()

    categories = {name.strip().lower(): id_ for id_, name in cat_rows}
    subcategories = {name.strip().lower(): (id_, category_id) for id_, name, category_id in sub_rows}
    brands = {name.strip().lower(): id_ for id_, name in brand_rows}
    return categories, subcategories, brands


def _cell(row: dict, header: str) -> str:
    value = row.get(header)
    return str(value).strip() if value is not None else ""


def _cell_number(row: dict, header: str) -> Optional[float]:
    raw = row.get(header)
    if raw is None or str(raw).strip() == "":
        return None
    try:
        return float(raw)
    except (TypeError, ValueError):
        return None


async def validate_import_rows(db: AsyncSession, rows: list[dict]) -> list[ImportRowResult]:
    categories, subcategories, brands = await _load_catalog_name_maps(db)
    existing_skus = {
        sku for (sku,) in (await db.execute(select(Product.sku).where(Product.sku.is_not(None)))).all()
    }

    results: list[ImportRowResult] = []
    seen_skus_in_file: dict[str, int] = {}

    for row in rows:
        row_num = row.get("_row_number")
        errors: list[str] = []

        sku = _cell(row, "Артикул (SKU)") or None
        name = _cell(row, "Название")
        category_name = _cell(row, "Категория")
        subcategory_name = _cell(row, "Подкатегория")
        brand_name = _cell(row, "Бренд")
        barcode = _cell(row, "Штрихкод") or None
        description = _cell(row, "Описание") or None
        detail = _cell(row, "Детали") or None
        price = _cell_number(row, "Цена")
        cost_price = _cell_number(row, "Себестоимость")

        if not name:
            errors.append("не указано название")
        if not category_name:
            errors.append("не указана категория")
        if price is None:
            errors.append("не указана или некорректна цена")
        if cost_price is None:
            errors.append("не указана или некорректна себестоимость")

        category_id = None
        if category_name:
            category_id = categories.get(category_name.lower())
            if category_id is None:
                errors.append(f'категория "{category_name}" не найдена')

        subcategory_id = None
        if subcategory_name:
            sub_entry = subcategories.get(subcategory_name.lower())
            if sub_entry is None:
                errors.append(f'подкатегория "{subcategory_name}" не найдена')
            else:
                subcategory_id, sub_category_id = sub_entry
                if category_id is not None and sub_category_id != category_id:
                    errors.append(f'подкатегория "{subcategory_name}" не относится к категории "{category_name}"')

        brand_id = None
        if brand_name:
            brand_id = brands.get(brand_name.lower())
            if brand_id is None:
                errors.append(f'бренд "{brand_name}" не найден')

        if barcode and not validate_ean13(barcode):
            errors.append("некорректный штрихкод (ожидается EAN-13, 13 цифр)")

        if sku:
            if sku in seen_skus_in_file:
                errors.append(f"дублирующийся артикул в файле (уже использован в строке {seen_skus_in_file[sku]})")
            else:
                seen_skus_in_file[sku] = row_num

        action = "error" if errors else ("update" if sku and sku in existing_skus else "create")

        results.append(ImportRowResult(
            row=row_num,
            sku=sku,
            name=name or None,
            action=action,
            errors=errors,
            data={
                "sku": sku, "name": name, "category_id": category_id,
                "subcategory_id": subcategory_id, "brand_id": brand_id,
                "price": price, "cost_price": cost_price, "barcode": barcode,
                "description": description, "detail": detail,
            },
        ))

    return results


async def import_products_excel(db: AsyncSession, rows: list[dict], batch_size: int = 200) -> dict:
    results = await validate_import_rows(db, rows)

    existing_by_sku = {
        sku: id_ for id_, sku in (await db.execute(select(Product.id, Product.sku))).all() if sku
    }
    generated_skus: set[str] = set()

    created = 0
    updated = 0
    errors: list[dict] = []
    processed_since_commit = 0

    for r in results:
        if r.action == "error":
            errors.append({"row": r.row, "message": "; ".join(r.errors)})
            continue

        data = r.data
        if r.action == "update":
            product = await db.get(Product, existing_by_sku[data["sku"]])
            for field_name in ("name", "category_id", "subcategory_id", "brand_id", "price", "cost_price", "barcode", "description", "detail"):
                setattr(product, field_name, data[field_name])
            updated += 1
        else:
            sku = data["sku"]
            if not sku:
                sku = generate_sku()
                while sku in existing_by_sku or sku in generated_skus:
                    sku = generate_sku()
            generated_skus.add(sku)
            db.add(Product(
                name=data["name"], category_id=data["category_id"], subcategory_id=data["subcategory_id"],
                brand_id=data["brand_id"], price=data["price"], cost_price=data["cost_price"],
                barcode=data["barcode"], description=data["description"], detail=data["detail"], sku=sku,
            ))
            created += 1

        processed_since_commit += 1
        if processed_since_commit >= batch_size:
            await db.commit()
            processed_since_commit = 0

    if processed_since_commit:
        await db.commit()

    return {"created": created, "updated": updated, "errors": errors}
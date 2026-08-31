from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.utils.search_query import TSQUERY_CTE


async def _run(db: AsyncSession, sql: str, q: str, limit: int) -> tuple[list[dict], int]:
    result = await db.execute(text(sql), {"q": q, "limit": limit})
    rows = [dict(r) for r in result.mappings().all()]
    total = rows[0]["total_count"] if rows else 0
    for row in rows:
        row.pop("total_count", None)
        row.pop("rank", None)
    return rows, total


async def search_customers(db: AsyncSession, q: str, limit: int = 5) -> tuple[list[dict], int]:
    sql = TSQUERY_CTE + """
        SELECT id, name, phone, email,
               ts_rank(search_vector, q.tsq) AS rank,
               COUNT(*) OVER() AS total_count
        FROM customers CROSS JOIN q
        WHERE search_vector @@ q.tsq
        ORDER BY rank DESC
        LIMIT :limit
    """
    return await _run(db, sql, q, limit)


async def search_orders(db: AsyncSession, q: str, limit: int = 5) -> tuple[list[dict], int]:
    # Номер заказа (id) — основной ключ поиска по заказам (см. план/бриф);
    # точное/префиксное совпадение по нему поднимается выше ts_rank.
    sql = TSQUERY_CTE + """
        SELECT o.id, o.total_price, o.created_at,
               c.name AS customer_name,
               os.name AS status_name,
               ts_rank(o.search_vector, q.tsq) AS rank,
               COUNT(*) OVER() AS total_count
        FROM orders o
        LEFT JOIN customers c ON c.id = o.customer_id
        LEFT JOIN order_statuses os ON os.id = o.status_id
        CROSS JOIN q
        WHERE o.search_vector @@ q.tsq
        ORDER BY (o.id::text = :q OR o.id::text LIKE :q || '%') DESC, rank DESC
        LIMIT :limit
    """
    return await _run(db, sql, q, limit)


async def search_products(db: AsyncSession, q: str, limit: int = 5) -> tuple[list[dict], int]:
    # Артикул (sku) — точное/префиксное совпадение поднимается выше ts_rank,
    # чтобы частичное совпадение по названию не перекрывало точный артикул.
    sql = TSQUERY_CTE + """
        SELECT id, name, sku, barcode, price,
               ts_rank(search_vector, q.tsq) AS rank,
               COUNT(*) OVER() AS total_count
        FROM products CROSS JOIN q
        WHERE search_vector @@ q.tsq
        ORDER BY (sku ILIKE :q || '%') DESC, rank DESC
        LIMIT :limit
    """
    return await _run(db, sql, q, limit)


async def search_employees(db: AsyncSession, q: str, limit: int = 5) -> tuple[list[dict], int]:
    sql = TSQUERY_CTE + """
        SELECT id, full_name, email,
               ts_rank(search_vector, q.tsq) AS rank,
               COUNT(*) OVER() AS total_count
        FROM users CROSS JOIN q
        WHERE search_vector @@ q.tsq
        ORDER BY rank DESC
        LIMIT :limit
    """
    return await _run(db, sql, q, limit)


async def search_suppliers(db: AsyncSession, q: str, limit: int = 5) -> tuple[list[dict], int]:
    sql = TSQUERY_CTE + """
        SELECT id, name, contact_person,
               ts_rank(search_vector, q.tsq) AS rank,
               COUNT(*) OVER() AS total_count
        FROM suppliers CROSS JOIN q
        WHERE search_vector @@ q.tsq
        ORDER BY rank DESC
        LIMIT :limit
    """
    return await _run(db, sql, q, limit)

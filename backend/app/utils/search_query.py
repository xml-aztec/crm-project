"""Общий SQL-фрагмент для полнотекстового поиска (см. app/api/search.py,
app/repositories/search.py).

Почему не просто plainto_tsquery()/websearch_to_tsquery(): ни один из них не
поддерживает префиксный поиск (нужен для "поиска по мере ввода" — см.
критерии приёмки), а собрать префиксный tsquery на стороне Python наивным
разбиением строки по пробелам — не работает: реальный токенизатор Postgres
не всегда режет строку по границам слов ожидаемо (например, "LEN-001" даёт
леммы ['len', '-001'], а не ['len', '001']). Поэтому вместо повторения
токенизации в Python здесь используется тот же самый токенизатор БД —
unnest(to_tsvector(...)) на сырой ввод даёт ровно те леммы, что легли бы в
search_vector, и уже к ним добавляется префиксный маркер ':*'.

Это тот samый случай "raw SQL допустим, если ORM не поддерживает нативно",
на который прямо ссылается задача — SQLAlchemy Core не имеет built-in для
unnest(tsvector) + string_agg в одном выражении, а оборачивать это в
громоздкую composite-конструкцию не даёт ничего по сравнению с text().
"""
# Общий CTE — вычисляет tsquery один раз на запрос (а не по разу для WHERE
# и для ORDER BY). Каждый repositories/search.py::search_* достраивает
# основной SELECT поверх него: f"{TSQUERY_CTE} SELECT ... FROM ..., q WHERE
# ... @@ q.tsq ORDER BY ..., ts_rank(..., q.tsq) DESC".
TSQUERY_CTE = """
WITH q AS (
    SELECT to_tsquery('russian', (
        SELECT string_agg(lexeme || ':*', ' & ')
        FROM unnest(to_tsvector('russian', :q)) AS lexeme
    )) AS tsq
)
"""

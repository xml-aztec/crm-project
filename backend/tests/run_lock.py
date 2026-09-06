"""Блокировка, сериализующая прогоны pytest на одной тестовой базе.

Вынесена из conftest.py намеренно: импорт conftest выполняет модульный код —
пересоздание базы и накат миграций, — поэтому импортировать его откуда-либо
ещё нельзя. Здесь при импорте не происходит ничего, так что механизм можно
тестировать и переиспользовать.
"""
import os
import tempfile
from pathlib import Path

try:
    import fcntl
except ImportError:  # pragma: no cover — Windows, где flock недоступен
    fcntl = None


def acquire_run_lock(db_name: str, *, lock_dir: str | None = None) -> int | None:
    """Берёт эксклюзивную блокировку на тестовую базу `db_name`.

    Зачем: conftest пересоздаёт базу через DROP ... WITH (FORCE), а FORCE
    намеренно отцепляет живые соединения. Поэтому два процесса pytest на одной
    базе уничтожают друг друга — DROP от второго сносит таблицы у первого
    посреди прогона. Падения при этом выглядят как дефекты в тестируемом коде,
    хотя код ни при чём: воспроизведено сдвигом старта второго прогона — при
    12 с падал test_orders, при 26 с — test_task_reminders, то есть ровно тот
    модуль, что выполнялся в момент сноса.

    Дескриптор намеренно НЕ закрывается: flock держится за открытым файловым
    описанием, и ОС снимает блокировку сама при завершении процесса, включая
    падение и SIGKILL. Ждать чужого прогона правильнее, чем испортить его.

    Возвращает дескриптор (или None, если flock на платформе недоступен).
    """
    if fcntl is None:  # pragma: no cover — на Windows просто не сериализуем
        return None

    lock_path = Path(lock_dir or tempfile.gettempdir()) / f"crm-pytest-{db_name}.lock"
    fd = os.open(lock_path, os.O_RDWR | os.O_CREAT, 0o644)
    try:
        fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except OSError:
        print(
            f"\n[conftest] База {db_name} занята другим прогоном pytest — "
            f"ждём его завершения, чтобы не снести ему схему.",
            flush=True,
        )
        fcntl.flock(fd, fcntl.LOCK_EX)
    return fd

"""Проверка блокировки, сериализующей прогоны на одной тестовой базе.

Дефект, который она закрывает: conftest пересоздаёт базу через
DROP ... WITH (FORCE) на импорте, поэтому второй запущенный pytest сносил
схему у первого прямо посреди прогона. Падения выглядели как дефекты в
тестируемом коде — воспроизводились в разных модулях в зависимости от того,
что выполнялось в момент сноса.

Тесты гоняют механизм в отдельном каталоге и на выдуманном имени базы, чтобы
не трогать боевой файл блокировки текущего прогона.
"""
import os
import subprocess
import sys
import textwrap
import time

CHILD = textwrap.dedent(
    """
    import sys, time
    sys.path.insert(0, {backend!r})
    from tests.run_lock import acquire_run_lock
    acquire_run_lock({db!r}, lock_dir={lock_dir!r})
    print("LOCKED", flush=True)
    time.sleep({hold})
    """
)

_BACKEND_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def _spawn_holder(tmp_path, db_name: str, hold: float) -> subprocess.Popen:
    """Дочерний процесс берёт блокировку и держит её `hold` секунд."""
    proc = subprocess.Popen(
        [sys.executable, "-c", CHILD.format(
            backend=_BACKEND_ROOT, db=db_name, lock_dir=str(tmp_path), hold=hold
        )],
        stdout=subprocess.PIPE,
        text=True,
    )
    assert proc.stdout.readline().strip() == "LOCKED", "дочерний процесс не взял блокировку"
    return proc


def test_second_run_waits_for_the_first(tmp_path):
    """Второй прогон обязан ДОЖДАТЬСЯ первого, а не снести ему базу."""
    from tests.run_lock import acquire_run_lock

    hold = 2.0
    child = _spawn_holder(tmp_path, "waits_db", hold)
    try:
        started = time.monotonic()
        fd = acquire_run_lock("waits_db", lock_dir=str(tmp_path))
        waited = time.monotonic() - started
    finally:
        child.wait(timeout=10)

    assert fd is not None, "на этой платформе блокировка должна быть доступна"
    os.close(fd)
    # Без блокировки вызов вернулся бы мгновенно и оба прогона пошли бы
    # параллельно — именно это и ломало базу.
    assert waited >= hold * 0.8, (
        f"блокировка не удержала второй прогон: ждали {waited:.2f}с при удержании {hold}с"
    )


def test_lock_is_released_when_the_holder_dies(tmp_path):
    """ОС снимает flock на выходе процесса — упавший прогон не блокирует всех."""
    from tests.run_lock import acquire_run_lock

    child = _spawn_holder(tmp_path, "released_db", 30.0)
    child.kill()
    child.wait(timeout=10)

    started = time.monotonic()
    fd = acquire_run_lock("released_db", lock_dir=str(tmp_path))
    waited = time.monotonic() - started

    assert fd is not None
    os.close(fd)
    assert waited < 2.0, f"блокировка убитого процесса не освободилась (ждали {waited:.2f}с)"


def test_distinct_databases_do_not_block_each_other(tmp_path):
    """Разные базы — разные блокировки: сериализуем только реальный конфликт."""
    from tests.run_lock import acquire_run_lock

    child = _spawn_holder(tmp_path, "db_one", 5.0)
    try:
        started = time.monotonic()
        fd = acquire_run_lock("db_two", lock_dir=str(tmp_path))
        waited = time.monotonic() - started
    finally:
        child.kill()
        child.wait(timeout=10)

    assert fd is not None
    os.close(fd)
    assert waited < 2.0, f"чужая база не должна блокировать (ждали {waited:.2f}с)"

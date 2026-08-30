import asyncio
import structlog
from pathlib import Path
from fastapi import BackgroundTasks
from jinja2 import Environment, FileSystemLoader

try:
    import resend
    _RESEND_AVAILABLE = True
except Exception:
    _RESEND_AVAILABLE = False
    resend = None  # type: ignore

from app.core.config import settings

logger = structlog.get_logger()

TEMPLATES_DIR = Path(__file__).parent.parent / "templates"
_jinja_env = Environment(loader=FileSystemLoader(TEMPLATES_DIR), autoescape=True)


def _resend_ready() -> bool:
    if not _RESEND_AVAILABLE:
        return False
    if not all([settings.RESEND_API_KEY, settings.MAIL_FROM]):
        return False
    resend.api_key = settings.RESEND_API_KEY
    return True


async def send_registration_email(background_tasks: BackgroundTasks, email: str, full_name: str) -> None:
    if not _resend_ready():
        return
    html = _jinja_env.get_template("email_registration.html").render(full_name=full_name)
    background_tasks.add_task(
        _send_safe, email, "Заявка на регистрацию принята", html, "email_registration.html"
    )


async def send_approval_email(background_tasks: BackgroundTasks, email: str, full_name: str) -> None:
    if not _resend_ready():
        return
    html = _jinja_env.get_template("email_approval.html").render(full_name=full_name, base_url=settings.BASE_URL)
    background_tasks.add_task(
        _send_safe, email, "Ваш аккаунт одобрен", html, "email_approval.html"
    )


async def send_password_reset_email(background_tasks: BackgroundTasks, email: str, reset_link: str) -> None:
    if not _resend_ready():
        return
    html = _jinja_env.get_template("email_password_reset.html").render(reset_link=reset_link)
    background_tasks.add_task(
        _send_safe, email, "Сброс пароля LeadFlow CRM", html, "email_password_reset.html"
    )


async def _send_safe(to_email: str, subject: str, html: str, template_name: str) -> None:
    try:
        # resend.Emails.send — синхронный (под капотом requests), поэтому уводим
        # его в отдельный поток, чтобы не блокировать event loop в BackgroundTasks.
        await asyncio.to_thread(
            resend.Emails.send,
            {
                "from": settings.MAIL_FROM,
                "to": [to_email],
                "subject": subject,
                "html": html,
            },
        )
    except Exception:
        logger.warning("email_send_failed", template=template_name)


async def send_task_reminder_email(
    to_email: str, task_title: str, due_at, max_retries: int = 2
) -> bool:
    """Используется фоновой обработкой напоминаний (app/scheduler/jobs.py), а
    не через BackgroundTasks.add_task — та работает только внутри цикла
    HTTP-запрос/ответ, а джоба планировщика вне его. Поэтому здесь нужен
    собственный retry с бэкоффом: единственный шанс отправить письмо для
    конкретного напоминания, т.к. задача уже атомарно помечена отправленной
    (см. claim_due_reminders) и повторно не попадёт в обработку."""
    if not _resend_ready():
        return False

    html = _jinja_env.get_template("email_task_reminder.html").render(
        task_title=task_title, due_at=f"{due_at:%d.%m.%Y %H:%M}", base_url=settings.BASE_URL
    )

    for attempt in range(max_retries + 1):
        try:
            await asyncio.to_thread(
                resend.Emails.send,
                {
                    "from": settings.MAIL_FROM,
                    "to": [to_email],
                    "subject": f"Напоминание: {task_title}",
                    "html": html,
                },
            )
            return True
        except Exception:
            if attempt < max_retries:
                await asyncio.sleep(2 ** attempt)
            else:
                logger.warning("task_reminder_email_failed", to_email=to_email, attempts=attempt + 1)
    return False

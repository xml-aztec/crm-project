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

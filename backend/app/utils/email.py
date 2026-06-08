import structlog
from pathlib import Path
from fastapi import BackgroundTasks
from app.core.config import settings

try:
    from pydantic import SecretStr  # noqa: F401 — fastapi_mail 1.5.2 forgets to import this
    import fastapi_mail.config as _fm_config
    if not hasattr(_fm_config, 'SecretStr'):
        _fm_config.SecretStr = SecretStr
    from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
    _MAIL_AVAILABLE = True
except Exception:
    _MAIL_AVAILABLE = False
    FastMail = None  # type: ignore
    MessageSchema = None  # type: ignore
    ConnectionConfig = None  # type: ignore
    MessageType = None  # type: ignore

logger = structlog.get_logger()

TEMPLATES_DIR = Path(__file__).parent.parent / "templates"


def _get_mail_client():
    if not _MAIL_AVAILABLE:
        return None
    if not all([settings.MAIL_SERVER, settings.MAIL_USERNAME, settings.MAIL_FROM]):
        return None
    conf = ConnectionConfig(
        MAIL_USERNAME=settings.MAIL_USERNAME,
        MAIL_PASSWORD=settings.MAIL_PASSWORD,
        MAIL_FROM=settings.MAIL_FROM,
        MAIL_PORT=settings.MAIL_PORT,
        MAIL_SERVER=settings.MAIL_SERVER,
        MAIL_STARTTLS=settings.MAIL_STARTTLS,
        MAIL_SSL_TLS=settings.MAIL_SSL_TLS,
        TEMPLATE_FOLDER=TEMPLATES_DIR,
    )
    return FastMail(conf)


async def send_registration_email(background_tasks: BackgroundTasks, email: str, full_name: str) -> None:
    mail = _get_mail_client()
    if not mail:
        return
    message = MessageSchema(
        subject="Заявка на регистрацию принята",
        recipients=[email],
        template_body={"full_name": full_name},
        subtype=MessageType.html,
    )
    background_tasks.add_task(
        _send_safe, mail, message, "email_registration.html"
    )


async def send_approval_email(background_tasks: BackgroundTasks, email: str, full_name: str) -> None:
    mail = _get_mail_client()
    if not mail:
        return
    message = MessageSchema(
        subject="Ваш аккаунт одобрен",
        recipients=[email],
        template_body={"full_name": full_name, "base_url": settings.BASE_URL},
        subtype=MessageType.html,
    )
    background_tasks.add_task(
        _send_safe, mail, message, "email_approval.html"
    )


async def _send_safe(mail, message, template_name: str) -> None:
    try:
        await mail.send_message(message, template_name=template_name)
    except Exception:
        logger.warning("email_send_failed", template=template_name)

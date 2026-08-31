from typing import Optional

import boto3
from botocore.config import Config as BotoConfig
from fastapi import HTTPException
from fastapi.concurrency import run_in_threadpool

from app.core.config import settings

ALLOWED_CONTENT_TYPES = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
}
MAX_UPLOAD_SIZE = 5 * 1024 * 1024  # 5 МБ

# Долгое кэширование объектов: уникальный uuid в ключе означает, что контент
# по данному ключу никогда не меняется — инвалидация кэша не нужна.
CACHE_CONTROL = "public, max-age=31536000, immutable"


def _client():
    if not (
        settings.R2_ACCOUNT_ID
        and settings.R2_ACCESS_KEY_ID
        and settings.R2_SECRET_ACCESS_KEY
        and settings.R2_BUCKET_NAME
    ):
        raise HTTPException(status_code=500, detail="Хранилище изображений не настроено")

    return boto3.client(
        "s3",
        endpoint_url=f"https://{settings.R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
        aws_access_key_id=settings.R2_ACCESS_KEY_ID,
        aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
        config=BotoConfig(signature_version="s3v4", region_name="auto"),
    )


def generate_presigned_put_url(key: str, content_type: str, expires_in: int = 300) -> str:
    """Чисто локальное HMAC-подписывание — сетевого запроса не делает,
    поэтому не оборачивается в threadpool."""
    client = _client()
    return client.generate_presigned_url(
        "put_object",
        Params={"Bucket": settings.R2_BUCKET_NAME, "Key": key, "ContentType": content_type},
        ExpiresIn=expires_in,
    )


async def download_object(key: str) -> bytes:
    def _download() -> bytes:
        client = _client()
        obj = client.get_object(Bucket=settings.R2_BUCKET_NAME, Key=key)
        return obj["Body"].read()

    return await run_in_threadpool(_download)


async def upload_object(key: str, data: bytes, content_type: str) -> None:
    def _upload() -> None:
        client = _client()
        client.put_object(
            Bucket=settings.R2_BUCKET_NAME,
            Key=key,
            Body=data,
            ContentType=content_type,
            CacheControl=CACHE_CONTROL,
        )

    await run_in_threadpool(_upload)


async def delete_object(key: str) -> None:
    await delete_objects([key])


async def delete_objects(keys: list[str]) -> None:
    if not keys:
        return

    def _delete() -> None:
        client = _client()
        client.delete_objects(
            Bucket=settings.R2_BUCKET_NAME,
            Delete={"Objects": [{"Key": key} for key in keys]},
        )

    await run_in_threadpool(_delete)


def public_url_for_key(key: str) -> str:
    if not settings.R2_PUBLIC_URL:
        raise HTTPException(status_code=500, detail="Хранилище изображений не настроено")
    return f"{settings.R2_PUBLIC_URL.rstrip('/')}/{key}"


def key_from_public_url(url: str) -> Optional[str]:
    if not settings.R2_PUBLIC_URL:
        return None
    prefix = settings.R2_PUBLIC_URL.rstrip("/") + "/"
    if url.startswith(prefix):
        return url[len(prefix):]
    return None

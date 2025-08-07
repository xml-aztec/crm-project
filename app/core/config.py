from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str
    ADMIN_EMAIL: str
    ADMIN_PASSWORD: str
    ADMIN_FULL_NAME: str = "Super Admin"
    BASE_URL: str = "http://localhost:8000"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()
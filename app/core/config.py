from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    BASE_URL: str = "http://localhost:8000"

    class Config:
        env_file = ".env"

settings = Settings()
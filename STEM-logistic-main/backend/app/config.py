from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "LogiProof Backend"
    environment: str = "development"

    database_url: str = "postgresql+psycopg://logiproof:logiproof@localhost:5433/logiproof"

    jwt_secret_key: str = "CHANGE_ME_SUPER_SECRET"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24

    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"
    public_base_url: str = "http://localhost:3000"

    bitrix_webhook_url: str | None = None

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
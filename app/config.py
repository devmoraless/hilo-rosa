"""Settings from the environment (.env at the repo root). Every key is optional: each external
service has a local fallback, so the demo runs with no keys at all."""

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ROOT / ".env", extra="ignore")

    hilo_env: str = "dev"
    hilo_database_url: str = f"sqlite:///{(ROOT / 'data' / 'hilo_rosa.db').as_posix()}"
    hilo_data_dir: Path = ROOT / "data"
    # Base URL printed in the QR (/p/<token>); Render sets it to the public URL.
    hilo_public_url: str = "http://localhost:8000"
    telegram_bot_token: str = ""
    telegram_demo_chat_id: str = ""
    valkey_url: str = ""
    anthropic_api_key: str = ""


settings = Settings()

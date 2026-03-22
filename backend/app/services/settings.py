from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

REPO_ROOT = Path(__file__).resolve().parents[3]


def load_project_env():
    for file_name in (".env.local", ".env"):
        env_file = REPO_ROOT / file_name
        if env_file.exists():
            load_dotenv(env_file, override=False, encoding="utf-8-sig")


def get_int_env(name: str, default: int) -> int:
    value = os.getenv(name)
    if value in (None, ""):
        return default

    try:
        return int(value)
    except ValueError:
        return default


def get_float_env(name: str, default: float) -> float:
    value = os.getenv(name)
    if value in (None, ""):
        return default

    try:
        return float(value)
    except ValueError:
        return default


load_project_env()


@dataclass(frozen=True)
class Settings:
    fastapi_base_url: str
    packycode_api_key: str
    packycode_base_url: str
    packycode_model: str
    chat_db_path: str
    packycode_health_timeout_ms: int
    packycode_request_timeout_seconds: float

    @property
    def normalized_packycode_base_url(self) -> str:
        return self.packycode_base_url.rstrip("/")

    def missing_packycode_config(self) -> str | None:
        if not self.packycode_api_key:
            return "PACKYCODE_API_KEY is missing"

        if not self.packycode_base_url:
            return "PACKYCODE_BASE_URL is missing"

        return None


settings = Settings(
    fastapi_base_url=os.getenv("FASTAPI_BASE_URL", "http://127.0.0.1:8000"),
    packycode_api_key=os.getenv("PACKYCODE_API_KEY", ""),
    packycode_base_url=os.getenv("PACKYCODE_BASE_URL", ""),
    packycode_model=os.getenv("PACKYCODE_MODEL", "gpt-5.4"),
    chat_db_path=os.getenv("CHAT_DB_PATH", "data/chat.db"),
    packycode_health_timeout_ms=get_int_env("PACKYCODE_HEALTH_TIMEOUT_MS", 8000),
    packycode_request_timeout_seconds=get_float_env("PACKYCODE_REQUEST_TIMEOUT_SECONDS", 30.0),
)

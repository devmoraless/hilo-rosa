"""Every test runs on a fresh in-memory SQLite seeded with the demo data."""

import os

os.environ.setdefault("HILO_DATABASE_URL", "sqlite://")
os.environ.setdefault("HILO_ENV", "test")

import pytest

from app.services import store


@pytest.fixture(autouse=True)
def fresh_demo_db() -> None:
    store.reset_demo()

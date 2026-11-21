"""Notices to the patient (HR-009), reused by HR-010 for OTP codes.

Interface (keep it this small):
    get_notifier().send(destino, mensaje) -> NotificationOut

- `TelegramNotifier` is used only when TELEGRAM_BOT_TOKEN is set. In the demo every message goes to
  TELEGRAM_DEMO_CHAT_ID (the team's phone), never to the real number. Any error falls back to the log.
- `LogNotifier` is the local fallback ("SMS simulado"): it keeps an in-memory feed that
  GET /api/notifications shows on screen.

Callers are responsible for the text: a result notice NEVER includes a diagnosis or classification.
"""

from __future__ import annotations

import logging
import re
from typing import ClassVar, Protocol

import httpx

from app.config import settings
from app.db import new_id, now_iso
from app.schemas import NotificationOut

log = logging.getLogger("hilo.notifier")

FEED_LIMIT = 50


def mask_phone(telefono: str | None) -> str:
    """'+523411000001' -> '+52 •••• ••01'. Never print a full phone number on screen."""
    digits = re.sub(r"\D", "", telefono or "")
    if not digits:
        return "sin teléfono"
    prefix = "+52 " if digits.startswith("52") and len(digits) > 10 else ""
    return f"{prefix}•••• ••{digits[-2:]}"


class Notifier(Protocol):
    def send(self, destino: str, mensaje: str) -> NotificationOut: ...


class LogNotifier:
    """Local fallback: no network, the message is shown in the app as "SMS simulado"."""

    canal = "log"
    _feed: ClassVar[list[NotificationOut]] = []

    def send(self, destino: str, mensaje: str) -> NotificationOut:
        note = NotificationOut(id=new_id(), canal="log", destino_enmascarado=mask_phone(destino), mensaje=mensaje, ts=now_iso())
        LogNotifier._feed.insert(0, note)
        del LogNotifier._feed[FEED_LIMIT:]
        log.info("SMS simulado a %s: %s", note.destino_enmascarado, mensaje)
        return note

    def send_otp(self, telefono: str, codigo: str) -> dict:
        """Convenience for HR-010: sends the code and exposes it on screen (demo only)."""
        note = self.send(telefono, f"Tu código Hilo Rosa es {codigo}. Vence en 5 minutos.")
        return {"canal": note.canal, "destino_enmascarado": note.destino_enmascarado, "codigo_demo": codigo}

    @classmethod
    def feed(cls) -> list[NotificationOut]:
        return list(cls._feed)

    @classmethod
    def clear(cls) -> None:
        cls._feed.clear()


class TelegramNotifier:
    """Telegram Bot API. Demo: always delivers to settings.telegram_demo_chat_id."""

    canal = "telegram"

    def __init__(self, token: str, chat_id: str):
        self.token = token
        self.chat_id = chat_id

    def send(self, destino: str, mensaje: str) -> NotificationOut:
        try:
            if not self.chat_id:
                raise ValueError("TELEGRAM_DEMO_CHAT_ID vacío")
            r = httpx.post(
                f"https://api.telegram.org/bot{self.token}/sendMessage",
                json={"chat_id": self.chat_id, "text": mensaje},
                timeout=5,
            )
            r.raise_for_status()
        except Exception as exc:  # noqa: BLE001 - any failure → the notice still goes out via the log
            log.warning("Telegram falló (%s); uso el registro local", type(exc).__name__)
            return LogNotifier().send(destino, mensaje)
        return NotificationOut(id=new_id(), canal="telegram", destino_enmascarado=mask_phone(destino), mensaje=mensaje, ts=now_iso())

    def send_otp(self, telefono: str, codigo: str) -> dict:
        note = self.send(telefono, f"Tu código Hilo Rosa es {codigo}. Vence en 5 minutos.")
        out = {"canal": note.canal, "destino_enmascarado": note.destino_enmascarado}
        if note.canal == "log":
            out["codigo_demo"] = codigo
        return out


def get_notifier() -> Notifier:
    if settings.telegram_bot_token:
        return TelegramNotifier(settings.telegram_bot_token, settings.telegram_demo_chat_id)
    return LogNotifier()

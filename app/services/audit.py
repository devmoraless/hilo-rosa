"""Bitácora con cadena de hashes SHA-256 (storage-agnostic).

Cada entrada: actor, rol, accion, entidad_id, ts, prev_hash, hash.
hash = sha256(prev_hash + json_canónico(actor, rol, accion, entidad_id, ts)).
Funciona sobre una lista de dicts; el store de SQLite solo persiste las entradas.
"""
from __future__ import annotations

import hashlib
import json
from collections.abc import Iterable
from datetime import UTC, datetime

GENESIS_HASH = "0" * 64
CAMPOS = ("actor", "rol", "accion", "entidad_id", "ts")


def _canonical(entry: dict) -> str:
    return json.dumps(
        {k: entry.get(k) for k in CAMPOS}, sort_keys=True, separators=(",", ":"), ensure_ascii=False
    )


def compute_hash(prev_hash: str, entry: dict) -> str:
    return hashlib.sha256((prev_hash + _canonical(entry)).encode("utf-8")).hexdigest()


def verify(entries: Iterable[dict]) -> tuple[bool, int | None]:
    """(True, None) si la cadena está íntegra; si no, (False, índice del primer registro malo)."""
    prev = GENESIS_HASH
    for i, e in enumerate(entries):
        if e.get("prev_hash") != prev or e.get("hash") != compute_hash(prev, e):
            return False, i
        prev = e["hash"]
    return True, None


class AuditLog:
    def __init__(self, entries: Iterable[dict] | None = None):
        self.entries: list[dict] = list(entries or [])

    @property
    def last_hash(self) -> str:
        return self.entries[-1]["hash"] if self.entries else GENESIS_HASH

    def append(self, actor: str, rol: str, accion: str, entidad_id: str, ts: str | None = None) -> dict:
        entry = {
            "actor": actor,
            "rol": rol,
            "accion": accion,
            "entidad_id": str(entidad_id),
            "ts": ts or datetime.now(UTC).isoformat(timespec="seconds"),
            "prev_hash": self.last_hash,
        }
        entry["hash"] = compute_hash(entry["prev_hash"], entry)
        self.entries.append(entry)
        return entry

    def verify(self) -> tuple[bool, int | None]:
        return verify(self.entries)

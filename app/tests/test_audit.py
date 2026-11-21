"""HR-005 · bitácora con cadena de hashes SHA-256."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from app.services.audit import GENESIS_HASH, AuditLog, verify


def test_audit_chain_detects_tampered_entry():
    log = AuditLog()
    e0 = log.append("capturista-1", "capturista", "registrar_paciente", "p-1", ts="2026-11-21T10:00:00Z")
    log.append("medica-1", "medica", "autorizar_resultado", "r-1", ts="2026-11-21T11:00:00Z")
    log.append("Laura (hija)", "familiar", "ver_resultado", "r-1", ts="2026-11-21T12:00:00Z")

    assert e0["prev_hash"] == GENESIS_HASH
    assert log.entries[1]["prev_hash"] == e0["hash"]
    assert len(e0["hash"]) == 64
    assert verify(log.entries) == (True, None)
    assert log.verify() == (True, None)

    # Alterar un registro intermedio rompe la cadena en ese índice
    tampered = [dict(e) for e in log.entries]
    tampered[1]["actor"] = "intruso"
    assert verify(tampered) == (False, 1)

    # Recalcular el hash del alterado no basta: el siguiente ya no enlaza
    from app.services.audit import compute_hash

    tampered[1]["hash"] = compute_hash(tampered[1]["prev_hash"], tampered[1])
    assert verify(tampered) == (False, 2)

    # Una bitácora reanudada desde entradas persistidas sigue encadenando
    resumed = AuditLog(log.entries)
    e3 = resumed.append("medica-1", "medica", "ver_bitacora", "audit")
    assert e3["prev_hash"] == log.entries[-1]["hash"]
    assert resumed.verify() == (True, None)

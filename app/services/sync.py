"""Offline outbox sync (IDEA.md §4): idempotent by op_id, optimistic locking by base_version.

Every applied op writes one entry to the hash-chained audit log (HR-005 contract:
hash = sha256(prev_hash + canonical_json(actor, rol, accion, entidad_id, ts))).
"""

import hashlib
import json
from collections.abc import Iterable
from typing import Any, get_args

from sqlmodel import Session, select

from app.db import (
    AuditLog,
    Patient,
    Study,
    SyncOp,
    TrustedContact,
    Visit,
    new_id,
    now_iso,
)
from app.schemas import (
    CanalAviso,
    CreatedPatient,
    StudyType,
    SyncConflict,
    SyncOpIn,
    SyncRequest,
    SyncResponse,
)
from app.services import credential

try:  # HR-005 owns the chain; this fallback is the same formula until it lands on main.
    from app.services.audit import GENESIS_HASH, compute_hash  # type: ignore
    from app.services.audit import verify as verify_chain
except ImportError:  # pragma: no cover - exercised only while HR-005 is not integrated
    GENESIS_HASH = "0" * 64
    _CAMPOS = ("actor", "rol", "accion", "entidad_id", "ts")

    def compute_hash(prev_hash: str, entry: dict) -> str:
        canonical = json.dumps({k: entry.get(k) for k in _CAMPOS}, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
        return hashlib.sha256((prev_hash + canonical).encode("utf-8")).hexdigest()

    def verify_chain(entries: Iterable[dict]) -> tuple[bool, int | None]:
        prev = GENESIS_HASH
        for i, e in enumerate(entries):
            if e.get("prev_hash") != prev or e.get("hash") != compute_hash(prev, e):
                return False, i
            prev = e["hash"]
        return True, None


REQUIRED_FIELDS = {
    "patient.create": ("nombre", "apellidos", "fecha_nacimiento", "municipio"),
    "contact.create": ("nombre", "parentesco", "telefono"),
    "study.create": ("tipo", "fecha"),
}
UPDATABLE_FIELDS = {"nombre", "apellidos", "fecha_nacimiento", "municipio", "telefono", "telefono_propio", "canal_aviso"}


class Conflict(Exception):
    def __init__(self, reason: str, server_version: int | None = None):
        super().__init__(reason)
        self.reason = reason
        self.server_version = server_version


def record_audit(s: Session, actor: str, rol: str, accion: str, entidad_id: str) -> AuditLog:
    last = s.exec(select(AuditLog).order_by(AuditLog.id.desc())).first()  # type: ignore[union-attr]
    entry = {"actor": actor, "rol": rol, "accion": accion, "entidad_id": str(entidad_id), "ts": now_iso()}
    entry["prev_hash"] = last.hash if last else GENESIS_HASH
    entry["hash"] = compute_hash(entry["prev_hash"], entry)
    row = AuditLog(**entry)
    s.add(row)
    s.flush()
    return row


def _created_patient_id(s: Session, device_id: str, local_id: str) -> str | None:
    """Resolve a device-local patient id from any earlier patient.create (this or a past batch)."""
    ops = select(SyncOp).where(SyncOp.device_id == device_id, SyncOp.tipo == "patient.create", SyncOp.status == "applied")
    for op in s.exec(ops).all():
        payload = json.loads(op.payload)
        if payload.get("local_id") == local_id and payload.get("_patient_id"):
            return payload["_patient_id"]
    return None


def _patient_for(s: Session, device_id: str, payload: dict[str, Any]) -> Patient:
    pid = payload.get("patient_id") or (payload.get("local_id") and _created_patient_id(s, device_id, payload["local_id"]))
    patient = s.get(Patient, pid) if pid else None
    if patient is None:
        raise Conflict("paciente desconocida: sincroniza primero su registro")
    return patient


def _visit_for(s: Session, device_id: str, local_visit_id: str | None) -> str | None:
    if not local_visit_id:
        return None
    ops = select(SyncOp).where(SyncOp.device_id == device_id, SyncOp.tipo == "visit.create", SyncOp.status == "applied")
    for op in s.exec(ops).all():
        payload = json.loads(op.payload)
        if payload.get("local_visit_id") == local_visit_id:
            return payload.get("_visit_id")
    return None


def _apply(s: Session, device_id: str, op: SyncOpIn, stored: dict[str, Any]) -> tuple[str, CreatedPatient | None]:
    p = op.payload
    missing = [f for f in REQUIRED_FIELDS.get(op.tipo, ()) if not p.get(f)]
    if missing:
        raise Conflict(f"faltan campos: {', '.join(missing)}")
    if op.tipo == "study.create" and p["tipo"] not in get_args(StudyType):
        raise Conflict(f"tipo de estudio no válido: {p['tipo']}")
    if "canal_aviso" in p and p["canal_aviso"] not in get_args(CanalAviso):
        raise Conflict(f"canal de aviso no válido: {p['canal_aviso']}")
    if op.tipo == "patient.create":
        patient = Patient(
            folio=credential.new_folio(s),
            nombre=p["nombre"],
            apellidos=p["apellidos"],
            fecha_nacimiento=p["fecha_nacimiento"],
            municipio=p["municipio"],
            telefono=p.get("telefono"),
            telefono_propio=p.get("telefono_propio", True),
            canal_aviso=p.get("canal_aviso", "telegram"),
            qr_token=credential.new_qr_token(s),
        )
        s.add(patient)
        s.flush()
        stored["_patient_id"] = patient.id
        created = CreatedPatient(local_id=p.get("local_id", ""), id=patient.id, folio=patient.folio, qr_token=patient.qr_token)
        return patient.id, created
    if op.tipo == "patient.update":
        patient = _patient_for(s, device_id, p)
        if op.base_version is None:
            raise Conflict("base_version requerida para actualizar", patient.version)
        if op.base_version != patient.version:
            raise Conflict("la paciente cambió en el servidor; revisa antes de sobrescribir", patient.version)
        for field, value in p.items():
            if field in UPDATABLE_FIELDS:
                setattr(patient, field, value)
        patient.version += 1
        s.add(patient)
        return patient.id, None
    if op.tipo == "contact.create":
        patient = _patient_for(s, device_id, p)
        if not p.get("consentimiento", False):
            raise Conflict("sin consentimiento de la paciente no se registra el contacto")
        contact = TrustedContact(patient_id=patient.id, nombre=p["nombre"], parentesco=p["parentesco"], telefono=p["telefono"])
        s.add(contact)
        s.flush()
        return contact.id, None
    if op.tipo == "visit.create":
        patient = _patient_for(s, device_id, p)
        visit = Visit(id=new_id(), patient_id=patient.id, jornada_id=p.get("jornada_id"), device_id=device_id)
        s.add(visit)
        s.flush()
        stored["_visit_id"] = visit.id
        return visit.id, None
    if op.tipo == "study.create":
        patient = _patient_for(s, device_id, p)
        study = Study(patient_id=patient.id, visit_id=_visit_for(s, device_id, p.get("local_visit_id")), tipo=p["tipo"], fecha=p["fecha"])
        s.add(study)
        s.flush()
        return study.id, None
    raise Conflict(f"tipo de operación no soportado: {op.tipo}")  # pragma: no cover


def _replay_created(stored: SyncOp) -> CreatedPatient | None:
    if stored.tipo != "patient.create" or stored.status != "applied":
        return None
    payload = json.loads(stored.payload)
    patient_id = payload.get("_patient_id")
    return patient_id and CreatedPatient(local_id=payload.get("local_id", ""), id=patient_id, folio=payload["_folio"], qr_token=payload["_qr_token"])


def apply_batch(s: Session, req: SyncRequest, actor: str = "capturista") -> SyncResponse:
    out = SyncResponse()
    for op in req.ops:
        previous = s.get(SyncOp, op.op_id)
        if previous is not None:
            out.duplicates.append(op.op_id)
            if (replay := _replay_created(previous)) is not None:
                out.created_patients.append(replay)
            continue
        stored: dict[str, Any] = dict(op.payload)
        try:
            entity_id, created = _apply(s, req.device_id, op, stored)
        except Conflict as c:
            s.rollback()  # every Conflict is raised before the op writes anything
            s.add(SyncOp(op_id=op.op_id, device_id=req.device_id, tipo=op.tipo, payload=json.dumps(stored, ensure_ascii=False), base_version=op.base_version, status="conflict"))
            record_audit(s, req.device_id, actor, f"{op.tipo}.conflict", op.op_id)
            out.conflicts.append(SyncConflict(op_id=op.op_id, reason=c.reason, server_version=c.server_version))
            s.commit()
            continue
        if created is not None:
            stored["_folio"], stored["_qr_token"] = created.folio, created.qr_token
            out.created_patients.append(created)
        s.add(SyncOp(op_id=op.op_id, device_id=req.device_id, tipo=op.tipo, payload=json.dumps(stored, ensure_ascii=False), base_version=op.base_version, status="applied"))
        record_audit(s, req.device_id, actor, op.tipo, entity_id)
        s.commit()
        out.applied.append(op.op_id)
    return out

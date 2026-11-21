"""API contract (request/response shapes). Mirrored by hand in web/src/api/types.ts.

Endpoints (IDEA.md §4) and the task that implements each:
  GET  /api/health                         HR-001
  POST /api/demo/reset                     HR-001
  GET  /api/jornadas                       HR-006
  GET  /api/jornadas/{id}/snapshot         HR-006 -> SnapshotResponse
  POST /api/sync                           HR-006  SyncRequest -> SyncResponse
  GET  /api/patients/{id}/credential.png   HR-006
  POST /api/results/upload                 HR-008 (multipart "files") -> UploadResponse
  GET  /api/results                        HR-008/HR-009 -> list[ResultOut] (?estado=)
  POST /api/results/{id}/associate         HR-008  AssociateRequest -> ResultOut
  GET  /api/results/{id}/pdf               HR-008/HR-010
  POST /api/results/{id}/authorize         HR-009  AuthorizeRequest -> AuthorizeResponse
  GET  /api/notifications                  HR-009 -> list[NotificationOut] (LogNotifier feed)
  POST /api/access/start                   HR-010  AccessStartRequest -> AccessStartResponse
  POST /api/access/verify                  HR-010  AccessVerifyRequest -> AccessVerifyResponse
  GET  /api/access/me/results              HR-010 (Authorization: Bearer <session>) -> list[PatientResultView]
  GET  /api/audit                          HR-010 -> AuditResponse

Roles travel in the header X-Demo-Role: capturista | laboratorio | medica | paciente (simulated login).
"""

from typing import Any, Literal

from pydantic import BaseModel, Field

RESULT_STATES: tuple[str, ...] = ("pendiente_asociar", "por_revisar", "autorizado", "notificado", "visto")
ResultState = Literal["pendiente_asociar", "por_revisar", "autorizado", "notificado", "visto"]
Role = Literal["capturista", "laboratorio", "medica", "paciente"]
StudyType = Literal["papanicolaou", "ultrasonido", "mastografia", "nutricion"]
Bethesda = Literal["NILM", "ASC-US", "LSIL", "ASC-H", "HSIL", "AGC", "insatisfactoria"]
Clasificacion = Literal["normal", "seguimiento", "repetir"]
Prioridad = Literal["normal", "alta"]
CanalAviso = Literal["telegram", "sms", "en_persona"]


# ---------- Patients and jornadas (HR-006, HR-007) ----------
class StudySummary(BaseModel):
    id: str
    tipo: StudyType
    fecha: str


class TrustedContactIn(BaseModel):
    nombre: str
    parentesco: str
    telefono: str
    consentimiento: bool = True


class TrustedContactOut(BaseModel):
    id: str
    nombre: str
    parentesco: str
    telefono_enmascarado: str
    activo: bool


class SnapshotPatient(BaseModel):
    """Minimal data the capturista device keeps offline (IndexedDB) for matching."""

    id: str
    folio: str
    nombre: str
    apellidos: str
    fecha_nacimiento: str
    municipio: str
    telefono: str | None = None
    version: int
    estudios: list[StudySummary] = []


class JornadaOut(BaseModel):
    id: str
    municipio: str
    sede: str
    fecha: str


class SnapshotResponse(BaseModel):
    jornada: JornadaOut
    patients: list[SnapshotPatient]
    generated_at: str


SyncOpType = Literal["patient.create", "patient.update", "contact.create", "visit.create", "study.create"]


class SyncOpIn(BaseModel):
    """One offline operation from the outbox. `op_id` is the idempotency key.

    payload by tipo:
      patient.create  {local_id, nombre, apellidos, fecha_nacimiento, municipio, telefono?, telefono_propio, canal_aviso}
      patient.update  {patient_id, ...changed fields}   (base_version required)
      contact.create  {patient_id | local_id, nombre, parentesco, telefono, consentimiento}
      visit.create    {patient_id | local_id, jornada_id, local_visit_id}
      study.create    {patient_id | local_id, local_visit_id?, tipo, fecha}
    """

    op_id: str
    tipo: SyncOpType
    payload: dict[str, Any]
    base_version: int | None = None


class SyncRequest(BaseModel):
    device_id: str
    ops: list[SyncOpIn]


class SyncConflict(BaseModel):
    op_id: str
    reason: str
    server_version: int | None = None


class CreatedPatient(BaseModel):
    local_id: str
    id: str
    folio: str
    qr_token: str


class SyncResponse(BaseModel):
    applied: list[str] = []
    duplicates: list[str] = []
    conflicts: list[SyncConflict] = []
    created_patients: list[CreatedPatient] = []


# ---------- Results (HR-008, HR-009) ----------
class ResultOut(BaseModel):
    id: str
    estado: ResultState
    tipo_estudio: StudyType = "papanicolaou"
    pdf_nombre: str = ""
    folio_detectado: str | None = None
    patient_id: str | None = None
    # Hidden for the laboratorio role (it only sees folio + estado):
    paciente_nombre: str | None = None
    sugerencia_patient_id: str | None = None
    sugerencia_nombre: str | None = None
    bethesda: Bethesda | None = None
    birads: int | None = Field(default=None, ge=0, le=5)
    conducta: str | None = None
    clasificacion: Clasificacion | None = None
    prioridad: Prioridad | None = None
    proximo_control: str | None = None
    explicacion_clara: str | None = None
    autorizado_por_nombre: str | None = None
    autorizado_at: str | None = None
    visto_por: str | None = None


class UploadResponse(BaseModel):
    results: list[ResultOut]


class AssociateRequest(BaseModel):
    patient_id: str


class AuthorizeRequest(BaseModel):
    """Doctor's capture. Pap: bethesda + conducta. Breast (paper fields 22-23): birads + conducta."""

    bethesda: Bethesda | None = None
    birads: int | None = Field(default=None, ge=0, le=5)
    conducta: str
    notas: str | None = None
    explicacion_clara: str | None = None  # optional edit of the rule template
    nombre: str  # paper field 21 / institutional seal
    cedula: str


class NotificationOut(BaseModel):
    id: str
    canal: str  # telegram | log
    destino_enmascarado: str
    mensaje: str  # NEVER contains a diagnosis
    ts: str


class AuthorizeResponse(BaseModel):
    result: ResultOut
    notification: NotificationOut | None = None  # None when the result needs a human call
    tareas: list[str] = []


# ---------- Patient / trusted-contact access (HR-010) ----------
class AccessStartRequest(BaseModel):
    token: str  # qr_token from /p/<token>
    quien: Literal["paciente", "contacto"]
    contacto_id: str | None = None
    fecha_nacimiento: str  # of the patient, YYYY-MM-DD


class AccessStartResponse(BaseModel):
    challenge_id: str
    canal: str
    destino_enmascarado: str
    expira_en_segundos: int = 300
    codigo_demo: str | None = None  # only with LogNotifier ("SMS simulado")


class AccessVerifyRequest(BaseModel):
    challenge_id: str
    codigo: str


class AccessVerifyResponse(BaseModel):
    session_token: str
    expires_at: str
    viewer_nombre: str
    viewer_rol: Literal["paciente", "contacto"]


class AccessIdentity(BaseModel):
    """GET /api/access/token/{token}: who can open this credential (no medical data)."""

    paciente_nombre_corto: str  # e.g. "María L."
    contactos: list[TrustedContactOut]


class PatientResultView(BaseModel):
    id: str
    tipo_estudio: StudyType
    fecha: str
    clasificacion: Clasificacion | None
    explicacion_clara: str | None
    proximo_control: str | None
    pdf_url: str


class AuditEntryOut(BaseModel):
    id: int
    actor: str
    rol: str
    accion: str
    entidad_id: str
    ts: str
    prev_hash: str
    hash: str


class AuditResponse(BaseModel):
    entries: list[AuditEntryOut]
    integridad_ok: bool
    primer_registro_alterado: int | None = None

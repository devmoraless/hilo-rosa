// Mirror of app/schemas/__init__.py (the API contract). Change both together and tell
// the consumers: `uak msg impact:HR-001 --kind contract "..."`.

export const RESULT_STATES = ["pendiente_asociar", "por_revisar", "autorizado", "notificado", "visto"] as const;
export type ResultState = (typeof RESULT_STATES)[number];
export type Role = "capturista" | "laboratorio" | "medica" | "paciente";
export type StudyType = "papanicolaou" | "ultrasonido" | "mastografia" | "nutricion";
export type Bethesda = "NILM" | "ASC-US" | "LSIL" | "ASC-H" | "HSIL" | "AGC" | "insatisfactoria";
export type Clasificacion = "normal" | "seguimiento" | "repetir";
export type Prioridad = "normal" | "alta";
export type CanalAviso = "telegram" | "sms" | "en_persona";

// ---------- Patients and jornadas (HR-006, HR-007) ----------
export interface StudySummary {
  id: string;
  tipo: StudyType;
  fecha: string;
}

export interface TrustedContactIn {
  nombre: string;
  parentesco: string;
  telefono: string;
  consentimiento: boolean;
}

export interface TrustedContactOut {
  id: string;
  nombre: string;
  parentesco: string;
  telefono_enmascarado: string;
  activo: boolean;
}

export interface SnapshotPatient {
  id: string;
  folio: string;
  nombre: string;
  apellidos: string;
  fecha_nacimiento: string; // YYYY-MM-DD
  municipio: string;
  telefono?: string | null;
  version: number;
  estudios: StudySummary[];
}

export interface JornadaOut {
  id: string;
  municipio: string;
  sede: string;
  fecha: string;
}

export interface SnapshotResponse {
  jornada: JornadaOut;
  patients: SnapshotPatient[];
  generated_at: string;
}

export type SyncOpType = "patient.create" | "patient.update" | "contact.create" | "visit.create" | "study.create";

/** payload by tipo: see SyncOpIn in app/schemas/__init__.py */
export interface SyncOpIn {
  op_id: string;
  tipo: SyncOpType;
  payload: Record<string, unknown>;
  base_version?: number | null;
}

export interface SyncRequest {
  device_id: string;
  ops: SyncOpIn[];
}

export interface SyncConflict {
  op_id: string;
  reason: string;
  server_version?: number | null;
}

export interface CreatedPatient {
  local_id: string;
  id: string;
  folio: string;
  qr_token: string;
}

export interface SyncResponse {
  applied: string[];
  duplicates: string[];
  conflicts: SyncConflict[];
  created_patients: CreatedPatient[];
}

// ---------- Results (HR-008, HR-009) ----------
export interface ResultOut {
  id: string;
  estado: ResultState;
  tipo_estudio: StudyType;
  pdf_nombre: string;
  folio_detectado?: string | null;
  patient_id?: string | null;
  paciente_nombre?: string | null; // hidden for the laboratorio role
  sugerencia_patient_id?: string | null;
  sugerencia_nombre?: string | null;
  bethesda?: Bethesda | null;
  birads?: number | null;
  conducta?: string | null;
  clasificacion?: Clasificacion | null;
  prioridad?: Prioridad | null;
  proximo_control?: string | null;
  explicacion_clara?: string | null;
  autorizado_por_nombre?: string | null;
  autorizado_at?: string | null;
  visto_por?: string | null;
}

export interface UploadResponse {
  results: ResultOut[];
}

export interface AssociateRequest {
  patient_id: string;
}

export interface AuthorizeRequest {
  bethesda?: Bethesda | null;
  birads?: number | null;
  conducta: string;
  notas?: string | null;
  explicacion_clara?: string | null;
  nombre: string;
  cedula: string;
}

export interface NotificationOut {
  id: string;
  canal: string;
  destino_enmascarado: string;
  mensaje: string; // never contains a diagnosis
  ts: string;
}

export interface AuthorizeResponse {
  result: ResultOut;
  notification: NotificationOut | null;
  tareas: string[];
}

// ---------- Patient / trusted-contact access (HR-010) ----------
export interface AccessStartRequest {
  token: string;
  quien: "paciente" | "contacto";
  contacto_id?: string | null;
  fecha_nacimiento: string;
}

export interface AccessStartResponse {
  challenge_id: string;
  canal: string;
  destino_enmascarado: string;
  expira_en_segundos: number;
  codigo_demo?: string | null;
}

export interface AccessVerifyRequest {
  challenge_id: string;
  codigo: string;
}

export interface AccessVerifyResponse {
  session_token: string;
  expires_at: string;
  viewer_nombre: string;
  viewer_rol: "paciente" | "contacto";
}

export interface AccessIdentity {
  paciente_nombre_corto: string;
  contactos: TrustedContactOut[];
}

export interface PatientResultView {
  id: string;
  tipo_estudio: StudyType;
  fecha: string;
  clasificacion: Clasificacion | null;
  explicacion_clara: string | null;
  proximo_control: string | null;
  pdf_url: string;
}

export interface AuditEntryOut {
  id: number;
  actor: string;
  rol: string;
  accion: string;
  entidad_id: string;
  ts: string;
  prev_hash: string;
  hash: string;
}

export interface AuditResponse {
  entries: AuditEntryOut[];
  integridad_ok: boolean;
  primer_registro_alterado?: number | null;
}

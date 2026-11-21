// Pure logic of the jornada screen (no Dexie, no DOM) so node --test can run it.
import type { SnapshotPatient, SyncOpIn, SyncResponse, TrustedContactIn } from '../../api/types.ts';

export type QueuedOp = SyncOpIn & { status: 'pending' | 'conflict'; reason?: string; created_at?: string };

export function connectionState(online: boolean): { online: boolean; label: string } {
  return { online, label: online ? 'En línea' : 'Sin conexión' };
}

type IdGen = () => string;

/** "Es ella": contact + visit + Papanicolaou, all linked to the existing patient_id (never a new patient). */
export function buildConfirmOps(a: {
  patientId: string;
  jornadaId: string;
  contact: TrustedContactIn | null;
  fecha: string;
  newId: IdGen;
}): SyncOpIn[] {
  return buildVisitOps({ patient_id: a.patientId }, a);
}

export type NewPatient = {
  nombre: string;
  apellidos: string;
  fecha_nacimiento: string;
  municipio: string;
  telefono?: string;
  telefono_propio: boolean;
  canal_aviso: 'telegram' | 'sms' | 'en_persona';
};

/** "Es otra": patient.create with a local_id, then contact + visit + study linked by that local_id. */
export function buildNewPatientOps(a: {
  patient: NewPatient;
  jornadaId: string;
  contact: TrustedContactIn | null;
  fecha: string;
  newId: IdGen;
}): { localId: string; ops: SyncOpIn[] } {
  const localId = `local-${a.newId()}`;
  const create: SyncOpIn = { op_id: a.newId(), tipo: 'patient.create', payload: { local_id: localId, ...a.patient } };
  return { localId, ops: [create, ...buildVisitOps({ local_id: localId }, a)] };
}

function buildVisitOps(
  ref: { patient_id: string } | { local_id: string },
  a: { jornadaId: string; contact: TrustedContactIn | null; fecha: string; newId: IdGen },
): SyncOpIn[] {
  const ops: SyncOpIn[] = [];
  if (a.contact) ops.push({ op_id: a.newId(), tipo: 'contact.create', payload: { ...ref, ...a.contact } });
  const localVisitId = `visit-${a.newId()}`;
  ops.push({ op_id: a.newId(), tipo: 'visit.create', payload: { ...ref, jornada_id: a.jornadaId, local_visit_id: localVisitId } });
  ops.push({ op_id: a.newId(), tipo: 'study.create', payload: { ...ref, local_visit_id: localVisitId, tipo: 'papanicolaou', fecha: a.fecha } });
  return ops;
}

export function pendingCount(q: readonly QueuedOp[]): number {
  return q.filter((o) => o.status === 'pending').length;
}

/** Drops applied and duplicate ops; marks conflicts (kept visible, never retried blindly). */
export function applySyncResult(q: QueuedOp[], r: SyncResponse): QueuedOp[] {
  const done = new Set([...r.applied, ...r.duplicates]);
  const conflicts = new Map(r.conflicts.map((c) => [c.op_id, c.reason]));
  return q
    .filter((o) => !done.has(o.op_id))
    .map((o) => (conflicts.has(o.op_id) ? { ...o, status: 'conflict' as const, reason: conflicts.get(o.op_id) } : o));
}

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** "Nació en 1974 · Tamazula de Gordiano · ultrasonido mar 2025" */
export function candidateMeta(p: Pick<SnapshotPatient, 'fecha_nacimiento' | 'municipio' | 'estudios'>): string {
  const parts = [`Nació en ${p.fecha_nacimiento.slice(0, 4)}`, p.municipio];
  const last = [...p.estudios].sort((x, y) => x.fecha.localeCompare(y.fecha)).at(-1);
  if (last) {
    const m = Number(last.fecha.slice(5, 7));
    parts.push(`${last.tipo} ${MONTHS[m - 1] ?? ''} ${last.fecha.slice(0, 4)}`.replace(/\s+/g, ' '));
  } else parts.push('sin estudios previos');
  return parts.join(' · ');
}

/** Local date YYYY-MM-DD (not UTC: a jornada at 19:00 in Jalisco is still today). */
export function todayLocal(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

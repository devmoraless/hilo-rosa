// HR-015 · pure helpers for the Bitácora (no DOM). The accion strings come from app/services/{sync,review,access,results}.py.
import type { AuditEntryOut, AuditResponse } from '../../api/types.ts';

export type AuditEntry = AuditEntryOut;
export interface Seal { ok: boolean; text: string; badIndex: number | null }
/** n is the 1-based position in the chain (the "entrada N" of the seal). */
export interface Row { n: number; entry: AuditEntry }

const SYNC_OPS = new Set(['patient.create', 'patient.update', 'contact.create', 'visit.create', 'study.create']);

export function actionLabel(e: AuditEntry): string {
  const a = e.accion;
  if (a.startsWith('visto por ')) return `${a.slice('visto por '.length)} vio el resultado`;
  if (a === 'resultado.autorizado') return `${e.actor} autorizó el resultado`;
  if (a === 'resultado.notificado') return 'Aviso enviado sin diagnóstico';
  if (a === 'tarea.llamar') return 'Caso abierto: llamar a la paciente';
  if (SYNC_OPS.has(a)) return 'Registro sincronizado desde la jornada';
  if (a.endsWith('.conflict')) return 'Conflicto al sincronizar desde la jornada';
  if (a.startsWith('result.upload')) return 'El laboratorio subió un PDF';
  if (a === 'result.associate') return 'PDF asociado a la paciente';
  return a;
}

export function integritySeal(r: AuditResponse): Seal {
  if (r.integridad_ok) return { ok: true, text: 'Integridad ✅ · la cadena de hashes no fue alterada', badIndex: null };
  const bad = r.primer_registro_alterado ?? 0;
  return { ok: false, text: `⚠ Registro alterado en la entrada ${bad + 1}`, badIndex: bad };
}

export function newestFirst(entries: AuditEntry[]): Row[] {
  return entries.map((entry, i) => ({ n: i + 1, entry })).reverse();
}

export const short = (hash: string) => hash.slice(0, 8);

/** "14:05" in local time; falls back to the raw string. */
export function timeLabel(ts: string): string {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  return d.toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

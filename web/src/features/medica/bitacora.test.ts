import { test } from 'node:test';
import assert from 'node:assert/strict';
import { actionLabel, integritySeal, newestFirst } from './bitacoraLogic.ts';
import type { AuditEntry } from './bitacoraLogic.ts';

const entry = (over: Partial<AuditEntry>): AuditEntry => ({
  id: 1,
  actor: 'sistema',
  rol: 'notifier',
  accion: 'resultado.notificado',
  entidad_id: 'r1',
  ts: '2026-11-21T14:00:00Z',
  prev_hash: '0'.repeat(64),
  hash: 'a'.repeat(64),
  ...over,
});

test('labels_viewed_action_with_viewer_and_relationship', () => {
  const visto = entry({ actor: 'Laura Gómez', rol: 'contacto', accion: 'visto por Laura (hija)' });
  assert.equal(actionLabel(visto), 'Laura (hija) vio el resultado');
  assert.equal(actionLabel(entry({ actor: 'Dra. Ana Ruiz', rol: 'medica', accion: 'resultado.autorizado' })), 'Dra. Ana Ruiz autorizó el resultado');
  assert.equal(actionLabel(entry({ accion: 'resultado.notificado' })), 'Aviso enviado sin diagnóstico');
  assert.equal(actionLabel(entry({ accion: 'patient.create' })), 'Registro sincronizado desde la jornada');
  assert.equal(actionLabel(entry({ accion: 'tarea.llamar' })), 'Caso abierto: llamar a la paciente');
});

test('shows_integrity_ok_seal_when_chain_is_valid', () => {
  const seal = integritySeal({ entries: [entry({})], integridad_ok: true, primer_registro_alterado: null });
  assert.equal(seal.ok, true);
  assert.equal(seal.text, 'Integridad ✅ · la cadena de hashes no fue alterada');
  assert.equal(seal.badIndex, null);
});

test('shows_tampered_entry_index_when_chain_is_broken', () => {
  const entries = [entry({ id: 1 }), entry({ id: 2 }), entry({ id: 3 })];
  const seal = integritySeal({ entries, integridad_ok: false, primer_registro_alterado: 1 });
  assert.equal(seal.ok, false);
  assert.equal(seal.text, '⚠ Registro alterado en la entrada 2');
  assert.equal(seal.badIndex, 1);
  const rows = newestFirst(entries);
  assert.deepEqual(rows.map((r) => r.n), [3, 2, 1]);
});

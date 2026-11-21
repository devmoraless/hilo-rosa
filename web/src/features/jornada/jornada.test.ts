import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applySyncResult, buildConfirmOps, connectionState, pendingCount } from './jornadaLogic.ts';
import type { QueuedOp } from './jornadaLogic.ts';

let n = 0;
const ids = () => `id-${++n}`;

test('shows_offline_badge_when_navigator_offline', () => {
  const off = connectionState(false);
  assert.equal(off.label, 'Sin conexión');
  assert.equal(off.online, false);
  assert.equal(connectionState(true).label, 'En línea');
});

test('confirming_match_links_visit_to_existing_patient', () => {
  const ops = buildConfirmOps({
    patientId: 'pat-maria',
    jornadaId: 'jor-tamazula-2026-11',
    contact: { nombre: 'Laura', parentesco: 'hija', telefono: '3411234567', consentimiento: true },
    fecha: '2026-11-21',
    newId: ids,
  });
  assert.deepEqual(ops.map((o) => o.tipo), ['contact.create', 'visit.create', 'study.create']);
  const visit = ops.find((o) => o.tipo === 'visit.create')!;
  const study = ops.find((o) => o.tipo === 'study.create')!;
  assert.equal(visit.payload.patient_id, 'pat-maria');
  assert.equal(visit.payload.jornada_id, 'jor-tamazula-2026-11');
  assert.equal(visit.payload.local_id, undefined, 'an existing patient is never re-created');
  assert.equal(study.payload.patient_id, 'pat-maria');
  assert.equal(study.payload.local_visit_id, visit.payload.local_visit_id);
  assert.equal(study.payload.tipo, 'papanicolaou');
  assert.equal(new Set(ops.map((o) => o.op_id)).size, 3);
});

test('pending_counter_drops_to_zero_after_sync', () => {
  const queue: QueuedOp[] = buildConfirmOps({
    patientId: 'pat-maria',
    jornadaId: 'jor-tamazula-2026-11',
    contact: { nombre: 'Laura', parentesco: 'hija', telefono: '3411234567', consentimiento: true },
    fecha: '2026-11-21',
    newId: ids,
  }).map((op) => ({ ...op, status: 'pending' as const }));
  assert.equal(pendingCount(queue), 3);
  const [a, b, c] = queue.map((o) => o.op_id);
  const after = applySyncResult(queue, { applied: [a, b], duplicates: [c], conflicts: [], created_patients: [] });
  assert.equal(pendingCount(after), 0);
  assert.equal(after.length, 0);
  const withConflict = applySyncResult(queue, { applied: [a, b], duplicates: [], conflicts: [{ op_id: c, reason: 'x' }], created_patients: [] });
  assert.equal(pendingCount(withConflict), 0);
  assert.equal(withConflict.length, 1, 'conflicts stay visible');
  assert.equal(withConflict[0].status, 'conflict');
});

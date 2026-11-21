import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { MATCH_THRESHOLD, findCandidates, scoreMatch } from './match.ts';
import type { MatchPatient } from './match.ts';
import { MATCH_CASES, NON_MATCH_CASES, PATIENTS } from './match.fixtures.ts';

const byId = (id: string): MatchPatient => {
  const p = PATIENTS.find((x) => x.id === id);
  assert.ok(p, `fixture ${id} missing`);
  return p;
};

const MARIA = byId('p01');

test('matches_maria_lopez_without_accents_above_threshold', () => {
  assert.equal(MARIA.nombre, 'María');
  assert.equal(MARIA.apellidos, 'López Hernández');
  assert.ok(MARIA.fecha_nacimiento.startsWith('1974'));
  assert.equal(MARIA.municipio, 'Tamazula de Gordiano');

  const r = scoreMatch({ nombre: 'Maria Lopez' }, MARIA);
  assert.ok(r.score >= MATCH_THRESHOLD, `score ${r.score} < ${MATCH_THRESHOLD}`);
  assert.ok(r.score <= 100);
  assert.ok(r.razones.length > 0, 'debe explicar el score');
  assert.ok(r.razones.every((x) => typeof x === 'string' && x.length > 5));

  const withYear = scoreMatch({ nombre: 'Maria Lopez', fecha_nacimiento: '1974', municipio: 'Tamazula' }, MARIA);
  assert.ok(withYear.score >= MATCH_THRESHOLD);
  assert.ok(withYear.razones.some((x) => /1974/.test(x)), withYear.razones.join(' | '));
  assert.ok(withYear.razones.some((x) => /municipio/i.test(x)), withYear.razones.join(' | '));

  const top = findCandidates({ nombre: 'Maria Lopez', municipio: 'Tamazula de Gordiano' }, PATIENTS);
  assert.ok(top.length >= 1);
  assert.equal(top[0].patient.id, 'p01');
});

test('matches_inverted_surnames', () => {
  const r = scoreMatch({ nombre: 'María', apellidos: 'Hernández López', fecha_nacimiento: '1974-03-08' }, MARIA);
  assert.ok(r.score >= MATCH_THRESHOLD, `score ${r.score}`);
  assert.ok(r.razones.some((x) => /orden/i.test(x)), r.razones.join(' | '));

  const rosa = scoreMatch({ nombre: 'Rosa Gomez Martinez', fecha_nacimiento: '1969-11-02' }, byId('p03'));
  assert.ok(rosa.score >= MATCH_THRESHOLD, `score ${rosa.score}`);

  const abbr = scoreMatch({ nombre: 'Ma. del Carmen Ruiz Flores' }, byId('p07'));
  assert.ok(abbr.score >= MATCH_THRESHOLD, `score ${abbr.score}`);
  assert.ok(abbr.razones.some((x) => /Ma\./.test(x)), abbr.razones.join(' | '));
});

test('matches_swapped_day_and_month_birthdate', () => {
  const p = byId('p05'); // 1972-04-10
  const swapped = scoreMatch({ nombre: 'Juana Sanchez Diaz', fecha_nacimiento: '1972-10-04' }, p);
  assert.ok(swapped.score >= MATCH_THRESHOLD, `score ${swapped.score}`);
  assert.ok(swapped.razones.some((x) => /invertid/i.test(x) && /d[ií]a/i.test(x)), swapped.razones.join(' | '));

  const slash = scoreMatch({ nombre: 'Juana Sanchez Diaz', fecha_nacimiento: '04/10/1972' }, p);
  assert.ok(slash.score >= MATCH_THRESHOLD, `dd/mm/aaaa: score ${slash.score}`);

  const exact = scoreMatch({ nombre: 'Juana Sanchez Diaz', fecha_nacimiento: '1972-04-10' }, p);
  const different = scoreMatch({ nombre: 'Juana Sanchez Diaz', fecha_nacimiento: '1995-07-22' }, p);
  assert.ok(exact.score > swapped.score, 'exacta debe pesar más que invertida');
  assert.ok(swapped.score > different.score, 'invertida debe pesar más que distinta');
  assert.ok(different.score < MATCH_THRESHOLD, `homónima con otra fecha: ${different.score}`);
});

test('does_not_match_different_person_same_surname', () => {
  const rosa = { nombre: 'Rosa López Hernández', fecha_nacimiento: '1974-03-08', municipio: 'Tamazula de Gordiano' };
  const r = scoreMatch(rosa, MARIA);
  assert.ok(r.score < MATCH_THRESHOLD, `score ${r.score}`);
  assert.ok(r.razones.some((x) => /nombre de pila/i.test(x)), r.razones.join(' | '));

  const ana = scoreMatch({ nombre: 'Ana Lopez Hernandez', fecha_nacimiento: '1980-07-15' }, MARIA);
  assert.ok(ana.score < MATCH_THRESHOLD, `Ana vs María: ${ana.score}`);

  const cands = findCandidates(rosa, PATIENTS);
  assert.ok(cands.every((c) => c.patient.id !== 'p01'), 'Rosa no debe proponer a María');
});

test('never_returns_a_merged_record', () => {
  const registry = PATIENTS.map((p) => Object.freeze({ ...p }));
  const before = JSON.stringify(registry);
  const q = { nombre: 'Maria Lopez Hernandez', fecha_nacimiento: '1974-03-08', telefono: '3419999999', municipio: 'Tamazula' };

  const cands = findCandidates(q, registry, { minScore: 0, limit: 50 });
  assert.ok(cands.length >= 2, 'con minScore 0 debe ordenar varias candidatas');
  assert.equal(JSON.stringify(registry), before, 'no muta el registro');
  for (const c of cands) {
    assert.deepEqual(Object.keys(c).sort(), ['patient', 'razones', 'score']);
    assert.ok(registry.includes(c.patient as (typeof registry)[number]), 'devuelve la misma referencia, no una copia fusionada');
    assert.notEqual(c.patient.telefono, q.telefono);
  }
  const ids = cands.map((c) => c.patient.id);
  assert.equal(new Set(ids).size, ids.length, 'cada paciente aparece una sola vez');
  for (let i = 1; i < cands.length; i++) assert.ok(cands[i - 1].score >= cands[i].score, 'ordenadas por score');
  assert.equal(cands[0].patient.id, 'p01');

  const strict = findCandidates(q, registry);
  assert.ok(strict.every((c) => c.score >= MATCH_THRESHOLD), 'por defecto solo devuelve >= umbral');
});

// Validación honesta: precisión y recall por pares (búsqueda × paciente registrada) sobre el set sintético.
after(() => {
  let tp = 0;
  let fp = 0;
  let fn = 0;
  const misses: string[] = [];
  const falsePos: string[] = [];
  for (const c of MATCH_CASES) {
    for (const p of PATIENTS) {
      const pos = scoreMatch(c.query, p).score >= MATCH_THRESHOLD;
      if (p.id === c.patientId) {
        if (pos) tp++;
        else { fn++; misses.push(`${c.patientId}(${c.variacion})`); }
      } else if (pos) { fp++; falsePos.push(`${c.patientId}->${p.id}`); }
    }
  }
  for (const c of NON_MATCH_CASES) {
    for (const p of PATIENTS) {
      if (scoreMatch(c.query, p).score >= MATCH_THRESHOLD) { fp++; falsePos.push(`${c.query.nombre}->${p.id}`); }
    }
  }
  const precision = tp + fp === 0 ? 0 : tp / (tp + fp);
  const recall = tp + fn === 0 ? 0 : tp / (tp + fn);
  const pairs = (MATCH_CASES.length + NON_MATCH_CASES.length) * PATIENTS.length;
  console.log(
    `MATCHING_METRICS pares=${pairs} umbral=${MATCH_THRESHOLD} TP=${tp} FP=${fp} FN=${fn} ` +
      `precision=${precision.toFixed(3)} recall=${recall.toFixed(3)}`,
  );
  if (misses.length) console.log(`MATCHING_FN ${misses.join(', ')}`);
  if (falsePos.length) console.log(`MATCHING_FP ${falsePos.join(', ')}`);
});

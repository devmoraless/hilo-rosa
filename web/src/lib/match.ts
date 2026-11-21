// Motor de coincidencias offline: TypeScript puro, sin dependencias, corre en el navegador sin red.
// Determinístico y explicable: devuelve {score 0-100, razones[]}. Nunca fusiona registros (ver findCandidates).
// Referencia: Fellegi-Sunter simplificado (pesos fijos por campo) + token-set ratio estilo rapidfuzz para el nombre.

export type MatchPatient = {
  id: string;
  nombre: string;
  apellidos: string;
  fecha_nacimiento: string;
  municipio?: string;
  telefono?: string;
};

/** Búsqueda: `nombre` puede traer el nombre completo ("Maria Lopez"); `apellidos` es opcional. */
export type MatchQuery = {
  nombre: string;
  apellidos?: string;
  fecha_nacimiento?: string;
  municipio?: string;
  telefono?: string;
};

export type MatchResult = { score: number; razones: string[] };
export type Candidate<P extends MatchPatient = MatchPatient> = { patient: P; score: number; razones: string[] };
export type FindOptions = { minScore?: number; limit?: number };

/** Umbral de "posible coincidencia". */
export const MATCH_THRESHOLD = 85;

/** Pesos por campo; solo cuentan los campos presentes en ambos lados. */
export const WEIGHTS = { nombre: 60, fecha: 25, municipio: 10, telefono: 10 } as const;

const PARTICLES = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'el']);
const GIVEN_NAME_PENALTY = 0.6;
const TOKEN_FUZZY_MIN = 85;

export function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** Normaliza un nombre a tokens: sin acentos, minúsculas, "Ma."/"Ma" → maria, sin de/del/la. */
export function nameTokens(s: string): string[] {
  const out: string[] = [];
  // stripAccents ya convirtió ñ → n; cualquier otro carácter (".", "-", espacios) separa tokens.
  for (const t of stripAccents(s).toLowerCase().split(/[^a-z]+/)) {
    if (!t) continue;
    if (t === 'ma') { out.push('maria'); continue; }
    if (PARTICLES.has(t)) continue;
    out.push(t);
  }
  return out;
}

export function normalizeName(s: string): string {
  return nameTokens(s).join(' ');
}

function lcsLength(a: string, b: string): number {
  if (!a.length || !b.length) return 0;
  let prev = new Array<number>(b.length + 1).fill(0);
  for (let i = 1; i <= a.length; i++) {
    const cur = new Array<number>(b.length + 1).fill(0);
    for (let j = 1; j <= b.length; j++) {
      cur[j] = a[i - 1] === b[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], cur[j - 1]);
    }
    prev = cur;
  }
  return prev[b.length];
}

/** Similitud por distancia indel normalizada (igual que rapidfuzz.fuzz.ratio), 0-100. */
export function ratio(a: string, b: string): number {
  if (!a.length && !b.length) return 100;
  return (200 * lcsLength(a, b)) / (a.length + b.length);
}

/** token_set_ratio estilo rapidfuzz sobre tokens ya normalizados, 0-100. */
export function tokenSetRatio(ta: string[], tb: string[]): number {
  const sa = new Set(ta);
  const sb = new Set(tb);
  if (!sa.size || !sb.size) return 0;
  const inter = [...sa].filter((t) => sb.has(t)).sort();
  const da = [...sa].filter((t) => !sb.has(t)).sort();
  const db = [...sb].filter((t) => !sa.has(t)).sort();
  if (inter.length && (!da.length || !db.length)) return 100;
  const t0 = inter.join(' ');
  const t1 = [t0, ...da].filter(Boolean).join(' ');
  const t2 = [t0, ...db].filter(Boolean).join(' ');
  return Math.max(t0 ? ratio(t0, t1) : 0, t0 ? ratio(t0, t2) : 0, ratio(t1, t2));
}

type YMD = { y: number; m?: number; d?: number };

/** Acepta AAAA-MM-DD, DD/MM/AAAA y solo AAAA. */
export function parseDate(s: string | undefined): YMD | null {
  if (!s) return null;
  const t = s.trim();
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(t);
  if (m) return { y: +m[1], m: +m[2], d: +m[3] };
  m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(t);
  if (m) return { y: +m[3], m: +m[2], d: +m[1] };
  m = /^(\d{4})$/.exec(t);
  if (m) return { y: +m[1] };
  return null;
}

const digits = (s: string | undefined): string => (s ?? '').replace(/\D/g, '').slice(-10);
const placeKey = (s: string | undefined): string[] => nameTokens(s ?? '');

function sameOrder(qTokens: string[], pTokens: string[]): boolean {
  const common = qTokens.filter((t) => pTokens.includes(t));
  const pOrder = pTokens.filter((t) => common.includes(t));
  return common.join(' ') === pOrder.join(' ');
}

/** Compara una búsqueda contra una paciente registrada. No modifica ninguno de los dos. */
export function scoreMatch(q: MatchQuery, p: MatchPatient): MatchResult {
  const razones: string[] = [];
  const qText = [q.nombre, q.apellidos ?? ''].join(' ').trim();
  const qTokens = nameTokens(qText);
  const pTokens = nameTokens(`${p.nombre} ${p.apellidos}`);
  const givenTokens = nameTokens(p.nombre);

  let nameSim = tokenSetRatio(qTokens, pTokens) / 100;
  const givenOk = givenTokens.some((g) => qTokens.some((t) => ratio(g, t) >= TOKEN_FUZZY_MIN));
  if (!givenOk) {
    nameSim *= GIVEN_NAME_PENALTY;
    razones.push(`Nombre de pila distinto (registrada: ${p.nombre})`);
  } else {
    razones.push(`Nombre coincide ${Math.round(nameSim * 100)}% (sin acentos ni mayúsculas)`);
    if (/\bma\b\.?/i.test(stripAccents(qText))) razones.push('«Ma.» se leyó como María');
    if (!sameOrder(qTokens, pTokens)) razones.push('Mismo nombre con palabras en otro orden (apellidos invertidos)');
    const missing = pTokens.filter((t) => !qTokens.includes(t));
    if (nameSim === 1 && missing.length) razones.push(`La búsqueda no incluye: ${missing.join(' ')}`);
  }

  let num = WEIGHTS.nombre * nameSim;
  let den: number = WEIGHTS.nombre;

  const qd = parseDate(q.fecha_nacimiento);
  const pd = parseDate(p.fecha_nacimiento);
  if (qd && pd) {
    den += WEIGHTS.fecha;
    let s = 0;
    if (qd.m === undefined || qd.d === undefined) {
      if (qd.y === pd.y) { s = 0.7; razones.push(`Mismo año de nacimiento (${pd.y})`); }
      else razones.push(`Año de nacimiento distinto (${qd.y} vs ${pd.y})`);
    } else if (qd.y === pd.y && qd.m === pd.m && qd.d === pd.d) {
      s = 1;
      razones.push('Fecha de nacimiento exacta');
    } else if (qd.y === pd.y && qd.m === pd.d && qd.d === pd.m) {
      s = 0.8;
      razones.push('Fecha de nacimiento con día y mes invertidos');
    } else {
      razones.push('Fecha de nacimiento distinta');
    }
    num += WEIGHTS.fecha * s;
  }

  if (q.municipio && p.municipio) {
    den += WEIGHTS.municipio;
    const a = placeKey(q.municipio);
    const b = placeKey(p.municipio);
    const same = a.length > 0 && (a.every((t) => b.includes(t)) || b.every((t) => a.includes(t)));
    if (same) { num += WEIGHTS.municipio; razones.push(`Mismo municipio: ${p.municipio}`); }
    else razones.push(`Municipio distinto (${p.municipio})`);
  }

  const qt = digits(q.telefono);
  const pt = digits(p.telefono);
  if (qt.length >= 7 && pt.length >= 7) {
    den += WEIGHTS.telefono;
    if (qt === pt) { num += WEIGHTS.telefono; razones.push('Mismo teléfono'); }
    else razones.push('Teléfono distinto');
  }

  const score = Math.max(0, Math.min(100, Math.round((100 * num) / den)));
  return { score, razones };
}

/**
 * Ordena candidatas por score (desc). NUNCA fusiona: cada candidata apunta al mismo objeto de entrada
 * (misma referencia, sin copiar ni mezclar campos de la búsqueda); la persona confirma "Es ella / Es otra".
 * Por defecto solo devuelve las que alcanzan MATCH_THRESHOLD.
 */
export function findCandidates<P extends MatchPatient>(
  q: MatchQuery,
  patients: readonly P[],
  opts: FindOptions = {},
): Candidate<P>[] {
  const minScore = opts.minScore ?? MATCH_THRESHOLD;
  const limit = opts.limit ?? 5;
  const seen = new Set<string>();
  const out: Candidate<P>[] = [];
  for (const patient of patients) {
    if (seen.has(patient.id)) continue;
    seen.add(patient.id);
    const { score, razones } = scoreMatch(q, patient);
    if (score >= minScore) out.push({ patient, score, razones });
  }
  out.sort((a, b) => b.score - a.score || a.patient.id.localeCompare(b.patient.id));
  return out.slice(0, limit);
}

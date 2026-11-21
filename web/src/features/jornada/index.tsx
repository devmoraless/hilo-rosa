// HR-007 · Jornada offline (capturista). Copies the locked flow screen (lib/ui/locked/JornadaLocked.tsx):
// search on the Dexie snapshot with match.ts → Es ella / Es otra → persona de confianza → Papanicolaou → credential.
// Every write goes to the outbox; it syncs on the `online` event and the counter drops to 0.
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import type { CanalAviso, SnapshotPatient, SyncResponse, TrustedContactIn } from "../../api/types";
import { getDemoRole, setDemoRole } from "../../lib/api";
import { cachedJornada, db, refreshSnapshot } from "../../lib/db";
import { findCandidates, type Candidate } from "../../lib/match";
import { allOps, autoFlush, enqueue, flush, newId } from "../../lib/outbox";
import { Button, Card, Chip, Credential, Field, PageHeader, PageLayout, SectionHeader, Stat, Stepper, useOnline } from "../../lib/ui";
import { buildConfirmOps, buildNewPatientOps, candidateMeta, pendingCount, todayLocal, type NewPatient, type QueuedOp } from "./jornadaLogic";

const JORNADA_ID = "jor-tamazula-2026-11";
const STEPS = ["Buscar", "Confirmar", "Persona de confianza", "Estudio", "Credencial"];

registerServiceWorker();

function registerServiceWorker() {
  if (!import.meta.env.PROD || typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  navigator.serviceWorker
    .register("/sw.js")
    .then(() => navigator.serviceWorker.ready)
    .then((reg) => {
      const urls = [location.pathname, ...performance.getEntriesByType("resource").map((e) => e.name)];
      reg.active?.postMessage({ type: "cache-urls", urls });
    })
    .catch(() => undefined);
}

type LocalPatient = Omit<SnapshotPatient, "telefono"> & { telefono?: string };
type Who = { kind: "existing"; patient: LocalPatient } | { kind: "new"; patient: NewPatient };
type Stage = "search" | "new" | "contact" | "study" | "done";
type Issued = { localId?: string; patientId?: string; folio?: string; qrToken?: string };

const EMPTY_CONTACT: TrustedContactIn = { nombre: "", parentesco: "", telefono: "", consentimiento: false };

export default function Jornada() {
  const online = useOnline();
  const [patients, setPatients] = useState<LocalPatient[]>([]);
  const [municipio, setMunicipio] = useState("Tamazula de Gordiano");
  const [queue, setQueue] = useState<QueuedOp[]>([]);
  const [snapshotError, setSnapshotError] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const [stage, setStage] = useState<Stage>("search");
  const [nombre, setNombre] = useState("");
  const [anio, setAnio] = useState("");
  const [who, setWho] = useState<Who | null>(null);
  const [contact, setContact] = useState<TrustedContactIn | null>(null);
  const [issued, setIssued] = useState<Issued | null>(null);

  const reloadLocal = useCallback(async () => {
    const [ps, ops, jor] = await Promise.all([db.patients.toArray(), allOps(), cachedJornada(JORNADA_ID)]);
    setPatients(ps.map((p) => ({ ...p, telefono: p.telefono ?? undefined })));
    setQueue(ops);
    if (jor) setMunicipio(jor.municipio);
  }, []);

  const onSynced = useCallback(
    (res: SyncResponse | null, err?: unknown) => {
      setSyncError(err ? "No se pudo sincronizar; se reintenta al volver la red." : null);
      if (res) {
        setIssued((cur) => {
          if (!cur?.localId) return cur;
          const made = res.created_patients.find((c) => c.local_id === cur.localId);
          return made ? { ...cur, patientId: made.id, folio: made.folio, qrToken: made.qr_token } : cur;
        });
        refreshSnapshot(JORNADA_ID).catch(() => undefined).finally(reloadLocal);
      } else void reloadLocal();
    },
    [reloadLocal],
  );

  useEffect(() => {
    if (getDemoRole() !== "capturista") setDemoRole("capturista");
    let alive = true;
    (async () => {
      if (navigator.onLine) {
        try {
          await refreshSnapshot(JORNADA_ID);
          setSnapshotError(false);
        } catch {
          setSnapshotError(true);
        }
      }
      if (!alive) return;
      await reloadLocal();
      if (navigator.onLine) flush().then((r) => onSynced(r), (e) => onSynced(null, e));
    })();
    const off = autoFlush(onSynced);
    return () => {
      alive = false;
      off();
    };
  }, [reloadLocal, onSynced]);

  const pending = pendingCount(queue);
  const conflicts = queue.filter((o) => o.status === "conflict");

  const candidates: Candidate<LocalPatient>[] = useMemo(() => {
    if (nombre.trim().length < 3) return [];
    const q = { nombre: nombre.trim(), municipio, fecha_nacimiento: /^\d{4}$/.test(anio.trim()) ? anio.trim() : undefined };
    return findCandidates(q, patients, { limit: 2 });
  }, [nombre, anio, municipio, patients]);

  const current = stage === "search" ? (candidates.length ? 1 : 0) : stage === "new" ? 1 : stage === "contact" ? 2 : stage === "study" ? 3 : 4;

  function reset() {
    setStage("search");
    setNombre("");
    setAnio("");
    setWho(null);
    setContact(null);
    setIssued(null);
  }

  async function registerStudy() {
    if (!who) return;
    const fecha = todayLocal();
    if (who.kind === "existing") {
      await enqueue(buildConfirmOps({ patientId: who.patient.id, jornadaId: JORNADA_ID, contact, fecha, newId }));
      setIssued({ patientId: who.patient.id, folio: who.patient.folio });
    } else {
      const { localId, ops } = buildNewPatientOps({ patient: who.patient, jornadaId: JORNADA_ID, contact, fecha, newId });
      await enqueue(ops);
      setIssued({ localId });
    }
    setStage("done");
    await reloadLocal();
    if (navigator.onLine) flush().then((r) => onSynced(r), (e) => onSynced(null, e));
  }

  const nameOf = (w: Who) => `${w.patient.nombre} ${w.patient.apellidos}`;

  return (
    <PageLayout
      recipe="flow"
      header={
        <PageHeader
          title={`Jornada · ${municipio}`}
          lede="Busca a la paciente antes de registrarla: si ya vino, no se duplica."
          action={
            <div className="flex flex-wrap items-center gap-2">
              {pending > 0 ? (
                <Chip tone="warn" size="md">
                  {pending} {pending === 1 ? "pendiente" : "pendientes"} de sincronizar
                </Chip>
              ) : (
                <Chip tone="neutral" size="md">
                  0 pendientes · todo sincronizado
                </Chip>
              )}
            </div>
          }
        />
      }
    >
      <Stepper steps={STEPS} current={current} />

      {snapshotError && !patients.length && (
        <Card size="sm">
          <p>No se pudo descargar la lista de la jornada. Conéctate una vez para tenerla en este equipo.</p>
        </Card>
      )}
      {syncError && (
        <Card size="sm">
          <p>{syncError}</p>
        </Card>
      )}
      {conflicts.length > 0 && (
        <Card size="sm">
          <SectionHeader size="sm" title="Revisar con coordinación" />
          <ul className="grid gap-1">
            {conflicts.map((c) => (
              <li key={c.op_id}>
                <Chip tone="bad">Conflicto</Chip> {c.reason}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {stage === "search" && (
        <>
          <Card>
            <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
              <Field
                label="Nombre de la paciente"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Nombre y apellidos"
                autoComplete="off"
                hint="Sin acentos también funciona."
              />
              <Field
                label="Año de nacimiento"
                value={anio}
                onChange={(e) => setAnio(e.target.value.replace(/\D/g, "").slice(0, 4))}
                inputMode="numeric"
                placeholder="Ej. 1974"
                autoComplete="off"
                hint="Opcional, separa homónimas."
              />
            </div>
          </Card>
          {candidates.map((c) => (
            <MatchCard
              key={c.patient.id}
              c={c}
              onYes={() => {
                setWho({ kind: "existing", patient: c.patient });
                setContact(null);
                setStage("contact");
              }}
              onNo={() => setStage("new")}
            />
          ))}
          {nombre.trim().length >= 3 && !candidates.length && (
            <Card>
              <div className="grid gap-4">
                <h3>Sin coincidencias en {municipio}</h3>
                <p>No hay ninguna paciente registrada con ese nombre. Puedes registrarla como nueva.</p>
                <Button size="lg" block onClick={() => setStage("new")}>
                  Registrar paciente nueva
                </Button>
              </div>
            </Card>
          )}
        </>
      )}

      {stage === "new" && (
        <NewPatientForm
          initialName={nombre}
          initialYear={anio}
          municipio={municipio}
          onCancel={() => setStage("search")}
          onSubmit={(p) => {
            setWho({ kind: "new", patient: p });
            setStage("contact");
          }}
        />
      )}

      {stage === "contact" && who && (
        <ContactForm
          patientName={nameOf(who)}
          onSkip={() => {
            setContact(null);
            setStage("study");
          }}
          onSubmit={(c) => {
            setContact(c);
            setStage("study");
          }}
        />
      )}

      {stage === "study" && who && (
        <Card>
          <div className="grid gap-4">
            <SectionHeader title="Estudio de hoy" />
            <p>
              <b>{nameOf(who)}</b>
              {contact ? ` · persona de confianza: ${contact.nombre} (${contact.parentesco})` : " · sin persona de confianza"}
            </p>
            <p>Papanicolaou · {formatDate(todayLocal())}</p>
            <Button size="lg" block onClick={registerStudy}>
              Registrar Papanicolaou
            </Button>
            <Button variant="quiet" onClick={() => setStage("contact")}>
              Volver
            </Button>
          </div>
        </Card>
      )}

      {stage === "done" && who && issued && (
        <IssuedCard who={who} issued={issued} pending={pending} online={online} onNext={reset} />
      )}
    </PageLayout>
  );
}

function MatchCard({ c, onYes, onNo }: { c: Candidate<LocalPatient>; onYes: () => void; onNo: () => void }) {
  return (
    <Card>
      <div className="hr-match">
        <div className="hr-match-head">
          <span className="hr-match-score display">{c.score}%</span>
          <div>
            <h3>
              Posible coincidencia: {c.patient.nombre} {c.patient.apellidos}
            </h3>
            <p className="hr-match-meta">{candidateMeta(c.patient)}</p>
          </div>
        </div>
        <div className="hr-match-why">
          {c.razones.map((r, i) => (
            <Chip key={r} tone={i === 0 ? "brand" : "neutral"}>
              {r}
            </Chip>
          ))}
        </div>
        <div className="hr-match-actions">
          <Button size="lg" onClick={onYes}>
            Es ella
          </Button>
          <Button size="lg" variant="secondary" onClick={onNo}>
            Es otra
          </Button>
        </div>
      </div>
    </Card>
  );
}

function splitName(full: string): { nombre: string; apellidos: string } {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 2) return { nombre: parts[0] ?? "", apellidos: parts.slice(1).join(" ") };
  return { nombre: parts.slice(0, parts.length - 2).join(" "), apellidos: parts.slice(-2).join(" ") };
}

function NewPatientForm({
  initialName,
  initialYear,
  municipio,
  onCancel,
  onSubmit,
}: {
  initialName: string;
  initialYear: string;
  municipio: string;
  onCancel: () => void;
  onSubmit: (p: NewPatient) => void;
}) {
  const split = splitName(initialName);
  const [nombre, setNombre] = useState(split.nombre);
  const [apellidos, setApellidos] = useState(split.apellidos);
  const [fecha, setFecha] = useState(initialYear.length === 4 ? `${initialYear}-01-01` : "");
  const [telefono, setTelefono] = useState("");
  const [propio, setPropio] = useState(false);
  const [canal, setCanal] = useState<CanalAviso>("sms");
  const ok = nombre.trim() && apellidos.trim() && /^\d{4}-\d{2}-\d{2}$/.test(fecha);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!ok) return;
    onSubmit({
      nombre: nombre.trim(),
      apellidos: apellidos.trim(),
      fecha_nacimiento: fecha,
      municipio,
      telefono: telefono.trim() || undefined,
      telefono_propio: propio,
      canal_aviso: canal,
    });
  }

  return (
    <Card>
      <form className="grid gap-4" onSubmit={submit}>
        <SectionHeader title="Paciente nueva" />
        <Field label="Nombre(s)" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
        <Field label="Apellidos" value={apellidos} onChange={(e) => setApellidos(e.target.value)} required />
        <Field label="Fecha de nacimiento" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
        <Field label="Teléfono" type="tel" inputMode="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} hint="Opcional." />
        <label className="flex items-center gap-3">
          <input type="checkbox" className="h-6 w-6" checked={propio} onChange={(e) => setPropio(e.target.checked)} />
          El teléfono es suyo (no compartido)
        </label>
        <Field label="¿Cómo le avisamos que su resultado está listo?">
          {(id) => (
            <select id={id} value={canal} onChange={(e) => setCanal(e.target.value as CanalAviso)}>
              <option value="sms">Mensaje de texto (SMS)</option>
              <option value="telegram">Telegram</option>
              <option value="en_persona">En persona</option>
            </select>
          )}
        </Field>
        <Button type="submit" size="lg" block disabled={!ok}>
          Guardar y seguir
        </Button>
        <Button variant="quiet" onClick={onCancel}>
          Volver a buscar
        </Button>
      </form>
    </Card>
  );
}

function ContactForm({ patientName, onSkip, onSubmit }: { patientName: string; onSkip: () => void; onSubmit: (c: TrustedContactIn) => void }) {
  const [c, setC] = useState<TrustedContactIn>(EMPTY_CONTACT);
  const ok = c.nombre.trim() && c.parentesco.trim() && c.telefono.replace(/\D/g, "").length >= 10 && c.consentimiento;

  function submit(e: FormEvent) {
    e.preventDefault();
    if (ok) onSubmit({ ...c, nombre: c.nombre.trim(), parentesco: c.parentesco.trim(), telefono: c.telefono.trim() });
  }

  return (
    <Card>
      <form className="grid gap-4" onSubmit={submit}>
        <SectionHeader title="Persona de confianza" />
        <p>Quién puede recibir el aviso y abrir el resultado de {patientName}.</p>
        <Field label="Nombre" value={c.nombre} onChange={(e) => setC({ ...c, nombre: e.target.value })} autoComplete="off" />
        <Field label="Parentesco" value={c.parentesco} onChange={(e) => setC({ ...c, parentesco: e.target.value })} placeholder="Ej. hija" autoComplete="off" />
        <Field
          label="Teléfono"
          type="tel"
          inputMode="tel"
          value={c.telefono}
          onChange={(e) => setC({ ...c, telefono: e.target.value })}
          hint="10 dígitos."
          autoComplete="off"
        />
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            className="mt-1 h-6 w-6 shrink-0"
            checked={c.consentimiento}
            onChange={(e) => setC({ ...c, consentimiento: e.target.checked })}
          />
          <span>La paciente autoriza que esta persona reciba el aviso y vea su resultado.</span>
        </label>
        <Button type="submit" size="lg" block disabled={!ok}>
          Guardar y seguir
        </Button>
        <Button variant="quiet" onClick={onSkip}>
          Seguir sin persona de confianza
        </Button>
      </form>
    </Card>
  );
}

function IssuedCard({ who, issued, pending, online, onNext }: { who: Who; issued: Issued; pending: number; online: boolean; onNext: () => void }) {
  const synced = pending === 0 && (who.kind === "existing" || !!issued.qrToken);
  const png = useCredentialPng(synced && who.kind === "existing" ? issued.patientId : undefined);
  const name = `${who.patient.nombre} ${who.patient.apellidos}`;

  return (
    <Card>
      <div className="grid justify-items-center gap-4 text-center">
        <SectionHeader title={synced ? "Credencial lista" : "Guardado en este equipo"} />
        {!synced && (
          <>
            <p>
              El registro de <b>{name}</b> está guardado. {online ? "Enviando…" : "Se enviará solo cuando vuelva la red."}
            </p>
          </>
        )}
        {synced && issued.qrToken && issued.folio && (
          <Credential folio={issued.folio} qrValue={`${location.origin}/p/${issued.qrToken}`} motion="flip" note={name} />
        )}
        {synced && who.kind === "existing" && (
          <>
            {png ? (
              <div className="hr-cred-stage"><img src={png} alt={`Credencial de ${name}, folio ${issued.folio}, con código QR`} className="block w-full rounded-[var(--r-lg)] shadow-[var(--shadow)]" /></div>
            ) : (
              <Stat value={issued.folio} label="Folio" />
            )}
            <p>Folio {issued.folio}: es el mismo de su visita anterior. Entrégale su credencial.</p>
          </>
        )}
        <Button size="lg" block onClick={onNext} disabled={!synced && online}>
          Siguiente paciente
        </Button>
      </div>
    </Card>
  );
}

/** credential.png needs the X-Demo-Role header, so it is fetched as a blob and shown through an object URL. */
function useCredentialPng(patientId: string | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!patientId) return;
    let objectUrl: string | null = null;
    let alive = true;
    fetch(`/api/patients/${encodeURIComponent(patientId)}/credential.png`, { headers: { "X-Demo-Role": getDemoRole() } })
      .then((r) => (r.ok ? r.blob() : null))
      .then((b) => {
        if (!b || !alive) return;
        objectUrl = URL.createObjectURL(b);
        setUrl(objectUrl);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [patientId]);
  return patientId ? url : null;
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
}

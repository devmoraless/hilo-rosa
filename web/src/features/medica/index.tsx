// HR-009 · Médica (recipe: dashboard). Kanban Por revisar → Autorizado → Notificado → Visto, a "Llamar" list for
// high-priority cases, and the capture panel (paper numbering: 21 firma, 22 BIRADS, 23 conducta).
import { useCallback, useEffect, useState } from "react";
import type { AuthorizeRequest, AuthorizeResponse, Bethesda, NotificationOut, ResultOut, ResultState } from "../../api/types";
import { ApiError, api, postJson, setDemoRole } from "../../lib/api";
import { Button, Card, Chip, Field, KanbanColumn, PageHeader, PageLayout, SectionHeader, Stat } from "../../lib/ui";
import Bitacora from "./Bitacora";
import "./medica.css";

interface Task {
  id: string;
  tipo: string;
  result_id: string | null;
  paciente_nombre: string | null;
  folio: string | null;
}

interface Preview {
  clasificacion: string;
  prioridad: string;
  explicacion_clara: string | null;
  tareas: string[];
}

const COLUMNS: Array<{ estado: ResultState; title: string }> = [
  { estado: "por_revisar", title: "Por revisar" },
  { estado: "autorizado", title: "Autorizado" },
  { estado: "notificado", title: "Notificado" },
  { estado: "visto", title: "Visto" },
];

const BETHESDA: Array<{ value: Bethesda; label: string }> = [
  { value: "NILM", label: "NILM · negativo para lesión" },
  { value: "ASC-US", label: "ASC-US" },
  { value: "LSIL", label: "LSIL" },
  { value: "ASC-H", label: "ASC-H" },
  { value: "HSIL", label: "HSIL" },
  { value: "AGC", label: "AGC" },
  { value: "insatisfactoria", label: "Muestra insatisfactoria" },
];
const CONDUCTA_PAP = [
  { value: "rutina", label: "Rutina en 1 año" },
  { value: "repetir", label: "Repetir muestra" },
  { value: "colposcopia", label: "Referencia a colposcopia" },
];
const CONDUCTA_MAMA = [
  { value: "1", label: "1 · Rutina en 1 año" },
  { value: "2", label: "2 · Mastografía de tamizaje" },
  { value: "3", label: "3 · Imagen complementaria" },
  { value: "4", label: "4 · Evaluación en 6 meses" },
];
const ESTUDIO: Record<string, string> = {
  papanicolaou: "Papanicolaou",
  ultrasonido: "Ultrasonido mamario",
  mastografia: "Mastografía",
  nutricion: "Nutrición",
};

const isPap = (r: ResultOut) => r.tipo_estudio === "papanicolaou";

export default function Medica() {
  const [results, setResults] = useState<ResultOut[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [feed, setFeed] = useState<NotificationOut[]>([]);
  const [selected, setSelected] = useState<ResultOut | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const [r, t, n] = await Promise.all([
        api<ResultOut[]>("/review/results"),
        api<Task[]>("/review/tasks?tipo=llamar"),
        api<NotificationOut[]>("/notifications"),
      ]);
      setResults(r);
      setTasks(t);
      setFeed(n);
      setError(null);
      setLoaded(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No pudimos cargar los resultados.");
    }
  }, []);

  useEffect(() => {
    setDemoRole("medica");
    load();
  }, [load]);

  const byState = (estado: ResultState) => results.filter((r) => r.estado === estado);
  const pending = byState("por_revisar").length;

  return (
    <div className="md-page">
      <PageLayout
        recipe="dashboard"
        header={
          <>
            <PageHeader
              title="Médica · revisión"
              lede="Abre el PDF, captura el resultado y autoriza con tu cédula. La paciente recibe solo un aviso, nunca el diagnóstico."
              action={
                <div className="md-summary">
                  <Stat value={pending} label="por revisar" size="sm" />
                  <Stat value={tasks.length} label="por llamar" size="sm" />
                  <Stat value={byState("notificado").length + byState("visto").length} label="avisos enviados" size="sm" />
                </div>
              }
            />
            {error && (
              <p className="md-error" role="alert">
                {error}
              </p>
            )}
          </>
        }
      >
        {COLUMNS.map((col) => {
          const items = byState(col.estado);
          return (
            <KanbanColumn key={col.estado} title={col.title} count={items.length}>
              {items.length === 0 && <p className="md-col-empty">{loaded ? (col.estado === "por_revisar" ? "Nada pendiente. Los PDFs del laboratorio llegan aquí." : "Sin resultados") : "Cargando…"}</p>}
              {items.map((r) => (
                <ResultCard key={r.id} r={r} active={selected?.id === r.id} onOpen={() => setSelected(r)} />
              ))}
            </KanbanColumn>
          );
        })}
      </PageLayout>

      {(tasks.length > 0 || feed.length > 0) && (
        <div className="hr-page md-below">
          {tasks.length > 0 && (
            <Card className="md-calls">
              <SectionHeader title="Llamar antes de avisar" size="sm" action={<Chip tone="bad">{tasks.length}</Chip>} />
              <p className="md-muted">Prioridad alta: no se envía aviso automático. EIRA llama a la paciente primero.</p>
              <ul className="md-call-list">
                {tasks.map((t) => (
                  <li key={t.id}>
                    <span className="md-call-name">{t.paciente_nombre}</span>
                    <span className="hr-mono">{t.folio}</span>
                    <Chip tone="bad">Llamar</Chip>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {feed.length > 0 && (
            <section className="md-feed" aria-label="Avisos enviados">
              <SectionHeader title="Avisos enviados sin diagnóstico" size="sm" />
              <ul>
                {feed.slice(0, 4).map((n) => (
                  <li key={n.id}>
                    <Chip tone="ok">{n.canal === "telegram" ? "Telegram" : "SMS simulado"}</Chip>
                    <span className="md-feed-to">{n.destino_enmascarado}</span>
                    <span className="md-feed-msg">“{n.mensaje}”</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      <div className="hr-page" style={{ paddingTop: 0 }}>
        <Bitacora />
      </div>

      {selected && (
        <CapturePanel
          key={selected.id}
          result={selected}
          onClose={() => setSelected(null)}
          onDone={(res) => {
            setSelected(res.result);
            load();
          }}
        />
      )}
    </div>
  );
}

function ResultCard({ r, active, onOpen }: { r: ResultOut; active: boolean; onOpen: () => void }) {
  return (
    <button type="button" className={`md-card${active ? " md-card--active" : ""}`} onClick={onOpen} aria-pressed={active}>
      <span className="md-card-name">{r.paciente_nombre ?? "Sin paciente"}</span>
      <span className="md-card-meta">
        <span className="hr-mono">{r.folio_detectado ?? "Sin folio"}</span> · {ESTUDIO[r.tipo_estudio] ?? r.tipo_estudio}
      </span>
      {r.prioridad === "alta" && <Chip tone="bad">Prioridad alta · llamar</Chip>}
      {r.estado === "notificado" && <Chip tone="ok">Aviso enviado</Chip>}
      {r.estado === "visto" && r.visto_por && <Chip tone="ok">Visto por {r.visto_por}</Chip>}
    </button>
  );
}

function CapturePanel({ result, onClose, onDone }: { result: ResultOut; onClose: () => void; onDone: (r: AuthorizeResponse) => void }) {
  const pap = isPap(result);
  const editable = result.estado === "por_revisar";
  const [bethesda, setBethesda] = useState<Bethesda>(result.bethesda ?? "NILM");
  const [birads, setBirads] = useState<string>(result.birads != null ? String(result.birads) : "1");
  const [conducta, setConducta] = useState<string>(result.conducta ?? (pap ? "rutina" : "1"));
  const [nombre, setNombre] = useState(result.autorizado_por_nombre ?? "");
  const [cedula, setCedula] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<AuthorizeResponse | null>(null);

  useEffect(() => {
    if (!editable) return;
    const body = pap
      ? { tipo_estudio: result.tipo_estudio, bethesda, conducta }
      : { tipo_estudio: result.tipo_estudio, birads: Number(birads), conducta };
    postJson<Preview>("/review/preview", body)
      .then(setPreview)
      .catch(() => setPreview(null));
  }, [editable, pap, result.tipo_estudio, bethesda, birads, conducta]);

  const canSubmit = editable && nombre.trim() !== "" && cedula.trim() !== "" && !sending;

  async function authorize() {
    setSending(true);
    setError(null);
    const body: AuthorizeRequest = pap
      ? { bethesda, conducta, nombre: nombre.trim(), cedula: cedula.trim() }
      : { birads: Number(birads), conducta, nombre: nombre.trim(), cedula: cedula.trim() };
    try {
      const res = await postJson<AuthorizeResponse>(`/results/${result.id}/authorize`, body);
      setDone(res);
      onDone(res);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo autorizar. Intenta de nuevo.");
    } finally {
      setSending(false);
    }
  }

  const alta = (done?.result.prioridad ?? preview?.prioridad) === "alta";
  const texto = done ? done.result.explicacion_clara : editable ? preview?.explicacion_clara : result.explicacion_clara;

  return (
    <div className="md-sheet-backdrop" onClick={onClose}>
      <aside className="md-sheet" aria-label="Captura del resultado" onClick={(e) => e.stopPropagation()}>
        <header className="md-sheet-head">
          <div>
            <h2>{result.paciente_nombre}</h2>
            <p className="md-muted">
              <span className="hr-mono">{result.folio_detectado}</span> · {ESTUDIO[result.tipo_estudio] ?? result.tipo_estudio}
            </p>
          </div>
          <Button variant="quiet" size="sm" onClick={onClose} aria-label="Cerrar">
            Cerrar
          </Button>
        </header>

        <a className="md-pdf" href={`/api/results/${result.id}/pdf`} target="_blank" rel="noreferrer">
          Abrir PDF del laboratorio
          <span className="md-muted">{result.pdf_nombre}</span>
        </a>

        {editable && !done ? (
          <form
            className="md-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (canSubmit) authorize();
            }}
          >
            {pap ? (
              <>
                <Field label="Resultado (Bethesda)">
                  {(id) => (
                    <select id={id} value={bethesda} onChange={(e) => setBethesda(e.target.value as Bethesda)}>
                      {BETHESDA.map((b) => (
                        <option key={b.value} value={b.value}>
                          {b.label}
                        </option>
                      ))}
                    </select>
                  )}
                </Field>
                <Field label="Conducta a seguir">
                  {(id) => (
                    <select id={id} value={conducta} onChange={(e) => setConducta(e.target.value)}>
                      {CONDUCTA_PAP.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  )}
                </Field>
              </>
            ) : (
              <>
                <Field label="BIRADS" num={22}>
                  {(id) => (
                    <select id={id} value={birads} onChange={(e) => setBirads(e.target.value)}>
                      {[0, 1, 2, 3, 4, 5].map((b) => (
                        <option key={b} value={b}>
                          BIRADS {b}
                        </option>
                      ))}
                    </select>
                  )}
                </Field>
                <Field label="Conducta a seguir" num={23}>
                  {(id) => (
                    <select id={id} value={conducta} onChange={(e) => setConducta(e.target.value)}>
                      {CONDUCTA_MAMA.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  )}
                </Field>
              </>
            )}

            <PlainText alta={alta} texto={texto} />

            <Field label="Nombre de quien autoriza" num={21} value={nombre} onChange={(e) => setNombre(e.target.value)} autoComplete="name" required />
            <Field label="Cédula profesional" num={21} value={cedula} onChange={(e) => setCedula(e.target.value)} inputMode="numeric" required hint="Queda en la bitácora como tu firma." />
            {error && (
              <p className="md-error" role="alert">
                {error}
              </p>
            )}
            <Button type="submit" size="lg" block disabled={!canSubmit}>
              {sending ? "Autorizando…" : "Autorizar"}
            </Button>
          </form>
        ) : (
          <div className="md-form">
            <PlainText alta={alta || result.prioridad === "alta"} texto={texto} />
            {(done?.result.autorizado_por_nombre ?? result.autorizado_por_nombre) && (
              <p className="md-muted">Autorizado por {done?.result.autorizado_por_nombre ?? result.autorizado_por_nombre}</p>
            )}
            {done?.notification && (
              <div className="md-sent" role="status">
                <strong>Aviso enviado sin diagnóstico</strong>
                <span>
                  {done.notification.canal === "telegram" ? "Telegram" : "SMS simulado"} a {done.notification.destino_enmascarado}
                </span>
                <span className="md-feed-msg">“{done.notification.mensaje}”</span>
              </div>
            )}
            {done && !done.notification && (
              <div className="md-call" role="status">
                <strong>No se envió aviso</strong>
                <span>Se creó la tarea “Llamar” a la paciente antes de mostrarle el resultado.</span>
              </div>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}

function PlainText({ alta, texto }: { alta: boolean; texto: string | null | undefined }) {
  return (
    <div className={`md-plain${alta ? " md-plain--alta" : ""}`}>
      <span className="md-plain-label">Lo que leerá la paciente</span>
      {alta ? <p>Sin texto automático: prioridad alta, EIRA llama antes de mostrar el resultado.</p> : <p>{texto ?? "…"}</p>}
    </div>
  );
}

// HR-008 · Laboratorio (recipe: list). Hero: the drop zone + the "Sin asociar" tray.
// The lab only sees file, folio and state; a PDF without a readable folio waits in the tray until someone
// types the folio from the sample's label (or, as médica, accepts the suggestion).
import { CheckCircle, WarningCircle } from "@phosphor-icons/react";
import { useCallback, useEffect, useRef, useState, type DragEvent, type FormEvent } from "react";
import type { ResultOut, ResultState, UploadResponse } from "../../api/types";
import { ApiError, api, getDemoRole, postJson } from "../../lib/api";
import { Button, Card, Chip, Field, PageHeader, PageLayout, SectionHeader, Stat, type Tone } from "../../lib/ui";

const STATE: Record<ResultState, { label: string; tone: Tone }> = {
  pendiente_asociar: { label: "Sin asociar", tone: "warn" },
  por_revisar: { label: "Asociado · por revisar", tone: "ok" },
  autorizado: { label: "Autorizado", tone: "brand" },
  notificado: { label: "Notificado", tone: "brand" },
  visto: { label: "Visto", tone: "ok" },
};

function message(err: unknown): string {
  if (err instanceof ApiError && err.status === 403) return "Entra como Laboratorio en el selector de arriba para subir resultados.";
  if (err instanceof ApiError) return err.message;
  return "No pudimos hablar con el servidor. Revisa la conexión y vuelve a intentar.";
}

function TrayItem({ result, onDone }: { result: ResultOut; onDone: (r: ResultOut) => void }) {
  const [folio, setFolio] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function associate(ref: string) {
    setBusy(true);
    setError(null);
    try {
      onDone(await postJson<ResultOut>(`/results/${result.id}/associate`, { patient_id: ref }));
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (folio.trim()) void associate(folio);
  }

  return (
    <form className="hr-tray-item" onSubmit={submit}>
      <p className="hr-tray-file">{result.pdf_nombre}</p>
      <p className="hr-tray-hint">El PDF no trae un folio legible. Escríbelo desde la etiqueta del frasco.</p>
      {result.sugerencia_nombre && result.sugerencia_patient_id && (
        <Button variant="secondary" block disabled={busy} onClick={() => void associate(result.sugerencia_patient_id!)}>
          Asociar a {result.sugerencia_nombre}
        </Button>
      )}
      <Field
        label="Folio de la paciente"
        placeholder="EIRA-0000"
        value={folio}
        autoCapitalize="characters"
        onChange={(e) => setFolio(e.target.value)}
        hint={error ?? undefined}
      />
      <Button type="submit" block disabled={busy || !folio.trim()}>
        Asociar
      </Button>
    </form>
  );
}

export default function Laboratorio() {
  const [results, setResults] = useState<ResultOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      setResults(await api<ResultOut[]>("/results"));
      setError(null);
    } catch (err) {
      setError(message(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function send(files: FileList | File[] | null) {
    const pdfs = Array.from(files ?? []);
    if (!pdfs.length) return;
    const body = new FormData();
    pdfs.forEach((f) => body.append("files", f));
    setBusy(true);
    try {
      const res = await api<UploadResponse>("/results/upload", { method: "POST", body });
      const fresh = new Set(res.results.map((r) => r.id));
      setResults((prev) => [...prev.filter((r) => !fresh.has(r.id)), ...res.results]);
      setError(null);
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  function drop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    void send(e.dataTransfer.files);
  }

  const replace = (next: ResultOut) => setResults((prev) => prev.map((r) => (r.id === next.id ? next : r)));
  const pending = results.filter((r) => r.estado === "pendiente_asociar");
  const linked = results.length - pending.length;
  const asMedica = getDemoRole() === "medica";

  return (
    <PageLayout
      recipe="list"
      header={
        <PageHeader
          title="Laboratorio · resultados"
          lede="Arrastra los PDFs. Se asocian solos por folio; los demás esperan en la bandeja."
          action={<Chip tone="brand">Datos de ejemplo</Chip>}
        />
      }
      aside={
        <Card>
          <SectionHeader title="Sin asociar" size="sm" action={<Chip tone={pending.length ? "warn" : "ok"}>{pending.length}</Chip>} />
          {pending.length === 0 ? (
            <p className="hr-tray-hint">Nada pendiente: cada PDF quedó con su paciente.</p>
          ) : (
            pending.map((r) => <TrayItem key={r.id} result={r} onDone={replace} />)
          )}
          {asMedica && pending.length > 0 && <p className="hr-tray-hint">Como médica ves la sugerencia por nombre y municipio.</p>}
        </Card>
      }
    >
      <div
        className="hr-drop"
        role="button"
        tabIndex={0}
        aria-label="Zona para soltar PDFs"
        aria-busy={busy}
        data-dragging={dragging || undefined}
        onClick={() => input.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            input.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={drop}
      >
        <span className="display">{busy ? "Subiendo…" : dragging ? "Suéltalos aquí" : "Suelta aquí los PDFs"}</span>
        <span>o elige archivos desde la computadora</span>
        <input ref={input} type="file" accept="application/pdf" multiple hidden onChange={(e) => void send(e.target.files)} />
      </div>
      {error && (
        <p className="hr-tray-hint" role="alert">
          <WarningCircle size={20} weight="bold" aria-hidden="true" /> {error}
        </p>
      )}
      <div className="hr-lab-stats">
        <Stat value={results.length} label="PDFs subidos" size="sm" />
        <Stat value={linked} label="asociados" size="sm" />
        <Stat value={pending.length} label="por asociar a mano" size="sm" />
      </div>
      <Card>
        <SectionHeader title="Subidos" size="sm" />
        {loading ? (
          <p className="hr-tray-hint" aria-busy="true">Cargando resultados…</p>
        ) : results.length === 0 ? (
          <div className="hr-empty">
            <h2>Todavía no hay PDFs</h2>
            <p>Arrastra los resultados del día a la zona de arriba.</p>
          </div>
        ) : (
          <table className="hr-table">
            <thead>
              <tr>
                <th scope="col">Archivo</th>
                <th scope="col">Folio</th>
                <th scope="col">Estado</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr key={r.id}>
                  <td>{r.pdf_nombre}</td>
                  <td className="hr-mono">{r.folio_detectado ?? "Sin folio legible"}</td>
                  <td>
                    <Chip tone={STATE[r.estado].tone}>
                      {r.estado !== "pendiente_asociar" && <CheckCircle size={16} weight="bold" aria-hidden="true" />} {STATE[r.estado].label}
                    </Chip>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </PageLayout>
  );
}

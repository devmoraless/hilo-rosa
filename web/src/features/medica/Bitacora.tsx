// HR-015 · Bitácora con integridad (demo paso 6). GET /api/audit as médica; newest first; hash chain visible.
import { useCallback, useEffect, useState } from "react";
import type { AuditResponse } from "../../api/types";
import { ApiError, api, setDemoRole } from "../../lib/api";
import { Button, Card, Chip, SectionHeader } from "../../lib/ui";
import { actionLabel, integritySeal, newestFirst, short, timeLabel } from "./bitacoraLogic";

const ROL: Record<string, string> = {
  medica: "Médica",
  notifier: "Sistema de avisos",
  capturista: "Capturista",
  laboratorio: "Laboratorio",
  contacto: "Familiar",
  paciente: "Paciente",
};

const CSS = `
.bt { display: grid; gap: var(--sp-4); min-width: 0; }
.bt-seal { border-radius: var(--r-md); padding: var(--sp-4) var(--sp-5); font-size: var(--fs-3); font-weight: 700; line-height: 1.25; overflow-wrap: anywhere; }
.bt-seal--ok { background: color-mix(in srgb, var(--ok) 12%, var(--surface)); color: var(--ok); border: 2px solid var(--ok); }
.bt-seal--bad { background: color-mix(in srgb, var(--bad) 10%, var(--surface)); color: var(--bad); border: 2px solid var(--bad); }
.bt-seal small { display: block; font-size: var(--fs-1); font-weight: 400; color: var(--text-2); margin-top: var(--sp-1); }
.bt-list { list-style: none; margin: 0; padding: 0; display: grid; }
.bt-row { display: grid; grid-template-columns: 7.5em minmax(0, 1fr) auto; gap: var(--sp-2) var(--sp-4); align-items: baseline; padding: var(--sp-3) 0; border-top: 1px solid var(--line); }
.bt-row--bad { background: color-mix(in srgb, var(--bad) 8%, transparent); border-left: 4px solid var(--bad); padding-left: var(--sp-3); }
.bt-when { color: var(--text-2); font-size: var(--fs-1); font-variant-numeric: tabular-nums; }
.bt-what { min-width: 0; overflow-wrap: anywhere; }
.bt-what strong { display: block; font-weight: 600; }
.bt-who { color: var(--text-2); font-size: var(--fs-1); }
.bt-chain { font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: var(--fs-1); color: var(--text-2); white-space: nowrap; }
.bt-chain b { color: var(--text); font-weight: 600; }
.bt-empty { color: var(--text-2); }
.bt-error { color: var(--bad); }
@media (max-width: 640px) {
  .bt-row { grid-template-columns: minmax(0, 1fr); gap: var(--sp-1); }
  .bt-chain { white-space: normal; overflow-wrap: anywhere; }
  .bt-seal { font-size: var(--fs-2); padding: var(--sp-3) var(--sp-4); }
}
`;

export default function Bitacora() {
  const [data, setData] = useState<AuditResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setDemoRole("medica");
    try {
      setData(await api<AuditResponse>("/audit"));
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No pudimos cargar la bitácora.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const seal = data ? integritySeal(data) : null;
  const rows = data ? newestFirst(data.entries) : [];

  return (
    <Card className="bt-card">
      <style>{CSS}</style>
      <section className="bt" aria-label="Bitácora">
        <SectionHeader
          title="Bitácora"
          size="sm"
          action={
            <Button variant="secondary" size="sm" onClick={load} disabled={loading}>
              {loading ? "Actualizando…" : "Actualizar"}
            </Button>
          }
        />
        {seal && (
          <div className={`bt-seal ${seal.ok ? "bt-seal--ok" : "bt-seal--bad"}`} role="status">
            {seal.text}
            <small>
              {rows.length} {rows.length === 1 ? "registro" : "registros"} · cada uno guarda el hash del anterior
            </small>
          </div>
        )}
        {error && (
          <p className="bt-error" role="alert">
            {error}
          </p>
        )}
        {data && rows.length === 0 && <p className="bt-empty">Aún no hay registros.</p>}
        {!data && !error && <p className="bt-empty">Cargando…</p>}
        {rows.length > 0 && (
          <ol className="bt-list">
            {rows.map(({ n, entry }) => {
              const bad = seal?.badIndex === n - 1;
              return (
                <li key={entry.id} className={`bt-row${bad ? " bt-row--bad" : ""}`}>
                  <span className="bt-when">
                    #{n} · <time dateTime={entry.ts}>{timeLabel(entry.ts)}</time>
                  </span>
                  <span className="bt-what">
                    <strong>{actionLabel(entry)}</strong>
                    <span className="bt-who">
                      {entry.actor} · {ROL[entry.rol] ?? entry.rol}
                    </span>
                    {bad && (
                      <>
                        {" "}
                        <Chip tone="bad">Alterado</Chip>
                      </>
                    )}
                  </span>
                  <span className="bt-chain" title={`hash ${entry.hash} · previo ${entry.prev_hash}`}>
                    previo {short(entry.prev_hash)} → <b>{short(entry.hash)}</b>
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </Card>
  );
}

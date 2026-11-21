import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import { FilePdf, Scan, SpeakerHigh } from "@phosphor-icons/react";
import type { AccessIdentity, AccessStartResponse, AccessVerifyResponse, PatientResultView } from "../../api/types";
import { api, postJson, setAccessSession } from "../../lib/api";
import { Button, Card, Field, PageHeader, PageLayout, Stepper } from "../../lib/ui";
import "./style.css";

export default function AccesoView() {
  const { token = "" } = useParams();
  return <AccesoFlow key={token} token={token} />;
}

function AccesoFlow({ token }: { token: string }) {
  const navigate = useNavigate();
  const [identity, setIdentity] = useState<AccessIdentity | null>(null);
  const [viewer, setViewer] = useState<string | null>(null);
  const [birthdate, setBirthdate] = useState("");
  const [challenge, setChallenge] = useState<AccessStartResponse | null>(null);
  const [code, setCode] = useState("");
  const [results, setResults] = useState<PatientResultView[] | null>(null);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [canSpeak] = useState(() => "speechSynthesis" in window);
  const requestVersion = useRef(0);

  useEffect(() => {
    let active = true;
    requestVersion.current += 1;
    setAccessSession(null);
    api<AccessIdentity>(`/access/token/${encodeURIComponent(token)}`)
      .then((value) => { if (active) setIdentity(value); })
      .catch((reason) => { if (active) setError(reason.message); });
    return () => { active = false; requestVersion.current += 1; setAccessSession(null); window.speechSynthesis?.cancel(); };
  }, [token]);

  useEffect(() => {
    if (!scanning) return;
    const scanner = new Html5Qrcode("access-qr");
    let stopped = false;
    const start = scanner.start({ facingMode: "environment" }, { fps: 10, qrbox: 220 }, (text) => {
      try {
        const url = new URL(text, window.location.origin);
        if (!/^\/p\/[^/]+$/.test(url.pathname)) throw new Error("Credencial no válida");
        setScanning(false);
        navigate(url.pathname);
      } catch { setError("Este QR no es una credencial. Escanea el de EIRA."); }
    }, () => {});
    start.then(() => { if (stopped) void scanner.stop().then(() => scanner.clear()); })
      .catch(() => { if (!stopped) { setError("No pudimos abrir la cámara. Usa el enlace de tu credencial."); setScanning(false); } });
    return () => { stopped = true; if (scanner.isScanning) void scanner.stop().then(() => scanner.clear()); };
  }, [scanning, navigate]);

  async function run(action: () => Promise<void>) {
    const version = requestVersion.current;
    setBusy(true); setError("");
    try { await action(); } catch (reason) { if (version === requestVersion.current) setError(reason instanceof Error ? reason.message : "No pudimos conectar. Intenta de nuevo."); }
    finally { if (version === requestVersion.current) setBusy(false); }
  }

  function send(event: FormEvent) {
    event.preventDefault();
    void run(async () => {
      const next = await postJson<AccessStartResponse>("/access/start", { token, quien: viewer === "paciente" ? "paciente" : "contacto", contacto_id: viewer === "paciente" ? null : viewer, fecha_nacimiento: birthdate });
      setChallenge(next); setCode("");
    });
  }

  async function loadResults() { setResults(await api<PatientResultView[]>("/access/me/results")); }

  function verify(event: FormEvent) {
    event.preventDefault();
    void run(async () => {
      const session = await postJson<AccessVerifyResponse>("/access/verify", { challenge_id: challenge?.challenge_id, codigo: code });
      setAccessSession(session.session_token); setVerified(true);
      await loadResults();
    });
  }

  const step = verified ? 3 : challenge ? 2 : viewer ? 1 : 0;
  return (
    <PageLayout recipe="flow" header={<PageHeader title="Tu resultado, contigo" lede="Solo tú o tu persona de confianza pueden abrirlo." />}>
      <div className="access-flow">
        <p className="access-demo">Demostración · datos ficticios</p>
        <Stepper steps={["Quién eres", "Fecha", "Código", "Resultado"]} current={step} />
        {error && <div role="alert" className="access-error">{error} <Button variant="quiet" onClick={() => window.location.reload()}>Volver a empezar</Button></div>}
        {!identity && !error && <Card><p role="status">Buscando tu credencial…</p></Card>}
        {identity && !viewer && <Card>
          <h2>¿Quién eres?</h2>
          <p>Credencial de {identity.paciente_nombre_corto}</p>
          <div className="access-actions">
            <Button size="lg" block onClick={() => setViewer("paciente")}>Soy la paciente</Button>
            {identity.contactos.map((contact) => <Button key={contact.id} size="lg" block variant="secondary" onClick={() => setViewer(contact.id)}>Soy {contact.nombre} ({contact.parentesco})</Button>)}
          </div>
        </Card>}
        {viewer && !challenge && <Card><form onSubmit={send}>
          <h2>Una verificación para cuidarte</h2>
          <Field label="Fecha de nacimiento de la paciente" type="date" required value={birthdate} onChange={(e) => setBirthdate(e.target.value)} />
          <p>Enviaremos un código al teléfono que registraste con EIRA.</p>
          <div className="access-actions access-sticky"><Button size="lg" block type="submit" disabled={busy}>{busy ? "Enviando…" : "Enviar código"}</Button><Button variant="quiet" disabled={busy} onClick={() => setViewer(null)}>Cambiar persona</Button></div>
        </form></Card>}
        {challenge && !verified && <Card><form onSubmit={verify}>
          <h2>Revisa tu teléfono</h2>
          <p>Código enviado a {challenge.destino_enmascarado}. Vence en 5 minutos; tienes 5 intentos.</p>
          {challenge.codigo_demo && <p className="access-demo" role="status">SMS simulado · Código: <strong>{challenge.codigo_demo}</strong></p>}
          <Field label="Código de 6 dígitos" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} required value={code} onChange={(e) => setCode(e.target.value)} />
          <div className="access-actions access-sticky"><Button size="lg" block type="submit" disabled={busy}>{busy ? "Verificando…" : "Ver mi resultado"}</Button><Button variant="quiet" disabled={busy} onClick={() => { setChallenge(null); setError(""); }}>Solicitar otro código</Button></div>
        </form></Card>}
        {verified && results === null && <Card><p role="status">{busy ? "Buscando tus resultados…" : "No pudimos cargar tus resultados."}</p><Button onClick={() => void run(loadResults)} disabled={busy}>Reintentar</Button></Card>}
        {results?.length === 0 && <Card><h2>Aún no hay resultados listos</h2><p>EIRA te avisará cuando tu resultado esté disponible.</p><Button size="lg" onClick={() => void run(loadResults)} disabled={busy}>Volver a consultar</Button></Card>}
        {results?.map((result) => <section key={result.id} className="access-result">
          <p>{result.tipo_estudio} · {result.fecha}</p>
          <h2>{result.clasificacion === "normal" ? "Tu resultado salió normal" : "Tu resultado está listo"}</h2>
          <p className="access-explanation">{result.explicacion_clara || "Consulta el PDF y habla con el equipo de EIRA."}</p>
          {result.proximo_control && <p>Próximo control: {result.proximo_control}</p>}
          <div className="access-actions">
            <Button size="lg" disabled={!canSpeak} onClick={() => { window.speechSynthesis.cancel(); const speech = new SpeechSynthesisUtterance(result.explicacion_clara || "Consulta tu resultado con EIRA."); speech.lang = "es-MX"; window.speechSynthesis.speak(speech); }}><SpeakerHigh size={24} aria-hidden="true" /> Escuchar resultado</Button>
            {!canSpeak && <p>Tu navegador no permite lectura en voz alta.</p>}
            <a className="hr-btn hr-btn--secondary hr-btn--lg" href={result.pdf_url} target="_blank" rel="noreferrer"><FilePdf size={24} aria-hidden="true" /> Abrir PDF</a>
          </div>
          <p>Este resultado fue autorizado por el equipo médico. Si tienes dudas, acércate a EIRA.</p>
        </section>)}
        {verified && <Button variant="quiet" onClick={() => window.location.reload()}>Cerrar sesión en este teléfono</Button>}
        {!viewer && <><Button variant="quiet" size="lg" onClick={() => setScanning(!scanning)}><Scan size={24} aria-hidden="true" />{scanning ? "Cerrar cámara" : "Escanear otra credencial"}</Button>{scanning && <div id="access-qr" />}<p>¿Sin cámara? Abre el enlace de tu credencial.</p></>}
      </div>
    </PageLayout>
  );
}

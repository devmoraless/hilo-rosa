// HR-011 · Landing (recipe landing-story). Locked direction: R1 v2 "credencial" on EIRA blush.
// Copy from IDEA.md §0, §1, §4; every number from IDEA.md §10 with its source shown under it.
// Screens in /shots are real captures of this app (HR-007, HR-009, HR-010) with the demo fixtures.
import { Link } from "react-router-dom";
import { Credential } from "../../lib/ui";
import "./landing.css";

// María's demo credential token (app/fixtures/seed_data.py MARIA["qr_token"]); opaque, no personal data.
const DEMO_TOKEN = "Xb7nQ2vRk9TzWm4pHs8dLc";
const DEMO_RESULT = `/p/${DEMO_TOKEN}`;

interface StepInfo {
  n: string;
  title: string;
  body: string;
  shot: string;
  alt: string;
  w: number;
  h: number;
  to: string;
  action: string;
  phone?: boolean;
}

const STEPS: StepInfo[] = [
  {
    n: "1",
    title: "Jornada sin internet",
    body: "En Tamazula no hay señal. Rosa teclea \"Maria Lopez\" y 1974: Hilo Rosa la reconoce con 92% de coincidencia porque ya vino en 2025. Rosa confirma y no se duplica el expediente.",
    shot: "/shots/jornada.webp",
    alt: "Pantalla de jornada sin conexión: posible coincidencia 92% con María López Hernández, botones Es ella y Es otra.",
    w: 1560,
    h: 1044,
    to: "/jornada",
    action: "Abrir la jornada",
  },
  {
    n: "2",
    title: "La médica autoriza",
    body: "La Dra. Ana revisa el PDF del laboratorio, captura el resultado y autoriza con su cédula. Solo entonces sale un aviso, y el aviso nunca dice el diagnóstico.",
    shot: "/shots/medica.webp",
    alt: "Tablero de la médica: el resultado de María López Hernández, folio EIRA-7K3P, en la columna Notificado con aviso enviado.",
    w: 2248,
    h: 470,
    to: "/medica",
    action: "Ver la revisión médica",
  },
  {
    n: "3",
    title: "Laura abre el resultado",
    body: "Laura, hija de María, escanea la credencial. Confirma la fecha de nacimiento y un código de 6 dígitos, y lee en palabras simples: salió normal, regresa en un año.",
    shot: "/shots/paciente.webp",
    alt: "Celular de Laura: Tu resultado salió normal, próximo control 2027-11-21, botones Escuchar resultado y Abrir PDF.",
    w: 780,
    h: 790,
    to: DEMO_RESULT,
    action: "Abrir como Laura",
    phone: true,
  },
];

function StepRow({ step, flip }: { step: StepInfo; flip: boolean }) {
  return (
    <li className={`lp-step${flip ? " lp-step--flip" : ""}${step.phone ? " lp-step--phone" : ""}`}>
      <div className="lp-step-text">
        <span className="lp-step-n display" aria-hidden="true">
          {step.n}
        </span>
        <h3 className="display">{step.title}</h3>
        <p>{step.body}</p>
        <Link className="hr-btn hr-btn--secondary hr-btn--md" to={step.to}>
          {step.action}
        </Link>
      </div>
      <figure className="lp-shot">
        <img src={step.shot} alt={step.alt} width={step.w} height={step.h} loading="lazy" decoding="async" />
      </figure>
    </li>
  );
}

export default function LandingPage() {
  const origin = typeof window === "undefined" ? "https://hilo-rosa.onrender.com" : window.location.origin;
  return (
    <div className="lp">
      <section className="lp-hero" aria-labelledby="lp-title">
        <div className="lp-hero-text">
          <h1 id="lp-title" className="display">
            Que ningún resultado se quede sin dueña.
          </h1>
          <p className="lp-lede">
            Hilo Rosa registra a cada paciente de EIRA una sola vez, aun sin internet, y le da una credencial con folio y QR
            para que ella o su familiar de confianza abra su resultado autorizado.
          </p>
          <div className="lp-actions">
            <Link className="hr-btn hr-btn--primary hr-btn--lg" to="/jornada">
              Ver la demo
            </Link>
            <Link className="hr-btn hr-btn--quiet hr-btn--lg" to={DEMO_RESULT}>
              Abrir el resultado de María
            </Link>
          </div>
        </div>
        <div className="lp-stage">
          <Credential folio="EIRA-7K3P" qrValue={`${origin}${DEMO_RESULT}`} note="Persona de confianza: Laura (hija)" motion="turning" />
          <p className="lp-stage-note">El QR no lleva datos: abre con fecha de nacimiento y código.</p>
        </div>
      </section>

      <section className="lp-pain" aria-labelledby="lp-pain-title">
        <h2 id="lp-pain-title" className="lp-sr">
          Por qué importa
        </h2>
        <div className="lp-pain-main">
          <p className="lp-big display">300+</p>
          <p className="lp-pain-text">
            resultados de Papanicolaou al mes salen hoy por <strong>una sola cuenta de WhatsApp</strong>, asociados por nombre.
            Si la cuenta se bloquea, las entregas se paran.
            <small>Fuente: brief del reto, Vibeathon Nerdearla México 2026.</small>
          </p>
        </div>
        <dl className="lp-pain-more">
          <div>
            <dt className="display">86,000</dt>
            <dd>
              estudios realizados por EIRA en comunidades rurales.
              <small>
                Fuente: <a href="https://eiraac.org/">eiraac.org</a>
              </small>
            </dd>
          </div>
          <div>
            <dt className="display">11,919</dt>
            <dd>
              casos nuevos de cáncer cervicouterino estimados en México.
              <small>
                Fuente: GLOBOCAN 2024, en{" "}
                <a href="https://www.scielo.org.mx/pdf/gmm/v159n6/2696-1288-gmm-159-6-591.pdf">Gaceta Médica de México</a>
              </small>
            </dd>
          </div>
        </dl>
      </section>

      <section className="lp-steps" aria-labelledby="lp-steps-title">
        <h2 id="lp-steps-title" className="display">
          De la jornada al celular de Laura
        </h2>
        <ol>
          {STEPS.map((s, i) => (
            <StepRow key={s.n} step={s} flip={i % 2 === 1} />
          ))}
        </ol>
      </section>

      <section className="lp-ask" aria-labelledby="lp-ask-title">
        <h2 id="lp-ask-title" className="display">
          Recorre la demo en tres minutos
        </h2>
        <div className="lp-actions">
          <Link className="hr-btn hr-btn--primary hr-btn--lg" to="/jornada">
            Empezar en la jornada
          </Link>
          <Link className="hr-btn hr-btn--secondary hr-btn--lg" to="/medica">
            Revisión médica
          </Link>
          <Link className="hr-btn hr-btn--secondary hr-btn--lg" to={DEMO_RESULT}>
            Resultado de María
          </Link>
        </div>
      </section>

      <footer className="lp-foot">
        <p>
          <strong>Datos ficticios · Prototipo para EIRA</strong>, asociación fundada en 2017 en Zapotlán el Grande, Jalisco.
          María y Laura son personas inventadas para la demostración.
        </p>
        <p>Hecho en Vibeathon Nerdearla México 2026.</p>
      </footer>
    </div>
  );
}

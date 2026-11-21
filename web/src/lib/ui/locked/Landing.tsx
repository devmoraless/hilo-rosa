// Locked screen 1 (wow / landing-story): the R1 v2 direction rebuilt with the kit, light EIRA blush.
// Copy and numbers come from IDEA.md §0, §4 and §10 (sources noted inline).
import { Link } from "react-router-dom";
import { Credential } from "../Credential";

const STEPS: Array<[string, string]> = [
  ["92%", "Sin conexión, Rosa teclea \"Maria Lopez\" y ve una posible coincidencia. Ella confirma: es ella."],
  ["3 → 0", "Registra a Laura y el Papanicolaou. Al volver la red, los 3 pendientes se sincronizan."],
  ["2 PDF", "El laboratorio los arrastra: uno se asocia por folio, el otro espera revisión."],
  ["NILM", "La Dra. Ana autoriza con su cédula. El aviso nunca dice el diagnóstico."],
  ["1 año", "Laura escanea la credencial: \"Tu resultado salió normal, regresa en 1 año\"."],
];

export function Landing() {
  return (
    <div className="hr-landing">
      <section className="hr-landing-hero">
        <div className="hr-landing-stats">
          <p className="hr-stat">
            <span className="hr-stat-value">300+</span>
            <span className="hr-stat-label">Papanicolaou al mes por un solo WhatsApp</span>
          </p>
          <p className="hr-stat">
            <span className="hr-stat-value">86,000</span>
            <span className="hr-stat-label">
              estudios de EIRA (<a href="https://eiraac.org/">eiraac.org</a>)
            </span>
          </p>
        </div>
        <div className="hr-landing-stage">
          <Credential folio="EIRA-7K3P" qrValue="https://hilo-rosa.onrender.com/p/demo" note="Persona de confianza: Laura (hija)" motion="turning" />
          <span className="hr-landing-label hr-landing-label--r">Folio único por paciente</span>
          <span className="hr-landing-label hr-landing-label--l">QR revocable, sin datos</span>
        </div>
        <h1 className="display hr-landing-title">Que ningún resultado se quede sin dueña.</h1>
        <p className="hr-landing-lede">Una credencial por paciente: la reconoce aun sin internet y le abre su resultado autorizado a ella o a su hija.</p>
        <Link className="hr-btn hr-btn--primary hr-btn--lg" to="/jornada">
          Empezar la jornada
        </Link>
      </section>
      <section className="hr-landing-steps" aria-labelledby="recorrido">
        <h2 id="recorrido" className="display">Del papel al celular de Laura, en cinco pasos</h2>
        <dl>
          {STEPS.map(([k, v]) => (
            <div key={k}>
              <dt className="display">{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      </section>
      <footer className="hr-landing-foot">Hilo Rosa · prototipo con datos ficticios para EIRA, fundada en 2017 en Zapotlán el Grande, Jalisco.</footer>
    </div>
  );
}

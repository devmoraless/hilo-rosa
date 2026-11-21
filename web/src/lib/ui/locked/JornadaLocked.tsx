// Locked screen 2 (recipe: flow). The reference HR-007 (jornada) and the acceso screen copy.
// Static demo data from IDEA.md §3-4 (ficticia); the real feature replaces this at /jornada.
import { Button, Card, Chip } from "../primitives";
import { Field } from "../Field";
import { Stepper } from "../Stepper";
import { PageHeader, PageLayout } from "../shell";

export function JornadaLocked() {
  return (
    <PageLayout
      recipe="flow"
      header={
        <PageHeader
          title="Jornada · Tamazula de Gordiano"
          lede="Busca a la paciente antes de registrarla: si ya vino, no se duplica."
          action={<Chip tone="warn" size="md">3 pendientes de sincronizar</Chip>}
        />
      }
    >
      <Stepper steps={["Buscar", "Confirmar", "Persona de confianza", "Estudio", "Credencial"]} current={1} />
      <Card>
        <Field label="Nombre de la paciente" defaultValue="Maria Lopez" hint="Sin acentos también funciona." />
      </Card>
      <Card>
        <div className="hr-match">
          <div className="hr-match-head">
            <span className="hr-match-score display">92%</span>
            <div>
              <h3>Posible coincidencia: María López Hernández</h3>
              <p className="hr-match-meta">Nació en 1974 · Tamazula · ultrasonido mar 2025</p>
            </div>
          </div>
          <div className="hr-match-why">
            <Chip tone="brand">Nombre igual sin acentos</Chip>
            <Chip tone="brand">Mismo municipio</Chip>
            <Chip>Año de nacimiento igual</Chip>
            <Chip tone="neutral">Datos de ejemplo</Chip>
          </div>
          <div className="hr-match-actions">
            <Button size="lg">Es ella</Button>
            <Button size="lg" variant="secondary">
              Es otra
            </Button>
          </div>
        </div>
      </Card>
    </PageLayout>
  );
}

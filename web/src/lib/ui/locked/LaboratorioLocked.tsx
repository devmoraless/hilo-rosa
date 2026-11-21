// Locked screen 3 (recipe: list). The reference HR-008 (laboratorio) copies.
// Static demo data: the 2 synthetic PDFs of the seed; the lab never sees the patient record (folio and state only).
import { Button, Card, Chip, SectionHeader, Stat } from "../primitives";
import { PageHeader, PageLayout } from "../shell";

const ROWS = [
  { file: "resultado_EIRA-7K3P.pdf", folio: "EIRA-7K3P", state: "Asociado por folio", tone: "ok" as const },
  { file: "escaneo_0412.pdf", folio: "Sin folio legible", state: "Sin asociar", tone: "warn" as const },
];

export function LaboratorioLocked() {
  return (
    <PageLayout
      recipe="list"
      header={<PageHeader title="Laboratorio · resultados" lede="Arrastra los PDFs. Se asocian solos por folio; los demás esperan en la bandeja." />}
      aside={
        <Card>
          <SectionHeader title="Sin asociar" size="sm" action={<Chip tone="warn">1</Chip>} />
          <p className="hr-tray-file">escaneo_0412.pdf</p>
          <p className="hr-tray-hint">Sugerencia: EIRA-7K3Q (1 letra distinta)</p>
          <Button size="md" block>
            Asociar a EIRA-7K3Q
          </Button>
        </Card>
      }
    >
      <div className="hr-drop" role="button" tabIndex={0} aria-label="Zona para soltar PDFs">
        <span className="display">Suelta aquí los PDFs</span>
        <span>o elige archivos desde la computadora</span>
      </div>
      <div className="hr-lab-stats">
        <Stat value="2" label="PDFs subidos hoy" size="sm" />
        <Stat value="1" label="asociado por folio" size="sm" />
        <Stat value="1" label="por revisar a mano" size="sm" />
      </div>
      <Card>
        <SectionHeader title="Subidos hoy" size="sm" />
        <table className="hr-table">
          <thead>
            <tr>
              <th scope="col">Archivo</th>
              <th scope="col">Folio</th>
              <th scope="col">Estado</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.file}>
                <td>{r.file}</td>
                <td className="hr-mono">{r.folio}</td>
                <td>
                  <Chip tone={r.tone}>{r.state}</Chip>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </PageLayout>
  );
}

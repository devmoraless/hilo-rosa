// The shell and the routes (HR-002 design lock). Every feature renders inside AppShell, so a view never builds
// its own header or nav. A feature plugs in by creating web/src/features/<name>/index.tsx with a default export;
// until then its route shows the locked reference screen or a placeholder. main.tsx already wraps this in BrowserRouter.
import { lazy, Suspense, type ComponentType, type LazyExoticComponent } from "react";
import { Route, Routes } from "react-router-dom";
import { AppShell } from "./lib/ui";
import { JornadaLocked } from "./lib/ui/locked/JornadaLocked";
import { LaboratorioLocked } from "./lib/ui/locked/LaboratorioLocked";
import { Landing } from "./lib/ui/locked/Landing";

const featureModules = import.meta.glob<{ default: ComponentType }>("./features/*/index.tsx");

function feature(name: string, fallback: ComponentType): ComponentType | LazyExoticComponent<ComponentType> {
  const load = featureModules[`./features/${name}/index.tsx`];
  return load ? lazy(load) : fallback;
}

function Placeholder({ title, lede }: { title: string; lede: string }) {
  return (
    <div className="hr-page">
      <div className="hr-empty">
        <h2>{title}</h2>
        <p>{lede}</p>
      </div>
    </div>
  );
}

const LandingView = feature("landing", Landing);
const JornadaView = feature("jornada", JornadaLocked);
const LaboratorioView = feature("laboratorio", LaboratorioLocked);
const MedicaView = feature("medica", () => (
  <Placeholder title="Médica" lede="Aquí se revisan y autorizan los resultados antes de que la paciente los vea." />
));
const AccesoView = feature("acceso", () => (
  <Placeholder title="Tu resultado" lede="Escanea tu credencial para abrir tu resultado de forma segura." />
));
const NotFound = () => <Placeholder title="No encontramos esta página" lede="Usa el menú de arriba para ir a tu pantalla." />;

export default function App() {
  return (
    <AppShell>
      <Suspense fallback={<div className="hr-page" aria-busy="true" />}>
        <Routes>
          <Route path="/" element={<LandingView />} />
          <Route path="/jornada" element={<JornadaView />} />
          <Route path="/laboratorio" element={<LaboratorioView />} />
          <Route path="/medica" element={<MedicaView />} />
          <Route path="/p/:token" element={<AccesoView />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </AppShell>
  );
}

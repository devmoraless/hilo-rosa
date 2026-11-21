import { StrictMode, type ComponentType } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

// App.tsx and index.css belong to the design lock (HR-002). Loading them through a glob keeps
// the skeleton buildable before that task lands, without either task touching the other's files.
const appModules = import.meta.glob<{ default: ComponentType }>("./App.tsx", { eager: true });
import.meta.glob("./index.css", { eager: true });

function Skeleton() {
  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: 24 }}>
      <h1>Hilo Rosa</h1>
      <p>Que ningún resultado se quede sin dueña.</p>
    </main>
  );
}

const App = appModules["./App.tsx"]?.default ?? Skeleton;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);

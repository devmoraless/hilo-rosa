import { useState, type ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import type { Role } from "../../api/types";
import { getDemoRole, setDemoRole } from "../api";
import { ConnectionBadge } from "./ConnectionBadge";

export const ROLES: Array<{ role: Role; label: string; path: string }> = [
  { role: "capturista", label: "Capturista", path: "/jornada" },
  { role: "laboratorio", label: "Laboratorio", path: "/laboratorio" },
  { role: "medica", label: "Médica", path: "/medica" },
  { role: "paciente", label: "Paciente / familiar", path: "/p/demo" },
];

const VIEWS = [
  { to: "/jornada", label: "Jornada" },
  { to: "/laboratorio", label: "Laboratorio" },
  { to: "/medica", label: "Médica" },
  { to: "/p/demo", label: "Paciente" },
];

/** Demo login: the selected role travels in X-Demo-Role on every API call (lib/api.ts). */
export function NavBar() {
  const navigate = useNavigate();
  const [role, setRole] = useState<Role>(getDemoRole());
  return (
    <nav className="hr-nav" aria-label="Principal">
      <NavLink to="/" className="hr-brand" aria-label="Hilo Rosa, inicio">
        <span className="hr-brand-dot" aria-hidden="true" />
        <span className="display">Hilo Rosa</span>
      </NavLink>
      <div className="hr-views">
        {VIEWS.map((v) => (
          <NavLink key={v.to} to={v.to} className="hr-view">
            {v.label}
          </NavLink>
        ))}
      </div>
      <div className="hr-nav-end">
        <label className="hr-role">
          <span>Entrar como</span>
          <select
            value={role}
            aria-label="Rol de demostración"
            onChange={(e) => {
              const next = e.target.value as Role;
              setDemoRole(next);
              setRole(next);
              const target = ROLES.find((r) => r.role === next);
              if (target) navigate(target.path);
            }}
          >
            {ROLES.map((r) => (
              <option key={r.role} value={r.role}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
        <ConnectionBadge size="sm" />
      </div>
    </nav>
  );
}

/** Every route renders inside this: a view never builds its own header or nav. */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="hr-shell">
      <NavBar />
      <main className="hr-main">{children}</main>
    </div>
  );
}

export function PageHeader({ title, lede, action }: { title: ReactNode; lede?: ReactNode; action?: ReactNode }) {
  return (
    <header className="hr-page-header">
      <div>
        <h1>{title}</h1>
        {lede && <p>{lede}</p>}
      </div>
      {action}
    </header>
  );
}

/** One layout per recipe in DESIGN.md: flow (jornada, acceso), list (laboratorio), dashboard (médica). */
export function PageLayout({
  recipe,
  header,
  aside,
  children,
}: {
  recipe: "flow" | "list" | "dashboard";
  header?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="hr-page">
      {header}
      {recipe === "list" ? (
        <div className="hr-layout-list">
          <div>{children}</div>
          {aside && <aside>{aside}</aside>}
        </div>
      ) : (
        <div className={`hr-layout-${recipe}`}>{children}</div>
      )}
    </div>
  );
}

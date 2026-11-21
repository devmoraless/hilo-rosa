import type { ReactNode } from "react";

/** One column of the médica board (Por revisar, Autorizado, Notificado…). Children are Cards (size sm). */
export function KanbanColumn({ title, count, children }: { title: string; count?: number; children?: ReactNode }) {
  return (
    <section className="hr-kanban" aria-label={title}>
      <header className="hr-kanban-head">
        <h2>{title}</h2>
        {count !== undefined && <span className="hr-kanban-count">{count}</span>}
      </header>
      {children}
    </section>
  );
}

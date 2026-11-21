// Hilo Rosa UI kit (HR-002). Styles live in web/src/index.css (hr-* classes); rules in web/DESIGN.md.
import type { ButtonHTMLAttributes, ReactNode } from "react";

export type Size = "sm" | "md" | "lg";
export const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ");

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "quiet";
  size?: Size;
  block?: boolean;
}

/** Big, plain-language action. `lg` is the default on capturista and paciente screens. */
export function Button({ variant = "primary", size = "md", block, className, type = "button", ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      className={cx("hr-btn", `hr-btn--${variant}`, `hr-btn--${size}`, block && "hr-btn--block", className)}
      {...rest}
    />
  );
}

/** The one container level. Never put a Card inside a Card. */
export function Card({ size = "md", className, children }: { size?: "sm" | "md"; className?: string; children: ReactNode }) {
  return <div className={cx("hr-card", size === "sm" && "hr-card--sm", className)}>{children}</div>;
}

export type Tone = "neutral" | "ok" | "warn" | "bad" | "brand";

/** Small status label. Data states only use ok / warn / bad. */
export function Chip({ tone = "neutral", size = "sm", children }: { tone?: Tone; size?: "sm" | "md"; children: ReactNode }) {
  return <span className={cx("hr-chip", size === "md" && "hr-chip--md", tone !== "neutral" && `hr-chip--${tone}`)}>{children}</span>;
}

export function Stat({ value, label, size = "md" }: { value: ReactNode; label: ReactNode; size?: "sm" | "md" }) {
  return (
    <div className={cx("hr-stat", size === "sm" && "hr-stat--sm")}>
      <span className="hr-stat-value">{value}</span>
      <span className="hr-stat-label">{label}</span>
    </div>
  );
}

export function SectionHeader({ title, action, size = "md" }: { title: ReactNode; action?: ReactNode; size?: "sm" | "md" }) {
  return (
    <div className={cx("hr-section-header", size === "sm" && "hr-section-header--sm")}>
      <h2>{title}</h2>
      {action}
    </div>
  );
}

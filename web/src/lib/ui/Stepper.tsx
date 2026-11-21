/** A real sequence of steps (e.g. Buscar, Confirmar, Persona de confianza, Estudio, Credencial). */
export function Stepper({ steps, current, label = "Pasos" }: { steps: string[]; current: number; label?: string }) {
  return (
    <ol className="hr-stepper" aria-label={label}>
      {steps.map((s, i) => {
        const state = i < current ? "done" : i === current ? "current" : "todo";
        return (
          <li key={s} className="hr-step" data-state={state} aria-current={state === "current" ? "step" : undefined}>
            <span className="hr-step-n">{i + 1}</span>
            {s}
          </li>
        );
      })}
    </ol>
  );
}

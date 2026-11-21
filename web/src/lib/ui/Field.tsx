import { useId, type InputHTMLAttributes, type ReactNode } from "react";

export interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size" | "children"> {
  label: ReactNode;
  /** The field number printed on EIRA's paper form (18, 19, 20…), so the capturista copies field by field. */
  num?: number | string;
  hint?: ReactNode;
  /** Render your own control (select, textarea) instead of the default input; give it this id. */
  children?: (id: string) => ReactNode;
}

export function Field({ label, num, hint, children, id: idProp, ...input }: FieldProps) {
  const auto = useId();
  const id = idProp ?? auto;
  return (
    <div className="hr-field">
      <label className="hr-field-label" htmlFor={id}>
        {num !== undefined && (
          <span className="hr-field-num" title={`Campo ${num} del formato`}>
            {num}
          </span>
        )}
        {label}
      </label>
      {children ? children(id) : <input id={id} {...input} />}
      {hint && <span className="hr-field-hint">{hint}</span>}
    </div>
  );
}

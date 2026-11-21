import { useEffect, useState } from "react";

/** Live navigator.onLine, so every screen agrees on the connection state. */
export function useOnline(): boolean {
  const [online, setOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return online;
}

/** 🔴 Sin conexión / 🟢 En línea. Pass `online` to override; otherwise it follows the browser. */
export function ConnectionBadge({ online, size = "md", pending }: { online?: boolean; size?: "sm" | "md"; pending?: number }) {
  const live = useOnline();
  const isOn = online ?? live;
  return (
    <span className={`hr-badge hr-badge--${isOn ? "on" : "off"}${size === "sm" ? " hr-badge--sm" : ""}`} role="status" aria-live="polite">
      <span aria-hidden="true">{isOn ? "🟢" : "🔴"}</span>
      {isOn ? "En línea" : "Sin conexión"}
      {pending ? ` · ${pending} pendiente${pending === 1 ? "" : "s"}` : null}
    </span>
  );
}

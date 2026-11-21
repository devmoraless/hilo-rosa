// The only door to the backend: every route lives under /api.
// The demo role (simulated login) travels in X-Demo-Role; the shell (HR-002) sets it with setDemoRole.
import type { Role } from "../api/types";

let demoRole: Role = "capturista";
let accessSession: string | null = null;

export function setDemoRole(role: Role): void {
  demoRole = role;
}

export function getDemoRole(): Role {
  return demoRole;
}

export function setAccessSession(token: string | null): void {
  accessSession = token;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (!(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  headers.set("X-Demo-Role", demoRole);
  if (accessSession) headers.set("Authorization", `Bearer ${accessSession}`);
  const response = await fetch(`/api${path}`, { ...init, headers });
  if (!response.ok) {
    let detail = response.statusText;
    try {
      const body = await response.json();
      detail = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail ?? body);
    } catch {
      /* not JSON */
    }
    throw new ApiError(response.status, detail);
  }
  return (await response.json()) as T;
}

export const postJson = <T>(path: string, body: unknown) =>
  api<T>(path, { method: "POST", body: JSON.stringify(body) });

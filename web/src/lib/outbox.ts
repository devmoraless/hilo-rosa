// Outbox of offline ops: enqueue with a uuid op_id, flush to POST /api/sync when online.
// The server is idempotent by op_id, so a flush interrupted halfway is safe to repeat.
import type { SyncOpIn, SyncResponse } from "../api/types";
import { applySyncResult, type QueuedOp } from "../features/jornada/jornadaLogic";
import { postJson } from "./api";
import { db } from "./db";

const DEVICE_KEY = "hilo-rosa:device_id";
let memoryDevice: string | null = null;

export function newId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

/** Stable per browser (localStorage); falls back to one id per page load when storage is blocked. */
export function deviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = `dev-${newId()}`;
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    memoryDevice ??= `dev-${newId()}`;
    return memoryDevice;
  }
}

export async function enqueue(ops: SyncOpIn[]): Promise<void> {
  const now = new Date().toISOString();
  await db.outbox.bulkPut(ops.map((op, i) => ({ ...op, status: "pending" as const, created_at: `${now}#${String(i).padStart(3, "0")}` })));
}

export async function allOps(): Promise<QueuedOp[]> {
  return db.outbox.orderBy("created_at").toArray();
}

let inFlight: Promise<SyncResponse | null> | null = null;

/** Sends the pending ops; removes applied and duplicates, keeps conflicts visible. Null when nothing was sent. */
export function flush(): Promise<SyncResponse | null> {
  inFlight ??= (async () => {
    try {
      if (typeof navigator !== "undefined" && !navigator.onLine) return null;
      const queue = await allOps();
      const pending = queue.filter((o) => o.status === "pending");
      if (!pending.length) return null;
      const res = await postJson<SyncResponse>("/sync", {
        device_id: deviceId(),
        ops: pending.map(({ op_id, tipo, payload, base_version }) => ({ op_id, tipo, payload, base_version })),
      });
      const next = applySyncResult(queue, res);
      const keep = new Set(next.map((o) => o.op_id));
      await db.transaction("rw", db.outbox, async () => {
        await db.outbox.bulkDelete(queue.filter((o) => !keep.has(o.op_id)).map((o) => o.op_id));
        await db.outbox.bulkPut(next);
      });
      return res;
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

/** Flushes on every `online` event; returns the unsubscribe. */
export function autoFlush(onResult: (r: SyncResponse | null, err?: unknown) => void): () => void {
  const run = () => flush().then((r) => onResult(r), (e) => onResult(null, e));
  window.addEventListener("online", run);
  return () => window.removeEventListener("online", run);
}

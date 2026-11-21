// Offline store of the jornada (IndexedDB via Dexie): the snapshot's patients and the outbox of ops.
import Dexie, { type Table } from "dexie";
import type { JornadaOut, SnapshotPatient, SnapshotResponse } from "../api/types";
import type { QueuedOp } from "../features/jornada/jornadaLogic";
import { api } from "./api";

export type MetaRow = { key: string; value: unknown };

class HiloRosaDB extends Dexie {
  patients!: Table<SnapshotPatient, string>;
  outbox!: Table<QueuedOp, string>;
  meta!: Table<MetaRow, string>;
  constructor() {
    super("hilo-rosa");
    this.version(1).stores({ patients: "id, municipio, folio", outbox: "op_id, status, created_at", meta: "key" });
  }
}

export const db = new HiloRosaDB();

/** Downloads the jornada snapshot into IndexedDB (replacing the previous one). Throws when offline. */
export async function refreshSnapshot(jornadaId: string): Promise<SnapshotResponse> {
  const snap = await api<SnapshotResponse>(`/jornadas/${encodeURIComponent(jornadaId)}/snapshot`);
  await db.transaction("rw", db.patients, db.meta, async () => {
    await db.patients.clear();
    await db.patients.bulkPut(snap.patients);
    await db.meta.put({ key: `jornada:${jornadaId}`, value: snap.jornada });
    await db.meta.put({ key: "snapshot_at", value: snap.generated_at });
  });
  return snap;
}

export async function cachedJornada(jornadaId: string): Promise<JornadaOut | undefined> {
  return (await db.meta.get(`jornada:${jornadaId}`))?.value as JornadaOut | undefined;
}

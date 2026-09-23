import { openDB } from 'idb';
import { api } from './api';

const DB_NAME = 'pacto_offline_db';
const STORE_NAME = 'evidence_upload_queue_v2';

export interface QueuedEvidence {
  id: string;
  pacto_id: string;
  user_id: string;
  blob: Blob;
  gps_lat?: number | null;
  gps_lng?: number | null;
  queued_at: string;
}

async function getDB() {
  return openDB(DB_NAME, 2, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: 'id' });
    }
  });
}

export async function queueOfflineEvidence(item: QueuedEvidence) {
  await (await getDB()).put(STORE_NAME, item);
}

export async function getQueuedEvidences(): Promise<QueuedEvidence[]> {
  return (await getDB()).getAll(STORE_NAME);
}

let syncing = false;

/** Sube las evidencias en cola. Devuelve cuantas se enviaron. Las que fallan por red se reintentan luego. */
export async function syncOfflineEvidences(): Promise<number> {
  if (syncing || !navigator.onLine) return 0;
  syncing = true;
  let sent = 0;
  try {
    const db = await getDB();
    for (const item of await getQueuedEvidences()) {
      try {
        const path = await api.uploadEvidence(item.pacto_id, item.user_id, item.blob);
        await api.submitEvidence({ pacto_id: item.pacto_id, user_id: item.user_id, evidence_url: path, gps_lat: item.gps_lat, gps_lng: item.gps_lng });
        await db.delete(STORE_NAME, item.id);
        sent++;
      } catch (err) {
        const msg = String((err as Error).message ?? err);
        // solo el duplicado del dia es definitivo; el resto (red, sesion caducada) se reintenta
        if (/duplicate|unique/i.test(msg)) await db.delete(STORE_NAME, item.id);
      }
    }
  } finally {
    syncing = false;
  }
  return sent;
}

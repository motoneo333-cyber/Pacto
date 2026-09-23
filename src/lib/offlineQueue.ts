import { openDB } from 'idb';
import { supabase } from './supabaseClient';

const DB_NAME = 'pacto_offline_db';
const STORE_NAME = 'evidence_upload_queue';

export async function getDB() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    }
  });
}

export async function queueOfflineEvidence(evidenceData: any) {
  const db = await getDB();
  await db.put(STORE_NAME, evidenceData);
}

export async function getQueuedEvidences() {
  const db = await getDB();
  return db.getAll(STORE_NAME);
}

export async function clearQueuedEvidence(id: string) {
  const db = await getDB();
  await db.delete(STORE_NAME, id);
}

export async function syncOfflineEvidences() {
  if (!navigator.onLine) return;
  const queued = await getQueuedEvidences();
  for (const item of queued) {
    try {
      await supabase.from('progress').insert({
        id: item.id,
        evidence_url: item.imageUrl,
        gps_lat: item.gps_lat,
        gps_lng: item.gps_lng,
        server_timestamp: item.server_timestamp
      });
      await clearQueuedEvidence(item.id);
    } catch (err) {
      console.warn('Sync item failed, will retry later:', err);
    }
  }
}

// Auto-sync listener on reconnection
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    syncOfflineEvidences().catch(console.warn);
  });
}

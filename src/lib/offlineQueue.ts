import { openDB } from 'idb';

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

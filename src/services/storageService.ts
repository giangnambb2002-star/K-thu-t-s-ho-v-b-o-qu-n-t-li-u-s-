import {
  ActivityLog,
  ArchiveRecord,
  QualityCheckEntry,
} from '../types/archive';
import { SEED_ACTIVITIES, SEED_ARCHIVE_RECORDS } from '../data/seedData';

const DB_NAME = 'digiarchive_db';
const DB_VERSION = 1;
const STORE_RECORDS = 'records';
const STORE_MEDIA = 'media';
const STORE_ACTIVITIES = 'activities';
const STORE_QUALITY = 'quality_checks';

const LS_INIT_FLAG = 'digiarchive_initialized_v1';
const LS_RECORDS_FALLBACK = 'digiarchive_records_fallback';
const LS_ACTIVITIES_FALLBACK = 'digiarchive_activities_fallback';
const LS_QUALITY_FALLBACK = 'digiarchive_quality_fallback';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB không khả dụng trên trình duyệt này.'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_RECORDS)) {
        db.createObjectStore(STORE_RECORDS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_MEDIA)) {
        db.createObjectStore(STORE_MEDIA, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(STORE_ACTIVITIES)) {
        db.createObjectStore(STORE_ACTIVITIES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_QUALITY)) {
        db.createObjectStore(STORE_QUALITY, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const req = action(store);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

async function seedIfFirstRun(): Promise<void> {
  const alreadyInit = localStorage.getItem(LS_INIT_FLAG);
  if (alreadyInit) return;

  try {
    const db = await openDB();
    const existingCount = await new Promise<number>((resolve, reject) => {
      const tx = db.transaction(STORE_RECORDS, 'readonly');
      const req = tx.objectStore(STORE_RECORDS).count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });

    if (existingCount === 0) {
      for (const rec of SEED_ARCHIVE_RECORDS) {
        await withStore(STORE_RECORDS, 'readwrite', (s) => s.put(rec));
      }
      for (const act of SEED_ACTIVITIES) {
        await withStore(STORE_ACTIVITIES, 'readwrite', (s) => s.put(act));
      }
    }
    localStorage.setItem(LS_INIT_FLAG, 'true');
  } catch {
    if (!localStorage.getItem(LS_RECORDS_FALLBACK)) {
      localStorage.setItem(
        LS_RECORDS_FALLBACK,
        JSON.stringify(SEED_ARCHIVE_RECORDS)
      );
      localStorage.setItem(
        LS_ACTIVITIES_FALLBACK,
        JSON.stringify(SEED_ACTIVITIES)
      );
    }
    localStorage.setItem(LS_INIT_FLAG, 'true');
  }
}

export const storageService = {
  async init(): Promise<void> {
    await seedIfFirstRun();
  },

  async getAllRecords(): Promise<ArchiveRecord[]> {
    await seedIfFirstRun();
    try {
      const items = await withStore<ArchiveRecord[]>(
        STORE_RECORDS,
        'readonly',
        (s) => s.getAll()
      );
      return items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    } catch {
      const raw = localStorage.getItem(LS_RECORDS_FALLBACK);
      const parsed: ArchiveRecord[] = raw ? JSON.parse(raw) : [];
      return parsed.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    }
  },

  async saveRecord(record: ArchiveRecord): Promise<void> {
    try {
      await withStore(STORE_RECORDS, 'readwrite', (s) => s.put(record));
    } catch {
      const all = await this.getAllRecords();
      const idx = all.findIndex((r) => r.id === record.id);
      if (idx >= 0) {
        all[idx] = record;
      } else {
        all.unshift(record);
      }
      localStorage.setItem(LS_RECORDS_FALLBACK, JSON.stringify(all));
    }
  },

  async deleteRecord(recordId: string): Promise<void> {
    try {
      const existing = await withStore<ArchiveRecord | undefined>(
        STORE_RECORDS,
        'readonly',
        (s) => s.get(recordId)
      );
      if (existing) {
        for (const f of existing.files) {
          if (f.mediaStorageKey) {
            await withStore(STORE_MEDIA, 'readwrite', (s) =>
              s.delete(f.mediaStorageKey!)
            );
          }
        }
      }
      await withStore(STORE_RECORDS, 'readwrite', (s) => s.delete(recordId));
    } catch {
      const all = await this.getAllRecords();
      const filtered = all.filter((r) => r.id !== recordId);
      localStorage.setItem(LS_RECORDS_FALLBACK, JSON.stringify(filtered));
    }
  },

  async saveMediaDataUrl(key: string, dataUrl: string): Promise<void> {
    try {
      await withStore(STORE_MEDIA, 'readwrite', (s) =>
        s.put({ key, dataUrl, savedAt: new Date().toISOString() })
      );
    } catch {
      try {
        localStorage.setItem(`digiarchive_media_${key}`, dataUrl);
      } catch {
        // Bỏ qua nếu vượt giới hạn dung lượng localStorage khi fallback
      }
    }
  },

  async getMediaDataUrl(key: string): Promise<string | null> {
    try {
      const res = await withStore<{ key: string; dataUrl: string } | undefined>(
        STORE_MEDIA,
        'readonly',
        (s) => s.get(key)
      );
      return res?.dataUrl ?? null;
    } catch {
      return localStorage.getItem(`digiarchive_media_${key}`);
    }
  },

  async getActivities(): Promise<ActivityLog[]> {
    await seedIfFirstRun();
    try {
      const items = await withStore<ActivityLog[]>(
        STORE_ACTIVITIES,
        'readonly',
        (s) => s.getAll()
      );
      return items.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    } catch {
      const raw = localStorage.getItem(LS_ACTIVITIES_FALLBACK);
      const parsed: ActivityLog[] = raw ? JSON.parse(raw) : [];
      return parsed.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    }
  },

  async logActivity(
    entry: Omit<ActivityLog, 'id' | 'timestamp'>
  ): Promise<ActivityLog> {
    const newEntry: ActivityLog = {
      ...entry,
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
    };
    try {
      await withStore(STORE_ACTIVITIES, 'readwrite', (s) => s.put(newEntry));
    } catch {
      const all = await this.getActivities();
      all.unshift(newEntry);
      localStorage.setItem(
        LS_ACTIVITIES_FALLBACK,
        JSON.stringify(all.slice(0, 100))
      );
    }
    return newEntry;
  },

  async getQualityChecks(): Promise<QualityCheckEntry[]> {
    try {
      const items = await withStore<QualityCheckEntry[]>(
        STORE_QUALITY,
        'readonly',
        (s) => s.getAll()
      );
      return items.sort((a, b) => b.checkedAt.localeCompare(a.checkedAt));
    } catch {
      const raw = localStorage.getItem(LS_QUALITY_FALLBACK);
      const parsed: QualityCheckEntry[] = raw ? JSON.parse(raw) : [];
      return parsed.sort((a, b) => b.checkedAt.localeCompare(a.checkedAt));
    }
  },

  async saveQualityCheck(entry: QualityCheckEntry): Promise<void> {
    try {
      await withStore(STORE_QUALITY, 'readwrite', (s) => s.put(entry));
    } catch {
      const all = await this.getQualityChecks();
      const idx = all.findIndex((q) => q.id === entry.id);
      if (idx >= 0) {
        all[idx] = entry;
      } else {
        all.unshift(entry);
      }
      localStorage.setItem(LS_QUALITY_FALLBACK, JSON.stringify(all));
    }
  },

  async resetDemoData(): Promise<void> {
    try {
      const db = await openDB();
      await Promise.all([
        withStore(STORE_RECORDS, 'readwrite', (s) => s.clear()),
        withStore(STORE_MEDIA, 'readwrite', (s) => s.clear()),
        withStore(STORE_ACTIVITIES, 'readwrite', (s) => s.clear()),
        withStore(STORE_QUALITY, 'readwrite', (s) => s.clear()),
      ]);
      db.close();
    } catch {
      localStorage.removeItem(LS_RECORDS_FALLBACK);
      localStorage.removeItem(LS_ACTIVITIES_FALLBACK);
      localStorage.removeItem(LS_QUALITY_FALLBACK);
    }
    localStorage.removeItem(LS_INIT_FLAG);
    await seedIfFirstRun();
  },
};

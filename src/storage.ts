import type { AppSettings, MediaAssetMeta, StoredClip, StoredProject, TimelineMarker, TrackSettings } from './types';
import type { VideoExportFormat } from './export/videoExporter';
import { serializeName } from './export/videoExporter';

const PROJECTS_KEY = 'revideeo:projects';
const SETTINGS_KEY = 'revideeo:settings';

const DEFAULT_SETTINGS: AppSettings = { autoSaveIntervalMinutes: 5, language: 'pl', renderServers: [], mobileRenderEnabled: false };

// --- localStorage: project metadata ---

export const listProjects = (): StoredProject[] => {
  try {
    const raw = localStorage.getItem(PROJECTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as StoredProject[]) : [];
  } catch {
    return [];
  }
};

export const upsertProject = (project: StoredProject): void => {
  const projects = listProjects();
  const rest = projects.filter((p) => p.id !== project.id);
  const updated = { ...project, savedAt: Date.now() };
  localStorage.setItem(PROJECTS_KEY, JSON.stringify([updated, ...rest]));
};

export const deleteProject = (id: string): void => {
  const projects = listProjects();
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects.filter((p) => p.id !== id)));
};

export const getSettings = (): AppSettings => {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      autoSaveIntervalMinutes: parsed.autoSaveIntervalMinutes ?? DEFAULT_SETTINGS.autoSaveIntervalMinutes,
      language: parsed.language ?? DEFAULT_SETTINGS.language,
      renderServers: Array.isArray(parsed.renderServers)
        ? parsed.renderServers.filter((s) => s && typeof s.url === 'string' && s.url.trim())
        : DEFAULT_SETTINGS.renderServers,
      mobileRenderEnabled: parsed.mobileRenderEnabled ?? DEFAULT_SETTINGS.mobileRenderEnabled,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
};

export const saveSettings = (settings: AppSettings): void => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
};

// --- IndexedDB: video files (blobs) ---

let dbPromise: Promise<IDBDatabase> | null = null;

const openDb = (): Promise<IDBDatabase> => {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open('revideeo', 2);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('media')) {
        db.createObjectStore('media', { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains('exports')) {
        db.createObjectStore('exports', { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
};

// --- IndexedDB: ostatnie eksporty (Bloby) ---

export interface RecentExport {
  id: string;
  name: string;
  format: VideoExportFormat;
  blob: Blob;
  createdAt: number;
  size: number;
  // False/undefined = not yet manually downloaded from list (counts toward badge).
  downloaded?: boolean;
}

export const addRecentExport = async (exp: RecentExport): Promise<void> => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('exports', 'readwrite');
    tx.objectStore('exports').put(exp);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const listRecentExports = async (limit = 30): Promise<RecentExport[]> => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('exports', 'readonly');
    const request = tx.objectStore('exports').getAll();
    request.onsuccess = () => {
      const all = (request.result as RecentExport[]).sort((a, b) => b.createdAt - a.createdAt);
      resolve(all.slice(0, limit));
    };
    request.onerror = () => reject(request.error);
  });
};

export const deleteRecentExport = async (id: string): Promise<void> => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('exports', 'readwrite');
    tx.objectStore('exports').delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const updateRecentExport = async (exp: RecentExport): Promise<void> => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('exports', 'readwrite');
    tx.objectStore('exports').put(exp);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

const mediaKey = (projectId: string, sourceId: string) => `${projectId}:${sourceId}`;

export const putMedia = async (projectId: string, sourceId: string, blob: Blob): Promise<void> => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('media', 'readwrite');
    tx.objectStore('media').put({ key: mediaKey(projectId, sourceId), blob });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const getMedia = async (projectId: string, sourceId: string): Promise<Blob | null> => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('media', 'readonly');
    const request = tx.objectStore('media').get(mediaKey(projectId, sourceId));
    request.onsuccess = () => resolve(request.result?.blob ?? null);
    request.onerror = () => reject(request.error);
  });
};

export const deleteProjectMedia = async (projectId: string): Promise<void> => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('media', 'readwrite');
    const store = tx.objectStore('media');
    const request = store.openCursor();
    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        if ((cursor.key as string).startsWith(`${projectId}:`)) {
          cursor.delete();
        }
        cursor.continue();
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

// --- Konwersje blob <-> data URL ---

export const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

export const dataUrlToBlob = async (dataUrl: string): Promise<Blob> => {
  const res = await fetch(dataUrl);
  return res.blob();
};

// --- Export / import .reevproj file to disk (JSON + checksum) ---

export interface ExportFile {
  app: 'revideeo';
  version: 1;
  format: 'reevproj';
  checksum: string;
  name: string;
  config: StoredProject['config'];
  clips: StoredClip[];
  assets: MediaAssetMeta[];
  trackCount: number;
  markers?: TimelineMarker[];
  trackSettings?: TrackSettings[];
  media: Record<string, string>;
}

// Canonical serialization — same key order and indentation on save and verify
const canonicalSerialize = (value: unknown): string => JSON.stringify(value, null, 2);

// Pure SHA-256 implementation (no crypto.subtle), so checksum verification
// also works in insecure contexts (http on LAN), where
// crypto.subtle is undefined and throws "Cannot read properties of undefined (reading 'digest')".
const SHA256_K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

export const sha256Hex = async (text: string): Promise<string> => {
  const bytes = new TextEncoder().encode(text);
  const h = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);
  const w = new Uint32Array(64);

  const rotr = (x: number, n: number): number => (x >>> n) | (x << (32 - n));

  const bitLen = bytes.length * 8;
  const total = ((bytes.length + 8) >> 6) * 64 + 64;
  const msg = new Uint8Array(total);
  msg.set(bytes);
  msg[bytes.length] = 0x80;
  const dv = new DataView(msg.buffer);
  dv.setUint32(total - 8, Math.floor(bitLen / 0x100000000));
  dv.setUint32(total - 4, bitLen >>> 0);

  for (let i = 0; i < total; i += 64) {
    for (let j = 0; j < 16; j++) {
      w[j] = dv.getUint32(i + j * 4);
    }
    for (let j = 16; j < 64; j++) {
      const s0 = rotr(w[j - 15], 7) ^ rotr(w[j - 15], 18) ^ (w[j - 15] >>> 3);
      const s1 = rotr(w[j - 2], 17) ^ rotr(w[j - 2], 19) ^ (w[j - 2] >>> 10);
      w[j] = (w[j - 16] + s0 + w[j - 7] + s1) | 0;
    }

    let a = h[0];
    let b = h[1];
    let c = h[2];
    let d = h[3];
    let e = h[4];
    let f = h[5];
    let g = h[6];
    let hh = h[7];

    for (let j = 0; j < 64; j++) {
      const s1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (hh + s1 + ch + SHA256_K[j] + w[j]) | 0;
      const s0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (s0 + maj) | 0;
      hh = g;
      g = f;
      f = e;
      e = (d + t1) | 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) | 0;
    }

    h[0] = (h[0] + a) | 0;
    h[1] = (h[1] + b) | 0;
    h[2] = (h[2] + c) | 0;
    h[3] = (h[3] + d) | 0;
    h[4] = (h[4] + e) | 0;
    h[5] = (h[5] + f) | 0;
    h[6] = (h[6] + g) | 0;
    h[7] = (h[7] + hh) | 0;
  }

  let out = '';
  for (let i = 0; i < 8; i++) {
    out += (h[i] >>> 0).toString(16).padStart(8, '0');
  }
  return out;
};

export const createProjectPayload = async (project: StoredProject, media: Record<string, Blob>): Promise<ExportFile> => {
  const encodedMedia: Record<string, string> = {};
  for (const [sourceId, blob] of Object.entries(media)) {
    encodedMedia[sourceId] = await blobToDataUrl(blob);
  }

  const base: Omit<ExportFile, 'checksum'> = {
    app: 'revideeo',
    version: 1,
    format: 'reevproj',
    name: project.name,
    config: project.config,
    clips: project.clips,
    assets: project.assets,
    trackCount: project.trackCount,
    markers: project.markers ?? [],
    trackSettings: project.trackSettings ?? [],
    media: encodedMedia,
  };

  const checksum = await sha256Hex(canonicalSerialize(base));
  return { ...base, checksum };
};

export const exportProjectFile = async (project: StoredProject, media: Record<string, Blob>): Promise<void> => {
  const payload = await createProjectPayload(project, media);

  const blob = new Blob([canonicalSerialize(payload)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const fileNameBase = serializeName(project.name);
  const noAssets = Object.keys(media).length === 0;
  anchor.href = url;
  anchor.download = `${fileNameBase}${noAssets ? '_noassets' : ''}.reevproj`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

export const readProjectPayload = async (payload: ExportFile): Promise<{ project: StoredProject; media: Record<string, Blob> }> => {
  if (payload.app !== 'revideeo' || payload.format !== 'reevproj' || !payload.checksum || !payload.clips || !payload.media) {
    throw new Error('To nie jest plik projektu ReVideeo (.reevproj)');
  }
  const { checksum, ...rest } = payload;
  const recomputed = await sha256Hex(canonicalSerialize(rest));
  if (recomputed !== checksum.toLowerCase()) throw new Error('Suma kontrolna projektu się nie zgadza.');
  const media: Record<string, Blob> = {};
  for (const [sourceId, dataUrl] of Object.entries(payload.media)) media[sourceId] = await dataUrlToBlob(dataUrl);
  return {
    project: {
      id: generateId(), name: payload.name || 'Projekt z serwera renderu', savedAt: Date.now(), config: payload.config,
      clips: payload.clips.map((clip) => ({ ...clip, trackIndex: clip.trackIndex ?? 0 })), assets: payload.assets ?? [],
      trackCount: payload.trackCount ?? 3, markers: payload.markers ?? [], trackSettings: payload.trackSettings ?? [],
    },
    media,
  };
};

// UUID v4 generated via crypto.getRandomValues — also works in insecure
// contexts (http on LAN), where crypto.randomUUID is unavailable.
export const generateId = (): string => {
  const c = typeof crypto !== 'undefined' ? crypto : undefined;
  if (c && typeof c.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    c.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0'));
    return (
      hex.slice(0, 4).join('') +
      '-' +
      hex.slice(4, 6).join('') +
      '-' +
      hex.slice(6, 8).join('') +
      '-' +
      hex.slice(8, 10).join('') +
      '-' +
      hex.slice(10, 16).join('')
    );
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
};

export const readProjectFile = async (
  file: File,
): Promise<{ project: StoredProject; media: Record<string, Blob> }> => {
  const text = await file.text();
  return readProjectPayload(JSON.parse(text) as ExportFile);
};

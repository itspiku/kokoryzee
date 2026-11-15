// Tiny IndexedDB blob store for voice notes, letters & photos ──
// Everything stays on-device in this prototype.

const DB = 'kokoryze-blobs';
const STORE = 'blobs';
let dbp;

function open() {
  if (dbp) return dbp;
  dbp = new Promise((resolve, reject) => {
    try {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    } catch (e) {
      reject(e);
    }
  });
  return dbp;
}

const mem = new Map(); // fallback when IndexedDB is unavailable

export async function putBlob(id, blob) {
  mem.set(id, blob);
  try {
    const db = await open();
    await new Promise((res, rej) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(blob, id);
      tx.oncomplete = res;
      tx.onerror = () => rej(tx.error);
    });
  } catch {}
  return id;
}

export async function getBlob(id) {
  if (mem.has(id)) return mem.get(id);
  try {
    const db = await open();
    return await new Promise((res, rej) => {
      const tx = db.transaction(STORE, 'readonly');
      const r = tx.objectStore(STORE).get(id);
      r.onsuccess = () => res(r.result || null);
      r.onerror = () => rej(r.error);
    });
  } catch {
    return null;
  }
}

export async function delBlob(id) {
  mem.delete(id);
  try {
    const db = await open();
    await new Promise((res) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = res;
      tx.onerror = res;
    });
  } catch {}
}

export async function clearBlobs() {
  mem.clear();
  try {
    const db = await open();
    await new Promise((res) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).clear();
      tx.oncomplete = res;
      tx.onerror = res;
    });
  } catch {}
}

/** Downscale an image file to a compact JPEG blob. */
export function compressImage(file, max = 900, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const s = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * s);
      c.height = Math.round(img.height * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      c.toBlob((b) => (b ? resolve(b) : reject(new Error('compress failed'))), 'image/jpeg', quality);
      URL.revokeObjectURL(url);
    };
    img.onerror = reject;
    img.src = url;
  });
}

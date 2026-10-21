// 下絵の画像を、この端末のブラウザ（IndexedDB）にだけ保存する。サーバーには送らない。
// localStorage は容量が小さいので画像は IndexedDB に。使えない環境（プライベートブラウズなど）では何もしない。

const DB_NAME = 'loomis-head';
const STORE = 'underlays';

let dbPromise = null;
function db() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

async function run(mode, fn) {
  const d = await db();
  return new Promise((resolve, reject) => {
    const tx = d.transaction(STORE, mode);
    const out = fn(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(out?.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

/** 枠 slot の画像を保存（失敗しても黙って続ける） */
export async function saveImage(slot, blob, name) {
  try { await run('readwrite', (s) => s.put({ blob, name }, slot)); } catch { /* 保存できなくても使える */ }
}

export async function deleteImage(slot) {
  try { await run('readwrite', (s) => s.delete(slot)); } catch { /* なくてよい */ }
}

/** 保存してある画像 { slot: { blob, name } } */
export async function loadImages(slots) {
  const out = {};
  try {
    for (const slot of slots) {
      const v = await run('readonly', (s) => s.get(slot));
      if (v?.blob instanceof Blob) out[slot] = v;
    }
  } catch { /* 読めなければ空のまま */ }
  return out;
}

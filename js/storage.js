/* ==========================================================================
   PTB Online – Persistent Storage (IndexedDB + LocalStorage), Image Compression & Undo/Redo
   ========================================================================== */

(function (global) {
  const PTB = (global.PTB = global.PTB || {});

  const DB_NAME = 'PTB_Online_MemoryBook_v1';
  const STORE_NAME = 'albums';
  const USER_KEY = 'ptb_online_user_v1';
  const FALLBACK_KEY = 'ptb_online_albums_fallback_v1';

  let dbPromise = null;

  function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve) => {
      if (!global.indexedDB) {
        resolve(null);
        return;
      }
      try {
        const req = global.indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          }
        };
        req.onsuccess = (e) => resolve(e.target.result);
        req.onerror = () => resolve(null);
      } catch (err) {
        resolve(null);
      }
    });
    return dbPromise;
  }

  async function getAllAlbums() {
    const db = await openDB();
    if (!db) {
      try {
        const raw = global.localStorage.getItem(FALLBACK_KEY);
        return raw ? JSON.parse(raw) : [];
      } catch {
        return [];
      }
    }
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const list = req.result || [];
        list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
        resolve(list);
      };
      req.onerror = () => resolve([]);
    });
  }

  async function saveAlbum(album) {
    album.updatedAt = Date.now();
    const db = await openDB();
    if (!db) {
      const list = await getAllAlbums();
      const idx = list.findIndex((item) => item.id === album.id);
      if (idx >= 0) list[idx] = album;
      else list.unshift(album);
      try {
        global.localStorage.setItem(FALLBACK_KEY, JSON.stringify(list));
      } catch (e) {
        console.warn('LocalStorage quota reached', e);
      }
      return album;
    }
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(album);
      req.onsuccess = () => resolve(album);
      req.onerror = () => reject(req.error);
    });
  }

  async function deleteAlbum(albumId) {
    const db = await openDB();
    if (!db) {
      const list = (await getAllAlbums()).filter((a) => a.id !== albumId);
      global.localStorage.setItem(FALLBACK_KEY, JSON.stringify(list));
      return;
    }
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(albumId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  }

  function getUserProfile() {
    try {
      const raw = global.localStorage.getItem(USER_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return {
      name: 'Minh Anh',
      loggedIn: false,
      tagline: 'Lưu giữ từng khoảnh khắc nhỏ',
    };
  }

  function saveUserProfile(profile) {
    try {
      global.localStorage.setItem(USER_KEY, JSON.stringify(profile));
    } catch {}
    return profile;
  }

  /**
   * Compresses JPG/PNG/WEBP files onto Canvas so IndexedDB stays fast & spacious
   */
  function compressImageFile(file, maxDim = 1350, quality = 0.86) {
    return new Promise((resolve, reject) => {
      const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (file.type && !allowed.includes(file.type.toLowerCase())) {
        reject(new Error('Định dạng ảnh chưa hỗ trợ. Hãy chọn JPG, JPEG, PNG hoặc WEBP.'));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            const ratio = Math.min(maxDim / width, maxDim / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          const outType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
          resolve(canvas.toDataURL(outType, quality));
        };
        img.onerror = () => reject(new Error('Không thể đọc tệp ảnh này.'));
        img.src = reader.result;
      };
      reader.onerror = () => reject(new Error('Lỗi đọc file từ thiết bị.'));
      reader.readAsDataURL(file);
    });
  }

  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  class HistoryManager {
    constructor(limit = 35) {
      this.limit = limit;
      this.past = [];
      this.future = [];
    }

    reset(initialState) {
      this.past = [deepClone(initialState)];
      this.future = [];
    }

    push(state) {
      const snap = deepClone(state);
      this.past.push(snap);
      if (this.past.length > this.limit) {
        this.past.shift();
      }
      this.future = [];
    }

    canUndo() {
      return this.past.length > 1;
    }

    canRedo() {
      return this.future.length > 0;
    }

    undo() {
      if (!this.canUndo()) return null;
      const current = this.past.pop();
      this.future.push(current);
      return deepClone(this.past[this.past.length - 1]);
    }

    redo() {
      if (!this.canRedo()) return null;
      const next = this.future.pop();
      this.past.push(next);
      return deepClone(next);
    }
  }

  function uid(prefix = 'id') {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  }

  /**
   * Deterministic salted password hash (pure JS so it works offline & on HTTP/file://)
   */
  function hashPassword(raw) {
    const str = String(raw || '').trim();
    if (!str) return '';
    const salted = `MEMORA_VT_2026::${str}`;
    let h1 = 0x811c9dc5;
    let h2 = 0x9e3779b9;
    for (let i = 0; i < salted.length; i++) {
      const code = salted.charCodeAt(i);
      h1 ^= code;
      h1 = Math.imul(h1, 0x01000193);
      h2 ^= code + i;
      h2 = Math.imul(h2, 0x85ebca6b);
    }
    return `h1_${(h1 >>> 0).toString(16).padStart(8, '0')}${(h2 >>> 0).toString(16).padStart(8, '0')}`;
  }

  function verifyPassword(album, raw) {
    if (!album) return false;
    const input = String(raw || '').trim();
    if (!input) return false;
    if (album.passwordHash) {
      return album.passwordHash === hashPassword(input);
    }
    if (album.password) {
      return album.password === input;
    }
    return false;
  }

  PTB.Storage = {
    getAllAlbums,
    saveAlbum,
    deleteAlbum,
    getUserProfile,
    saveUserProfile,
    compressImageFile,
    deepClone,
    HistoryManager,
    uid,
    hashPassword,
    verifyPassword,
  };
})(window);

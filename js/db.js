'use strict';
class PriceTrackerDB {
  constructor() { this.db = null; }

  async init() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('PriceTrackerDB', 1);
      req.onerror = () => reject(req.error);
      req.onsuccess = e => { this.db = e.target.result; resolve(this); };
      req.onupgradeneeded = e => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('products')) {
          const ps = db.createObjectStore('products', { keyPath: 'id' });
          ps.createIndex('isArchived', 'isArchived'); ps.createIndex('category', 'category');
        }
        if (!db.objectStoreNames.contains('stores')) {
          const ss = db.createObjectStore('stores', { keyPath: 'id' });
          ss.createIndex('isArchived', 'isArchived');
        }
        if (!db.objectStoreNames.contains('priceRecords')) {
          const prs = db.createObjectStore('priceRecords', { keyPath: 'id' });
          prs.createIndex('productId', 'productId'); prs.createIndex('storeId', 'storeId');
          prs.createIndex('date', 'date');
        }
      };
    });
  }

  _tx(name, mode = 'readonly') {
    return this.db.transaction(Array.isArray(name) ? name : [name], mode);
  }

  async add(store, data) {
    return new Promise((res, rej) => {
      const req = this._tx(store, 'readwrite').objectStore(store).add(data);
      req.onsuccess = () => res(data); req.onerror = () => rej(req.error);
    });
  }

  async get(store, id) {
    return new Promise((res, rej) => {
      const req = this._tx(store).objectStore(store).get(id);
      req.onsuccess = () => res(req.result || null); req.onerror = () => rej(req.error);
    });
  }

  async getAll(store) {
    return new Promise((res, rej) => {
      const req = this._tx(store).objectStore(store).getAll();
      req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error);
    });
  }

  async put(store, data) {
    return new Promise((res, rej) => {
      const req = this._tx(store, 'readwrite').objectStore(store).put(data);
      req.onsuccess = () => res(data); req.onerror = () => rej(req.error);
    });
  }

  async delete(store, id) {
    return new Promise((res, rej) => {
      const req = this._tx(store, 'readwrite').objectStore(store).delete(id);
      req.onsuccess = () => res(true); req.onerror = () => rej(req.error);
    });
  }

  async getByIndex(store, index, value) {
    return new Promise((res, rej) => {
      const req = this._tx(store).objectStore(store).index(index).getAll(value);
      req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error);
    });
  }

  async exportAll() {
    const [products, stores, priceRecords] = await Promise.all([
      this.getAll('products'), this.getAll('stores'), this.getAll('priceRecords')
    ]);
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      products, stores, priceRecords
    };
  }

  async importAll(data) {
    const stores = ['products', 'stores', 'priceRecords'];
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(stores, 'readwrite');
      tx.onerror = () => reject(tx.error);
      tx.oncomplete = () => resolve(true);
      for (const name of stores) {
        const os = tx.objectStore(name);
        os.clear();
        for (const item of (data[name] || [])) os.put(item);
      }
    });
  }
}
window.db = new PriceTrackerDB();

// IndexedDB utility for offline POS functionality
import { Product } from '@/types';

const DB_NAME = 'pos-offline-db';
const DB_VERSION = 1;

export interface OfflineOrder {
  id: string;
  organizationId: string;
  locationId: string;
  orderNumber: string;
  vertical: string;
  items: OfflineOrderItem[];
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  paymentMethod: string;
  createdBy: string;
  createdAt: string;
  synced: boolean;
  syncError?: string;
}

export interface OfflineOrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface CachedProduct extends Product {
  cachedAt: string;
}

class OfflineDB {
  private db: IDBDatabase | null = null;
  private dbPromise: Promise<IDBDatabase> | null = null;

  async init(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('[OfflineDB] Error opening database:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('[OfflineDB] Database opened successfully');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        console.log('[OfflineDB] Upgrading database...');

        // Create offline orders store
        if (!db.objectStoreNames.contains('offlineOrders')) {
          const ordersStore = db.createObjectStore('offlineOrders', { keyPath: 'id' });
          ordersStore.createIndex('synced', 'synced', { unique: false });
          ordersStore.createIndex('createdAt', 'createdAt', { unique: false });
          ordersStore.createIndex('organizationId', 'organizationId', { unique: false });
        }

        // Create products cache store
        if (!db.objectStoreNames.contains('products')) {
          const productsStore = db.createObjectStore('products', { keyPath: 'id' });
          productsStore.createIndex('organizationId', 'organization_id', { unique: false });
          productsStore.createIndex('cachedAt', 'cachedAt', { unique: false });
        }

        // Create sync queue store
        if (!db.objectStoreNames.contains('syncQueue')) {
          const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
          syncStore.createIndex('type', 'type', { unique: false });
          syncStore.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };
    });

    return this.dbPromise;
  }

  // Offline Orders Methods
  async saveOfflineOrder(order: OfflineOrder): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['offlineOrders'], 'readwrite');
      const store = transaction.objectStore('offlineOrders');
      const request = store.put(order);

      request.onsuccess = () => {
        console.log('[OfflineDB] Order saved:', order.orderNumber);
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getUnsyncedOrders(): Promise<OfflineOrder[]> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['offlineOrders'], 'readonly');
      const store = transaction.objectStore('offlineOrders');
      const index = store.index('synced');
      const request = index.getAll(IDBKeyRange.only(false));

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async markOrderSynced(orderId: string): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['offlineOrders'], 'readwrite');
      const store = transaction.objectStore('offlineOrders');
      const getRequest = store.get(orderId);

      getRequest.onsuccess = () => {
        const order = getRequest.result;
        if (order) {
          order.synced = true;
          const putRequest = store.put(order);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          resolve();
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async markOrderError(orderId: string, error: string): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['offlineOrders'], 'readwrite');
      const store = transaction.objectStore('offlineOrders');
      const getRequest = store.get(orderId);

      getRequest.onsuccess = () => {
        const order = getRequest.result;
        if (order) {
          order.syncError = error;
          const putRequest = store.put(order);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          resolve();
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async getAllOfflineOrders(organizationId?: string): Promise<OfflineOrder[]> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['offlineOrders'], 'readonly');
      const store = transaction.objectStore('offlineOrders');
      const request = organizationId
        ? store.index('organizationId').getAll(IDBKeyRange.only(organizationId))
        : store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteOrder(orderId: string): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['offlineOrders'], 'readwrite');
      const store = transaction.objectStore('offlineOrders');
      const request = store.delete(orderId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Products Cache Methods
  async cacheProducts(products: Product[]): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['products'], 'readwrite');
      const store = transaction.objectStore('products');
      const cachedAt = new Date().toISOString();

      let completed = 0;
      products.forEach((product) => {
        const cachedProduct: CachedProduct = { ...product, cachedAt };
        const request = store.put(cachedProduct);
        request.onsuccess = () => {
          completed++;
          if (completed === products.length) {
            console.log(`[OfflineDB] Cached ${products.length} products`);
            resolve();
          }
        };
        request.onerror = () => reject(request.error);
      });

      if (products.length === 0) resolve();
    });
  }

  async getCachedProducts(organizationId: string): Promise<CachedProduct[]> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['products'], 'readonly');
      const store = transaction.objectStore('products');
      const index = store.index('organizationId');
      const request = index.getAll(IDBKeyRange.only(organizationId));

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async updateProductStock(productId: string, newStock: number): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['products'], 'readwrite');
      const store = transaction.objectStore('products');
      const getRequest = store.get(productId);

      getRequest.onsuccess = () => {
        const product = getRequest.result;
        if (product) {
          product.stock_quantity = newStock;
          const putRequest = store.put(product);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          resolve();
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async clearProductsCache(organizationId?: string): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['products'], 'readwrite');
      const store = transaction.objectStore('products');

      if (organizationId) {
        const index = store.index('organizationId');
        const request = index.openCursor(IDBKeyRange.only(organizationId));
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) {
            cursor.delete();
            cursor.continue();
          } else {
            resolve();
          }
        };
        request.onerror = () => reject(request.error);
      } else {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      }
    });
  }

  // Get database stats
  async getStats(): Promise<{ orders: number; unsyncedOrders: number; products: number }> {
    const db = await this.init();
    
    const getCount = (storeName: string, index?: { name: string; value: any }): Promise<number> => {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = index
          ? store.index(index.name).count(IDBKeyRange.only(index.value))
          : store.count();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    };

    const [orders, unsyncedOrders, products] = await Promise.all([
      getCount('offlineOrders'),
      getCount('offlineOrders', { name: 'synced', value: false }),
      getCount('products'),
    ]);

    return { orders, unsyncedOrders, products };
  }
}

export const offlineDB = new OfflineDB();

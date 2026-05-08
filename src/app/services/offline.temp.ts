import { Injectable, Injector } from '@angular/core';
import { Item } from '../models/item.model';
import { Category } from '../models/category.model';
import { ItemService } from './item.service';
import { CategoryService } from './category.service';
import { Observable, from } from 'rxjs';
import { PendingSync, SyncMeta, SyncStatus } from '../models/sync.model';

@Injectable({
  providedIn: 'root'
})
export class OfflineService {
  private dbName = 'inventoryManagementDB';
  private dbVersion = 2;
  private db: IDBDatabase | null = null;
  private itemService?: ItemService;
  private categoryService?: CategoryService;

  private readonly STORES = {
    ITEMS: 'items',
    CATEGORIES: 'categories',
    PENDING_SYNC: 'pendingSync',
    SYNC_META: 'syncMeta'
  };

  constructor(private injector: Injector) {
    this.initDB().catch(error => {
      console.error('Failed to initialize database:', error);
    });
  }

  private get isInitialized(): boolean {
    return this.db !== null;
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initDB();
    }
  }

  private getItemService(): ItemService {
    if (!this.itemService) {
      this.itemService = this.injector.get(ItemService);
    }
    return this.itemService;
  }

  private getCategoryService(): CategoryService {
    if (!this.categoryService) {
      this.categoryService = this.injector.get(CategoryService);
    }
    return this.categoryService;
  }

  private async initDB(): Promise<void> {
    try {
      // Close any existing database connection
      if (this.db) {
        this.db.close();
        this.db = null;
      }

      // Delete the existing database if it exists
      await new Promise<void>((resolve, reject) => {
        const deleteRequest = indexedDB.deleteDatabase(this.dbName);
        deleteRequest.onsuccess = () => resolve();
        deleteRequest.onerror = () => reject();
      });

      // Open/create new database
      await new Promise<void>((resolve, reject) => {
        const request = indexedDB.open(this.dbName, this.dbVersion);

        request.onerror = (event) => {
          console.error('Database error:', (event.target as IDBOpenDBRequest).error);
          reject((event.target as IDBOpenDBRequest).error);
        };

        request.onsuccess = (event) => {
          this.db = (event.target as IDBOpenDBRequest).result;
          console.log('Database initialized successfully');
          resolve();
        };

        request.onupgradeneeded = (event) => {
          console.log('Database upgrade needed');
          this.db = (event.target as IDBOpenDBRequest).result;
          const db = this.db;

          // Create or update items store
          if (!db.objectStoreNames.contains(this.STORES.ITEMS)) {
            console.log('Creating items store');
            const itemStore = db.createObjectStore(this.STORES.ITEMS, { keyPath: 'id' });
            itemStore.createIndex('categoryId', 'category_id', { unique: false });
            itemStore.createIndex('barcode', 'barcode', { unique: false });
            itemStore.createIndex('updated_at', 'updated_at', { unique: false });
            itemStore.createIndex('sync_status', 'sync_status', { unique: false });
            itemStore.createIndex('version', 'version', { unique: false });
          }

          // Create or update categories store
          if (!db.objectStoreNames.contains(this.STORES.CATEGORIES)) {
            console.log('Creating categories store');
            const categoryStore = db.createObjectStore(this.STORES.CATEGORIES, { keyPath: 'id' });
            categoryStore.createIndex('updated_at', 'updated_at', { unique: false });
            categoryStore.createIndex('sync_status', 'sync_status', { unique: false });
            categoryStore.createIndex('version', 'version', { unique: false });
          }

          // Create or update pending sync store
          if (!db.objectStoreNames.contains(this.STORES.PENDING_SYNC)) {
            console.log('Creating pendingSync store');
            const pendingStore = db.createObjectStore(this.STORES.PENDING_SYNC, { 
              keyPath: 'id', 
              autoIncrement: true 
            });
            pendingStore.createIndex('type', 'type', { unique: false });
            pendingStore.createIndex('status', 'status', { unique: false });
            pendingStore.createIndex('created_at', 'created_at', { unique: false });
          }

          // Create or update sync meta store
          if (!db.objectStoreNames.contains(this.STORES.SYNC_META)) {
            console.log('Creating syncMeta store');
            const metaStore = db.createObjectStore(this.STORES.SYNC_META, { keyPath: 'key' });
            metaStore.createIndex('timestamp', 'timestamp', { unique: false });
          }

          console.log('Database upgrade completed');
        };
      });
    } catch (error) {
      console.error('Error initializing database:', error);
      throw error;
    }
  }

  saveItem(item: Item & { sync_status?: SyncStatus; version?: number }): Observable<void> {
    return from(new Promise<void>((resolve, reject) => {
      if (!this.db) {
        reject('Database not initialized');
        return;
      }

      const transaction = this.db.transaction([this.STORES.ITEMS], 'readwrite');
      const store = transaction.objectStore(this.STORES.ITEMS);

      // Get existing item to preserve version if it exists
      const getRequest = store.get(item.id!);
      
      getRequest.onsuccess = () => {
        const existingItem = getRequest.result;
        const version = existingItem ? (existingItem.version || 0) + 1 : 1;
        
        const itemToSave = {
          ...item,
          sync_status: item.sync_status || 'pending' as SyncStatus,
          version: version,
          updated_at: new Date().toISOString()
        };

        const putRequest = store.put(itemToSave);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = (event) => reject((event.target as IDBRequest).error);
      };

      getRequest.onerror = (event) => reject((event.target as IDBRequest).error);
    }));
  }

  getItems(): Observable<Array<Item & { sync_status?: SyncStatus; version?: number }>> {
    return from(new Promise<Array<Item & { sync_status?: SyncStatus; version?: number }>>((resolve, reject) => {
      if (!this.db) {
        reject('Database not initialized');
        return;
      }
      
      const transaction = this.db.transaction([this.STORES.ITEMS], 'readonly');
      const store = transaction.objectStore(this.STORES.ITEMS);
      const request = store.getAll();
      
      request.onsuccess = (event) => {
        resolve((event.target as IDBRequest).result);
      };
      request.onerror = (event) => reject((event.target as IDBRequest).error);
    }));
  }

  saveCategory(category: Category & { sync_status?: SyncStatus; version?: number }): Observable<void> {
    return from(new Promise<void>((resolve, reject) => {
      if (!this.db) {
        reject('Database not initialized');
        return;
      }
      
      const transaction = this.db.transaction([this.STORES.CATEGORIES], 'readwrite');
      const store = transaction.objectStore(this.STORES.CATEGORIES);

      // Get existing category to preserve version if it exists
      const getRequest = store.get(category.id!);
      
      getRequest.onsuccess = () => {
        const existingCategory = getRequest.result;
        const version = existingCategory ? (existingCategory.version || 0) + 1 : 1;
        
        const categoryToSave = {
          ...category,
          sync_status: category.sync_status || 'pending' as SyncStatus,
          version: version,
          updated_at: new Date().toISOString()
        };

        const putRequest = store.put(categoryToSave);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = (event) => reject((event.target as IDBRequest).error);
      };

      getRequest.onerror = (event) => reject((event.target as IDBRequest).error);
    }));
  }

  getCategories(): Observable<Array<Category & { sync_status?: SyncStatus; version?: number }>> {
    return from(new Promise<Array<Category & { sync_status?: SyncStatus; version?: number }>>((resolve, reject) => {
      if (!this.db) {
        reject('Database not initialized');
        return;
      }
      
      const transaction = this.db.transaction([this.STORES.CATEGORIES], 'readonly');
      const store = transaction.objectStore(this.STORES.CATEGORIES);
      const request = store.getAll();
      
      request.onsuccess = (event) => {
        resolve((event.target as IDBRequest).result);
      };
      request.onerror = (event) => reject((event.target as IDBRequest).error);
    }));
  }

  addPendingSync(operation: PendingSync): Observable<void> {
    return from(new Promise<void>((resolve, reject) => {
      if (!this.db) {
        reject('Database not initialized');
        return;
      }
      
      const transaction = this.db.transaction([this.STORES.PENDING_SYNC], 'readwrite');
      const store = transaction.objectStore(this.STORES.PENDING_SYNC);
      const request = store.add({
        ...operation,
        created_at: new Date().toISOString()
      });
      
      request.onsuccess = () => resolve();
      request.onerror = (event) => reject((event.target as IDBRequest).error);
    }));
  }

  getPendingSync(): Observable<PendingSync[]> {
    return from(new Promise<PendingSync[]>((resolve, reject) => {
      if (!this.db) {
        reject('Database not initialized');
        return;
      }
      
      const transaction = this.db.transaction([this.STORES.PENDING_SYNC], 'readonly');
      const store = transaction.objectStore(this.STORES.PENDING_SYNC);
      const request = store.getAll();
      
      request.onsuccess = (event) => {
        resolve((event.target as IDBRequest).result);
      };
      request.onerror = (event) => reject((event.target as IDBRequest).error);
    }));
  }

  removePendingSync(id: number): Observable<void> {
    return from(new Promise<void>((resolve, reject) => {
      if (!this.db) {
        reject('Database not initialized');
        return;
      }
      
      const transaction = this.db.transaction([this.STORES.PENDING_SYNC], 'readwrite');
      const store = transaction.objectStore(this.STORES.PENDING_SYNC);
      const request = store.delete(id);
      
      request.onsuccess = () => resolve();
      request.onerror = (event) => reject((event.target as IDBRequest).error);
    }));
  }

  private getLastSyncTime(type: 'items' | 'categories'): Observable<string | null> {
    return from(new Promise<string | null>((resolve, reject) => {
      if (!this.db) {
        reject('Database not initialized');
        return;
      }

      const transaction = this.db.transaction([this.STORES.SYNC_META], 'readonly');
      const store = transaction.objectStore(this.STORES.SYNC_META);
      const request = store.get(`lastSync_${type}`);

      request.onsuccess = () => resolve(request.result?.timestamp || null);
      request.onerror = () => resolve(null);
    }));
  }

  private updateLastSyncTime(type: 'items' | 'categories'): Observable<void> {
    return from(new Promise<void>((resolve, reject) => {
      if (!this.db) {
        reject('Database not initialized');
        return;
      }

      const transaction = this.db.transaction([this.STORES.SYNC_META], 'readwrite');
      const store = transaction.objectStore(this.STORES.SYNC_META);
      const request = store.put({
        key: `lastSync_${type}`,
        timestamp: new Date().toISOString()
      });

      request.onsuccess = () => resolve();
      request.onerror = (event) => reject((event.target as IDBRequest).error);
    }));
  }

  private async syncDataWithServer(
    type: 'items' | 'categories',
    serverData: (Item | Category)[],
    offlineData: (Item | Category)[]
  ): Promise<void> {
    const offlineMap = new Map(offlineData.map(item => [item.id!, { ...item, originalId: item.id }]));
    const serverMap = new Map(serverData.map(item => [item.id!, { ...item, originalId: item.id }]));

    // Start transaction
    const transaction = this.db!.transaction([type], 'readwrite');
    const store = transaction.objectStore(type);

    return new Promise<void>((resolveSync, rejectSync) => {
      transaction.oncomplete = () => resolveSync();
      transaction.onerror = () => rejectSync(new Error('Sync transaction failed'));

      // Process updates and inserts
      for (const [id, serverItem] of serverMap.entries()) {
        const offlineItem = offlineMap.get(id);
        
        if (!offlineItem) {
          // New item from server - insert with synced status
          const request = store.add({
            ...serverItem,
            sync_status: 'synced' as SyncStatus,
            version: 1
          });
          request.onerror = () => console.error('Error adding new server item:', serverItem);
        } else {
          // Compare versions and update if needed
          const serverTime = new Date(serverItem.updated_at || '').getTime();
          const offlineTime = new Date(offlineItem.updated_at || '').getTime();
          const offlineStatus = (offlineItem as any).sync_status || 'pending';
          
          if (offlineStatus === 'pending') {
            // Local changes exist - mark as conflict if server version is different
            if (serverTime !== offlineTime) {
              const request = store.put({
                ...offlineItem,
                sync_status: 'conflict' as SyncStatus,
                server_version: serverItem
              });
              request.onerror = () => console.error('Error marking conflict:', offlineItem);
            }
          } else if (serverTime > offlineTime) {
            // Server version is newer - update local copy
            const request = store.put({
              ...serverItem,
              sync_status: 'synced' as SyncStatus,
              version: ((offlineItem as any).version || 0) + 1
            });
            request.onerror = () => console.error('Error updating from server:', serverItem);
          }
        }
      }

      // Handle deletes
      for (const [id, offlineItem] of offlineMap.entries()) {
        if (!serverMap.has(id)) {
          const status = (offlineItem as any).sync_status;
          if (status !== 'pending') {
            // Only delete if there are no pending changes
            const request = store.delete(id);
            request.onerror = () => console.error('Error deleting item:', id);
          }
        }
      }
    });
  }

  syncPendingOperations(): Observable<any> {
    return from(new Promise<any>(async (resolve, reject) => {
      try {
        if (!this.isOnline()) {
          resolve({ success: true, synced: 0, message: 'Device is offline' });
          return;
        }

        // First, sync any pending operations
        const pendingOps = await this.getPendingSync().toPromise();
        let syncedOps = 0;
        
        if (pendingOps && pendingOps.length > 0) {
          for (const op of pendingOps) {
            try {
              switch (op.type) {
                case 'addItem':
                case 'updateItem':
                  await this.getItemService().createItem(op.data).toPromise();
                  break;
                case 'deleteItem':
                  await this.getItemService().deleteItem(op.data.id).toPromise();
                  break;
                case 'addCategory':
                case 'updateCategory':
                  await this.getCategoryService().createCategory(op.data).toPromise();
                  break;
                case 'deleteCategory':
                  await this.getCategoryService().deleteCategory(op.data.id).toPromise();
                  break;
              }
              
              await this.removePendingSync(op.id!).toPromise();
              syncedOps++;
            } catch (error) {
              console.error('Error syncing operation:', error);
            }
          }
        }

        try {
          // Fetch all data from server
          const serverItems = await this.getItemService().getItems().toPromise() || [];
          const serverCategories = await this.getCategoryService().getCategories().toPromise() || [];

          // Fetch current offline data
          const offlineItems = await this.getItems().toPromise() || [];
          const offlineCategories = await this.getCategories().toPromise() || [];

          // Sync items and categories
          await this.syncDataWithServer('items', serverItems, offlineItems);
          await this.syncDataWithServer('categories', serverCategories, offlineCategories);

          // Update last sync times
          await this.updateLastSyncTime('items').toPromise();
          await this.updateLastSyncTime('categories').toPromise();
          
          resolve({ 
            success: true, 
            pendingOpsSynced: syncedOps,
            itemsSynced: serverItems.length,
            categoriesSynced: serverCategories.length,
            syncTime: new Date().toISOString()
          });
        } catch (error) {
          console.error('Error during data sync:', error);
          resolve({
            success: false,
            pendingOpsSynced: syncedOps,
            error: error instanceof Error ? error.message : 'Error during data synchronization'
          });
        }
      } catch (error) {
        reject(error);
      }
    }));
  }

  isOnline(): boolean {
    return navigator.onLine;
  }
}

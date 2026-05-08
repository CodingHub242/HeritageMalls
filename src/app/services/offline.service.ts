import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Item } from '../models/item.model';
import { Category } from '../models/category.model';
import { Activity } from '../models/activity.model';
import { Observable, from } from 'rxjs';
import { SyncMetadata } from '../models/sync.model';

export interface OfflineItem extends Item {
  modifiedAt?: string;
  isModified?: boolean;
  serverId?: string;
}

export interface OfflineCategory extends Category {
  modifiedAt?: string;
  isModified?: boolean;
  serverId?: string;
}

export interface OfflineActivity extends Activity {
  synced?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class OfflineService {
  private dbName = 'inventoryManagementDB';
  private dbVersion = 4; // Increment version for new schema (added activities store)
  private db: IDBDatabase | null = null;
  private readonly STORES = {
    ITEMS: 'items',
    CATEGORIES: 'categories',
    METADATA: 'metadata',
    ACTIVITIES: 'activities'
  };
  private apiUrl = 'https://benlee.codepps.online/api';

  constructor(private http: HttpClient) {
    this.initDB().catch(error => {
      console.error('Failed to initialize database:', error);
    });
  }

  isOnline(): boolean {
    return navigator.onLine;
  }

  saveItem(item: OfflineItem): Observable<void> {
    return from(new Promise<void>((resolve, reject) => {
      if (!this.db) {
        reject('Database not initialized');
        return;
      }

      const itemToSave = {
        ...item,
        modifiedAt: new Date().toISOString(),
        isModified: true
      };

      const transaction = this.db.transaction([this.STORES.ITEMS], 'readwrite');
      const store = transaction.objectStore(this.STORES.ITEMS);
      const request = store.put(itemToSave);
      
      request.onsuccess = () => resolve();
      request.onerror = (event) => reject((event.target as IDBRequest).error);
    }));
  }

  getItems(): Observable<OfflineItem[]> {
    return from(new Promise<OfflineItem[]>((resolve, reject) => {
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

  getModifiedItems(): Observable<OfflineItem[]> {
    return from(new Promise<OfflineItem[]>((resolve, reject) => {
      if (!this.db) {
        reject('Database not initialized');
        return;
      }
      
      const transaction = this.db.transaction([this.STORES.ITEMS], 'readonly');
      const store = transaction.objectStore(this.STORES.ITEMS);
      const index = store.index('isModified');
      const request = index.getAll(IDBKeyRange.only(true));
      
      request.onsuccess = (event) => {
        resolve((event.target as IDBRequest).result);
      };
      request.onerror = (event) => reject((event.target as IDBRequest).error);
    }));
  }

  updateItems(items: OfflineItem[]): Observable<void> {
    return from(new Promise<void>((resolve, reject) => {
      if (!this.db) {
        reject('Database not initialized');
        return;
      }

      const transaction = this.db.transaction([this.STORES.ITEMS], 'readwrite');
      const store = transaction.objectStore(this.STORES.ITEMS);

      let completed = 0;
      const total = items.length;

      items.forEach(item => {
        const request = store.put({
          ...item,
          isModified: false
        });

        request.onsuccess = () => {
          completed++;
          if (completed === total) {
            resolve();
          }
        };

        request.onerror = (event) => reject((event.target as IDBRequest).error);
      });

      if (total === 0) {
        resolve();
      }
    }));
  }

  saveCategory(category: OfflineCategory): Observable<void> {
    return from(new Promise<void>((resolve, reject) => {
      if (!this.db) {
        reject('Database not initialized');
        return;
      }

      const categoryToSave = {
        ...category,
        modifiedAt: new Date().toISOString(),
        isModified: true
      };

      const transaction = this.db.transaction([this.STORES.CATEGORIES], 'readwrite');
      const store = transaction.objectStore(this.STORES.CATEGORIES);
      const request = store.put(categoryToSave);
      
      request.onsuccess = () => resolve();
      request.onerror = (event) => reject((event.target as IDBRequest).error);
    }));
  }

  getCategories(): Observable<OfflineCategory[]> {
    return from(new Promise<OfflineCategory[]>((resolve, reject) => {
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

  getModifiedCategories(): Observable<OfflineCategory[]> {
    return from(new Promise<OfflineCategory[]>((resolve, reject) => {
      if (!this.db) {
        reject('Database not initialized');
        return;
      }
      
      const transaction = this.db.transaction([this.STORES.CATEGORIES], 'readonly');
      const store = transaction.objectStore(this.STORES.CATEGORIES);
      const index = store.index('isModified');
      const request = index.getAll(IDBKeyRange.only(true));
      
      request.onsuccess = (event) => {
        resolve((event.target as IDBRequest).result);
      };
      request.onerror = (event) => reject((event.target as IDBRequest).error);
    }));
  }

  updateCategories(categories: OfflineCategory[]): Observable<void> {
    return from(new Promise<void>((resolve, reject) => {
      if (!this.db) {
        reject('Database not initialized');
        return;
      }

      const transaction = this.db.transaction([this.STORES.CATEGORIES], 'readwrite');
      const store = transaction.objectStore(this.STORES.CATEGORIES);

      let completed = 0;
      const total = categories.length;

      categories.forEach(category => {
        const request = store.put({
          ...category,
          isModified: false
        });

        request.onsuccess = () => {
          completed++;
          if (completed === total) {
            resolve();
          }
        };

        request.onerror = (event) => reject((event.target as IDBRequest).error);
      });

      if (total === 0) {
        resolve();
      }
    }));
  }

  getSyncMetadata(key: string): Observable<any> {
    return from(new Promise((resolve, reject) => {
      if (!this.db) {
        reject('Database not initialized');
        return;
      }

      const transaction = this.db.transaction([this.STORES.METADATA], 'readonly');
      const store = transaction.objectStore(this.STORES.METADATA);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result);
      request.onerror = (event) => reject((event.target as IDBRequest).error);
    }));
  }

  saveSyncMetadata(key: string, data: any): Observable<void> {
    return from(new Promise<void>((resolve, reject) => {
      if (!this.db) {
        reject('Database not initialized');
        return;
      }

      const transaction = this.db.transaction([this.STORES.METADATA], 'readwrite');
      const store = transaction.objectStore(this.STORES.METADATA);
      const request = store.put(data, key);

      request.onsuccess = () => resolve();
      request.onerror = (event) => reject((event.target as IDBRequest).error);
    }));
  }

  getPendingSync(): Observable<any[]> {
    return from(Promise.all([
      this.getModifiedItems().toPromise(),
      this.getModifiedCategories().toPromise()
    ]).then(([items, categories]) => {
      return [...(items || []), ...(categories || [])];
    }));
  }

  syncPendingOperations(): Observable<any> {
    if (!this.isOnline()) {
      return from(Promise.reject('No internet connection'));
    }

    return from(new Promise(async (resolve, reject) => {
      try {
        const modifiedItems = await this.getModifiedItems().toPromise();
        const modifiedCategories = await this.getModifiedCategories().toPromise();
        
        let syncedCount = 0;
        
        // Sync items
        if (modifiedItems && modifiedItems.length > 0) {
          await this.updateItems(modifiedItems).toPromise();
          syncedCount += modifiedItems.length;
        }
        
        // Sync categories
        if (modifiedCategories && modifiedCategories.length > 0) {
          await this.updateCategories(modifiedCategories).toPromise();
          syncedCount += modifiedCategories.length;
        }
        
        resolve({
          success: true,
          synced: syncedCount
        });
      } catch (error) {
        reject(error);
      }
    }));
  }

  private async initDB(): Promise<void> {
    try {
      if (this.db) {
        this.db.close();
        this.db = null;
      }

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

          if (!db.objectStoreNames.contains(this.STORES.ITEMS)) {
            console.log('Creating items store');
            const itemStore = db.createObjectStore(this.STORES.ITEMS, { keyPath: 'id' });
            itemStore.createIndex('categoryId', 'category_id', { unique: false });
            itemStore.createIndex('barcode', 'barcode', { unique: false });
            itemStore.createIndex('updated_at', 'updated_at', { unique: false });
            itemStore.createIndex('isModified', 'isModified', { unique: false });
            itemStore.createIndex('serverId', 'serverId', { unique: false });
          }

          if (!db.objectStoreNames.contains(this.STORES.CATEGORIES)) {
            console.log('Creating categories store');
            const categoryStore = db.createObjectStore(this.STORES.CATEGORIES, { keyPath: 'id' });
            categoryStore.createIndex('updated_at', 'updated_at', { unique: false });
            categoryStore.createIndex('isModified', 'isModified', { unique: false });
            categoryStore.createIndex('serverId', 'serverId', { unique: false });
          }

          if (!db.objectStoreNames.contains(this.STORES.METADATA)) {
            console.log('Creating metadata store');
            db.createObjectStore(this.STORES.METADATA);
          }

          if (!db.objectStoreNames.contains(this.STORES.ACTIVITIES)) {
            console.log('Creating activities store');
            const activityStore = db.createObjectStore(this.STORES.ACTIVITIES, { keyPath: 'id' });
            activityStore.createIndex('time', 'time', { unique: false });
            activityStore.createIndex('type', 'type', { unique: false });
            activityStore.createIndex('synced', 'synced', { unique: false });
          }

          console.log('Database upgrade completed');
        };
      });
    } catch (error) {
      console.error('Error initializing database:', error);
      throw error;
    }
  }

  // Activity methods
  saveActivity(activity: OfflineActivity): Observable<void> {
    return from(new Promise<void>((resolve, reject) => {
      if (!this.db) {
        reject('Database not initialized');
        return;
      }

      const activityToSave = {
        ...activity,
        id: activity.id || Date.now().toString(),
        synced: false
      };

      const transaction = this.db.transaction([this.STORES.ACTIVITIES], 'readwrite');
      const store = transaction.objectStore(this.STORES.ACTIVITIES);
      const request = store.put(activityToSave);
      
      request.onsuccess = () => resolve();
      request.onerror = (event) => reject((event.target as IDBRequest).error);
    }));
  }

  getActivities(limit?: number): Observable<OfflineActivity[]> {
    return from(new Promise<OfflineActivity[]>((resolve, reject) => {
      if (!this.db) {
        reject('Database not initialized');
        return;
      }
      
      const transaction = this.db.transaction([this.STORES.ACTIVITIES], 'readonly');
      const store = transaction.objectStore(this.STORES.ACTIVITIES);
      const index = store.index('time');
      const request = limit ? index.openCursor(null, 'prev') : store.getAll();
      
      if (limit) {
        const results: OfflineActivity[] = [];
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor && results.length < limit) {
            results.push(cursor.value);
            cursor.continue();
          } else {
            resolve(results);
          }
        };
      } else {
        request.onsuccess = (event) => {
          resolve((event.target as IDBRequest).result);
        };
      }
      request.onerror = (event) => reject((event.target as IDBRequest).error);
    }));
  }

  getUnsyncedActivities(): Observable<OfflineActivity[]> {
    return from(new Promise<OfflineActivity[]>((resolve, reject) => {
      if (!this.db) {
        reject('Database not initialized');
        return;
      }
      
      const transaction = this.db.transaction([this.STORES.ACTIVITIES], 'readonly');
      const store = transaction.objectStore(this.STORES.ACTIVITIES);
      const index = store.index('synced');
      const request = index.getAll(IDBKeyRange.only(false));
      
      request.onsuccess = (event) => {
        resolve((event.target as IDBRequest).result);
      };
      request.onerror = (event) => reject((event.target as IDBRequest).error);
    }));
  }

  markActivitiesAsSynced(activityIds: string[]): Observable<void> {
    return from(new Promise<void>((resolve, reject) => {
      if (!this.db) {
        reject('Database not initialized');
        return;
      }

      const transaction = this.db.transaction([this.STORES.ACTIVITIES], 'readwrite');
      const store = transaction.objectStore(this.STORES.ACTIVITIES);

      let completed = 0;
      const total = activityIds.length;

      activityIds.forEach(id => {
        const request = store.get(id);
        request.onsuccess = () => {
          const activity = request.result;
          if (activity) {
            activity.synced = true;
            const updateRequest = store.put(activity);
            updateRequest.onsuccess = () => {
              completed++;
              if (completed === total) {
                resolve();
              }
            };
            updateRequest.onerror = (event) => reject((event.target as IDBRequest).error);
          } else {
            completed++;
            if (completed === total) {
              resolve();
            }
          }
        };
        request.onerror = (event) => reject((event.target as IDBRequest).error);
      });

      if (total === 0) {
        resolve();
      }
    }));
  }

  syncActivities(): Observable<any> {
    if (!this.isOnline()) {
      return from(Promise.reject('No internet connection'));
    }

    return from(new Promise(async (resolve, reject) => {
      try {
        const unsynced = await this.getUnsyncedActivities().toPromise();
        
        if (unsynced && unsynced.length > 0) {
          // Send activities to server
          const token = localStorage.getItem('token');
          await this.http.post(`${this.apiUrl}/activities/batch`, unsynced, {
            headers: { Authorization: `Bearer ${token}` }
          }).toPromise();

          // Mark as synced
          const ids = unsynced.map(a => a.id);
          await this.markActivitiesAsSynced(ids).toPromise();
        }

        resolve({ success: true, synced: unsynced?.length || 0 });
      } catch (error) {
        reject(error);
      }
    }));
  }
}

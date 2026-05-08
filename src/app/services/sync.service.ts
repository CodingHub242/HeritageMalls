import { Injectable } from '@angular/core';
import { OfflineService } from './offline.service';
import { ItemService } from './item.service';
import { CategoryService } from './category.service';
import { Observable, from, forkJoin, of } from 'rxjs';
import { catchError, map, mergeMap } from 'rxjs/operators';
import { Item } from '../models/item.model';
import { Category } from '../models/category.model';
import { AuthService } from './auth.service';

export interface SyncResult {
  success: boolean;
  itemsUploaded: number;
  itemsDownloaded: number;
  categoriesUploaded: number;
  categoriesDownloaded: number;
  errors?: string[];
}

export interface SyncMetadata {
  lastSync: string;
  version: number;
  serverId: string;
}

@Injectable({
  providedIn: 'root'
})
export class SyncService {
  private readonly SYNC_META_KEY = 'syncMetadata';

  constructor(
    private offlineService: OfflineService,
    private itemService: ItemService,
    private categoryService: CategoryService,
    private authService: AuthService
  ) {}

  /**
   * Main sync function that orchestrates the sync process
   */
  sync(): Observable<SyncResult> {
    return this.getSyncMetadata().pipe(
      mergeMap(metadata => {
        // First upload local changes
        return this.uploadLocalChanges().pipe(
          mergeMap(() => {
            // Then download server changes
            return this.downloadServerChanges(metadata?.lastSync);
          })
        );
      }),
      map(result => ({
        ...result,
        success: true
      })),
      catchError(error => {
        console.error('Sync failed:', error);
        return of({
          success: false,
          itemsUploaded: 0,
          itemsDownloaded: 0,
          categoriesUploaded: 0,
          categoriesDownloaded: 0,
          errors: [error.message]
        });
      })
    );
  }

  /**
   * Upload local changes to the server
   */
  private uploadLocalChanges(): Observable<any> {
    return forkJoin({
      items: this.uploadItems(),
      categories: this.uploadCategories()
    });
  }

  /**
   * Upload modified items to the server
   */
  private uploadItems(): Observable<number> {
    return this.offlineService.getModifiedItems().pipe(
      mergeMap(items => {
        const uploads = items.map(item => this.itemService.createOrUpdateItem(item));
        return forkJoin(uploads).pipe(
          map(() => items.length),
          catchError(error => {
            console.error('Error uploading items:', error);
            return of(0);
          })
        );
      })
    );
  }

  /**
   * Upload modified categories to the server
   */
  private uploadCategories(): Observable<number> {
    return this.offlineService.getModifiedCategories().pipe(
      mergeMap(categories => {
        const uploads = categories.map(category => 
          this.categoryService.createOrUpdateCategory(category)
        );
        return forkJoin(uploads).pipe(
          map(() => categories.length),
          catchError(error => {
            console.error('Error uploading categories:', error);
            return of(0);
          })
        );
      })
    );
  }

  /**
   * Download changes from the server
   */
  private downloadServerChanges(lastSync?: string): Observable<any> {
    return forkJoin({
      items: this.downloadItems(lastSync),
      categories: this.downloadCategories(lastSync)
    }).pipe(
      mergeMap(result => {
        // Update sync metadata
        const newMetadata: SyncMetadata = {
          lastSync: new Date().toISOString(),
          version: (result.items.length + result.categories.length),
          serverId: crypto.randomUUID()
        };
        return this.saveSyncMetadata(newMetadata).pipe(
          map(() => result)
        );
      })
    );
  }

  /**
   * Download updated items from the server
   */
  private downloadItems(lastSync?: string): Observable<Item[]> {
    return this.itemService.getItems(lastSync).pipe(
      mergeMap(serverItems => {
        return this.offlineService.updateItems(serverItems).pipe(
          map(() => serverItems)
        );
      }),
      catchError(error => {
        console.error('Error downloading items:', error);
        return of([]);
      })
    );
  }

  /**
   * Download updated categories from the server
   */
  private downloadCategories(lastSync?: string): Observable<Category[]> {
    return this.categoryService.getCategories(lastSync).pipe(
      mergeMap(serverCategories => {
        return this.offlineService.updateCategories(serverCategories).pipe(
          map(() => serverCategories)
        );
      }),
      catchError(error => {
        console.error('Error downloading categories:', error);
        return of([]);
      })
    );
  }

  /**
   * Get the last sync metadata
   */
  private getSyncMetadata(): Observable<SyncMetadata | null> {
    return this.offlineService.getSyncMetadata(this.SYNC_META_KEY);
  }

  /**
   * Save sync metadata
   */
  private saveSyncMetadata(metadata: SyncMetadata): Observable<void> {
    return this.offlineService.saveSyncMetadata(this.SYNC_META_KEY, metadata);
  }
}

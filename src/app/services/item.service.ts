import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Item } from '../models/item.model';
import { OfflineItem, OfflineService } from './offline.service';
import { AuthService } from './auth.service';
import { ActivityService } from './activity.service';

@Injectable({
  providedIn: 'root'
})
export class ItemService {
  private apiUrl = 'https://benlee.codepps.online/api/items';

  constructor(
    private http: HttpClient,
    private offlineService: OfflineService,
    private authService: AuthService,
    private activityService: ActivityService
  ) { }

  private getAuthHeaders() {
    const token = this.authService.getToken();
    if (token) {
      return new HttpHeaders({ Authorization: `Bearer ${token}` });
    }
    return undefined;
  }

  getItems(lastSync?: string): Observable<Item[]> {
    let params = new HttpParams();
    if (lastSync) {
      params = params.set('lastSync', lastSync);
    }
    
    const userId = this.authService.getCurrentUserId();
    if (userId) {
      params = params.set('user_id', userId);
    }
    
    return this.http.get<Item[]>(this.apiUrl, { params, headers: this.getAuthHeaders() }).pipe(
      map(items => items.map(item => ({
        ...item,
        serverId: item.id?.toString()
      })))
    );
  }

  getItem(id: string): Observable<Item> {
    let params = new HttpParams();
    const userId = this.authService.getCurrentUserId();
    if (userId) {
      params = params.set('user_id', userId);
    }
    return this.http.get<Item>(`${this.apiUrl}/${id}`, { params, headers: this.getAuthHeaders() });
  }

  createOrUpdateItem(item: OfflineItem): Observable<Item> {
    const userId = this.authService.getCurrentUserId();
    const itemData = {
      ...item,
      user_id: userId
    };

    const headers = this.getAuthHeaders();
    
    if (item.serverId) {
      // Update existing item
      return this.http.put<Item>(`${this.apiUrl}/${item.serverId}`, itemData, { headers }).pipe(
        map(updatedItem => {
          this.activityService.trackItemUpdated(item.name || item.barcode || 'Unknown Item');
          return updatedItem;
        })
      );
    } else {
      // Create new item
      return this.http.post<Item>(this.apiUrl, itemData, { headers }).pipe(
        map(newItem => {
          this.activityService.trackItemAdded(item.name || item.barcode || 'Unknown Item');
          return newItem;
        })
      );
    }
  }

  deleteItem(id: string): Observable<void> {
    // Get item name before deleting for activity log
    const itemName = 'Item'; // We'll need to fetch this properly or pass it
    return this.http.delete<void>(`${this.apiUrl}/${id}`, { headers: this.getAuthHeaders() }).pipe(
      map(() => {
        this.activityService.trackItemDeleted(itemName);
        return;
      })
    );
  }

  searchByBarcode(barcode: string): Observable<Item> {
    let params = new HttpParams();
    const userId = this.authService.getCurrentUserId();
    if (userId) {
      params = params.set('user_id', userId);
    }
    return this.http.get<Item>(`${this.apiUrl}/search/${barcode}`, { params, headers: this.getAuthHeaders() });
  }

  importFromExcel(formData: FormData): Observable<any> {
    const userId = this.authService.getCurrentUserId();
    formData.append('user_id', userId?.toString() ?? '');
    const headers = this.getAuthHeaders();
    return this.http.post(`${this.apiUrl}/import`, formData, { headers });
  }

  importItemsJson(items: any[]): Observable<any> {
    const userId = this.authService.getCurrentUserId();
    const data = {
      items: items,
      user_id: userId
    };
    const headers = this.getAuthHeaders();
    return this.http.post(`${this.apiUrl}/import`, data, { headers });
  }
  
  fetchOnlineInfo(barcode: string): Observable<any> {
    const userId = this.authService.getCurrentUserId();
    const headers = this.getAuthHeaders();
    return this.http.post(`${this.apiUrl}/online-info`, { 
      barcode,
      user_id: userId
    }, { headers });
  }

  uploadImage(itemId: string, imageFile: File): Observable<any> {
    const formData = new FormData();
    formData.append('image', imageFile);
    const headers = this.getAuthHeaders();
    return this.http.post(`${this.apiUrl}/${itemId}/image`, formData, { headers });
  }

  updateQuantity(itemId: string, quantity: number): Observable<Item> {
    const headers = this.getAuthHeaders();
    return this.http.patch<Item>(`${this.apiUrl}/${itemId}`, { quantity }, { headers }).pipe(
      map(updatedItem => {
        this.activityService.trackStockUpdate(updatedItem.name || updatedItem.barcode || 'Unknown Item', quantity);
        return updatedItem;
      })
    );
  }

  createItem(formData: FormData): Observable<Item> {
    const userId = this.authService.getCurrentUserId();
    if (userId) {
      formData.append('user_id', userId.toString());
    }
    const headers = this.getAuthHeaders();
    return this.http.post<Item>(this.apiUrl, formData, { headers });
  }

  updateItem(id: string, formData: FormData): Observable<Item> {
    const userId = this.authService.getCurrentUserId();
    if (userId) {
      formData.append('user_id', userId.toString());
    }
    const headers = this.getAuthHeaders();
    // Using PUT for full updates with FormData
    return this.http.post<Item>(`${this.apiUrl}/${id}`, formData, { headers });
  }
}
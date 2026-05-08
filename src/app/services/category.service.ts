import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Category } from '../models/category.model';
import { OfflineCategory, OfflineService } from './offline.service';
import { AuthService } from './auth.service';
import { ActivityService } from './activity.service';

@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  private apiUrl = 'https://benlee.codepps.online/api/categories';

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

  getCategories(lastSync?: string): Observable<Category[]> {
    let params = new HttpParams();
    if (lastSync) {
      params = params.set('lastSync', lastSync);
    }
    
    const userId = this.authService.getCurrentUserId();
    if (userId) {
      params = params.set('user_id', userId);
    }
    
    return this.http.get<Category[]>(this.apiUrl, { params, headers: this.getAuthHeaders() }).pipe(
      map(categories => categories.map(category => ({
        ...category,
        serverId: category.id?.toString()
      })))
    );
  }

  getCategory(id: string): Observable<Category> {
    let params = new HttpParams();
    const userId = this.authService.getCurrentUserId();
    if (userId) {
      params = params.set('user_id', userId);
    }
    return this.http.get<Category>(`${this.apiUrl}/${id}`, { params, headers: this.getAuthHeaders() });
  }

  createOrUpdateCategory(category: OfflineCategory): Observable<Category> {
    const userId = this.authService.getCurrentUserId();
    const categoryData = {
      ...category,
      user_id: userId
    };

    const headers = this.getAuthHeaders();
    
    if (category.serverId) {
      // Update existing category
      return this.http.put<Category>(`${this.apiUrl}/${category.serverId}`, categoryData, { headers }).pipe(
        map(updatedCategory => {
          this.activityService.trackCategoryUpdated(category.name || 'Unknown Category');
          return updatedCategory;
        })
      );
    } else {
      // Create new category
      return this.http.post<Category>(this.apiUrl, categoryData, { headers }).pipe(
        map(newCategory => {
          this.activityService.trackCategoryAdded(category.name || 'Unknown Category');
          return newCategory;
        })
      );
    }
  }

  deleteCategory(id: string): Observable<void> {
    // Laravel backend expects GET request to /delete/{id}
    let params = new HttpParams();
    const userId = this.authService.getCurrentUserId();
    if (userId) {
      params = params.set('user_id', userId);
    }
    const headers = this.getAuthHeaders();
    return this.http.get<void>(`${this.apiUrl}/delete/${id}`, { params, headers }).pipe(
      map(() => {
        this.activityService.trackCategoryDeleted('Category');
        return;
      })
    );
  }
}
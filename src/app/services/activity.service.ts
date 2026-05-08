import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { OfflineService, OfflineActivity } from './offline.service';
import { Activity } from '../models/activity.model';
import { AuthService } from './auth.service';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

export interface BackendActivity {
  id: number;
  type: string;
  item: string;
  details: string;
  user_id: number;
  user_name: string;
  created_at: string;
  synced: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ActivityService {
  private readonly RECENT_ACTIVITY_LIMIT = 20;
  private apiUrl = 'https://benlee.codepps.online/api';

  constructor(
    private http: HttpClient,
    private offlineService: OfflineService,
    private authService: AuthService
  ) { }

  trackActivity(activity: Partial<Activity>): void {
    const userId = this.authService.getCurrentUserId();
    const newActivity: OfflineActivity = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      type: activity.type || 'updated',
      item: activity.item || 'Unknown',
      time: activity.time || new Date().toISOString(),
      user: activity.user || userId?.toString() || 'Anonymous',
      details: activity.details,
      synced: false
    };

    this.offlineService.saveActivity(newActivity).subscribe({
      next: () => console.log('Activity tracked:', newActivity),
      error: (err) => console.error('Failed to track activity:', err)
    });
  }

  trackLogin(): void {
    const user = this.authService.getUser();
    this.trackActivity({
      type: 'added',
      item: 'User Login',
      details: user?.name ? user.name + ' logged in to the system' : 'User logged in to the system'
    });
  }

  trackLogout(): void {
    const user = this.authService.getUser();
    this.trackActivity({
      type: 'deleted',
      item: 'User Logout',
      details: user?.name ? user.name + ' logged out of the system' : 'User logged out of the system'
    });
  }

  trackPasswordChange(): void {
    this.trackActivity({
      type: 'updated',
      item: 'User Password',
      details: 'Account password was changed'
    });
  }

  trackItemAdded(itemName: string, details?: string): void {
    this.trackActivity({
      type: 'added',
      item: 'Item: ' + itemName,
      details: details || 'New item added to inventory'
    });
  }

  trackItemUpdated(itemName: string, details?: string): void {
    this.trackActivity({
      type: 'updated',
      item: 'Item: ' + itemName,
      details: details || 'Item information updated'
    });
  }

  trackItemDeleted(itemName: string): void {
    this.trackActivity({
      type: 'deleted',
      item: 'Item: ' + itemName,
      details: 'Item removed from inventory'
    });
  }

  trackStockUpdate(itemName: string, quantity: number): void {
    this.trackActivity({
      type: 'stocked',
      item: 'Item: ' + itemName,
      details: 'Stock level updated (' + quantity + ' units)'
    });
  }

  trackCategoryAdded(categoryName: string): void {
    this.trackActivity({
      type: 'added',
      item: 'Category: ' + categoryName,
      details: 'New category created'
    });
  }

  trackCategoryUpdated(categoryName: string): void {
    this.trackActivity({
      type: 'updated',
      item: 'Category: ' + categoryName,
      details: 'Category information updated'
    });
  }

  trackCategoryDeleted(categoryName: string): void {
    this.trackActivity({
      type: 'deleted',
      item: 'Category: ' + categoryName,
      details: 'Category removed'
    });
  }

getRecentActivities(limit: number = this.RECENT_ACTIVITY_LIMIT): Observable<Activity[]> {
    return this.offlineService.getActivities(limit);
  }

  /**
   * Get recent activities from backend API
   */
  getBackendRecentActivities(): Observable<BackendActivity[]> {
    const token = this.authService.getToken();
    if (!token) {
      return of([]);
    }

    return this.http.get<BackendActivity[]>(`${this.apiUrl}/activity/recent`, {
      headers: { Authorization: `Bearer ${token}` }
    }).pipe(
      catchError(error => {
        console.error('Error fetching recent activities:', error);
        return of([]);
      })
    );
  }

  /**
   * Get all activities from backend API (admin only)
   */
  getBackendAllActivities(): Observable<BackendActivity[]> {
    const token = this.authService.getToken();
    if (!token) {
      return of([]);
    }

    return this.http.get<BackendActivity[]>(`${this.apiUrl}/activity`, {
      headers: { Authorization: `Bearer ${token}` }
    }).pipe(
      catchError(error => {
        console.error('Error fetching all activities:', error);
        return of([]);
      })
    );
  }

  syncActivities(): Observable<any> {
    return this.offlineService.syncActivities();
  }
}

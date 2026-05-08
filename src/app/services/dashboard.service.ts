import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable, forkJoin, from, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { Activity } from '../models/activity.model';
import { AuthService } from './auth.service';
import * as idb from 'idb';

interface SyncQueueItem {
  id: string;
  status: 'pending' | 'completed' | 'error';
  timestamp: number;
  data: any;
}

export interface DashboardStats {
  totalItems: number;
  lowStock: number;
  categories: number;
  recentActivity: Activity[];
  pendingSyncs?: number;
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private apiUrl = 'https://benlee.codepps.online/api';
  private db = idb.openDB('inventory-app', 1, {
    upgrade(db: idb.IDBPDatabase) {
      const syncStore = db.createObjectStore('sync-queue', { keyPath: 'id' });
      syncStore.createIndex('status', 'status');
      syncStore.createIndex('timestamp', 'timestamp');
    }
  });

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) { }

  private getAuthHeaders() {
    const token = this.authService.getToken();
    if (token) {
      return new HttpHeaders({ Authorization: `Bearer ${token}` });
    }
    return undefined;
  }

  async getPendingSyncCount(): Promise<number> {
    const db = await this.db;
    return await db.getAllFromIndex('sync-queue', 'status', 'pending').then((items: SyncQueueItem[]) => items.length);
  }

  getDashboardStats(): Observable<DashboardStats> {
    console.log('Starting getDashboardStats...');
    
    // Create individual requests with error handling
    let params = new HttpParams();
    const userId = this.authService.getCurrentUserId();
    if (userId) {
      params = params.set('user_id', userId);
    }

    const statsRequest = this.http.get<{totalItems: number; lowStock: number; categories: number}>(
      `${this.apiUrl}/dashboard/stats`,
      { params, headers: this.getAuthHeaders() }
    ).pipe(
      map(response => {
        console.log('Stats response received:', response);
        return response;
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('Stats request failed:', error);
        // Return a default stats object instead of failing
        return of({ totalItems: 0, lowStock: 0, categories: 0 });
      })
    );

    const activityRequest = this.http.get<Activity[]>(
      `${this.apiUrl}/activity/recent`,
      { params, headers: this.getAuthHeaders() }
    ).pipe(
      map(response => {
        console.log('Activity response received:', response);
        return response;
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('Activity request failed:', error);
        return of([] as Activity[]); // Return empty array instead of failing
      })
    );

    const syncRequest = from(this.getPendingSyncCount()).pipe(
      map(count => {
        console.log('Sync count received:', count);
        return count;
      }),
      catchError((error: Error) => {
        console.error('Sync count request failed:', error);
        return of(0);
      })
    );

    type ApiResponse = {
      stats: {totalItems: number; lowStock: number; categories: number};
      activity: Activity[];
      pendingSyncs: number;
    };

    // Combine all requests with forkJoin
    return forkJoin({
      stats: statsRequest,
      activity: activityRequest,
      pendingSyncs: syncRequest
    }).pipe(
      map((results: ApiResponse) => {
        console.log('All requests completed. Results:', results);
        
        const dashboardStats: DashboardStats = {
          totalItems: results.stats.totalItems || 0,
          lowStock: results.stats.lowStock || 0,
          categories: results.stats.categories || 0,
          recentActivity: results.activity || [],
          pendingSyncs: results.pendingSyncs || 0
        };

        console.log('Final dashboard stats:', dashboardStats);
        return dashboardStats;
      }),
      catchError((error: unknown) => {
        console.error('Error in forkJoin:', error);
        // Return a default dashboard stats object if everything fails
        const defaultStats: DashboardStats = {
          totalItems: 0,
          lowStock: 0,
          categories: 0,
          recentActivity: [],
          pendingSyncs: 0
        };
        return of(defaultStats);
      })
    );
  }

  private getRecentActivity(): Observable<Activity[]> {
    let params = new HttpParams();
    const userId = this.authService.getCurrentUserId();
    if (userId) {
      params = params.set('user_id', userId);
    }
    return this.http.get<Activity[]>(`${this.apiUrl}/activity/recent`, { params, headers: this.getAuthHeaders() });
  }

  // Test method to verify stats endpoint directly
  testStatsEndpoint(): Observable<{totalItems: number; lowStock: number; categories: number}> {
    console.log('Testing stats endpoint directly...');
    let params = new HttpParams();
    const userId = this.authService.getCurrentUserId();
    if (userId) {
      params = params.set('user_id', userId);
    }
    return this.http.get<{totalItems: number; lowStock: number; categories: number}>(
      `${this.apiUrl}/dashboard/stats`,
      { params, headers: this.getAuthHeaders() }
    ).pipe(
      map(response => {
        console.log('Direct stats test response:', response);
        return response;
      })
    );
  }
}

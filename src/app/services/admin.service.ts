import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Activity } from '../models/activity.model';
import { UserService, User, UserCount } from './user.service';

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
export class AdminService {
  private apiUrl = 'https://benlee.codepps.online/api';

  constructor(
    private http: HttpClient,
    private userService: UserService
  ) { }

  /**
   * Get all users (admin only)
   */
  getUsers(): Observable<User[]> {
    return this.userService.getUsers();
  }

  /**
   * Get user counts (admin only)
   */
  getUserCount(): Observable<UserCount> {
    return this.userService.getUserCount();
  }

  /**
   * Get all activities (admin only)
   */
  getAllActivities(): Observable<BackendActivity[]> {
    return this.http.get<BackendActivity[]>(`${this.apiUrl}/activity`, {
      headers: { Authorization: `Bearer ${this.userService.getToken()}` }
    });
  }

  /**
   * Get recent activities (for all users)
   */
  getRecentActivities(): Observable<BackendActivity[]> {
    return this.http.get<BackendActivity[]>(`${this.apiUrl}/activity/recent`, {
      headers: { Authorization: `Bearer ${this.userService.getToken()}` }
    });
  }

  /**
   * Create new user (admin only)
   */
  createUser(name: string, email: string, password: string, role: 'admin' | 'attendant'): Observable<any> {
    return this.userService.createUser(name, email, password, role);
  }

  /**
   * Update user role (admin only)
   */
  updateUserRole(id: number, role: 'admin' | 'attendant'): Observable<any> {
    return this.userService.updateUserRole(id, role);
  }

  /**
   * Delete user (admin only)
   */
  deleteUser(id: number): Observable<any> {
    return this.userService.deleteUser(id);
  }
}

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'attendant';
  created_at: string;
  updated_at: string;
}

export interface UserCount {
  total: number;
  admins: number;
  attendants: number;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = 'https://benlee.codepps.online/api';

  constructor(private http: HttpClient) { }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  /**
   * Get all users (admin only)
   */
  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/admin/users`, {
      headers: { Authorization: `Bearer ${this.getToken()}` }
    });
  }

  /**
   * Get single user (admin only)
   */
  getUser(id: number): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/admin/users/${id}`, {
      headers: { Authorization: `Bearer ${this.getToken()}` }
    });
  }

  /**
   * Create new user (admin only)
   */
  createUser(name: string, email: string, password: string, role: 'admin' | 'attendant'): Observable<any> {
    return this.http.post(`${this.apiUrl}/admin/users`, {
      name,
      email,
      password,
      role
    }, {
      headers: { Authorization: `Bearer ${this.getToken()}` }
    });
  }

  /**
   * Update user role (admin only)
   */
  updateUserRole(id: number, role: 'admin' | 'attendant'): Observable<any> {
    return this.http.put(`${this.apiUrl}/admin/users/${id}/role`, { role }, {
      headers: { Authorization: `Bearer ${this.getToken()}` }
    });
  }

  /**
   * Delete user (admin only)
   */
  deleteUser(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/admin/users/${id}`, {
      headers: { Authorization: `Bearer ${this.getToken()}` }
    });
  }

  /**
   * Get user counts (admin only)
   */
  getUserCount(): Observable<UserCount> {
    return this.http.get<UserCount>(`${this.apiUrl}/admin/users/count`, {
      headers: { Authorization: `Bearer ${this.getToken()}` }
    });
  }
}

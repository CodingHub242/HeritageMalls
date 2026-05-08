import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, finalize, catchError } from 'rxjs/operators';
import { OfflineService } from './offline.service';

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'attendant';
  created_at: string;
  updated_at: string;
}

export interface LoginResponse {
  user: User;
  token: string;
}

export interface RegisterResponse {
  user: User;
  token: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'https://benlee.codepps.online/api';
  private _currentUser: User | null = null;

  get currentUser(): User | null {
    if (!this._currentUser) {
      const storedUser = this.getUser();
      if (storedUser) {
        this._currentUser = storedUser;
      }
    }
    return this._currentUser;
  }
  
  // Token refresh interval (15 minutes)
  private tokenRefreshInterval: any;

  constructor(private http: HttpClient) { }

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, { email, password }).pipe(
      map(response => {
        this.setToken(response.token);
        this.setUser(response.user);
        return response;
      })
    );
  }

  register(name: string, email: string, password: string, passwordConfirmation: string): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(`${this.apiUrl}/register`, {
      name,
      email,
      password,
      password_confirmation: passwordConfirmation
    }).pipe(
      map(response => {
        this.setToken(response.token);
        this.setUser(response.user);
        return response;
      })
    );
  }

  logout(): Observable<any> {
    const token = this.getToken();
    if (token) {
      return this.http.post(`${this.apiUrl}/logout`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      }).pipe(
        finalize(() => {
          this.clearStorage();
        })
      );
    } else {
      this.clearStorage();
      return of(null);
    }
  }
  
  clearStorage(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this._currentUser = null;
  }

  setToken(token: string): void {
    localStorage.setItem('token', token);
  }
  
  setUser(user: User): void {
    this._currentUser = user;
    localStorage.setItem('user', JSON.stringify(user));
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  getCurrentUserId(): number | null {
    return this.currentUser?.id ?? null;
  }

  isAdmin(): boolean {
    return this.currentUser?.role === 'admin';
  }

  removeToken(): void {
    localStorage.removeItem('token');
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }
  
  isAuthenticated(): boolean {
    return this.isLoggedIn();
  }
  
  getUser(): User | null {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) as User : null;
  }
  
  // Start token refresh interval
  startTokenRefresh() {
    // Clear any existing interval
    if (this.tokenRefreshInterval) {
      clearInterval(this.tokenRefreshInterval);
    }
    
    // Set up new interval
    this.tokenRefreshInterval = setInterval(() => {
      this.refreshToken().subscribe();
    }, 15 * 60 * 1000); // 15 minutes
  }
  
  // Stop token refresh interval
  stopTokenRefresh() {
    if (this.tokenRefreshInterval) {
      clearInterval(this.tokenRefreshInterval);
      this.tokenRefreshInterval = null;
    }
  }
  
  // Refresh token
  refreshToken(): Observable<any> {
    const token = this.getToken();
    if (token) {
      return this.http.post(`${this.apiUrl}/refresh`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      }).pipe(
        map((response: any) => {
          if (response.token) {
            this.setToken(response.token);
          }
          return response;
        }),
        catchError((error) => {
          // If refresh fails, logout user
          this.logout();
          return of(null);
        })
      );
    } else {
      return of(null);
    }
  }

  changePassword(currentPassword: string, newPassword: string): Observable<any> {
    const token = this.getToken();
    return this.http.post(`${this.apiUrl}/change-password`, {
      current_password: currentPassword,
      password: newPassword,
      password_confirmation: newPassword
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
  }
}
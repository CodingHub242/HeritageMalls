import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

export interface DailySales {
  date: string;
  totalSales: number;
  totalItemsSold: number;
  transactions: number;

  total_sales?: any;
  total_items_sold?: any;
}

export interface MonthlySales {
  month: string;
  totalSales: number;
  totalItemsSold: number;
  transactions: number;

  total_sales?: any;
  total_items_sold?: any;
}

export interface YearlySales {
  year: string;
  totalSales: number;
  totalItemsSold: number;
  transactions: number;

  total_sales?: any;
  total_items_sold?: any;
}

export interface ItemBreakdown {
  itemId: string;
  itemName: string;
  totalSold: number;
  totalRevenue: number;
}

@Injectable({
  providedIn: 'root'
})
export class SalesReportsService {
  private apiUrl = 'https://benlee.codepps.online/api/sales-reports';

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

  getDailySales(): Observable<DailySales[]> {
    return this.http.get<DailySales[]>(`${this.apiUrl}/daily`, { headers: this.getAuthHeaders() });
  }

  getMonthlySales(): Observable<MonthlySales[]> {
    return this.http.get<MonthlySales[]>(`${this.apiUrl}/monthly`, { headers: this.getAuthHeaders() });
  }

  getYearlySales(): Observable<YearlySales[]> {
    return this.http.get<YearlySales[]>(`${this.apiUrl}/yearly`, { headers: this.getAuthHeaders() });
  }

  getItemBreakdown(): Observable<ItemBreakdown[]> {
    return this.http.get<ItemBreakdown[]>(`${this.apiUrl}/breakdown`, { headers: this.getAuthHeaders() });
  }
}
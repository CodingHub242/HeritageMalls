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

export interface SalesItemDetail {
  itemId: string;
  itemName: string;
  barcode: string;
  quantity: number;
  total_revenue: number;

  name?: string;
  quantity_sold?: any;
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

  getDailyItems(date: string): Observable<SalesItemDetail[]> {
    return this.http.get<SalesItemDetail[]>(`${this.apiUrl}/daily/${date}/items`, { headers: this.getAuthHeaders() });
  }

  getMonthlyItems(month: string): Observable<SalesItemDetail[]> {
    return this.http.get<SalesItemDetail[]>(`${this.apiUrl}/monthly/${month}/items`, { headers: this.getAuthHeaders() });
  }

  getYearlyItems(year: string): Observable<SalesItemDetail[]> {
    return this.http.get<SalesItemDetail[]>(`${this.apiUrl}/yearly/${year}/items`, { headers: this.getAuthHeaders() });
  }
}
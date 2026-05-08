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
  saleId: string; // Added for delete/update operations

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

deleteItem(saleId: string | number, itemId: string | number): Observable<any> {
    // Ensure IDs are integers
    const saleIdNum = Number(saleId);
    const itemIdNum = Number(itemId);
    
    if (isNaN(saleIdNum) || isNaN(itemIdNum) || saleIdNum <= 0 || itemIdNum <= 0) {
      throw new Error('Invalid sale ID or item ID');
    }
    
    return this.http.delete(`${this.apiUrl}/${saleIdNum}/items/${itemIdNum}`, { headers: this.getAuthHeaders() });
  }

  updateItemQuantity(saleId: string | number, itemId: string | number, quantity: number): Observable<any> {
    // Ensure IDs are integers
    const saleIdNum = Number(saleId);
    const itemIdNum = Number(itemId);
    const quantityNum = Math.floor(Number(quantity));
    
    if (isNaN(saleIdNum) || isNaN(itemIdNum) || saleIdNum <= 0 || itemIdNum <= 0) {
      throw new Error('Invalid sale ID or item ID');
    }
    
    if (isNaN(quantityNum) || quantityNum <= 0) {
      throw new Error('Invalid quantity');
    }
    
    return this.http.put(`${this.apiUrl}/${saleIdNum}/items/${itemIdNum}`, { quantity: quantityNum }, { headers: this.getAuthHeaders() });
  }
}
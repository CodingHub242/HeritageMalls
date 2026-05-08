import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { ActivityService } from './activity.service';

@Injectable({
  providedIn: 'root'
})
export class SaleService {
  private apiUrl = 'https://benlee.codepps.online/api/sales';

  constructor(
    private http: HttpClient,
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

  createSale(saleData: any): Observable<any> {
    return this.http.post(this.apiUrl, saleData, { headers: this.getAuthHeaders() }).pipe(
      map((response: any) => {
        const items = saleData.items || [];
        const itemCount = items.length;
        const totalAmount = saleData.total_amount || 0;
        this.activityService.trackActivity({
          type: 'added',
          item: 'Sale',
          details: `Sale created: ${itemCount} items, total $${totalAmount}`
        });
        return response;
      })
    );
  }

  getSales(): Observable<any> {
    return this.http.get(this.apiUrl, { headers: this.getAuthHeaders() });
  }

  getSale(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}`, { headers: this.getAuthHeaders() });
  }
}
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SalesReportsService, SalesItemDetail } from '../services/sales-reports.service';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { saveAs } from 'file-saver';

@Component({
  selector: 'app-sales-detail',
  templateUrl: './sales-detail.page.html',
  styleUrls: ['./sales-detail.page.scss'],
  standalone: false
})
export class SalesDetailPage implements OnInit {
  period: 'daily' | 'monthly' | 'yearly' = 'daily';
  periodValue: string = '';
  items: SalesItemDetail[] = [];
  loading = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private salesReportsService: SalesReportsService
  ) {}

  ngOnInit() {
    this.period = this.route.snapshot.paramMap.get('period') as any;
    this.periodValue = this.route.snapshot.paramMap.get('value') || '';

    if (this.period && this.periodValue) {
      this.loadItems();
    }
  }

  loadItems() {
    this.loading = true;
    let obs$: any;

    switch (this.period) {
      case 'daily':
        obs$ = this.salesReportsService.getDailyItems(this.periodValue);
        break;
      case 'monthly':
        obs$ = this.salesReportsService.getMonthlyItems(this.periodValue);
        break;
      case 'yearly':
        obs$ = this.salesReportsService.getYearlyItems(this.periodValue);
        break;
      default:
        this.loading = false;
        return;
    }

    obs$.subscribe({
      next: (data:any) => {
        this.items = data;
        console.log('Loaded items:', data);
        this.loading = false;
      },
      error: (err:any) => {
        console.error('Error loading items:', err);
        this.loading = false;
      }
    });
  }

  goBack() {
    this.router.navigate(['/admin']);
  }

  exportToCsv() {
    if (this.items.length === 0) return;

    const headers = ['Item Name', 'Barcode', 'Quantity', 'Total Revenue (GHS)'];
    const rows = this.items.map(item => [
      item.itemName || item.name || 'Unknown Item',
      item.barcode || '',
      item.quantity.toString(),
      Number(item.total_revenue).toFixed(2)
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(field => `"${field}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `sales-${this.period}-${this.periodValue}.csv`);
  }
}
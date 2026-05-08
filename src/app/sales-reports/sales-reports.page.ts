import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SalesReportsService } from '../services/sales-reports.service';
import { DailySales, MonthlySales, YearlySales, ItemBreakdown } from '../services/sales-reports.service';
import { ChartConfiguration, ChartData, ChartEvent, ChartType } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';

@Component({
  selector: 'app-sales-reports',
  templateUrl: './sales-reports.page.html',
  styleUrls: ['./sales-reports.page.scss'],
  standalone: false
})
export class SalesReportsPage implements OnInit {
  dailySales: DailySales[] = [];
  monthlySales: MonthlySales[] = [];
  yearlySales: YearlySales[] = [];
  itemBreakdown: ItemBreakdown[] = [];

  // Chart properties
  public dailyChartData: ChartData<'line'> = {
    labels: [],
    datasets: [
      {
        data: [],
        label: 'Daily Sales (GHS)',
        fill: true,
        tension: 0.4,
        borderColor: '#667eea',
        backgroundColor: 'rgba(102, 126, 234, 0.1)'
      }
    ]
  };
  public dailyChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value: any) => 'GHS ' + value
        }
      }
    }
  };
  public dailyChartType: ChartType = 'pie';

  public monthlyChartData: ChartData<'bar'> = {
    labels: [],
    datasets: [
      {
        data: [],
        label: 'Monthly Sales (GHS)',
        backgroundColor: '#764ba2'
      }
    ]
  };
  public monthlyChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value: any) => 'GHS ' + value
        }
      }
    }
  };
  public monthlyChartType: ChartType = 'bar';

  public yearlyChartData: ChartData<'bar'> = {
    labels: [],
    datasets: [
      {
        data: [],
        label: 'Yearly Sales (GHS)',
        backgroundColor: '#f093fb'
      }
    ]
  };
  public yearlyChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value: any) => 'GHS ' + value
        }
      }
    }
  };
  public yearlyChartType: ChartType = 'bar';

  public itemChartData: ChartData<'doughnut'> = {
    labels: [],
    datasets: [
      {
        data: [],
        backgroundColor: [
          '#ff9a9e',
          '#fad0c4',
          '#fad0c4',
          '#a1c4fd',
          '#c2e9fb',
          '#a8edea',
          '#fed6e3',
          '#fbc2eb'
        ]
      }
    ]
  };
  public itemChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'right' as const
      }
    }
  };
  public itemChartType: ChartType = 'doughnut';

  constructor(
    private salesReportsService: SalesReportsService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadDailySales();
    this.loadMonthlySales();
    this.loadYearlySales();
    this.loadItemBreakdown();
  }

  loadDailySales() {
    this.salesReportsService.getDailySales().subscribe(
      (data) => {
        this.dailySales = data;
        // Update daily chart
        this.dailyChartData.labels = data.map((item:any) => item.date);
        this.dailyChartData.datasets[0].data = data.map((item:any) => item.total_sales);
      },
      (error) => {
        console.error('Error loading daily sales:', error);
      }
    );
  }

  loadMonthlySales() {
    this.salesReportsService.getMonthlySales().subscribe(
      (data) => {
        this.monthlySales = data;
        // Update monthly chart
        this.monthlyChartData.labels = data.map((item:any) => item.month);
        this.monthlyChartData.datasets[0].data = data.map((item:any) => item.total_sales);
      },
      (error) => {
        console.error('Error loading monthly sales:', error);
      }
    );
  }

  loadYearlySales() {
    this.salesReportsService.getYearlySales().subscribe(
      (data) => {
        this.yearlySales = data;
        // Update yearly chart
        this.yearlyChartData.labels = data.map(item => item.year);
        this.yearlyChartData.datasets[0].data = data.map(item => item.total_sales);
      },
      (error) => {
        console.error('Error loading yearly sales:', error);
      }
    );
  }

  loadItemBreakdown() {
    this.salesReportsService.getItemBreakdown().subscribe(
      (data) => {
        this.itemBreakdown = data;
        // Update item breakdown chart (top 5 items)
        const topItems = data.slice(0, 5);
        this.itemChartData.labels = topItems.map(item => item.itemName);
        this.itemChartData.datasets[0].data = topItems.map(item => item.totalSold);
      },
      (error) => {
        console.error('Error loading item breakdown:', error);
      }
    );
  }

  goback() {
    window.history.back();
  }

  goToDailyDetail(date: string) {
    this.router.navigate(['/sales-detail/daily', date]);
  }

  goToMonthlyDetail(month: string) {
    this.router.navigate(['/sales-detail/monthly', month]);
  }

  goToYearlyDetail(year: string) {
    this.router.navigate(['/sales-detail/yearly', year]);
  }

  goToItemDetail(itemId: string) {
    this.router.navigate(['/item-details', itemId]);
  }
}

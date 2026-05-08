import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { DashboardService, DashboardStats } from '../services/dashboard.service';
import { ActivityType, Activity } from '../models/activity.model';
import { Subscription, timer } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage implements OnInit, OnDestroy {
  currentUser:any;
  showSyncStatus = true;
  stats: DashboardStats = {
    totalItems: 0,
    lowStock: 0,
    categories: 0,
    recentActivity: []
  };

  loading = true;
  error: string | null = null;
  private autoRefreshSubscription?: Subscription;

  constructor(
    private router: Router,
    private dashboardService: DashboardService,
    private cdr: ChangeDetectorRef,
    private authService: AuthService // Assuming AuthService is used to get current user
  ) {}

  ngOnInit() {
    this.currentUser = this.authService.currentUser;
    
    this.loadDashboardStats();
    this.setupAutoRefresh();
  }

  ngOnDestroy() {
    if (this.autoRefreshSubscription) {
      this.autoRefreshSubscription.unsubscribe();
    }
  }

  private setupAutoRefresh() {
    // Auto refresh every 5 minutes
    this.autoRefreshSubscription = timer(300000, 300000).subscribe(() => {
      this.loadDashboardStats();
    });
  }

  private loadDashboardStats() {
    this.loading = true;
    this.error = null;

    console.log('Starting dashboard stats load...');

    // Get the full dashboard stats
    this.dashboardService.getDashboardStats().subscribe({
      next: (stats) => {
        console.log('Component received stats:', stats);
        if (!stats) {
          console.error('Received null or undefined stats');
          this.error = 'Invalid data received from server';
          this.loading = false;
          return;
        }

        // Update the stats with strict typing
        this.stats = {
          totalItems: Number(stats.totalItems) || 0,
          lowStock: Number(stats.lowStock) || 0,
          categories: Number(stats.categories) || 0,
          recentActivity: Array.isArray(stats.recentActivity) ? stats.recentActivity : [],
          pendingSyncs: Number(stats.pendingSyncs) || 0
        };

        console.log('Component stats updated:', this.stats);
        this.loading = false;
        
        // Force view update
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Error loading dashboard stats:', err);
        
        // Set a more specific error message based on the error
        if (err.status === 0) {
          this.error = 'Unable to connect to the server. Please check your internet connection.';
        } else if (err.status === 401) {
          this.error = 'Session expired. Please log in again.';
        } else {
          this.error = 'Failed to load dashboard statistics. Please try again later.';
        }
        
        this.loading = false;
        this.cdr.detectChanges();
      },
      complete: () => {
        console.log('Dashboard stats subscription completed');
      }
    });
  }

  getActivityIcon(type: ActivityType): string {
    switch (type) {
      case 'added':
        return 'add-circle-outline';
      case 'updated':
        return 'refresh-outline';
      case 'deleted':
        return 'trash-outline';
      case 'stocked':
        return 'cube-outline';
      default:
        return 'ellipse-outline';
    }
  }

  getActivityColor(type: ActivityType): string {
    switch (type) {
      case 'added':
        return 'success';
      case 'updated':
        return 'primary';
      case 'deleted':
        return 'danger';
      case 'stocked':
        return 'warning';
      default:
        return 'medium';
    }
  }

  refresh() {
    this.loadDashboardStats();
  }

  toggleSyncStatus() {
    this.showSyncStatus = !this.showSyncStatus;
  }

  startSelling() {
    this.router.navigate(['/pos']);
  }

  adminSide() {
    this.router.navigate(['/admin']);
  }
}

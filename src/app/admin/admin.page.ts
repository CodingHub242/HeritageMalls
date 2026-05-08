import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit } from '@angular/core';
import { AlertController, LoadingController } from '@ionic/angular';
import { AuthService, User } from '../services/auth.service';
import { ActivityService, BackendActivity } from '../services/activity.service';
import { UserService, UserCount } from '../services/user.service';
import { SalesReportsService } from '../services/sales-reports.service';
import { DailySales, MonthlySales, YearlySales, ItemBreakdown } from '../services/sales-reports.service';
import { ChartConfiguration, ChartData, ChartEvent, ChartType } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.page.html',
  styleUrls: ['./admin.page.scss'],
 // standalone: false,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [CommonModule, BaseChartDirective]
})
export class AdminPage implements OnInit {
  dailySales: DailySales[] = [];
  monthlySales: MonthlySales[] = [];
  yearlySales: YearlySales[] = [];
  itemBreakdown: ItemBreakdown[] = [];
  // User data
  currentUser: User | null = null;
  isAdmin = false;
  
  // Stats
  stats: UserCount = { total: 0, admins: 0, attendants: 0 };
  
  // Users list
  users: User[] = [];
  
  // Activities
  activities: BackendActivity[] = [];
  
  // Loading states
  loading = false;
  loadingMessage = '';
  
// Active tab
  activeTab: 'users' | 'activities' | 'sales' = 'users';
  
  // User role filter
  userRoleFilter: 'all' | 'admin' | 'attendant' = 'all';
  
  // Create user form
  showCreateUserForm = false;
  newUser = {
    name: '',
    email: '',
    password: '',
    role: 'attendant' as 'admin' | 'attendant'
  };

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
    private authService: AuthService,
    private activityService: ActivityService,
    private userService: UserService,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private salesReportsService: SalesReportsService
  ) {}

  ngOnInit() {
    this.loadCurrentUser();
    this.loadDailySales();
    this.loadMonthlySales();
    this.loadYearlySales();
    this.loadItemBreakdown();
  }

  ionViewWillEnter() {
    this.loadCurrentUser();
  }

  loadCurrentUser() {
    this.currentUser = this.authService.getUser();
    this.isAdmin = this.authService.isAdmin();
    
    if (this.isAdmin) {
      this.loadStats();
      this.loadUsers();
      this.loadActivities();
    }
  }

  async showLoading(message: string) {
    const loading = await this.loadingController.create({
      message: message,
      duration: 3000
    });
    await loading.present();
  }

  loadStats() {
    this.userService.getUserCount().subscribe({
      next: (data) => {
        this.stats = data;
      },
      error: (err) => {
        console.error('Error loading stats:', err);
      }
    });
  }

  loadUsers() {
    this.userService.getUsers().subscribe({
      next: (data) => {
        this.users = data;
      },
      error: (err) => {
        console.error('Error loading users:', err);
      }
    });
  }

  loadActivities() {
    this.activityService.getBackendRecentActivities().subscribe({
      next: (data) => {
        this.activities = data;
      },
      error: (err) => {
        console.error('Error loading activities:', err);
      }
    });
  }

  loadAllActivities() {
    this.activityService.getBackendAllActivities().subscribe({
      next: (data) => {
        this.activities = data;
      },
      error: (err) => {
        console.error('Error loading all activities:', err);
      }
    });
  }

toggleTab(tab: string | number | undefined) {
    const tabString = String(tab);
    if (!tabString || (tabString !== 'users' && tabString !== 'activities' && tabString !== 'sales')) return;
    this.activeTab = tabString as 'users' | 'activities' | 'sales';
    if (tab === 'activities') {
      this.loadAllActivities();
    } else {
      this.loadUsers();
    }
  }

  toggleUserRoleFilter(filter: string | number | undefined) {
    const filterString = String(filter);
    if (filterString === 'all' || filterString === 'admin' || filterString === 'attendant') {
      this.userRoleFilter = filterString;
    }
  }

  getFilteredUsers(): User[] {
    if (this.userRoleFilter === 'all') {
      return this.users;
    }
    return this.users.filter(user => user.role === this.userRoleFilter);
  }

toggleCreateUserForm() {
    this.showCreateUserForm = !this.showCreateUserForm;
    if (!this.showCreateUserForm) {
      this.resetNewUserForm();
    }
  }

  resetNewUserForm() {
    this.newUser = {
      name: '',
      email: '',
      password: '',
      role: 'attendant'
    };
  }

  async createUser() {
    if (!this.newUser.name || !this.newUser.email || !this.newUser.password) {
      const alert = await this.alertController.create({
        header: 'Error',
        message: 'Please fill in all fields',
        buttons: ['OK']
      });
      await alert.present();
      return;
    }

    this.loading = true;
    this.loadingMessage = 'Creating user...';

    this.userService.createUser(
      this.newUser.name,
      this.newUser.email,
      this.newUser.password,
      this.newUser.role
    ).subscribe({
      next: async (response) => {
        this.loading = false;
        this.showCreateUserForm = false;
        this.resetNewUserForm();
        this.loadUsers();
        this.loadStats();
        
        const alert = await this.alertController.create({
          header: 'Success',
          message: 'User created successfully',
          buttons: ['OK']
        });
        await alert.present();
      },
      error: async (err) => {
        this.loading = false;
        const alert = await this.alertController.create({
          header: 'Error',
          message: err.error?.message || 'Failed to create user',
          buttons: ['OK']
        });
        await alert.present();
      }
    });
  }

  async updateUserRole(user: User, newRole: 'admin' | 'attendant') {
    if (user.role === newRole) return;

    const alert = await this.alertController.create({
      header: 'Confirm',
      message: `Change ${user.name}'s role to ${newRole}?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Confirm',
          handler: () => {
            this.userService.updateUserRole(user.id, newRole).subscribe({
              next: () => {
                user.role = newRole;
                this.loadUsers();
                this.loadStats();
              },
              error: async (err) => {
                const errorAlert = await this.alertController.create({
                  header: 'Error',
                  message: err.error?.message || 'Failed to update role',
                  buttons: ['OK']
                });
                await errorAlert.present();
              }
            });
          }
        }
      ]
    });
    await alert.present();
  }

  async deleteUser(user: User) {
    const alert = await this.alertController.create({
      header: 'Confirm Delete',
      message: `Are you sure you want to delete ${user.name}?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete',
          handler: () => {
            this.userService.deleteUser(user.id).subscribe({
              next: () => {
                this.loadUsers();
                this.loadStats();
              },
              error: async (err) => {
                const errorAlert = await this.alertController.create({
                  header: 'Error',
                  message: err.error?.message || 'Failed to delete user',
                  buttons: ['OK']
                });
                await errorAlert.present();
              }
            });
          }
        }
      ]
    });
    await alert.present();
  }

  async logout() {
    this.authService.logout().subscribe();
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  getActivityTypeClass(type: string): string {
    switch (type) {
      case 'added':
        return 'activity-added';
      case 'updated':
        return 'activity-updated';
      case 'deleted':
        return 'activity-deleted';
      case 'stock_update':
        return 'activity-stock';
      default:
        return '';
    }
  }

  getActivityIcon(type: string): string {
    switch (type) {
      case 'added':
        return 'add-circle';
      case 'updated':
        return 'create';
      case 'deleted':
        return 'trash';
      case 'stock_update':
        return 'cube';
      default:
        return 'information-circle';
    }
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

  goBack() {
    window.history.back();
  }
}

import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ActivityService } from '../services/activity.service';
import { Activity } from '../models/activity.model';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
  standalone: false,
})
export class SettingsPage implements OnInit {
  profilePhoto: string | null = null;
  user: any = null;
  currentTheme = 'light';
  notificationsEnabled = false;
  autoSyncEnabled = false;
  isAdmin = false;
  
  // Password change
  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  isChangingPassword = false;
  passwordChangeMessage: string | null = null;
  passwordChangeError: string | null = null;
  
  // Activity history
  recentActivities: Activity[] = [];
  showPasswordSection = true;
  showActivityHistory = true;

  constructor(
    private router: Router,
    private authService: AuthService,
    private activityService: ActivityService
  ) { }

  ngOnInit() {
    // Load profile photo from localStorage
    this.profilePhoto = localStorage.getItem('profilePhoto');
    
    // Load user information
    const userString = localStorage.getItem('user');
    if (userString) {
      this.user = JSON.parse(userString);
      this.isAdmin = this.user.role === 'admin';
    }
    
    // Load theme from localStorage
    this.currentTheme = localStorage.getItem('theme') || 'light';
    document.body.classList.remove('dark', 'light');
    document.body.classList.add(this.currentTheme);

    // Load toggle states from localStorage
    this.notificationsEnabled = localStorage.getItem('notificationsEnabled') === 'true';
    this.autoSyncEnabled = localStorage.getItem('autoSyncEnabled') === 'true';
    
    // Load recent activities
    this.loadRecentActivities();
  }

  changeTheme(event: any) {
    const theme = event.detail.value;
    document.body.classList.remove('dark', 'light');
    document.body.classList.add(theme);
    this.currentTheme = theme;
    localStorage.setItem('theme', theme);
  }

  changeProfilePhoto() {
    // Create file input element
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    input.onchange = (event: any) => {
      const file = event.target.files[0];
      if (file) {
        // Read the file as a data URL
        const reader = new FileReader();
        reader.onload = (e: any) => {
          const imageData = e.target.result;
          
          // Save to localStorage (in a real app, you would upload to a server)
          localStorage.setItem('profilePhoto', imageData);
          
          // Update profile photo property
          this.profilePhoto = imageData;
          
          console.log('Profile photo updated');
        };
        reader.readAsDataURL(file);
      }
    };
    
    input.click();
  }

  toggleSplashScreen(event: any) {
    const enabled = event.detail.checked;
    localStorage.setItem('splashScreenEnabled', enabled.toString());
  }

  toggleNotifications(event: any) {
    const enabled = event.detail.checked;
    localStorage.setItem('notificationsEnabled', enabled.toString());
  }

  toggleAutoSync(event: any) {
    const enabled = event.detail.checked;
    localStorage.setItem('autoSyncEnabled', enabled.toString());
  }

  clearCache() {
    // Clear localStorage
    localStorage.clear();
    
    // Clear IndexedDB (if using)
    if (indexedDB) {
      const deleteReq = indexedDB.deleteDatabase('inventoryManagementDB');
      deleteReq.onsuccess = () => {
        console.log('Cache cleared successfully');
      };
      deleteReq.onerror = (event) => {
        console.error('Error clearing cache:', event);
      };
    }
  }

  logout() {
    // Track logout activity before logging out
    this.activityService.trackLogout();
    
    this.authService.logout().subscribe(
      () => {
        this.authService.removeToken();
        this.router.navigate(['/login']);
      },
      (error) => {
        console.error('Error logging out:', error);
        // Even if there's an error, remove the token and navigate to login
        this.authService.removeToken();
        this.router.navigate(['/login']);
      }
    );
  }

  goToSalesReports() {
    this.router.navigate(['/sales-reports']);
  }

  goToAdminPanel() {
    this.router.navigate(['/admin']);
  }

  loadRecentActivities() {
    this.activityService.getRecentActivities().subscribe({
      next: (activities) => this.recentActivities = activities,
      error: (err) => console.error('Failed to load activities:', err)
    });
  }

  changePassword() {
    // Reset messages
    this.passwordChangeMessage = null;
    this.passwordChangeError = null;

    // Validation
    if (!this.currentPassword) {
      this.passwordChangeError = 'Please enter your current password';
      return;
    }
    if (!this.newPassword) {
      this.passwordChangeError = 'Please enter a new password';
      return;
    }
    if (this.newPassword.length < 6) {
      this.passwordChangeError = 'New password must be at least 6 characters';
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.passwordChangeError = 'New passwords do not match';
      return;
    }

    this.isChangingPassword = true;

    this.authService.changePassword(this.currentPassword, this.newPassword).subscribe({
      next: (response) => {
        this.isChangingPassword = false;
        this.passwordChangeMessage = response.message || 'Password changed successfully';
        this.currentPassword = '';
        this.newPassword = '';
        this.confirmPassword = '';
        
        // Track password change activity
        this.activityService.trackPasswordChange();
      },
      error: (error) => {
        this.isChangingPassword = false;
        this.passwordChangeError = error.error?.message || 'Failed to change password. Please check your current password.';
      }
    });
  }

  getActivityIcon(type: string): string {
    switch (type) {
      case 'added': return 'add-circle-outline';
      case 'updated': return 'create-outline';
      case 'deleted': return 'trash-outline';
      case 'stocked': return 'cube-outline';
      default: return 'information-circle-outline';
    }
  }

  getActivityColor(type: string): string {
    switch (type) {
      case 'added': return 'success';
      case 'updated': return 'primary';
      case 'deleted': return 'danger';
      case 'stocked': return 'warning';
      default: return 'medium';
    }
  }
}

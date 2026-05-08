import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { AuthService } from './services/auth.service';
import { PopoverController } from '@ionic/angular';
import { ProfilePopoverComponent } from './profile-popover/profile-popover.component';
import { filter } from 'rxjs/operators';
import { ActivityService } from './services/activity.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit, OnDestroy {
  isLoggedIn = false;
  user: any = null;
  defaultProfileImage = 'assets/img/default.jpg';
  private onlineSubscription!: Subscription;

  constructor(
    private authService: AuthService,
    public router: Router,
    private popoverController: PopoverController,
    private activityService: ActivityService
  ) {}

  ngOnInit() {
    this.checkAuthStatus();
    
    // Subscribe to router events to update auth status
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.checkAuthStatus();
    });

    // Listen for online/offline events to sync activities
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
  }

  ngOnDestroy() {
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    if (this.onlineSubscription) {
      this.onlineSubscription.unsubscribe();
    }
  }

  private handleOnline = () => {
    console.log('App is online - syncing activities');
    this.activityService.syncActivities().subscribe({
      next: (result) => console.log('Activities synced:', result),
      error: (err) => console.error('Failed to sync activities:', err)
    });
  };

  private handleOffline = () => {
    console.log('App is offline - activities will be stored locally');
  };

  checkAuthStatus() {
    this.isLoggedIn = this.authService.isLoggedIn();
    this.user = this.authService.getUser();
  }

  async presentPopover(ev: any) {
    const popover = await this.popoverController.create({
      component: ProfilePopoverComponent,
      event: ev,
      translucent: true,
      cssClass: 'profile-popover'
    });
    return await popover.present();
  }

  logout() {
    this.authService.logout().subscribe(() => {
      this.isLoggedIn = false;
      this.user = null;
      this.router.navigate(['/landing']);
    });
  }
}

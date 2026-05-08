import { Component } from '@angular/core';
import { PopoverController } from '@ionic/angular';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-profile-popover',
  standalone:false,
  template: `
    <ion-list>
      <ion-item style="cursor:pointer;" (click)="goToSettings()">
        <ion-icon name="settings-outline" slot="start"></ion-icon>
        <ion-label>Settings</ion-label>
      </ion-item>
      <ion-item style="cursor:pointer;" (click)="logout()">
        <ion-icon name="log-out-outline" slot="start"></ion-icon>
        <ion-label>Logout</ion-label>
      </ion-item>
    </ion-list>
  `,
})
export class ProfilePopoverComponent {
  constructor(
    private popoverController: PopoverController,
    private authService: AuthService,
    private router: Router
  ) {}

  goToSettings() {
    this.popoverController.dismiss();
    this.router.navigate(['/settings']);
  }

  logout() {
    this.authService.logout().subscribe(() => {
      this.popoverController.dismiss();
      this.router.navigate(['/landing']);
    });
  }
}

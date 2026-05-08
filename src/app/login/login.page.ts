import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ActivityService } from '../services/activity.service';
import { ToastController } from '@ionic/angular';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false,
})
export class LoginPage implements OnInit {
  credentials = {
    email: '',
    password: ''
  };

  showPassword = false;

  constructor(
    private router: Router,
    private authService: AuthService,
    private activityService: ActivityService,
    private toastController: ToastController
  ) { }

  ngOnInit() {
    // If user is already logged in, redirect to home
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/home']);
    }
  }

  login() {
    this.authService.login(this.credentials.email, this.credentials.password).subscribe(
      (response) => {
        console.log('Login successful:', response);
        // Track login activity
        this.activityService.trackLogin();
        this.router.navigate(['/home']);
      },
async (error) => {
        console.error('Login error:', error);
        // Show error message to user using toast
        const toast = await this.toastController.create({
          message: 'Login failed. Please check your credentials.',
          duration: 3000,
          color: 'danger',
          position: 'top'
        });
        await toast.present();
      }
    );
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  goToRegister() {
    this.router.navigate(['/register']);
  }

  goToLanding() {
    this.router.navigate(['/']);
  }
}

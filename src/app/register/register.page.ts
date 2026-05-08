import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ToastController } from '@ionic/angular';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: false,
})
export class RegisterPage implements OnInit {
  credentials = {
    name: '',
    email: '',
    password: '',
    password_confirmation: ''
  };

  showPassword = false;

  constructor(
    private router: Router,
    private authService: AuthService,
    private toastController: ToastController
  ) { }

  ngOnInit() {
    // If user is already logged in, redirect to home
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/home']);
    }
  }

  register() {
    this.authService.register(
      this.credentials.name,
      this.credentials.email,
      this.credentials.password,
      this.credentials.password_confirmation
    ).subscribe(
      (response) => {
        this.router.navigate(['/home']);
      },
async (error:any) => {
        console.error('Registration error:', error.error.message || error.message || 'Unknown error');
        // Show error message to user using toast
        const toast = await this.toastController.create({
          message: error.error.message || error.message || 'Registration failed.',
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

  goToLogin() {
    this.router.navigate(['/login']);
  }
}

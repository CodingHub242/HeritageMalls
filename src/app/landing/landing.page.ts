import { Component, OnInit } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-landing',
  templateUrl: './landing.page.html',
  styleUrls: ['./landing.page.scss'],
  standalone: false,
})
export class LandingPage implements OnInit {
credentials = {
    email: 'demo@test.com',
    password: '12345678'
  };
  constructor(private authService:AuthService, private router:Router) { }

  ngOnInit() {
     if (this.authService.isLoggedIn()) {
      this.router.navigate(['/home']);
    }
  }

  startFreeTrial() {
     this.authService.login(this.credentials.email, this.credentials.password).subscribe(
      (response) => {
        console.log('Login successful:', response);
        this.router.navigate(['/home']);
      },
      (error) => {
        console.error('Login error:', error);
        // Show error message to user
        alert('Login failed. Please check your credentials.');
      }
    );
    // Logic to start the free trial

  }

}

import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private router: Router
  ) { }

  canActivate(): boolean {
    if (this.authService.isLoggedIn()) {
      if (this.authService.isAdmin()) {
        return true;
      } else {
        // Redirect non-admins to home
        this.router.navigate(['/home']);
        return false;
      }
    } else {
      this.router.navigate(['/landing']);
      return false;
    }
  }
}

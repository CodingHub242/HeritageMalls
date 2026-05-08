import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-tutorial',
  templateUrl: './tutorial.page.html',
  styleUrls: ['./tutorial.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule]
})
export class TutorialPage {
  steps = [
    {
      number: 1,
      title: 'Navigate the Dashboard',
      description: 'The home screen provides an overview of your inventory status, including total items, low stock alerts, and recent activity.',
      icon: 'home-outline'
    },
    {
      number: 2,
      title: 'Manage Items',
      description: 'Add, edit, or delete inventory items. Use the barcode scanner to quickly add new products or search for existing ones.',
      icon: 'bag-handle-outline'
    },
    {
      number: 3,
      title: 'Process Sales',
      description: 'Use the POS (Point of Sale) system to process transactions, manage sales, and track revenue in real-time.',
      icon: 'card-outline'
    },
    {
      number: 4,
      title: 'Scan Barcodes',
      description: 'Use the built-in scanner to quickly identify products. The app supports both QR codes and traditional barcodes.',
      icon: 'scan-outline'
    },
    {
      number: 5,
      title: 'View Reports',
      description: 'Access detailed sales reports and analytics to understand your business performance and make informed decisions.',
      icon: 'stats-chart-outline'
    },
    {
      number: 6,
      title: 'Manage Categories',
      description: 'Organize your inventory into categories for easier management and reporting.',
      icon: 'list-outline'
    }
  ];

  constructor(private router: Router) {}

  goToHome(): void {
    this.router.navigate(['/home']);
  }

  skipTutorial(): void {
    this.router.navigate(['/home']);
  }
}

import { Component } from '@angular/core';
import { ItemService } from '../services/item.service';
import { Item } from '../models/item.model';
import { Router } from '@angular/router';

@Component({
  selector: 'app-scan',
  templateUrl: './scan.component.html',
  styleUrls: ['./scan.component.scss'],
  standalone: false,
})
export class ScanComponent {
  scannedItem: Item | null = null;

  constructor(
    private itemService: ItemService,
    private router: Router
  ) { }

  scanBarcode() {
    // In a real app, this would use a barcode scanning library
    // For now, we'll simulate a scan with a prompt
    const barcode = prompt('Enter barcode:');
    if (barcode) {
      this.itemService.searchByBarcode(barcode).subscribe(
        (item: Item) => {
          this.scannedItem = item;
        },
        (error) => {
          console.error('Error scanning barcode:', error);
          alert('Item not found');
        }
      );
    }
  }

  viewItemDetails(id: number | undefined) {
    if (id === undefined) return;
    this.router.navigate(['/items', id]);
  }
}

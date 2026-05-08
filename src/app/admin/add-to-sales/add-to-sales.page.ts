import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit } from '@angular/core';
import { ItemService } from '../../services/item.service';
import { ScannerService, ScanResult } from '../../services/scanner.service';
import { SaleService } from '../../services/sale.service';
import { Item } from '../../models/item.model';
import { 
  IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon, IonContent, 
  IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonGrid, IonRow, IonCol,
  IonSearchbar, IonLabel, IonList, IonItem, IonBadge, IonSpinner, IonSelect, 
  IonSelectOption, IonDatetime, AlertController, LoadingController
} from '@ionic/angular';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface SelectedItem {
  item: Item;
  quantity: number;
}

@Component({
  selector: 'app-add-to-sales',
  templateUrl: './add-to-sales.page.html',
  styleUrls: ['./add-to-sales.page.scss'],
  standalone: false,
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AddToSalesPage implements OnInit {
  // Search
  searchQuery = '';
  searchResults: Item[] = [];
  allItems: Item[] = [];
  isSearching = false;

  // Selected items for sale
  selectedItems: SelectedItem[] = [];

  // Scanner
  isScanning = false;
  scanError: string | null = null;

  // Custom date
  saleDate: string;

  // Payment method
  paymentMethod: 'cash' | 'card' | 'mobile_money' = 'cash';

  // Loading
  loading = false;
  loadingMessage = '';

  constructor(
    private itemService: ItemService,
    private scannerService: ScannerService,
    private saleService: SaleService,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private router: Router
  ) {
    // Default to current date/time
    const now = new Date();
    this.saleDate = now.toISOString().slice(0, 16);
  }

  ngOnInit() {
    this.loadAllItems();
  }

async loadAllItems() {
    this.isSearching = true;
    try {
      this.itemService.getItems().subscribe({
        next: (items) => {
          this.allItems = items;
          this.searchResults = items;
          this.isSearching = false;
        },
        error: (err) => {
          console.error('Error loading items:', err);
          this.isSearching = false;
        }
      });
    } catch (error) {
      this.isSearching = false;
    }
  }

  async searchItems() {
    if (!this.searchQuery || this.searchQuery.trim() === '') {
      this.searchResults = this.allItems;
      return;
    }

    // Filter locally from already loaded items
    const query = this.searchQuery.toLowerCase().trim();
    this.searchResults = this.allItems.filter(item => 
      item.name.toLowerCase().includes(query) || 
      (item.barcode && item.barcode.toLowerCase().includes(query))
    );
  }

  async startScan() {
    this.scanError = null;
    try {
      this.isScanning = true;
      await this.scannerService.startContinuousScan('scan-video-container');
      
      this.scannerService.scanResults$.subscribe({
        next: (result) => this.handleScanResult(result),
        error: (err) => {
          console.error('Scan error:', err);
          this.scanError = 'Failed to scan barcode';
          this.isScanning = false;
        }
      });
    } catch (error: any) {
      this.scanError = error.message || 'Failed to start scanner';
      this.isScanning = false;
    }
  }

  stopScan() {
    this.scannerService.stopScan();
    this.isScanning = false;
  }

  private async handleScanResult(result: ScanResult) {
    this.stopScan();
    try {
      const item = await this.itemService.searchByBarcode(result.barcode).toPromise();
      if (item) {
        this.addToSelection(item);
      } else {
        const alert = await this.alertController.create({
          header: 'Item Not Found',
          message: `No item found with barcode: ${result.barcode}`,
          buttons: ['OK']
        });
        await alert.present();
      }
    } catch (error) {
      const alert = await this.alertController.create({
        header: 'Error',
        message: 'Failed to lookup item',
        buttons: ['OK']
      });
      await alert.present();
    }
  }

  addToSelection(item: Item) {
    // Check if already selected
    const existing = this.selectedItems.find(si => si.item.id === item.id);
    if (existing) {
      existing.quantity += 1;
    } else {
      this.selectedItems.push({ item, quantity: 1 });
    }
  }

  removeFromSelection(index: number) {
    this.selectedItems.splice(index, 1);
  }

  updateQuantity(index: number, quantity: number) {
    if (quantity < 1) {
      this.selectedItems[index].quantity = 1;
    } else {
      this.selectedItems[index].quantity = quantity;
    }
  }

  getTotalAmount(): number {
    return this.selectedItems.reduce((total, si) => {
      return total + (si.item.price * si.quantity);
    }, 0);
  }

  async createSale() {
    if (this.selectedItems.length === 0) {
      const alert = await this.alertController.create({
        header: 'Error',
        message: 'Please select at least one item',
        buttons: ['OK']
      });
      await alert.present();
      return;
    }

    // Validate quantities
    for (const si of this.selectedItems) {
      if (si.quantity < 1) {
        const alert = await this.alertController.create({
          header: 'Error',
          message: `Invalid quantity for ${si.item.name}`,
          buttons: ['OK']
        });
        await alert.present();
        return;
      }
    }

    const items = this.selectedItems.map(si => ({
      item_id: si.item.id,
      quantity: si.quantity
    }));

    const saleData = {
      items,
      payment_method: this.paymentMethod,
      sale_date: this.saleDate ? new Date(this.saleDate).toISOString() : null
    };

    this.loading = true;
    this.loadingMessage = 'Creating sale...';

    this.saleService.createSale(saleData).subscribe({
      next: async (response) => {
        this.loading = false;
        const alert = await this.alertController.create({
          header: 'Success',
          message: 'Sale created successfully!',
          buttons: ['OK']
        });
        await alert.present();
        // Reset form
        this.selectedItems = [];
        this.searchQuery = '';
        this.loadAllItems();
      },
      error: async (err) => {
        this.loading = false;
        const alert = await this.alertController.create({
          header: 'Error',
          message: err.error?.message || 'Failed to create sale',
          buttons: ['OK']
        });
        await alert.present();
      }
    });
  }

  goBack() {
    window.history.back();
  }

  isItemSelected(item: Item): boolean {
    return this.selectedItems.some(si => si.item.id === item.id);
  }

  getSelectedQuantity(itemId: number | string): number {
    const found = this.selectedItems.find(si => si.item.id === itemId);
    return found ? found.quantity : 0;
  }

  async toggleItemSelection(item: Item) {
    if (this.isItemSelected(item)) {
      const index = this.selectedItems.findIndex(si => si.item.id === item.id);
      this.removeFromSelection(index);
    } else {
      this.addToSelection(item);
    }
  }
}

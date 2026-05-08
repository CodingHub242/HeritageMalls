import { Component, OnDestroy, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { ItemService } from '../services/item.service';
import { Item } from '../models/item.model';
import { Router } from '@angular/router';
import { ScannerService, ScanResult } from '../services/scanner.service';
import { ModalController, AlertController, Platform } from '@ionic/angular';
import { ItemFormModalComponent } from '../modals/item-form-modal/item-form-modal.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-scan',
  templateUrl: './scan.page.html',
  styleUrls: ['./scan.page.scss'],
  standalone: false,
})
export class ScanPage implements OnDestroy, AfterViewInit {
  scannedItem: Item | null = null;
  isScanning = false;
  useFrontCamera = false;
  scanError: string | null = null;
  scanResult: ScanResult | null = null;
  
  private scanSubscription: Subscription | null = null;
  private isProcessingScan = false;

  constructor(
    private itemService: ItemService,
    private router: Router,
    private scannerService: ScannerService,
    private alertController: AlertController,
    private modalController: ModalController,
    private platform: Platform
  ) { }

  ngAfterViewInit(): void {
    // Pre-request camera permission for better UX
    this.requestCameraPermission();
  }

  ngOnDestroy(): void {
    this.stopScan();
  }

  async requestCameraPermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: this.useFrontCamera ? 'user' : 'environment' } 
      });
      // Stop tracks immediately - we just wanted to check permission
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      return false;
    }
  }

  toggleCamera(): void {
    this.useFrontCamera = !this.useFrontCamera;
    if (this.isScanning) {
      this.restartScan();
    }
  }

  async startScan(): Promise<void> {
    if (this.isScanning) {
      return;
    }

    this.scanError = null;
    
    try {
      // Check camera permission
      const hasPermission = await this.requestCameraPermission();
      if (!hasPermission) {
        throw new Error('Camera permission denied. Please enable camera access in your browser settings.');
      }

      // Start continuous scanning
      this.isScanning = true;
      this.scanSubscription = this.scannerService.scanResults$.subscribe({
        next: (result) => this.handleScanResult(result),
        error: (err) => {
          console.error('Scan error:', err);
          this.scanError = 'Failed to scan barcode';
          this.isScanning = false;
        }
      });

      await this.scannerService.startContinuousScan('video-container');
      
    } catch (error: any) {
      console.error('Error starting scan:', error);
      this.scanError = error.message || 'Failed to start scanner';
      this.isScanning = false;
      await this.presentAlert('Error', this.scanError || 'Unknown error');
    }
  }

  stopScan(): void {
    if (!this.isScanning) {
      return;
    }

    this.isScanning = false;
    this.scannerService.stopScan();
    
    if (this.scanSubscription) {
      this.scanSubscription.unsubscribe();
      this.scanSubscription = null;
    }
  }

  restartScan(): void {
    this.stopScan();
    setTimeout(() => {
      this.startScan();
    }, 100);
  }

  private async handleScanResult(result: ScanResult): Promise<void> {
    // Prevent multiple simultaneous scan processing
    if (this.isProcessingScan) {
      return;
    }
    
    this.isProcessingScan = true;
    this.scanResult = result;
    
    // Stop scanning temporarily to prevent duplicate scans
    this.scannerService.stopScan();
    this.isScanning = false;

    try {
      const item = await this.itemService.searchByBarcode(result.barcode).toPromise();
      
      if (item) {
        this.scannedItem = item;
      } else {
        await this.handleItemNotFound(result.barcode);
      }
    } catch (error) {
      console.error('Error processing scan:', error);
      await this.presentAlert('Error', 'Failed to process scanned item');
      // Restart scanning after error
      await this.handleItemNotFound(result.barcode);
    } finally {
      // Reset processing flag after a short delay to prevent rapid re-scanning
      setTimeout(() => {
        this.isProcessingScan = false;
      }, 1000);
    }
  }

  async presentAlert(header: string, message: string): Promise<void> {
    const alert = await this.alertController.create({
      header: header,
      message: message,
      buttons: ['OK']
    });
    await alert.present();
  }

  async openCreateItemModal(barcode: string): Promise<void> {
    const modal = await this.modalController.create({
      component: ItemFormModalComponent,
      componentProps: {
        isEdit: false,
        initialBarcode: barcode
      }
    });

    await modal.present();

    const { data } = await modal.onDidDismiss();
    if (data) {
      await this.presentAlert('Success', 'Item created successfully!');
      this.scannedItem = null;
      // Restart scanning
      setTimeout(() => this.startScan(), 500);
    }
    // Reset processing flag
    this.isProcessingScan = false;
  }

  async handleItemNotFound(barcode: string): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Item Not Found',
      message: `No item found with barcode: ${barcode}. Would you like to create a new item?`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          handler: () => {
            // Restart scanning
            setTimeout(() => this.startScan(), 500);
          }
        },
        {
          text: 'Create Item',
          handler: () => {
            this.openCreateItemModal(barcode);
          }
        }
      ]
    });
    await alert.present();
  }

  viewItemDetails(id: string | undefined): void {
    if (id === undefined) return;
    this.router.navigate(['/item-details', id]);
  }

  async useNativeScanner(): Promise<void> {
    // Prevent multiple simultaneous scans
    if (this.isProcessingScan) {
      return;
    }
    
    this.isProcessingScan = true;
    
    try {
      const result = await this.scannerService.startNativeScan();
      const item = await this.itemService.searchByBarcode(result.barcode).toPromise();
      
      if (item) {
        this.scannedItem = item;
      } else {
        await this.handleItemNotFound(result.barcode);
      }
    } catch (error: any) {
      console.error('Native scanner error:', error);
      await this.presentAlert('Error', error.message || 'Failed to scan with native scanner');
      this.isProcessingScan = false;
    }
  }
}

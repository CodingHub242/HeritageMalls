import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject, from, of } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { BarcodeScanner, SupportedFormat } from '@capacitor-community/barcode-scanner';
import { BrowserMultiFormatReader, NotFoundException, ChecksumException, FormatException, Result } from '@zxing/library';
import { ItemService } from './item.service';
import { Item } from '../models/item.model';

export interface ScannerDevice {
  id: string;
  label: string;
}

export interface ScanResult {
  barcode: string;
  format: string;
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class ScannerService {
  private codeReader = new BrowserMultiFormatReader();
  private scanSubject = new Subject<ScanResult>();
  private isScanningSubject = new BehaviorSubject<boolean>(false);
  private devicesSubject = new BehaviorSubject<ScannerDevice[]>([]);
  private selectedDeviceIdSubject = new BehaviorSubject<string | null>(null);
  private scanInterval: any = null;
  private lastScanTime = 0;
  private scanCooldown = 1000; // 1 second cooldown between scans
  private activeVideoElement: HTMLVideoElement | null = null;

  scanResults$ = this.scanSubject.asObservable();
  isScanning$ = this.isScanningSubject.asObservable();
  availableDevices$ = this.devicesSubject.asObservable();
  selectedDeviceId$ = this.selectedDeviceIdSubject.asObservable();

  constructor(private itemService: ItemService) {}

  /**
   * Get list of available cameras
   */
  async getAvailableDevices(): Promise<ScannerDevice[]> {
    try {
      const devices = await this.codeReader.listVideoInputDevices();
      const scannerDevices = devices.map(device => ({
        id: device.deviceId,
        label: device.label || `Camera ${devices.indexOf(device) + 1}`
      }));
      this.devicesSubject.next(scannerDevices);
      return scannerDevices;
    } catch (error) {
      console.error('Error getting devices:', error);
      return [];
    }
  }

  /**
   * Select a specific camera device
   */
  selectDevice(deviceId: string): void {
    this.selectedDeviceIdSubject.next(deviceId);
  }

  /**
   * Start continuous scanning using ZXing (web-based, more robust)
   * This method continuously processes camera frames for faster detection
   */
  async startContinuousScan(targetElementId: string = 'video-container'): Promise<Observable<ScanResult>> {
    if (this.isScanningSubject.value) {
      return this.scanResults$;
    }

    this.isScanningSubject.next(true);
    
    try {
      // Get available devices if not already selected
      if (!this.selectedDeviceIdSubject.value) {
        const devices = await this.getAvailableDevices();
        if (devices.length > 0) {
          // Prefer back camera on mobile, or the first available
          const backCamera = devices.find(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('environment'));
          this.selectDevice(backCamera?.id || devices[0].id);
        }
      }

      // Start continuous decoding
      const deviceId = this.selectedDeviceIdSubject.value || null;
      
      // Use decodeFromVideoDevice for continuous scanning
      // This will automatically create and manage the video element
      this.codeReader.decodeFromVideoDevice(
        deviceId,
        targetElementId,
        (result, error) => {
          if (result) {
            const now = Date.now();
            // Apply cooldown to prevent duplicate scans
            if (now - this.lastScanTime > this.scanCooldown) {
              this.lastScanTime = now;
              const scanResult: ScanResult = {
                barcode: (result as any).text || result.toString(),
                format: (result as any).format || 'UNKNOWN',
                timestamp: now
              };
              this.scanSubject.next(scanResult);
            }
          }
          // Errors are handled silently for continuous scanning
          if (error && !(error instanceof NotFoundException)) {
            console.debug('Scan error (non-fatal):', error);
          }
        }
      );

      return this.scanResults$;
    } catch (error) {
      console.error('Error starting continuous scan:', error);
      this.isScanningSubject.next(false);
      throw error;
    }
  }

  /**
   * Start one-time scan using native capacitor scanner (fallback)
   */
  async startNativeScan(): Promise<ScanResult> {
    try {
      const status = await BarcodeScanner.checkPermission({ force: true });
      if (!status.granted) {
        throw new Error('Camera permission denied');
      }

      await BarcodeScanner.hideBackground();
      
      const result = await BarcodeScanner.startScan({
        targetedFormats: [
          SupportedFormat.EAN_13,
          SupportedFormat.EAN_8,
          SupportedFormat.UPC_A,
          SupportedFormat.UPC_E,
          SupportedFormat.CODE_39,
          SupportedFormat.CODE_93,
          SupportedFormat.CODE_128,
          SupportedFormat.ITF,
          SupportedFormat.QR_CODE,
          SupportedFormat.DATA_MATRIX,
          SupportedFormat.PDF_417,
          SupportedFormat.AZTEC
        ] as any,
        showTorchButton: true,
        showFlipCameraButton: true,
      } as any);

      await BarcodeScanner.stopScan();
      BarcodeScanner.showBackground();

      if (result.hasContent) {
        const scanResult: ScanResult = {
          barcode: result.content,
          format: result.format || 'UNKNOWN',
          timestamp: Date.now()
        };
        this.scanSubject.next(scanResult);
        return scanResult;
      } else {
        throw new Error('No barcode detected');
      }
    } catch (error) {
      console.error('Native scan error:', error);
      throw error;
    }
  }

  /**
   * Stop continuous scanning
   */
  stopScan(): void {
    if (this.isScanningSubject.value) {
      this.codeReader.reset();
      this.isScanningSubject.next(false);
      if (this.scanInterval) {
        clearInterval(this.scanInterval);
        this.scanInterval = null;
      }
    }
  }

  /**
   * Scan and lookup item
   */
  async scanAndLookup(): Promise<{item: Item | null, scanResult: ScanResult}> {
    const scanResult = await this.startNativeScan();
    const item = await this.lookupItem(scanResult.barcode).toPromise();
    return {item: item || null, scanResult};
  }

  /**
   * Lookup item by barcode
   */
  lookupItem(barcode: string): Observable<Item> {
    return this.itemService.searchByBarcode(barcode).pipe(
      catchError(error => {
        console.error('Error looking up item:', error);
        throw error;
      })
    );
  }

  /**
   * Set cooldown between scans (in milliseconds)
   */
  setScanCooldown(ms: number): void {
    this.scanCooldown = ms;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopScan();
    this.codeReader.reset();
  }
}

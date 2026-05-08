import { Component, OnInit, OnDestroy, HostListener, AfterViewInit } from '@angular/core';
import { ItemService } from '../services/item.service';
import { Item } from '../models/item.model';
import { SaleService } from '../services/sale.service';
import { Router } from '@angular/router';
import { ModalController, AlertController, Platform } from '@ionic/angular';
import { ScannerService, ScanResult } from '../services/scanner.service';
import { ReceiptModalComponent } from '../modals/receipt-modal/receipt-modal.component';
import { Subscription } from 'rxjs';
import { debounceTime, filter } from 'rxjs/operators';

interface CartItem {
  item: Item;
  quantity: number;
  unit_price: number;
  total_price: number;
}

@Component({
  selector: 'app-pos',
  templateUrl: './pos.page.html',
  styleUrls: ['./pos.page.scss'],
  standalone: false,
})
export class PosPage implements OnInit, OnDestroy, AfterViewInit {
  scannedItem: Item | null = null;
  cartItems: CartItem[] = [];
  quantity: number = 1;
  totalAmount: number = 0;
  isProcessing: boolean = false;
  isScanning: boolean = false;
  useFrontCamera = false;
  scanError: string | null = null;
  lastScannedBarcode: string = '';
  
  // Search functionality
  searchTerm: string = '';
  searchResults: Item[] = [];
  isSearching: boolean = false;
  
  // New: Scan detection tracking
  scanCount: number = 0;
  lastScannedItemName: string = '';
  scanFeedback: string = '';
  
  private scanSubscription: Subscription | null = null;
  private scanCooldown = 1500; // Cooldown between scans to prevent duplicates
  private lastScanTime = 0;

  constructor(
    private itemService: ItemService,
    private saleService: SaleService,
    private router: Router,
    private alertController: AlertController,
    private modalController: ModalController,
    private scannerService: ScannerService,
    private platform: Platform
  ) {}

  ngAfterViewInit(): void {
    // Pre-request camera permission for better UX
    this.requestCameraPermission();
  }

  ngOnInit() {
    this.calculateTotal();
    // Start scanning automatically when page loads
    this.startAutoScan();
  }

  ngOnDestroy(): void {
    this.stopScan();
  }

  ionViewWillEnter() {
    // Restart scanning when returning to this page
    this.startAutoScan();

    //activate scanner tab by default
    const defaultTab = document.querySelector('.tablinks') as HTMLElement;
    //first tab in default is scanner, so we can just click it to activate
    defaultTab.click();
    
  }

  ionViewWillLeave() {
    // Stop scanning when leaving the page to save battery
    this.stopScan();
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape' && this.isScanning) {
      this.stopScan();
    }
  }

  async requestCameraPermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: this.useFrontCamera ? 'user' : 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
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

  startAutoScan() {
    if (!this.isScanning) {
      this.scanBarcode();
    }
  }

  stopScan() {
    if (this.isScanning) {
      this.isScanning = false;
      this.scannerService.stopScan();
      
      if (this.scanSubscription) {
        this.scanSubscription.unsubscribe();
        this.scanSubscription = null;
      }
    }
  }

  restartScan(): void {
    this.stopScan();
    setTimeout(() => {
      this.scanBarcode();
    }, 100);
  }

  async scanBarcode(): Promise<void> {
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

      await this.scannerService.startContinuousScan('pos-video-container');
      
    } catch (error: any) {
      console.error('Error starting scan:', error);
      this.scanError = error.message || 'Failed to start scanner';
      this.isScanning = false;
      await this.presentAlert('Error', this.scanError || 'Unknown error');
    }
  }

  private async handleScanResult(result: ScanResult): Promise<void> {
    const now = Date.now();
    
    // Apply cooldown to prevent duplicate scans of the same item
    if (now - this.lastScanTime < this.scanCooldown) {
      return;
    }
    
    // Prevent scanning the same barcode multiple times in quick succession
    if (result.barcode === this.lastScannedBarcode && now - this.lastScanTime < 2000) {
      return;
    }
    
    this.lastScanTime = now;
    this.lastScannedBarcode = result.barcode;

    try {
      // Process the scanned item
      const item = await this.itemService.searchByBarcode(result.barcode).toPromise();
      
      if (item) {
        this.scannedItem = item;
        this.quantity = 1;
        // Auto-add to cart immediately (supermarket style)
        this.addToCart();
        
        // Update scan feedback
        this.updateScanFeedback(item);
      } else {
        this.presentAlert('Item Not Found', `No item found with barcode: ${result.barcode}`);
        // Continue scanning even if item not found
      }
    } catch (error) {
      console.error('Error scanning barcode:', error);
      this.presentAlert('Error', 'Failed to process scanned item');
    }
  }

  // New: Update scan feedback display
  private updateScanFeedback(item: Item): void {
    this.scanCount++;
    this.lastScannedItemName = item.name;
    this.scanFeedback = `✓ Scanned: ${item.name} (Total items scanned: ${this.scanCount})`;
    
    // Clear feedback after 3 seconds
    setTimeout(() => {
      this.scanFeedback = '';
    }, 3000);
  }

  // New: Reset scan counter
  resetScanCounter(): void {
    this.scanCount = 0;
    this.scanFeedback = 'Scan counter reset';
    setTimeout(() => {
      this.scanFeedback = '';
    }, 2000);
  }

  // New: Handle quantity change from input field
  onQuantityChange(itemId: string | undefined, event: any): void {
    if (!itemId) return;
    const value = event.target ? parseInt(event.target.value, 10) : parseInt(event, 10);
    if (!isNaN(value)) {
      this.updateCartItemQuantity(itemId, value);
    }
  }

  increaseQuantity() {
    if (this.scannedItem && this.quantity < this.scannedItem.quantity) {
      this.quantity++;
    }
  }

  decreaseQuantity() {
    if (this.quantity > 1) {
      this.quantity--;
    }
  }

  // Get current item's quantity in cart
  getCartQuantity(): number {
    if (!this.scannedItem) return 0;
    const cartItem = this.cartItems.find(item => item.item.id === this.scannedItem!.id);
    return cartItem ? cartItem.quantity : 0;
  }

  // New: Update quantity directly in cart
  updateCartItemQuantity(itemId: string | undefined, newQuantity: number): void {
    if (!itemId || newQuantity < 1) {
      if (itemId) {
        this.removeFromCartById(itemId);
      }
      return;
    }
    
    const cartItem = this.cartItems.find(item => item.item.id === itemId);
    if (cartItem) {
      const availableStock = cartItem.item.quantity;
      if (newQuantity <= availableStock) {
        cartItem.quantity = newQuantity;
        cartItem.total_price = cartItem.quantity * cartItem.unit_price;
        this.calculateTotal();
      } else {
        this.presentAlert('Error', `Only ${availableStock} units available in stock`);
      }
    }
  }

  // Increase quantity of current item in cart
  increaseCartQuantity() {
    const cartItem = this.cartItems.find(item => item.item.id === this.scannedItem!.id);
    if (cartItem && cartItem.quantity < this.scannedItem!.quantity) {
      cartItem.quantity++;
      cartItem.total_price = cartItem.quantity * cartItem.unit_price;
      this.calculateTotal();
    }
  }

  // Decrease quantity of current item in cart
  decreaseCartQuantity() {
    const cartItem = this.cartItems.find(item => item.item.id === this.scannedItem!.id);
    if (cartItem && cartItem.quantity > 1) {
      cartItem.quantity--;
      cartItem.total_price = cartItem.quantity * cartItem.unit_price;
      this.calculateTotal();
    }
  }

  // Remove current item from cart
  removeFromCartById(itemId: string | undefined) {
    if (itemId === undefined) return;
    this.removeFromCart(this.cartItems.findIndex(item => item.item.id === itemId));
  }

  cancelScan() {
    // Clear the current scanned item display only (item already in cart)
    this.scannedItem = null;
    this.quantity = 1;
    // Scanning continues automatically
  }

  toggleScanning() {
    if (this.isScanning) {
      // Pause scanning
      this.stopScan();
    } else {
      // Resume scanning
      this.scanBarcode();
    }
  }

  addToCart() {
    if (!this.scannedItem) {
      this.presentAlert('Error', 'Please scan an item first');
      return;
    }

    if (this.quantity > this.scannedItem.quantity) {
      this.presentAlert('Error', 'Not enough stock available');
      return;
    }

    // Use selling_price if available, otherwise fall back to price (cost price)
    const unitPrice = this.scannedItem.selling_price || this.scannedItem.price;

    // Check if item already in cart
    const existingItemIndex = this.cartItems.findIndex(
      item => item.item.id === this.scannedItem!.id
    );

    if (existingItemIndex >= 0) {
      // Increase quantity of existing item
      const newQuantity = this.cartItems[existingItemIndex].quantity + this.quantity;
      if (newQuantity <= this.scannedItem.quantity) {
        this.cartItems[existingItemIndex].quantity = newQuantity;
        this.cartItems[existingItemIndex].total_price = 
          this.cartItems[existingItemIndex].quantity * this.cartItems[existingItemIndex].unit_price;
      } else {
        this.presentAlert('Error', 'Not enough stock available');
        return;
      }
    } else {
      // Add new item to cart
      const cartItem: CartItem = {
        item: this.scannedItem,
        quantity: this.quantity,
        unit_price: unitPrice,
        total_price: unitPrice * this.quantity
      };
      this.cartItems.push(cartItem);
    }

    // Reset scanned item and quantity
    this.scannedItem = null;
    this.quantity = 1;
    this.calculateTotal();

    // Continue scanning for next item (don't restart, it's already running)
  }

  removeFromCart(index: number) {
    this.cartItems.splice(index, 1);
    this.calculateTotal();
  }

  clearCart() {
    this.cartItems = [];
    this.scannedItem = null;
    this.quantity = 1;
    this.calculateTotal();
  }

  calculateTotal() {
    this.totalAmount = this.cartItems.reduce((sum, item) => sum + Number(item.total_price), 0);
  }

  async completeSale() {
    if (this.cartItems.length === 0) {
      this.presentAlert('Error', 'Cart is empty');
      return;
    }

    // Stop scanning before completing sale
    this.stopScan();
    this.isProcessing = true;

    // Capture a snapshot of the cart for the receipt to prevent race conditions
    console.log('POS: cartItems before snapshot:', this.cartItems);
    const receiptItems = this.cartItems.map(item => ({
      name: item.item.name,
      quantity: item.quantity,
      unit_price: Number(item.unit_price) || 0,
      total_price: Number(item.total_price) || 0
    }));
    const receiptTotal = Number(this.totalAmount) || 0;
    console.log('POS: receiptItems after snapshot:', receiptItems);
    console.log('POS: receiptTotal:', receiptTotal);

    try {
      // Prepare sale data
      const saleData = {
        items: this.cartItems.map(item => ({
          item_id: item.item.id,
          quantity: item.quantity
        })),
        payment_method: 'cash' // Default to cash, could be made configurable
      };

      // Call backend API to create sale
      const result = await this.saleService.createSale(saleData).toPromise();
      
      // Debug: log receipt items before showing modal
      console.log('POS: Receipt items snapshot:', receiptItems);
      console.log('POS: Receipt total snapshot:', receiptTotal);
  
      // Show receipt modal with componentProps
      const receiptModal = await this.modalController.create({
        component: ReceiptModalComponent,
        componentProps: {
          saleId: result?.id ? result.id.toString() : null,
          items: receiptItems,
          totalAmount: receiptTotal,
          paymentMethod: 'cash',
          saleDate: new Date()
        },
        backdropDismiss: false
      });
  
      // Log after creation to verify props (access via component property if available)
      console.log('Modal created, checking component instance props...');
      // Note: receiptModal.component may not be directly accessible; rely on modal logs
  
      await receiptModal.present();

      // Reset for next sale after modal is closed
      this.clearCart();
    } catch (error) {
      console.error('Error completing sale:', error);
      this.presentAlert('Error', 'Failed to complete sale. Please try again.');
    } finally {
      this.isProcessing = false;
    }
  }

   async presentAlert(header: string, message: string) {
     const alert = await this.alertController.create({
       header: header,
       message: message,
       buttons: ['OK']
     });
     await alert.present();
   }

   // Search items by name or description
   searchItems() {
     if (!this.searchTerm || this.searchTerm.trim().length < 2) {
       this.searchResults = [];
       return;
     }

     this.isSearching = true;
     this.itemService.getItems().subscribe({
       next: (items) => {
         // Filter items by name or description (case insensitive)
         const searchTermLower = this.searchTerm.toLowerCase().trim();
         this.searchResults = items.filter(item => 
           item.name.toLowerCase().includes(searchTermLower) || 
           (item.description && item.description.toLowerCase().includes(searchTermLower))
         );
         this.isSearching = false;
       },
       error: (error) => {
         console.error('Error searching items:', error);
         this.isSearching = false;
         this.presentAlert('Error', 'Failed to search items');
       }
     });
   }

   // Select item from search results
   selectItemFromSearch(item: Item) {
     this.scannedItem = item;
     this.quantity = 1;
     // Auto-add to cart (similar to scanning)
     this.addToCart();
     
     // Clear search
     this.searchTerm = '';
     this.searchResults = [];
     
     // Switch back to scan tab
     // Note: In a real implementation, you'd use tab controller to switch tabs
     // For now, we'll just provide feedback
     this.scanFeedback = `✓ Selected: ${item.name} (Added to cart)`;
     setTimeout(() => {
       this.scanFeedback = '';
     }, 3000);
   }

    openCity(evt:any, cityName:any) {
      var i, tabcontent, tablinks;
      tabcontent = document.getElementsByClassName("tabcontent") as HTMLCollectionOf<HTMLElement>;
      for (i = 0; i < tabcontent.length; i++) {
      tabcontent[i].style.display = "none";
      }
      tablinks = document.getElementsByClassName("tablinks");
      for (i = 0; i < tablinks.length; i++) {
      tablinks[i].className = tablinks[i].className.replace(" active", "");
      }
      document.getElementById(cityName)!.style.display = "block";
      evt.currentTarget.className += " active";
  }
}

import { Component, OnInit } from '@angular/core';
import { SaleService } from '../services/sale.service';
import { ModalController } from '@ionic/angular';
import { ReceiptModalComponent } from '../modals/receipt-modal/receipt-modal.component';

@Component({
  selector: 'app-receipts',
  templateUrl: './receipts.page.html',
  styleUrls: ['./receipts.page.scss'],
  standalone: false,
})
export class ReceiptsPage implements OnInit {
  sales: any[] = [];
  filteredSales: any[] = [];
  isLoading = false;
  searchTerm: string = '';
  totalRevenue: number = 0;

  constructor(
    private saleService: SaleService,
    private modalController: ModalController
  ) {}

  ngOnInit() {
    this.loadSales();
  }

  ionViewWillEnter() {
    this.loadSales();
  }

  loadSales() {
    this.isLoading = true;
    this.saleService.getSales().subscribe(
      (data: any[]) => {
        this.sales = data;
        this.filteredSales = data;
        this.calculateTotalRevenue();
        this.isLoading = false;
      },
      (error: any) => {
        console.error('Error loading sales:', error);
        this.isLoading = false;
      }
    );
  }

  calculateTotalRevenue() {
    this.totalRevenue = this.sales.reduce((sum: number, s: any) => {
      return sum + Number(s.total_amount || 0);
    }, 0);
  }

  onSearchChange() {
    if (!this.searchTerm || this.searchTerm.trim() === '') {
      this.filteredSales = this.sales;
      return;
    }
    const term = this.searchTerm.toLowerCase().trim();
    this.filteredSales = this.sales.filter((sale: any) => {
      return (
        sale.id?.toString().includes(term) ||
        sale.payment_method?.toLowerCase().includes(term) ||
        sale.total_amount?.toString().includes(term) ||
        sale.created_at?.toLowerCase().includes(term) ||
        sale.items?.some((item: any) =>
          item.item?.name?.toLowerCase().includes(term)
        )
      );
    });
  }

  loadMore(event: any) {
    // Placeholder for infinite scroll - could load more historical data
    setTimeout(() => {
      event.target.complete();
    }, 500);
  }

  async viewReceipt(sale: any) {
    const modal = await this.modalController.create({
      component: ReceiptModalComponent,
      componentProps: {
        saleId: sale.id?.toString() || null,
        items: sale.items?.map((item: any) => ({
          name: item.item?.name || 'Unknown Item',
          quantity: item.quantity || 0,
          unit_price: Number(item.unit_price) || 0,
          total_price: Number(item.total_price) || 0
        })) || [],
        totalAmount: Number(sale.total_amount) || 0,
        paymentMethod: sale.payment_method || 'cash',
        saleDate: sale.created_at ? new Date(sale.created_at) : new Date()
      }
    });

    return await modal.present();
  }

  // Optional: reprint is same as viewing receipt
  async reprintReceipt(sale: any) {
    return this.viewReceipt(sale);
  }
}

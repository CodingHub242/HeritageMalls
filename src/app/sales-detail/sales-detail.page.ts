import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SalesReportsService, SalesItemDetail } from '../services/sales-reports.service';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { saveAs } from 'file-saver';
import { AlertController } from '@ionic/angular';

@Component({
  selector: 'app-sales-detail',
  templateUrl: './sales-detail.page.html',
  styleUrls: ['./sales-detail.page.scss'],
  standalone: false
})
export class SalesDetailPage implements OnInit {
  period: 'daily' | 'monthly' | 'yearly' = 'daily';
  periodValue: string = '';
  items: SalesItemDetail[] = [];
  loading = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private salesReportsService: SalesReportsService,
    private alertController: AlertController
  ) {}

  ngOnInit() {
    this.period = this.route.snapshot.paramMap.get('period') as any;
    this.periodValue = this.route.snapshot.paramMap.get('value') || '';

    if (this.period && this.periodValue) {
      this.loadItems();
    }
  }

  loadItems() {
    this.loading = true;
    let obs$: any;

    switch (this.period) {
      case 'daily':
        obs$ = this.salesReportsService.getDailyItems(this.periodValue);
        break;
      case 'monthly':
        obs$ = this.salesReportsService.getMonthlyItems(this.periodValue);
        break;
      case 'yearly':
        obs$ = this.salesReportsService.getYearlyItems(this.periodValue);
        break;
      default:
        this.loading = false;
        return;
    }

    obs$.subscribe({
      next: (data:any) => {
        // For detailed view, we already have saleId and itemId from the API
        this.items = data.map((item: any) => ({
          ...item,
          // Ensure we have both IDs for delete/update operations
          saleId: item.saleItemId || this.periodValue, // Use API saleId or fallback to periodValue
          itemId: item.itemId || item.id // Ensure itemId is set
        }));
        console.log('Loaded items:', this.items);
        this.loading = false;
      },
      error: (err:any) => {
        console.error('Error loading items:', err);
        this.loading = false;
      }
    });
  }

  goBack() {
    this.router.navigate(['/admin']);
  }

  async deleteItem(itemId: string, saleId: string) {
    const alert = await this.alertController.create({
      header: 'Confirm Delete',
      message: 'Are you sure you want to delete this item from the sale?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Delete',
          role: 'destructive',
          handler: () => {
            this.performDelete(itemId, saleId);
          }
        }
      ]
    });

    await alert.present();
  }

  async performDelete(itemId: string, saleId: string) {
    this.loading = true;
    this.salesReportsService.deleteItem(saleId, itemId).subscribe({
      next: () => {
        // Remove the item from the list
        this.items = this.items.filter(item => item.itemId !== itemId);
        this.loading = false;
        this.showToast('Item deleted successfully');
      },
      error: (err) => {
        console.error('Error deleting item:', err);
        this.loading = false;
        this.showToast('Failed to delete item');
      }
    });
  }

   async editItem(itemId: string, saleId: string, currentQuantity: number) {
     const alert = await this.alertController.create({
       header: 'Edit Quantity',
       inputs: [
         {
           name: 'quantity',
           type: 'number',
           label: 'Quantity',
           value: currentQuantity,
           min: '1'
         }
       ],
       buttons: [
         {
           text: 'Cancel',
           role: 'cancel'
         },
         {
           text: 'Update',
           handler: (data) => {
             const quantity = parseInt(data.quantity);
             if (!isNaN(quantity) && quantity >= 1) {
               this.updateItemQuantity(itemId, saleId, quantity);
             }
           }
         }
       ]
     });
 
     await alert.present();
   }

    updateItemQuantity(itemId: string, saleId: string, quantity: number) {
      this.loading = true;
      this.salesReportsService.updateItemQuantity(saleId, itemId, quantity).subscribe({
        next: (updatedItem:any) => {
          // Update the item in the list
          const index = this.items.findIndex(item => item.itemId === itemId);
          if (index !== -1) {
            this.items[index] = {
              ...updatedItem,
              saleId: saleId
            };
          }
          this.loading = false;
          this.showToast('Item updated successfully');
        },
        error: (err) => {
          console.error('Error updating item:', err);
          this.loading = false;
          this.showToast('Failed to update item');
        }
      });
    }

  exportToCsv() {
    if (this.items.length === 0) return;

    const headers = ['Item Name', 'Barcode', 'Quantity', 'Total Revenue (GHS)'];
    const rows = this.items.map(item => [
      item.itemName || item.name || 'Unknown Item',
      item.barcode || '',
      item.quantity.toString(),
      Number(item.total_revenue).toFixed(2)
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(field => `"${field}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `sales-${this.period}-${this.periodValue}.csv`);
  }

  private showToast(message: string) {
    // Simple toast implementation - you might want to use Ionic ToastController
    console.log(message);
    // For now, just log to console. In a real app, you'd show a proper toast.
  }
}
import { Component, OnInit } from '@angular/core';
import { ItemService } from '../services/item.service';
import { Item } from '../models/item.model';
import { AlertController, ModalController } from '@ionic/angular';
import { Router } from '@angular/router';
import { ItemFormModalComponent } from '../modals/item-form-modal/item-form-modal.component';

@Component({
  selector: 'app-items',
  templateUrl: './items.page.html',
  styleUrls: ['./items.page.scss'],
  standalone: false,
})
export class ItemsPage implements OnInit {
  items: Item[] = [];
  filteredItems: Item[] = [];

  constructor(
    private itemService: ItemService,
    private alertController: AlertController,
    private modalController: ModalController,
    private router: Router
  ) { }

  ngOnInit() {
    this.loadItems();
  }

  ionViewWillEnter() {
    this.loadItems();
  }

  loadItems() {
    this.itemService.getItems().subscribe(
      (data: Item[]) => {
        this.items = data;
        this.filteredItems = data;
      },
      (error) => {
        console.error('Error loading items:', error);
      }
    );
  }

  async addItem() {
    const modal = await this.modalController.create({
      component: ItemFormModalComponent,
      componentProps: {
        isEdit: false
      }
    });

    await modal.present();

    const { data } = await modal.onDidDismiss();
    if (data) {
      // The item has already been created in the modal
      // Just update the local arrays
      this.items.push(data);
      this.filteredItems = this.items;
    }
  }


  viewItemDetails(id: string | undefined) {
    if (id === undefined) return;
    this.router.navigate(['/item-details', id]);
  }

  async editItem(item: Item) {
    const modal = await this.modalController.create({
      component: ItemFormModalComponent,
      componentProps: {
        isEdit: true,
        item: item
      }
    });

    await modal.present();

    const { data } = await modal.onDidDismiss();
    if (data) {
      // The item has already been updated in the modal
      // Just update the local arrays
      const index = this.items.findIndex(i => i.id === item.id);
      if (index !== -1) {
        this.items[index] = data;
        this.filteredItems = this.items;
      }
    }
  }

  deleteItem(id: string | undefined) {
    if (id === undefined) return;

    this.itemService.deleteItem(id).subscribe(
      () => {
        this.items = this.items.filter(item => item.id !== id);
        this.filteredItems = this.items;
      },
      (error) => {
        console.error('Error deleting item:', error);
      }
    );
  }

   filterItems(event: any) {
     const searchTerm = event.target.value.toLowerCase();
     this.filteredItems = this.items.filter(item => 
       item.name.toLowerCase().includes(searchTerm) ||
       (item.description && item.description.toLowerCase().includes(searchTerm)) ||
       (item.barcode && item.barcode.includes(searchTerm))
     );
   }
}

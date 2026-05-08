import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CategoryService } from '../services/category.service';
import { Category } from '../models/category.model';
import { ItemService } from '../services/item.service';
import { Item } from '../models/item.model';
import { AlertController, IonicModule, ToastController } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { CurrencyPipe } from '@angular/common';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-category-details',
  templateUrl: './category-details.page.html',
  styleUrls: ['./category-details.page.scss'],
  //standalone: false,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [IonicModule, FormsModule, CurrencyPipe, CommonModule]
})
export class CategoryDetailsPage implements OnInit {
  category: Category | null = null;
  items: Item[] = [];
  filteredItems: Item[] = [];
  isEditing: { [key: string]: boolean } = {};
  editedItem: { [key: string]: Item } = {};
  categories: Category[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private categoryService: CategoryService,
    private itemService: ItemService,
    private alertController: AlertController,
    private toastController: ToastController
  ) { }

  ngOnInit() {
    const categoryId = this.route.snapshot.paramMap.get('id');
    if (categoryId) {
      this.loadCategory(categoryId);
      this.loadItemsByCategory(categoryId);
    }
    this.loadCategories();
  }

  ionViewWillEnter() {
    const categoryId = this.route.snapshot.paramMap.get('id');
    if (categoryId) {
      this.loadCategory(categoryId);
      this.loadItemsByCategory(categoryId);
    }
  }

  loadCategory(id: string) {
    this.categoryService.getCategory(id).subscribe(
      (category: Category) => {
        this.category = category;
      },
      (error) => {
        console.error('Error loading category:', error);
      }
    );
  }

  loadCategories() {
    this.categoryService.getCategories().subscribe(
      (data: Category[]) => {
        this.categories = data;
      },
      (error) => {
        console.error('Error loading categories:', error);
      }
    );
  }

  loadItemsByCategory(categoryId: string) {
    this.itemService.getItems().subscribe(
      (data: Item[]) => {
        this.items = data.filter(item => item.category_id?.toString() === categoryId || item.category?.id?.toString() === categoryId);
        this.filteredItems = this.items;
      },
      (error) => {
        console.error('Error loading items:', error);
      }
    );
  }

  viewItemDetails(id: string | undefined) {
    if (id === undefined) return;
    this.router.navigate(['/item-details', id]);
  }

startEditing(item: Item) {
    const itemId = item.id as string;
    if (itemId) {
      this.isEditing[itemId] = true;
      this.editedItem[itemId] = { ...item };
    }
  }

  cancelEditing(item: Item) {
    const itemId = item.id as string;
    if (itemId) {
      this.isEditing[itemId] = false;
      delete this.editedItem[itemId];
    }
  }

saveItem(item: Item) {
    const itemId = item.id as string;
    if (!itemId) return;

    const updatedItem = this.editedItem[itemId];
    this.itemService.createOrUpdateItem(updatedItem).subscribe(
      async (savedItem: Item) => {
        const index = this.items.findIndex(i => i.id === item.id);
        if (index !== -1) {
          this.items[index] = savedItem;
          this.filteredItems = this.items;
        }
        this.isEditing[itemId] = false;
        delete this.editedItem[itemId];
        
        const toast = await this.toastController.create({
          message: 'Item updated successfully',
          duration: 2000,
          color: 'success'
        });
        await toast.present();
      },
      async (error: Error) => {
        console.error('Error updating item:', error);
        const toast = await this.toastController.create({
          message: 'Error updating item',
          duration: 2000,
          color: 'danger'
        });
        await toast.present();
      }
    );
  }

  async updateQuantity(item: Item, event: any) {
    const newQuantity = parseInt(event.detail.value);
    if (item.id && !isNaN(newQuantity)) {
      this.itemService.updateQuantity(item.id, newQuantity).subscribe(
        async (updatedItem: Item) => {
          const index = this.items.findIndex(i => i.id === item.id);
          if (index !== -1) {
            this.items[index] = updatedItem;
            this.filteredItems = this.items;
          }
          
          const toast = await this.toastController.create({
            message: 'Quantity updated successfully',
            duration: 2000,
            color: 'success'
          });
          await toast.present();
        },
        (error) => {
          console.error('Error updating quantity:', error);
        }
      );
    }
  }

  async deleteItem(item: Item) {
    if (item.id === undefined) return;

    const alert = await this.alertController.create({
      header: 'Delete Item',
      message: `Are you sure you want to delete "${item.name}"?`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Delete',
          handler: () => {
            this.confirmDeleteItem(item);
          }
        }
      ]
    });

    await alert.present();
  }

  confirmDeleteItem(item: Item) {
    if (item.id === undefined) return;

    this.itemService.deleteItem(item.id).subscribe(
      async () => {
        this.items = this.items.filter(i => i.id !== item.id);
        this.filteredItems = this.items;
        
        const toast = await this.toastController.create({
          message: 'Item deleted successfully',
          duration: 2000,
          color: 'success'
        });
        await toast.present();
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

  getCategoryName(categoryId: number | string | undefined): string {
    if (!categoryId) return 'Uncategorized';
    const cat = this.categories.find(c => c.id?.toString() === categoryId?.toString());
    return cat ? cat.name : 'Uncategorized';
  }

isEditingField(itemId: string | undefined, field: string): boolean {
    if (!itemId) return false;
    const item = this.editedItem[itemId];
    return item && item.hasOwnProperty(field);
  }

// Helper methods for template bindings
  getEditedItem(itemId: string | undefined): Item | undefined {
    if (!itemId) return undefined;
    return this.editedItem[itemId];
  }

  updateField(itemId: string | undefined, field: string, value: any) {
    if (!itemId || !this.editedItem[itemId]) return;
    (this.editedItem[itemId] as any)[field] = value;
  }

  // Check if an item is being edited
  checkIsEditing(itemId: string | undefined): boolean {
    if (!itemId) return false;
    return this.isEditing[itemId] || false;
  }
}

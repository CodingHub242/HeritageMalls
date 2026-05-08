import { Component, OnInit } from '@angular/core';
import { CategoryService } from '../services/category.service';
import { Category } from '../models/category.model';
import { AlertController } from '@ionic/angular';
import { Router } from '@angular/router';

@Component({
  selector: 'app-categories',
  templateUrl: './categories.page.html',
  styleUrls: ['./categories.page.scss'],
  standalone: false,
})
export class CategoriesPage implements OnInit {
  categories: Category[] = [];

  constructor(
    private categoryService: CategoryService,
    private alertController: AlertController,
    private router: Router
  ) { }

  ngOnInit() {
    this.loadCategories();
  }

  ionViewWillEnter() {
    this.loadCategories();
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

  async openAddCategoryModal() {
    const alert = await this.alertController.create({
      header: 'Add Category',
      inputs: [
        {
          name: 'name',
          type: 'text',
          placeholder: 'Category name'
        },
        {
          name: 'description',
          type: 'textarea',
          placeholder: 'Description'
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Add',
          handler: (data) => {
            this.addCategory(data);
          }
        }
      ]
    });

    await alert.present();
  }

  addCategory(data: any) {
    const newCategory = {
      name: data.name,
      description: data.description,
      form_fields: [],
      serverId: undefined
    };

    this.categoryService.createOrUpdateCategory(newCategory).subscribe(
      (category: Category) => {
        this.categories.push(category);
      },
      (error:Error) => {
        console.error('Error adding category:', error);
      }
    );
  }

  async editCategory(category: Category) {
    const alert = await this.alertController.create({
      header: 'Edit Category',
      inputs: [
        {
          name: 'name',
          type: 'text',
          value: category.name,
          placeholder: 'Category name'
        },
        {
          name: 'description',
          type: 'textarea',
          value: category.description,
          placeholder: 'Description'
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Save',
          handler: (data) => {
            const updatedCategory = { ...category, ...data };
            this.updateCategory(updatedCategory);
          }
        }
      ]
    });

    await alert.present();
  }

  updateCategory(category: Category) {
    this.categoryService.createOrUpdateCategory(category).subscribe(
      (updatedCategory: Category) => {
        const index = this.categories.findIndex(c => c.id === updatedCategory.id);
        if (index !== -1) {
          this.categories[index] = updatedCategory;
        }
      },
      (error: Error) => {
        console.error('Error updating category:', error);
      }
    );
  }

  deleteCategory(id: string | undefined) {
    if (id === undefined) return;

    this.categoryService.deleteCategory(id).subscribe(
      () => {
        this.categories = this.categories.filter(cat => cat.id !== id);
      },
      (error) => {
        console.error('Error deleting category:', error);
      }
    );
  }

viewCategoryDetails(id: string | undefined) {
    if (id === undefined) return;
    this.router.navigate(['/categories', id]);
  }

  async presentAlert(header: string, message: string) {
    const alert = await this.alertController.create({
      header: header,
      message: message,
      buttons: ['OK']
    });
    await alert.present();
  }
}

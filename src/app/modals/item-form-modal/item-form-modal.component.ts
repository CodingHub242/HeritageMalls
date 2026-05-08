import { Component, OnInit, ViewChild, ElementRef, Input } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModalController, LoadingController, ToastController } from '@ionic/angular';
import { Item } from '../../models/item.model';
import { Category } from '../../models/category.model';
import { CategoryService } from '../../services/category.service';
import { ItemService } from '../../services/item.service';

@Component({
  selector: 'app-item-form-modal',
  templateUrl: './item-form-modal.component.html',
  styleUrls: ['./item-form-modal.component.scss'],
  standalone: false,
})
export class ItemFormModalComponent implements OnInit {
  @ViewChild('fileInput') fileInput!: ElementRef;
  
  itemForm: FormGroup;
  categories: Category[] | undefined = [];
  imagePreviews: string[] = [];
  imageFiles: File[] = [];
  isEdit = false;
  item: Item | null = null;
  maxImages = 5; // Maximum number of images allowed
  
  @Input() initialBarcode: string | null = null;

  constructor(
    private modalCtrl: ModalController,
    private formBuilder: FormBuilder,
    private categoryService: CategoryService,
    private itemService: ItemService,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController
  ) {
    this.itemForm = this.formBuilder.group({
      name: ['', Validators.required],
      description: [''],
      category_id: ['', Validators.required],
      barcode: [''],
      quantity: [0, [Validators.required, Validators.min(0)]],
      price: [0, [Validators.required, Validators.min(0)]],
      selling_price: [0, [Validators.min(0)]],
      currency: ['GHS', Validators.required]
    });
  }

  ngOnInit() {
    this.loadCategories();
    if (this.item) {
      this.isEdit = true;
      this.itemForm.patchValue(this.item);
    } else if (this.initialBarcode) {
      // Pre-fill barcode for new items created from scan
      this.itemForm.patchValue({ barcode: this.initialBarcode });
    }
  }

  async loadCategories() {
    try {
      this.categories = await this.categoryService.getCategories().toPromise();
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  }

  triggerImageUpload() {
    this.fileInput.nativeElement.click();
  }

  onImageSelected(event: Event) {
    const files = Array.from((event.target as HTMLInputElement).files || []);
    const remainingSlots = this.maxImages - this.imageFiles.length;
    
    if (remainingSlots <= 0) {
      // Show error message that max images limit is reached
      return;
    }

    const filesToAdd = files.slice(0, remainingSlots);
    
    filesToAdd.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreviews.push(reader.result as string);
        this.imageFiles.push(file);
      };
      reader.readAsDataURL(file);
    });

    // Reset input to allow selecting the same file again
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }

  removeImage(index: number) {
    this.imagePreviews.splice(index, 1);
    this.imageFiles.splice(index, 1);
  }

  canAddMoreImages(): boolean {
    return this.imageFiles.length < this.maxImages;
  }

  async onSubmit() {
    if (this.itemForm.valid) {
      const loading = await this.loadingCtrl.create({
        message: this.isEdit ? 'Updating item...' : 'Creating item...'
      });
      await loading.present();

      try {
        const formData = new FormData();
        const itemData = this.itemForm.value;
        
        // Append all form fields to FormData
        Object.keys(itemData).forEach(key => {
          if (itemData[key] !== null && itemData[key] !== undefined) {
            formData.append(key, itemData[key]);
          }
        });

        // Append images if selected
        this.imageFiles.forEach((file, index) => {
          formData.append(`images[${index}]`, file);
        });

        // If editing, append removed image URLs
        if (this.isEdit && this.item?.image_urls) {
          const currentUrls = new Set(this.item.image_urls);
          const remainingUrls = new Set(this.imagePreviews.filter(url => url.startsWith('http')));
          
          // Find removed URLs
          const removedUrls = [...currentUrls].filter(url => !remainingUrls.has(url));
          removedUrls.forEach((url, index) => {
            formData.append(`remove_images[${index}]`, url);
          });
        }

        let response: Item | undefined;
        if (this.isEdit && this.item?.id) {
          response = await this.itemService.updateItem(this.item.id, formData).toPromise();
        } else {
          response = await this.itemService.createItem(formData).toPromise();
        }

        await loading.dismiss();
        
        const toast = await this.toastCtrl.create({
          message: `Item successfully ${this.isEdit ? 'updated' : 'created'}!`,
          duration: 2000,
          position: 'bottom',
          color: 'success'
        });
        await toast.present();

        // Return the created/updated item to the parent component
        await this.modalCtrl.dismiss(response);

      } catch (error) {
        await loading.dismiss();
        
        console.error('Error submitting item:', error);
        
        const toast = await this.toastCtrl.create({
          message: `Failed to ${this.isEdit ? 'update' : 'create'} item. Please try again.`,
          duration: 3000,
          position: 'bottom',
          color: 'danger',
          buttons: [
            {
              text: 'Dismiss',
              role: 'cancel'
            }
          ]
        });
        await toast.present();
      }
    } else {
      const toast = await this.toastCtrl.create({
        message: 'Please fill in all required fields correctly.',
        duration: 3000,
        position: 'bottom',
        color: 'warning'
      });
      await toast.present();
    }
  }

  dismiss() {
    this.modalCtrl.dismiss();
  }
}

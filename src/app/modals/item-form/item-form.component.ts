import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModalController } from '@ionic/angular';
import { Item } from '../../models/item.model';
import { Category } from '../../models/category.model';

@Component({
  selector: 'app-item-form',
  templateUrl: './item-form.component.html',
  styleUrls: ['./item-form.component.scss'],
  standalone:false
})
export class ItemFormComponent implements OnInit {
  @Input() item?: Item;
  @Input() categories: Category[] = [];
  @Input() mode: 'add' | 'edit' = 'add';

  itemForm: FormGroup;
  selectedImages: File[] = [];
  previewUrls: string[] = [];

  constructor(
    private formBuilder: FormBuilder,
    private modalController: ModalController
  ) {
    this.itemForm = this.formBuilder.group({
      name: ['', Validators.required],
      description: [''],
      category_id: ['', Validators.required],
      barcode: [''],
      quantity: [0, [Validators.required, Validators.min(0)]],
      price: [0, [Validators.required, Validators.min(0)]],
      currency: ['USD', [Validators.required, Validators.minLength(3), Validators.maxLength(3)]]
    });
  }

  ngOnInit() {
    if (this.item && this.mode === 'edit') {
      this.itemForm.patchValue({
        name: this.item.name,
        description: this.item.description,
        category_id: this.item.category_id,
        barcode: this.item.barcode,
        quantity: this.item.quantity,
        price: this.item.price,
        currency: this.item.currency
      });

      if (this.item.image_url) {
        this.previewUrls = [this.item.image_url];
      }
    }
  }

  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedImages = Array.from(input.files);
      this.previewUrls = [];

      // Create preview URLs
      this.selectedImages.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e: any) => {
          this.previewUrls.push(e.target.result);
        };
        reader.readAsDataURL(file);
      });
    }
  }

  removeImage(index: number) {
    this.selectedImages.splice(index, 1);
    this.previewUrls.splice(index, 1);
  }

  async dismiss(role: 'cancel' | 'submit' = 'cancel') {
    if (role === 'submit' && this.itemForm.valid) {
      await this.modalController.dismiss({
        item: {
          ...this.itemForm.value,
          form_data: {}
        },
        images: this.selectedImages
      }, 'submit');
    } else {
      await this.modalController.dismiss(null, 'cancel');
    }
  }
}

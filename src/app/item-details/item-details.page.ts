import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ItemService } from '../services/item.service';
import { Item } from '../models/item.model';

@Component({
  selector: 'app-item-details',
  templateUrl: './item-details.page.html',
  styleUrls: ['./item-details.page.scss'],
  standalone: false,
})
export class ItemDetailsPage implements OnInit {
  item: Item | null = null;
  onlineInfo: any = null;
  isUploading: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private itemService: ItemService
  ) { }

  ngOnInit() {
    const itemId = this.route.snapshot.paramMap.get('id');
    if (itemId) {
      this.loadItem(parseInt(itemId));
    }
  }

  loadItem(id: number) {
    this.itemService.getItem(id.toString()).subscribe(
      (item: Item) => {
        this.item = item;
      },
      (error) => {
        console.error('Error loading item:', error);
      }
    );
  }

  editItem() {
    if (this.item && this.item.id) {
      // Navigate to edit item page
      console.log('Edit item functionality will be implemented');
    }
  }

  uploadImage() {
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file && this.item?.id) {
      this.isUploading = true;
      this.itemService.uploadImage(this.item.id, file).subscribe(
        response => {
          if (response.image_url) {
            this.item!.image_url = response.image_url;
          }
          this.isUploading = false;
        },
        error => {
          console.error('Error uploading image:', error);
          this.isUploading = false;
        }
      );
    }
  }

  updateQuantity(event: any) {
    const newQuantity = event.detail.value;
    if (this.item?.id && !isNaN(newQuantity)) {
      this.itemService.updateQuantity(this.item.id, newQuantity).subscribe(
        updatedItem => {
          this.item = updatedItem;
        },
        error => {
          console.error('Error updating quantity:', error);
        }
      );
    }
  }

  fetchOnlineInfo() {
    if (this.item && this.item.barcode) {
      this.itemService.fetchOnlineInfo(this.item.barcode).subscribe(
        (info: any) => {
          this.onlineInfo = info;
        },
        (error) => {
          console.error('Error fetching online info:', error);
          // Fallback to simulated data if API fails
          this.onlineInfo = {
            'Manufacturer': 'Example Manufacturer',
            'Model Number': 'ABC-123',
            'Warranty': '2 years',
            'Release Date': '2023-01-15',
            'Specifications': 'High-quality, durable material'
          };
        }
      );
    }
  }
}

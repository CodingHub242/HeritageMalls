import { Component } from '@angular/core';
import { ItemService } from '../services/item.service';

@Component({
  selector: 'app-import',
  templateUrl: './import.component.html',
  styleUrls: ['./import.component.scss'],
  standalone: false,
})
export class ImportComponent {
  selectedFile: File | null = null;
  importResult: any = null;

  constructor(private itemService: ItemService) { }

  onFileSelected(event: any) {
    this.selectedFile = event.target.files[0];
  }

  importItems() {
    if (!this.selectedFile) {
      alert('Please select a file first');
      return;
    }

    const formData = new FormData();
    formData.append('file', this.selectedFile);

    this.itemService.importFromExcel(formData).subscribe(
      (response) => {
        this.importResult = response;
        alert('Items imported successfully');
      },
      (error) => {
        console.error('Error importing items:', error);
        this.importResult = { success: false, message: 'Import failed' };
        alert('Import failed. Please check the file format.');
      }
    );
  }
}

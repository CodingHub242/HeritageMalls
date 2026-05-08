import { Component } from '@angular/core';
import { ItemService } from '../services/item.service';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

@Component({
  selector: 'app-import',
  templateUrl: './import.page.html',
  styleUrls: ['./import.page.scss'],
  standalone: false,
})
export class ImportPage {
  selectedFile: File | null = null;
  importResult: any = null;
  isDragover: boolean = false;
  fileValidationError: string = '';
  
  // Preview and mapping properties
  rawData: any[] = [];
  previewData: any[] = [];
  headers: string[] = [];
  columnMapping: any = {};
  suggestedMapping: any = {};
  isPreviewing: boolean = false;
  isImporting: boolean = false;
  
  // Import results
  importSuccessCount: number = 0;
  importErrorCount: number = 0;
  importErrors: any[] = [];
  processingTime: number = 0;

  constructor(private itemService: ItemService) { }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    this.handleFileSelection(file);
  }

  onFileDrop(event: any) {
    event.preventDefault();
    this.isDragover = false;
    const file = event.dataTransfer.files[0];
    this.handleFileSelection(file);
  }

  onDragOver(event: any) {
    event.preventDefault();
    this.isDragover = true;
  }

  onDragLeave(event: any) {
    event.preventDefault();
    this.isDragover = false;
  }

  private handleFileSelection(file: File | null) {
    this.selectedFile = file;
    this.fileValidationError = '';
    this.resetImportState();
    
    if (!file) {
      return;
    }

    // Validate file type
    const allowedExtensions = ['.xlsx', '.xls', '.csv'];
    const fileExtension = `.${file.name.split('.').pop()?.toLowerCase() ?? ''}`;
    if (!allowedExtensions.includes(fileExtension)) {
      this.fileValidationError = 'Invalid file type. Please select .xlsx, .xls, or .csv files.';
      this.selectedFile = null;
      return;
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > maxSize) {
      this.fileValidationError = `File size exceeds 10MB limit. Please select a smaller file.`;
      this.selectedFile = null;
      return;
    }

    // If validation passes, start preview
    if (!this.fileValidationError) {
      this.previewFile(file);
    }
  }

  private resetImportState() {
    this.rawData = [];
    this.previewData = [];
    this.headers = [];
    this.columnMapping = {};
    this.suggestedMapping = {};
    this.isPreviewing = false;
    this.importResult = null;
    this.importSuccessCount = 0;
    this.importErrorCount = 0;
    this.importErrors = [];
    this.processingTime = 0;
  }

  private previewFile(file: File) {
    this.isPreviewing = true;
    
    const reader = new FileReader();
    
    reader.onload = (e: any) => {
      try {
        const data = e.target.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        this.rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (this.rawData.length === 0) {
          this.fileValidationError = 'The file appears to be empty.';
          this.isPreviewing = false;
          return;
        }
        
        // Extract headers (first row)
        this.headers = this.rawData[0] || [];
        
        // Generate suggested mapping based on common column names
        this.suggestedMapping = this.generateSuggestedMapping(this.headers);
        
        // Initialize column mapping with suggested values
        this.columnMapping = { ...this.suggestedMapping };
        
        // Prepare preview data (first 10 rows excluding header)
        this.previewData = this.rawData.slice(1, 11).map((row: any, index: number) => {
          const mappedRow: any = {};
          this.headers.forEach((header, colIndex) => {
            const mappedKey = this.columnMapping[header] || header;
            mappedRow[mappedKey] = row[colIndex];
          });
          return mappedRow;
        });
        
        this.isPreviewing = false;
      } catch (error) {
        console.error('Error parsing file:', error);
        this.fileValidationError = 'Error reading the file. Please ensure it is a valid Excel or CSV file.';
        this.isPreviewing = false;
      }
    };
    
    reader.onerror = () => {
      this.fileValidationError = 'Error reading the file.';
      this.isPreviewing = false;
    };
    
    reader.readAsArrayBuffer(file);
  }

  private generateSuggestedMapping(headers: string[]): any {
    const mapping: any = {};
    const lowerHeaders = headers.map(h => h.toString().toLowerCase().trim());
    
    // Define common variations for each field
    const fieldVariations: { [key: string]: string[] } = {
      name: ['name', 'product name', 'item name', 'title', 'product'],
      barcode: ['barcode', 'bar code', 'sku', 'upc', 'ean', 'item code', 'product code'],
      quantity: ['quantity', 'qty', 'stock', 'quantity in stock', 'amount', 'count'],
      price: ['price', 'unit price', 'cost', 'cost price', 'unit cost'],
      description: ['description', 'desc', 'details', 'product description'],
      category_id: ['category', 'category id', 'category_id', 'cat_id'],
      selling_price: ['selling price', 'sale price', 'retail price', 'msrp', 'list price'],
      currency: ['currency', 'curr', 'money'],
      image_url: ['image', 'image url', 'photo', 'picture', 'img']
    };
    
    // Map each header to the most likely field
    lowerHeaders.forEach((header, index) => {
      const originalHeader = headers[index];
      let matched = false;
      
      for (const [field, variations] of Object.entries(fieldVariations)) {
        if (variations.includes(header)) {
          mapping[originalHeader] = field;
          matched = true;
          break;
        }
      }
      
      // If no exact match, try partial matching
      if (!matched) {
        for (const [field, variations] of Object.entries(fieldVariations)) {
          for (const variation of variations) {
            if (header.includes(variation) || variation.includes(header)) {
              mapping[originalHeader] = field;
              matched = true;
              break;
            }
          }
          if (matched) break;
        }
      }
    });
    
    return mapping;
  }

  onColumnMappingChange() {
    // Update preview when column mapping changes
    if (this.rawData.length > 0 && this.headers.length > 0) {
      this.previewData = this.rawData.slice(1, 11).map((row: any, index: number) => {
        const mappedRow: any = {};
        this.headers.forEach((header, colIndex) => {
          const mappedKey = this.columnMapping[header] || header;
          mappedRow[mappedKey] = row[colIndex];
        });
        return mappedRow;
      });
    }
  }

  downloadTemplate() {
    // Create a sample template with headers
    const templateData = [
      ['name', 'barcode', 'quantity', 'price', 'description', 'category_id', 'selling_price', 'currency', 'image_url'],
      ['Sample Product', '1234567890123', '100', '15.99', 'This is a sample product description', '1', '24.99', 'USD', 'https://example.com/image.jpg']
    ];
    
    const ws: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(templateData);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    
    const excelBuffer: any = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const data: Blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
    saveAs(data, 'inventory-import-template.xlsx');
  }

  async importItems() {
    if (!this.selectedFile) {
      alert('Please select a file first');
      return;
    }

    if (this.fileValidationError) {
      alert(this.fileValidationError);
      return;
    }

    if (this.isImporting) {
      return;
    }

    if (!this.previewData || this.previewData.length === 0) {
      alert('No data to import');
      return;
    }

    this.isImporting = true;
    const startTime = Date.now();

    try {
      // Prepare items array based on column mapping
      const itemsToImport = this.rawData.slice(1).map((row: any, rowIndex: number) => {
        const item: any = {};
        this.headers.forEach((header, colIndex) => {
          const mappedKey = this.columnMapping[header] || header;
          if (mappedKey && row[colIndex] !== undefined && row[colIndex] !== null) {
            // Handle category field specially - send as text for backend processing
            if (mappedKey === 'category_id') {
              item['category'] = row[colIndex]; // Send as text for backend to handle
            } else {
              item[mappedKey] = row[colIndex];
            }
          }
        });
        return item;
      }).filter(item => Object.keys(item).length > 0); // Remove empty items

      // Send items array to backend
      this.itemService.importItemsJson(itemsToImport).subscribe(
        (response: any) => {
          this.processingTime = Date.now() - startTime;
          this.isImporting = false;
          
          if (response && response.success) {
            this.importSuccessCount = response.imported || 0;
            this.importErrorCount = response.failed || 0;
            this.importErrors = response.errors || [];
            this.importResult = {
              success: true,
              message: `Import completed: ${this.importSuccessCount} successful, ${this.importErrorCount} failed`
            };
          } else {
            this.importResult = {
              success: false,
              message: 'Import failed. Please check the response format.'
            };
          }
        },
        (error: any) => {
          this.processingTime = Date.now() - startTime;
          this.isImporting = false;
          console.error('Error importing items:', error);
          this.importResult = {
            success: false,
            message: 'Import failed. Please check the file format and try again.'
          };
        }
      );
    } catch (error) {
      this.isImporting = false;
      this.importResult = {
        success: false,
        message: 'An unexpected error occurred during import.'
      };
    }
  }

  downloadErrorReport() {
    if (!this.importErrors || this.importErrors.length === 0) {
      alert('No errors to report.');
      return;
    }
    
    // Convert errors to CSV format
    const csvHeaders = ['Row', 'Field', 'Message', 'Value'];
    const csvRows = this.importErrors.map(error => [
      error.row || '',
      error.field || '',
      error.message || '',
      error.value || ''
    ]);
    
    const csvData = [csvHeaders, ...csvRows];
    const ws: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(csvData);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Import Errors');
    
    const excelBuffer: any = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const data: Blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
    saveAs(data, 'import-errors.xlsx');
  }

  getFileExtension(filename: string | null | undefined): string {
    if (!filename) {
      return '';
    }
    const parts = filename.split('.');
    return parts.length > 0 ? parts[parts.length - 1].toUpperCase() : '';
  }

  getImportProgress(): number {
    if (this.rawData.length === 0) return 0;
    const processed = this.importSuccessCount + this.importErrorCount;
    return Math.min(100, Math.round((processed / (this.rawData.length - 1)) * 100));
  }

  canImport(): boolean {
    return !!this.selectedFile && 
           !this.fileValidationError && 
           this.isPreviewing === false && 
           this.isImporting === false &&
           this.rawData.length > 1; // At least header + one data row
  }
}

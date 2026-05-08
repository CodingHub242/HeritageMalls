import { Component, Input, OnInit, OnChanges, SimpleChanges, ChangeDetectorRef, Inject, PLATFORM_ID } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { isPlatformBrowser } from '@angular/common';

interface ReceiptItem {
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

@Component({
  selector: 'app-receipt-modal',
  templateUrl: './receipt-modal.component.html',
  styleUrls: ['./receipt-modal.component.scss'],
  standalone: false,
})
export class ReceiptModalComponent implements OnInit, OnChanges {
  @Input() saleId: string | null = null;
  @Input() items: ReceiptItem[] = [];
  @Input() totalAmount: number = 0;
  @Input() paymentMethod: string = 'cash';
  @Input() saleDate: Date = new Date();

  constructor(private modalCtrl: ModalController, private cd: ChangeDetectorRef) {}

  ngOnInit() {
    console.log('ReceiptModalComponent ngOnInit - items length:', this.items.length);
    // Ensure change detection runs
    this.cd.detectChanges();
  }

  ngOnChanges(changes: SimpleChanges) {
    console.log('ReceiptModal ngOnChanges:', changes);
    this.cd.detectChanges();
  }

  dismiss() {
    this.modalCtrl.dismiss();
  }

  printReceipt() {
    // Check if we're running in Electron
    const isElectron = window.navigator.userAgent.includes('Electron') ||
                      (window as any).require?.('electron') ||
                      (window as any).process?.type === 'renderer';

    if (isElectron) {
      // In Electron, use webContents to print
      const printContent = document.getElementById('receipt-content');
      if (printContent) {
        // Create a temporary hidden element for printing
        const printElement = document.createElement('div');
        printElement.style.position = 'fixed';
        printElement.style.left = '-9999px';
        printElement.style.top = '-9999px';
        printElement.innerHTML = printContent.innerHTML;
        document.body.appendChild(printElement);

        // Trigger print
        window.print();

        // Clean up
        setTimeout(() => {
          document.body.removeChild(printElement);
        }, 500);
      }
    } else {
      // In browser, use the original method
      const printContent = document.getElementById('receipt-content');
      if (printContent) {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          // Safe number formatter
          const fmt = (val: any) => {
            const n = Number(val);
            return isNaN(n) ? '0.00' : n.toFixed(2);
          };

          const html = `
            <html>
              <head>
                <title>Receipt - ${this.saleId || 'Sale'}</title>
                <style>
                  body {
                    font-family: 'Courier New', monospace;
                    width: 300px;
                    margin: 0 auto;
                    padding: 20px;
                    font-size: 12px;
                  }
                  .receipt-header {
                    text-align: center;
                    border-bottom: 1px dashed #000;
                    padding-bottom: 10px;
                    margin-bottom: 10px;
                  }
                  .receipt-title {
                    font-size: 16px;
                    font-weight: bold;
                  }
                  .receipt-info {
                    margin-bottom: 10px;
                  }
                  .receipt-items {
                    margin: 10px 0;
                  }
                  .receipt-item {
                    display: flex;
                    justify-content: space-between;
                    margin: 5px 0;
                  }
                  .receipt-total {
                    border-top: 1px dashed #000;
                    padding-top: 10px;
                    margin-top: 10px;
                    font-weight: bold;
                    font-size: 14px;
                  }
                  .receipt-footer {
                    text-align: center;
                    margin-top: 20px;
                    font-size: 10px;
                  }
                  @media print {
                    body { width: 80mm; }
                  }
                </style>
              </head>
              <body>
                <div class="receipt-header">
                  <div class="receipt-title">INVENTORY RECEIPT</div>
                  <div>benlee.codepps.online</div>
                  <div>${this.saleDate.toLocaleDateString()} ${this.saleDate.toLocaleTimeString()}</div>
                  <div>Sale #: ${this.saleId || 'N/A'}</div>
                </div>
                <div class="receipt-items">
                  ${this.items.map(item => `
                    <div class="receipt-item">
                      <span>${item.name || 'Unknown'} x${item.quantity || 0}</span>
                      <span>GHS${fmt(item.total_price)}</span>
                    </div>
                  `).join('')}
                </div>
                <div class="receipt-total">
                  <div>TOTAL: GHS${fmt(this.totalAmount)}</div>
                  <div>Payment: ${(this.paymentMethod || 'cash').toUpperCase()}</div>
                </div>
                <div class="receipt-footer">
                  <p>Thank you for your purchase!</p>
                  <p>Please come again.</p>
                </div>
              </body>
            </html>
          `;

          printWindow.document.write(html);
          printWindow.document.close();
          printWindow.focus();

          // Ensure the document is rendered before printing
          setTimeout(() => {
            printWindow.print();
            // Close the window after printing
            printWindow.close();
          }, 300);
        }
      }
    }
  }
}

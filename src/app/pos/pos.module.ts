import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { PosPageRoutingModule } from './pos-routing.module';

import { PosPage } from './pos.page';
import { ReceiptModalComponent } from '../modals/receipt-modal/receipt-modal.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    PosPageRoutingModule
  ],
  declarations: [PosPage, ReceiptModalComponent]
})
export class PosPageModule {}
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

import { SalesDetailPageRoutingModule } from './sales-detail-routing.module';
import { SalesDetailPage } from './sales-detail.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule,
    SalesDetailPageRoutingModule
  ],
  declarations: [SalesDetailPage]
})
export class SalesDetailPageModule {}
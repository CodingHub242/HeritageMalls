import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CurrencyPipe } from '@angular/common';

import { IonicModule } from '@ionic/angular';

import { CategoryDetailsPageRoutingModule } from './category-details-routing.module';

import { CategoryDetailsPage } from './category-details.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    CategoryDetailsPageRoutingModule,
    CurrencyPipe
  ],
  declarations: [CategoryDetailsPage]
})
export class CategoryDetailsPageModule {}

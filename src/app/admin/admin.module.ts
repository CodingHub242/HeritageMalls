import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule, Routes } from '@angular/router';

import { IonicModule } from '@ionic/angular';
import { BaseChartDirective } from 'ng2-charts';

import { AdminPage } from './admin.page';
import { AddToSalesPage } from './add-to-sales/add-to-sales.page';
import { AdminRoutingModule } from './admin-routing.module';

@NgModule({
  declarations: [
    AdminPage,
    AddToSalesPage
  ],
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AdminRoutingModule,
    HttpClientModule,
    BaseChartDirective
  ]
})
export class AdminModule {}

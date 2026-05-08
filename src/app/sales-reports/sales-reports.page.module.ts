import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { SalesReportsPage } from './sales-reports.page';
import { SalesReportsPageRoutingModule } from './sales-reports-routing.module';

@NgModule({
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [
    CommonModule,
    IonicModule,
    SalesReportsPageRoutingModule,
    SalesReportsPage
  ],
  declarations: [],
})
export class SalesReportsPageModule {}

import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { BaseChartDirective } from 'ng2-charts';
import { SalesReportsPage } from './sales-reports.page';
import { SalesReportsPageRoutingModule } from './sales-reports-routing.module';

@NgModule({
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [
    CommonModule,
    IonicModule,
    SalesReportsPageRoutingModule,
    BaseChartDirective
  ],
  declarations: [SalesReportsPage]
})
export class SalesReportsPageModule {}

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { BaseChartDirective } from 'ng2-charts';
import { SalesReportsPage } from './sales-reports.page';
import { SalesReportsPageRoutingModule } from './sales-reports-routing.module';

@NgModule({
  imports: [
    CommonModule,
    IonicModule,
    SalesReportsPageRoutingModule,
    BaseChartDirective
  ],
  declarations: [SalesReportsPage]
})
export class SalesReportsPageModule {}

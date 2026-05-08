import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SalesDetailPage } from './sales-detail.page';

const routes: Routes = [
  {
    path: ':period/:value',
    component: SalesDetailPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class SalesDetailPageRoutingModule {}
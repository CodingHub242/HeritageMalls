import { NgModule } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { HomePage } from './home.page';
import { SyncStatusComponent } from '../sync-status/sync-status.component';

import { HomePageRoutingModule } from './home-routing.module';
import { CommonModule } from '@angular/common';
import { OfflineService } from '../services/offline.service';


@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,  
    HomePageRoutingModule
  ],
  declarations: [HomePage, SyncStatusComponent]
})
export class HomePageModule {}

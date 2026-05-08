import { Component, OnInit } from '@angular/core';
import { OfflineService } from '../services/offline.service';
import { interval } from 'rxjs';

@Component({
  selector: 'app-sync-status',
  templateUrl: './sync-status.component.html',
  styleUrls: ['./sync-status.component.scss'],
  standalone: false,
})
export class SyncStatusComponent implements OnInit {
  online = true;
  isSyncing = false;
  pendingSyncCount = 0;
  lastSyncTime: Date | null = null;

  constructor(private offlineService: OfflineService) { }

  ngOnInit() {
    this.updateStatus();
    
    // Update status periodically
    interval(30000).subscribe(() => {
      this.updateStatus();
    });
    
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.online = true;
      this.sync();
    });
    
    window.addEventListener('offline', () => {
      this.online = false;
    });
  }

  updateStatus() {
    this.online = this.offlineService.isOnline();
    
    // Get pending sync count
    this.offlineService.getPendingSync().subscribe(
      (pendingOps: any[]) => {
        this.pendingSyncCount = pendingOps ? pendingOps.length : 0;
      },
      (error:Error) => {
        console.error('Error getting pending sync count:', error);
      }
    );
  }

  sync() {
    if (!this.online || this.isSyncing) {
      return;
    }
    
    this.isSyncing = true;
    
    this.offlineService.syncPendingOperations().subscribe(
      (result: any) => {
        this.isSyncing = false;
        this.lastSyncTime = new Date();
        this.updateStatus();
        
        if (result.success) {
          console.log(`Synced ${result.synced} operations`);
        }
      },
      (error) => {
        this.isSyncing = false;
        console.error('Error syncing:', error);
      }
    );
  }
}

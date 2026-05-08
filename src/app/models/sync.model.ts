export interface SyncMetadata {
  lastSync: string;
  version: number;
  serverId: string;
}

export interface SyncResult {
  success: boolean;
  itemsUploaded: number;
  itemsDownloaded: number;
  categoriesUploaded: number;
  categoriesDownloaded: number;
  errors?: string[];
}

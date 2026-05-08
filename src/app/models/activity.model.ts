export type ActivityType = 'added' | 'updated' | 'deleted' | 'stocked';

export interface Activity {
  id: string;
  type: ActivityType;
  item: string;
  time: string;
  user?: string;
  details?: string;
}


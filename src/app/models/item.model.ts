import { Category } from './category.model';

export interface Item {
  id?: string;
  name: string;
  description: string;
  category_id: number;
  form_data: any;
  barcode: string;
  image_url?: string;
  image_urls?: string[];
  created_at?: string;
  quantity: number;
  price: number;
  selling_price?: number;
  currency: string;
  updated_at?: string;
  category?: Category;
}
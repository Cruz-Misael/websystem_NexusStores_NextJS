// types/sales.ts
export interface Sale {
  id: number;
  created_at: string;
  sale_date: string;
  customer_id: number | null;
  customer?: {
    id: number;
    name: string;
    email: string;
    phone?: string;
  };
  total_amount: number;
  discount_amount: number;
  final_amount: number; 
  payment_method: 'credit_card' | 'debit' | 'cash' | 'pix' | null;
  payment_status: 'pending' | 'paid' | 'cancelled';
  observation: string | null;
  items: SaleItem[];
}

export interface SaleItem {
  id: number;
  sale_id: number;
  product_id: number;
  product_name: string;
  product_sku: string;
  product_barcode?: string;
  quantity: number;
  unit_price: number;
  unit_cost: number;
  discount_per_item: number;
  total_price: number;
}

export interface CreateSaleDTO {
  customer_id?: number | null;
  payment_method?: 'credit_card' | 'debit' | 'cash' | 'pix' | null;
  payment_status?: 'pending' | 'paid' | 'cancelled';
  discount_amount?: number;
  observation?: string;
  items: {
    product_id: number;
    quantity: number;
    discount?: number;
  }[];
}
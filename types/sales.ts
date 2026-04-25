// types/sales.ts

// Tipo para um produto aninhado dentro de um item de venda
export type NestedProduct = {
  sku: number;
  name: string;
  price: number;
};

// Tipo para um cliente (pessoa) aninhado dentro de uma venda
export type NestedCustomer = {
  id: number;
  name: string;
  email: string;
  phone?: string;
};

// Item da venda, agora com o produto aninhado
export interface SaleItem {
  id: number;
  sale_id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  total_price: number;
  // Propriedades que podem ou não vir na consulta principal
  product_name: string;
  product_sku: string;
  product_barcode?: string;
  unit_cost: number;
  discount_per_item: number;
  // Objeto do produto aninhado
  product: NestedProduct;
}

// Venda principal, com cliente e itens aninhados
export interface Sale {
  id: number;
  created_at: string;
  sale_date: string;
  customer_id: number | null;
  total_amount: number;
  discount_amount: number;
  final_amount: number; 
  payment_method: string | null;
  payment_status: 'pending' | 'paid' | 'cancelled';
  observation: string | null;
  // Objetos aninhados
  customer: NestedCustomer | null;
  items: SaleItem[];
}

// DTO (Data Transfer Object) para criar uma nova venda
export interface CreateSaleDTO {
  customer_id?: number | null;
  payment_method?: string | null;
  payment_status?: 'pending' | 'paid' | 'cancelled';
  discount_amount?: number;
  observation?: string;
  items: {
    product_id: number;
    quantity: number;
    discount?: number;
  }[];
}

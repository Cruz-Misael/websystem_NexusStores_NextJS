export interface ItemVenda {
  id: number;
  nome: string;
  sku: string;
  codigoBarras: string;
  quantidade: number;
  precoUnitario: number;
  variante?: string;
}

export interface Venda {
  id: number;
  dataHora: string;
  cliente: string;
  total: number;
  status: "Concluída" | "Cancelada" | "Pendente";
  metodoPagamento: string;
  desconto?: number;
  itens: ItemVenda[];
}

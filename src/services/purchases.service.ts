// src/services/purchases.service.ts
// Pedidos de compra e recebimento de mercadoria.
// Operações compostas (confirmar/estornar recebimento) rodam em RPCs
// transacionais no Postgres — ver sql/compras_financeiro_setup.sql.
import { supabase } from "@/src/lib/supabase/client";

export type PurchaseOrderStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "sent"
  | "partially_received"
  | "received"
  | "cancelled";

export interface PurchaseOrderItem {
  id: number;
  purchase_order_id: number;
  product_sku: number | null;
  description: string | null;
  quantity_ordered: number;
  quantity_received: number;
  unit_cost: number;
  total_cost: number;
  product?: { sku: number; name: string; stock_quantity: number | null } | null;
}

export interface PurchaseOrder {
  id: number;
  code: string;
  supplier_id: number;
  status: PurchaseOrderStatus;
  expected_date: string | null;
  items_total: number;
  freight: number;
  discount: number;
  other_costs: number;
  total_amount: number;
  payment_terms: string | null;
  notes: string | null;
  created_at: string;
  supplier?: { id: number; name: string } | null;
  items: PurchaseOrderItem[];
}

export interface GoodsReceipt {
  id: number;
  code: string;
  purchase_order_id: number | null;
  supplier_id: number;
  receipt_date: string;
  invoice_number: string | null;
  freight: number;
  other_costs: number;
  total_amount: number;
  status: "draft" | "confirmed" | "cancelled";
  supplier?: { id: number; name: string } | null;
}

export interface CreatePurchaseOrderDTO {
  supplier_id: number;
  expected_date?: string | null;
  freight?: number;
  discount?: number;
  other_costs?: number;
  payment_terms?: string | null;
  notes?: string | null;
  items: {
    product_sku: number | null;
    description?: string | null;
    quantity_ordered: number;
    unit_cost: number;
  }[];
}

export interface ParcelaDTO {
  due_date: string; // YYYY-MM-DD
  amount: number;
}

const PO_SELECT = `
  *,
  supplier:suppliers(id, name),
  items:purchase_order_items(
    *,
    product:products(sku, name, stock_quantity)
  )
`;

/* =========================
   PEDIDOS DE COMPRA
========================= */

export async function listarPedidosCompra(filtros?: {
  status?: PurchaseOrderStatus | "all";
  supplierId?: number;
  busca?: string;
}): Promise<PurchaseOrder[]> {
  let query = supabase
    .from("purchase_orders")
    .select(PO_SELECT)
    .order("created_at", { ascending: false })
    .limit(300);

  if (filtros?.status && filtros.status !== "all") query = query.eq("status", filtros.status);
  if (filtros?.supplierId) query = query.eq("supplier_id", filtros.supplierId);
  if (filtros?.busca && filtros.busca.trim()) query = query.ilike("code", `%${filtros.busca.trim()}%`);

  const { data, error } = await query;
  if (error) throw new Error(`Erro ao listar pedidos de compra: ${error.message}`);
  return (data || []) as unknown as PurchaseOrder[];
}

export async function buscarPedidoCompra(id: number): Promise<PurchaseOrder> {
  const { data, error } = await supabase
    .from("purchase_orders")
    .select(PO_SELECT)
    .eq("id", id)
    .single();

  if (error) throw new Error(`Erro ao buscar pedido: ${error.message}`);
  return data as unknown as PurchaseOrder;
}

function calcularTotais(dto: CreatePurchaseOrderDTO) {
  const itemsTotal = dto.items.reduce(
    (s, i) => s + i.quantity_ordered * i.unit_cost,
    0
  );
  const total =
    itemsTotal + (dto.freight || 0) + (dto.other_costs || 0) - (dto.discount || 0);
  return { itemsTotal, total };
}

export async function criarPedidoCompra(dto: CreatePurchaseOrderDTO): Promise<PurchaseOrder> {
  if (!dto.items.length) throw new Error("Adicione ao menos um item ao pedido");

  const { itemsTotal, total } = calcularTotais(dto);
  const { data: { user } } = await supabase.auth.getUser();

  const { data: po, error } = await supabase
    .from("purchase_orders")
    .insert([{
      supplier_id: dto.supplier_id,
      expected_date: dto.expected_date || null,
      items_total: itemsTotal,
      freight: dto.freight || 0,
      discount: dto.discount || 0,
      other_costs: dto.other_costs || 0,
      total_amount: total,
      payment_terms: dto.payment_terms || null,
      notes: dto.notes || null,
      created_by: user?.id || null,
    }])
    .select()
    .single();

  if (error || !po) throw new Error(`Erro ao criar pedido: ${error?.message}`);

  const { error: itemsError } = await supabase
    .from("purchase_order_items")
    .insert(dto.items.map((i) => ({
      purchase_order_id: po.id,
      product_sku: i.product_sku,
      description: i.description || null,
      quantity_ordered: i.quantity_ordered,
      unit_cost: i.unit_cost,
      total_cost: i.quantity_ordered * i.unit_cost,
    })));

  if (itemsError) {
    // Rollback do cabeçalho (mesmo padrão de criarVenda)
    await supabase.from("purchase_orders").delete().eq("id", po.id);
    throw new Error(`Erro ao criar itens do pedido: ${itemsError.message}`);
  }

  return buscarPedidoCompra(po.id);
}

export async function atualizarPedidoCompra(id: number, dto: CreatePurchaseOrderDTO): Promise<PurchaseOrder> {
  const atual = await buscarPedidoCompra(id);
  if (atual.status !== "draft") {
    throw new Error("Somente pedidos em rascunho podem ser editados");
  }

  const { itemsTotal, total } = calcularTotais(dto);

  const { error } = await supabase
    .from("purchase_orders")
    .update({
      supplier_id: dto.supplier_id,
      expected_date: dto.expected_date || null,
      items_total: itemsTotal,
      freight: dto.freight || 0,
      discount: dto.discount || 0,
      other_costs: dto.other_costs || 0,
      total_amount: total,
      payment_terms: dto.payment_terms || null,
      notes: dto.notes || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw new Error(`Erro ao atualizar pedido: ${error.message}`);

  // Substitui os itens (pedido ainda é rascunho — sem recebimentos vinculados)
  const { error: delError } = await supabase
    .from("purchase_order_items")
    .delete()
    .eq("purchase_order_id", id);
  if (delError) throw new Error(`Erro ao atualizar itens: ${delError.message}`);

  const { error: insError } = await supabase
    .from("purchase_order_items")
    .insert(dto.items.map((i) => ({
      purchase_order_id: id,
      product_sku: i.product_sku,
      description: i.description || null,
      quantity_ordered: i.quantity_ordered,
      unit_cost: i.unit_cost,
      total_cost: i.quantity_ordered * i.unit_cost,
    })));
  if (insError) throw new Error(`Erro ao atualizar itens: ${insError.message}`);

  return buscarPedidoCompra(id);
}

const TRANSICOES_VALIDAS: Record<string, PurchaseOrderStatus[]> = {
  draft: ["pending_approval", "approved", "cancelled"],
  pending_approval: ["approved", "draft", "cancelled"],
  approved: ["sent", "draft", "cancelled"],
  sent: ["cancelled"], // recebimento muda o status via RPC
  partially_received: ["cancelled"],
};

export async function atualizarStatusPedido(
  id: number,
  novoStatus: PurchaseOrderStatus
): Promise<void> {
  const atual = await buscarPedidoCompra(id);
  const permitidas = TRANSICOES_VALIDAS[atual.status] || [];
  if (!permitidas.includes(novoStatus)) {
    throw new Error(`Não é possível mudar de "${atual.status}" para "${novoStatus}"`);
  }

  const patch: Record<string, unknown> = {
    status: novoStatus,
    updated_at: new Date().toISOString(),
  };

  if (novoStatus === "approved") {
    const { data: { user } } = await supabase.auth.getUser();
    patch.approved_by = user?.id || null;
    patch.approved_at = new Date().toISOString();
  }

  const { error } = await supabase.from("purchase_orders").update(patch).eq("id", id);
  if (error) throw new Error(`Erro ao atualizar status: ${error.message}`);
}

/* =========================
   RECEBIMENTO DE MERCADORIA
========================= */

export interface CreateReceiptDTO {
  purchase_order_id: number | null;
  supplier_id: number;
  invoice_number?: string | null;
  freight?: number;
  other_costs?: number;
  notes?: string | null;
  items: {
    purchase_order_item_id: number | null;
    product_sku: number | null;
    quantity: number;
    unit_cost: number;
  }[];
}

export async function criarRecebimento(dto: CreateReceiptDTO): Promise<number> {
  const itens = dto.items.filter((i) => i.quantity > 0);
  if (!itens.length) throw new Error("Informe a quantidade recebida de ao menos um item");

  const itemsTotal = itens.reduce((s, i) => s + i.quantity * i.unit_cost, 0);
  const { data: { user } } = await supabase.auth.getUser();

  const { data: receipt, error } = await supabase
    .from("goods_receipts")
    .insert([{
      purchase_order_id: dto.purchase_order_id,
      supplier_id: dto.supplier_id,
      invoice_number: dto.invoice_number || null,
      freight: dto.freight || 0,
      other_costs: dto.other_costs || 0,
      total_amount: itemsTotal + (dto.freight || 0) + (dto.other_costs || 0),
      notes: dto.notes || null,
      received_by: user?.id || null,
    }])
    .select()
    .single();

  if (error || !receipt) throw new Error(`Erro ao criar recebimento: ${error?.message}`);

  const { error: itemsError } = await supabase
    .from("goods_receipt_items")
    .insert(itens.map((i) => ({
      goods_receipt_id: receipt.id,
      purchase_order_item_id: i.purchase_order_item_id,
      product_sku: i.product_sku,
      quantity: i.quantity,
      unit_cost: i.unit_cost,
      total_cost: i.quantity * i.unit_cost,
    })));

  if (itemsError) {
    await supabase.from("goods_receipts").delete().eq("id", receipt.id);
    throw new Error(`Erro ao criar itens do recebimento: ${itemsError.message}`);
  }

  return receipt.id;
}

/**
 * Confirma o recebimento via RPC transacional:
 * entrada de estoque + custo médio + status do pedido + conta a pagar com parcelas.
 */
export async function confirmarRecebimento(
  receiptId: number,
  parcelas: ParcelaDTO[] | null
): Promise<{ receipt_id: number; payable_id: number; total: number }> {
  const { data, error } = await supabase.rpc("confirmar_recebimento", {
    p_receipt_id: receiptId,
    p_parcelas: parcelas && parcelas.length ? parcelas : null,
  });

  if (error) throw new Error(`Erro ao confirmar recebimento: ${error.message}`);
  return data;
}

/** Atalho: cria o recebimento e já confirma (fluxo padrão da tela). */
export async function receberMercadoria(
  dto: CreateReceiptDTO,
  parcelas: ParcelaDTO[] | null
) {
  const receiptId = await criarRecebimento(dto);
  return confirmarRecebimento(receiptId, parcelas);
}

export async function estornarRecebimento(receiptId: number): Promise<void> {
  const { error } = await supabase.rpc("estornar_recebimento", {
    p_receipt_id: receiptId,
  });
  if (error) throw new Error(`Erro ao estornar recebimento: ${error.message}`);
}

export async function listarRecebimentos(purchaseOrderId?: number): Promise<GoodsReceipt[]> {
  let query = supabase
    .from("goods_receipts")
    .select("*, supplier:suppliers(id, name)")
    .order("receipt_date", { ascending: false })
    .limit(200);

  if (purchaseOrderId) query = query.eq("purchase_order_id", purchaseOrderId);

  const { data, error } = await query;
  if (error) throw new Error(`Erro ao listar recebimentos: ${error.message}`);
  return (data || []) as unknown as GoodsReceipt[];
}

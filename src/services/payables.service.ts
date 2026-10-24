// src/services/payables.service.ts
// Financeiro: contas (caixa/banco), categorias, contas a pagar e baixas.
// Baixa/estorno rodam em RPCs transacionais — ver sql/compras_financeiro_setup.sql.
import { supabase } from "@/src/lib/supabase/client";
import type { ParcelaDTO } from "./purchases.service";

export interface FinancialAccount {
  id: number;
  name: string;
  type: "cash" | "bank" | "wallet";
  opening_balance: number;
  current_balance: number;
  is_active: boolean;
}

export interface FinancialCategory {
  id: number;
  name: string;
  type: "income" | "expense";
  parent_id: number | null;
  is_active: boolean;
}

export type PayableStatus = "open" | "partially_paid" | "paid" | "cancelled";

export interface PayableInstallment {
  id: number;
  payable_id: number;
  installment_number: number;
  due_date: string;
  amount: number;
  paid_amount: number;
  status: PayableStatus;
}

export interface Payable {
  id: number;
  code: string;
  supplier_id: number | null;
  description: string;
  category_id: number | null;
  origin: "purchase" | "manual" | "expense";
  goods_receipt_id: number | null;
  purchase_order_id: number | null;
  total_amount: number;
  issue_date: string;
  status: PayableStatus;
  notes: string | null;
  created_at: string;
  supplier?: { id: number; name: string } | null;
  category?: { id: number; name: string } | null;
  installments: PayableInstallment[];
}

export interface FinancialTransaction {
  id: number;
  account_id: number;
  direction: "in" | "out";
  amount: number;
  interest_amount: number;
  discount_amount: number;
  payment_method: string | null;
  reference_type: string | null;
  reference_id: number | null;
  reversed_of: number | null;
  transaction_date: string;
  notes: string | null;
  account?: { id: number; name: string } | null;
}

/* =========================
   CONTAS (CAIXA / BANCO)
========================= */

export async function listarContasFinanceiras(): Promise<FinancialAccount[]> {
  const { data, error } = await supabase
    .from("financial_accounts")
    .select("*")
    .eq("is_active", true)
    .order("name");

  if (error) throw new Error(`Erro ao listar contas: ${error.message}`);
  return data || [];
}

/* =========================
   CATEGORIAS
========================= */

export async function listarCategorias(tipo?: "income" | "expense"): Promise<FinancialCategory[]> {
  let query = supabase
    .from("financial_categories")
    .select("*")
    .eq("is_active", true)
    .order("name");

  if (tipo) query = query.eq("type", tipo);

  const { data, error } = await query;
  if (error) throw new Error(`Erro ao listar categorias: ${error.message}`);
  return data || [];
}

/* =========================
   CONTAS A PAGAR
========================= */

const PAYABLE_SELECT = `
  *,
  supplier:suppliers(id, name),
  category:financial_categories(id, name),
  installments:payable_installments(*)
`;

export async function listarContasPagar(filtros?: {
  status?: PayableStatus | "all";
  supplierId?: number;
  categoriaId?: number;
  busca?: string;
}): Promise<Payable[]> {
  let query = supabase
    .from("payables")
    .select(PAYABLE_SELECT)
    .order("created_at", { ascending: false })
    .limit(300);

  if (filtros?.status && filtros.status !== "all") query = query.eq("status", filtros.status);
  if (filtros?.supplierId) query = query.eq("supplier_id", filtros.supplierId);
  if (filtros?.categoriaId) query = query.eq("category_id", filtros.categoriaId);
  if (filtros?.busca && filtros.busca.trim()) {
    const b = filtros.busca.trim();
    query = query.or(`description.ilike.%${b}%,code.ilike.%${b}%`);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Erro ao listar contas a pagar: ${error.message}`);

  const payables = (data || []) as unknown as Payable[];
  payables.forEach((p) =>
    p.installments.sort((a, b) => a.installment_number - b.installment_number)
  );
  return payables;
}

export async function criarContaPagarManual(dto: {
  description: string;
  total: number;
  parcelas: ParcelaDTO[];
  categoryId?: number | null;
  supplierId?: number | null;
  issueDate?: string;
  notes?: string | null;
}): Promise<number> {
  const { data, error } = await supabase.rpc("criar_conta_pagar_manual", {
    p_description: dto.description,
    p_total: dto.total,
    p_parcelas: dto.parcelas,
    p_category_id: dto.categoryId ?? null,
    p_supplier_id: dto.supplierId ?? null,
    p_issue_date: dto.issueDate ?? new Date().toISOString().slice(0, 10),
    p_notes: dto.notes ?? null,
  });

  if (error) throw new Error(`Erro ao criar conta a pagar: ${error.message}`);
  return data as number;
}

export async function cancelarContaPagar(payableId: number): Promise<void> {
  // Só permite cancelar se nenhuma parcela tiver pagamento
  const { data: parcelas, error: instError } = await supabase
    .from("payable_installments")
    .select("paid_amount")
    .eq("payable_id", payableId);

  if (instError) throw new Error(instError.message);
  if ((parcelas || []).some((p) => (p.paid_amount || 0) > 0)) {
    throw new Error("Esta conta já possui pagamentos. Estorne as baixas antes de cancelar.");
  }

  const { error: e1 } = await supabase
    .from("payable_installments")
    .update({ status: "cancelled" })
    .eq("payable_id", payableId);
  if (e1) throw new Error(e1.message);

  const { error: e2 } = await supabase
    .from("payables")
    .update({ status: "cancelled" })
    .eq("id", payableId);
  if (e2) throw new Error(e2.message);
}

/* =========================
   BAIXAS (PAGAMENTOS)
========================= */

export async function baixarParcela(dto: {
  installmentId: number;
  accountId: number;
  amount: number;
  juros?: number;
  desconto?: number;
  paymentMethod?: string | null;
  date?: string;
  notes?: string | null;
}): Promise<void> {
  const { error } = await supabase.rpc("baixar_parcela", {
    p_installment_id: dto.installmentId,
    p_account_id: dto.accountId,
    p_amount: dto.amount,
    p_juros: dto.juros ?? 0,
    p_desconto: dto.desconto ?? 0,
    p_payment_method: dto.paymentMethod ?? null,
    p_date: dto.date ?? new Date().toISOString().slice(0, 10),
    p_notes: dto.notes ?? null,
  });

  if (error) throw new Error(`Erro ao baixar parcela: ${error.message}`);
}

export async function estornarBaixa(transactionId: number): Promise<void> {
  const { error } = await supabase.rpc("estornar_baixa", {
    p_transaction_id: transactionId,
  });
  if (error) throw new Error(`Erro ao estornar baixa: ${error.message}`);
}

export async function listarBaixasDaParcela(installmentId: number): Promise<FinancialTransaction[]> {
  const { data, error } = await supabase
    .from("financial_transactions")
    .select("*, account:financial_accounts(id, name)")
    .eq("reference_type", "payable_installment")
    .eq("reference_id", installmentId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Erro ao listar baixas: ${error.message}`);
  return (data || []) as unknown as FinancialTransaction[];
}

/* =========================
   RESUMO / KPIs
========================= */

export interface ResumoContasPagar {
  vencidas: { qtd: number; valor: number };
  venceHoje: { qtd: number; valor: number };
  proximos7Dias: { qtd: number; valor: number };
  emAberto: { qtd: number; valor: number };
}

export async function getResumoContasPagar(): Promise<ResumoContasPagar> {
  const { data, error } = await supabase
    .from("payable_installments")
    .select("due_date, amount, paid_amount, status")
    .in("status", ["open", "partially_paid"]);

  if (error) throw new Error(`Erro ao carregar resumo: ${error.message}`);

  const hoje = new Date().toISOString().slice(0, 10);
  const em7 = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const resumo: ResumoContasPagar = {
    vencidas: { qtd: 0, valor: 0 },
    venceHoje: { qtd: 0, valor: 0 },
    proximos7Dias: { qtd: 0, valor: 0 },
    emAberto: { qtd: 0, valor: 0 },
  };

  for (const p of data || []) {
    const restante = (p.amount || 0) - (p.paid_amount || 0);
    resumo.emAberto.qtd += 1;
    resumo.emAberto.valor += restante;

    if (p.due_date < hoje) {
      resumo.vencidas.qtd += 1;
      resumo.vencidas.valor += restante;
    } else if (p.due_date === hoje) {
      resumo.venceHoje.qtd += 1;
      resumo.venceHoje.valor += restante;
    } else if (p.due_date <= em7) {
      resumo.proximos7Dias.qtd += 1;
      resumo.proximos7Dias.valor += restante;
    }
  }

  return resumo;
}

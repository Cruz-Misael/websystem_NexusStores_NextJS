// src/services/suppliers.service.ts
import { supabase } from "@/src/lib/supabase/client";

export interface Supplier {
  id: number;
  name: string;
  legal_name: string | null;
  document: string | null;
  email: string | null;
  phone: string | null;
  contact_name: string | null;
  address: { logradouro?: string; cidade?: string; uf?: string; cep?: string } | null;
  default_payment_terms: string | null;
  lead_time_days: number | null;
  bank_info: { banco?: string; agencia?: string; conta?: string; pix?: string } | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

export type SupplierDTO = Omit<Supplier, "id" | "created_at">;

export async function listarFornecedores(somenteAtivos = true): Promise<Supplier[]> {
  let query = supabase.from("suppliers").select("*").order("name");
  if (somenteAtivos) query = query.eq("is_active", true);

  const { data, error } = await query;
  if (error) throw new Error(`Erro ao listar fornecedores: ${error.message}`);
  return data || [];
}

export async function listarFornecedoresPaginado(
  pagina: number = 1,
  itensPorPagina: number = 50,
  busca?: string,
  mostrarInativos?: boolean
) {
  const inicio = (pagina - 1) * itensPorPagina;
  const fim = inicio + itensPorPagina - 1;

  let query = supabase
    .from("suppliers")
    .select("*", { count: "exact" })
    .order("name");

  if (busca && busca.trim()) {
    const b = busca.trim();
    query = query.or(`name.ilike.%${b}%,legal_name.ilike.%${b}%,document.ilike.%${b}%`);
  }

  if (!mostrarInativos) query = query.eq("is_active", true);

  const { data, error, count } = await query.range(inicio, fim);
  if (error) throw new Error(`Erro ao listar fornecedores: ${error.message}`);

  return {
    fornecedores: (data || []) as Supplier[],
    total: count || 0,
    pagina,
    totalPaginas: Math.ceil((count || 0) / itensPorPagina),
    itensPorPagina,
  };
}

export async function criarFornecedor(fornecedor: Partial<SupplierDTO>): Promise<Supplier> {
  const { data, error } = await supabase
    .from("suppliers")
    .insert([fornecedor])
    .select()
    .single();

  if (error) throw new Error(`Erro ao criar fornecedor: ${error.message}`);
  return data;
}

export async function atualizarFornecedor(id: number, fornecedor: Partial<SupplierDTO>): Promise<Supplier> {
  const { data, error } = await supabase
    .from("suppliers")
    .update(fornecedor)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(`Erro ao atualizar fornecedor: ${error.message}`);
  return data;
}

export async function inativarFornecedor(id: number, ativo: boolean): Promise<void> {
  const { error } = await supabase
    .from("suppliers")
    .update({ is_active: ativo })
    .eq("id", id);

  if (error) throw new Error(`Erro ao atualizar fornecedor: ${error.message}`);
}

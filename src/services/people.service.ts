// src/services/people.service.ts (já está usando people_id)
import { supabase } from "@/src/lib/supabase/client";

/* =========================
   CRIAR PESSOA
========================= */
export async function criarPessoa(pessoa: any) {
  console.log("Criando pessoa:", pessoa);

  const { data, error } = await supabase
    .from("people")
    .insert([pessoa])
    .select()
    .single();

  if (error) {
    console.error("Erro ao criar pessoa:", error);
    throw new Error(`Erro ao criar pessoa: ${error.message}`);
  }

  console.log("Pessoa criada com sucesso:", data);
  return data;
}

/* =========================
   ATUALIZAR PESSOA
========================= */
export async function atualizarPessoa(id: number, pessoa: any) {
  console.log("Atualizando pessoa ID:", id);

  const { data, error } = await supabase
    .from("people")
    .update(pessoa)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Erro ao atualizar pessoa:", error);
    throw new Error(`Erro ao atualizar pessoa: ${error.message}`);
  }

  console.log("Pessoa atualizada:", data);
  return data;
}

/* =========================
   ATUALIZAR LIMITE DE VENDA (cliente novo)
========================= */
export async function atualizarLimiteCliente(id: number, salesLimit: number | null) {
  const { data, error } = await supabase
    .from("people")
    .update({ sales_limit: salesLimit })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Erro ao atualizar limite do cliente:", error);
    throw new Error(`Erro ao atualizar limite: ${error.message}`);
  }

  return data;
}

/* =========================
   BUSCAR POR ID
========================= */
export async function buscarPessoaPorId(id: number) {
  console.log("Buscando pessoa ID:", id);

  const { data, error } = await supabase
    .from("people")
    .select(`
      *,
      documents(*)
    `)
    .eq("id", id)
    .single();

  if (error) {
    console.error("Erro ao buscar pessoa com documentos:", error);
    throw new Error(`Erro ao buscar pessoa: ${error.message}`);
  }

  return data;
}

/* =========================
   LISTAR TODAS
========================= */
export async function listarPessoas() {
  console.log("Listando pessoas");

  const { data, error } = await supabase
    .from("people")
    .select(`
      *,
      documents(*)
    `)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    console.error("Erro ao listar pessoas com documentos:", error);
    throw new Error(`Erro ao listar pessoas: ${error.message}`);
  }

  return data || [];
}

/* =========================
   LISTAR PAGINADO
========================= */
export async function listarPessoasPaginado(
  pagina: number = 1,
  itensPorPagina: number = 50,
  busca?: string,
  mostrarInativos?: boolean
) {
  const inicio = (pagina - 1) * itensPorPagina;
  const fim = inicio + itensPorPagina - 1;

  let pessoasQuery = supabase
    .from("people")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (busca && busca.trim()) {
    pessoasQuery = pessoasQuery.or(`name.ilike.%${busca.trim()}%,email.ilike.%${busca.trim()}%,phone.ilike.%${busca.trim()}%`);
  }

  if (!mostrarInativos) {
    pessoasQuery = pessoasQuery.or("is_active.eq.true,is_active.is.null");
  }

  // Primeiro busca as pessoas paginadas
  const { data: pessoas, error: pessoasError, count } = await pessoasQuery.range(inicio, fim);

  if (pessoasError) {
    console.error("Erro ao listar pessoas paginado:", pessoasError);
    throw new Error(pessoasError.message);
  }

  // Não buscamos os documentos aqui: a lista de clientes não os exibe, e antes
  // isso disparava 1 query por pessoa (N+1) trazendo blobs base64 à toa. Os
  // documentos são carregados sob demanda ao abrir um cliente (buscarPessoaPorId).
  return {
    pessoas: pessoas || [],
    total: count || 0,
    pagina,
    totalPaginas: Math.ceil((count || 0) / itensPorPagina),
    itensPorPagina,
  };
}

/* =========================
   DELETAR
========================= */
export async function deletarPessoa(id: number) {
  console.log("Deletando pessoa ID:", id);

  // Os documentos serão deletados automaticamente pelo ON DELETE CASCADE
  const { error } = await supabase
    .from("people")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Erro ao deletar pessoa:", error);
    throw new Error(error.message);
  }

  return { success: true };
}
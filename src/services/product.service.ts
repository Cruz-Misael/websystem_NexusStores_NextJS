// product.service.ts completo
import { supabase } from "@/src/lib/supabase/client";

export async function criarProduto(produto: any) {
  const produtoParaInserir = { ...produto };
  if (produtoParaInserir.sku === undefined) {
    delete produtoParaInserir.sku;
  }

  const { data, error } = await supabase
    .from("products")
    .insert([produtoParaInserir])
    .select()
    .single();

  if (error) {
    console.error("Erro ao criar produto:", error);
    throw new Error(`Erro ao criar produto: ${error.message}`);
  }

  return data;
}

export async function atualizarProduto(sku: number, produto: any) {
  const { data, error } = await supabase
    .from("products")
    .update(produto)
    .eq("sku", sku)
    .select()
    .single();

  if (error) {
    console.error("Erro ao atualizar produto:", error);
    throw new Error(`Erro ao atualizar produto: ${error.message}`);
  }

  return data;
}

export async function buscarProdutoPorSKU(sku: number) {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("sku", sku)
    .single();

  if (error) {
    console.error("Erro ao buscar produto:", error);
    throw new Error(`Erro ao buscar produto: ${error.message}`);
  }

  return data;
}

// product.service.ts - Versão paginada
// Opção A: Mantenha listarProdutos() original para array simples
export async function listarProdutos() {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1000); // Máximo do Supabase

  if (error) throw new Error(`Erro ao listar produtos: ${error.message}`);
  return data || [];
}

// Opção B: Renomeie a função paginada para ficar claro
export async function listarProdutosPaginado(
  pagina: number = 1, 
  itensPorPagina: number = 50
) {
  const inicio = (pagina - 1) * itensPorPagina;
  const fim = inicio + itensPorPagina - 1;

  const { data, error, count } = await supabase
    .from("products")
    .select("*", { count: 'exact' })
    .order("created_at", { ascending: false })
    .range(inicio, fim);

  if (error) throw new Error(`Erro: ${error.message}`);

  return {
    produtos: data || [],
    total: count || 0,
    pagina,
    totalPaginas: Math.ceil((count || 0) / itensPorPagina),
    itensPorPagina
  };
}

export async function deletarProduto(sku: number) {
  const { error } = await supabase
    .from("products")
    .delete()
    .eq("sku", sku);

  if (error) {
    console.error("Erro ao deletar produto:", error);
    throw new Error(`Erro ao deletar produto: ${error.message}`);
  }

  return { success: true };
}
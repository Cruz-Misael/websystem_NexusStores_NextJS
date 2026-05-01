// src/services/returns.service.ts
import { supabase } from "@/src/lib/supabase/client";

export interface CreateDevolucaoDTO {
  vendaId: number;
  itens: {
    itemId: number;
    quantidade: number;
  }[];
  motive: string; // motivo
  type: 'devolucao' | 'troca'; // tipo
}

export async function criarDevolucao(data: CreateDevolucaoDTO) {
  console.log("📦 Criando devolução:", data);

  try {
    // 1. Criar registro da devolução
    const { data: devolucao, error: errorDevolucao } = await supabase
      .from("returns")
      .insert([{
        sale_id: data.vendaId,
        motive: data.motive,
        type: data.type,
        status: 'completed',
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (errorDevolucao) throw errorDevolucao;

    // 2. Inserir itens devolvidos e atualizar estoque
    for (const item of data.itens) {
      // Buscar o item da venda para saber o produto e preço
      const { data: saleItem, error: errorBusca } = await supabase
        .from("sale_items")
        .select("product_id, unit_price, quantity")
        .eq("id", item.itemId)
        .single();

      if (errorBusca) throw errorBusca;

      // Calcular total do item devolvido
      const totalPrice = saleItem.unit_price * item.quantidade;

      // Inserir item na devolução
      const { error: errorItem } = await supabase
        .from("return_items")
        .insert([{
          return_id: devolucao.id,
          sale_item_id: item.itemId,
          product_id: saleItem.product_id,
          quantity: item.quantidade,
          unit_price: saleItem.unit_price,
          total_price: totalPrice
        }]);

      if (errorItem) throw errorItem;

      // 3. Atualizar estoque (devolver produtos)
      const { data: produto, error: errorProduto } = await supabase
        .from("products")
        .select("stock_quantity")
        .eq("sku", saleItem.product_id)
        .single();

      if (errorProduto) throw errorProduto;

      const novaQuantidade = (produto.stock_quantity || 0) + item.quantidade;
      
      const { error: errorEstoque } = await supabase
        .from("products")
        .update({ stock_quantity: novaQuantidade })
        .eq("sku", saleItem.product_id);

      if (errorEstoque) throw errorEstoque;
    }

    // 4. Verificar se todos os itens da venda foram devolvidos
    const { data: itensVenda, error: errorItensVenda } = await supabase
      .from("sale_items")
      .select("id")
      .eq("sale_id", data.vendaId);

    if (errorItensVenda) throw errorItensVenda;

    // Buscar todos os itens devolvidos desta venda
    const { data: devolucoes, error: errorDevolucoes } = await supabase
      .from("returns")
      .select(`
        id,
        return_items (
          sale_item_id
        )
      `)
      .eq("sale_id", data.vendaId);

    if (errorDevolucoes) throw errorDevolucoes;

    // Contar itens únicos devolvidos
    const itensDevolvidos = new Set();
    devolucoes?.forEach(d => {
      d.return_items?.forEach((ri: any) => {
        itensDevolvidos.add(ri.sale_item_id);
      });
    });

    // 4. Verificação de cancelamento automático removida a pedido do usuário.
    // A venda agora deve ser cancelada apenas manualmente se necessário.


    console.log("✅ Devolução criada com sucesso:", devolucao);
    return devolucao;

  } catch (error: any) {
    console.error("❌ Erro ao criar devolução:", error);
    throw new Error(error.message);
  }
}

export async function listarDevolucoesPorVenda(vendaId: number) {
  console.log("📋 Listando devoluções da venda:", vendaId);

  const { data, error } = await supabase
    .from("returns")
    .select(`
      *,
      return_items (
        *,
        sale_item:sale_item_id (*)
      )
    `)
    .eq("sale_id", vendaId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("❌ Erro ao listar devoluções:", error);
    throw new Error(error.message);
  }

  return data || [];
}

export async function buscarDevolucaoPorId(id: number) {
  console.log("🔍 Buscando devolução ID:", id);

  const { data, error } = await supabase
    .from("returns")
    .select(`
      *,
      return_items (
        *,
        sale_item:sale_item_id (*)
      )
    `)
    .eq("id", id)
    .single();

  if (error) {
    console.error("❌ Erro ao buscar devolução:", error);
    throw new Error(error.message);
  }

  return data;
}
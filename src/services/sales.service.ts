// src/services/sales.service.ts
import { supabase } from "@/src/lib/supabase/client";
import { CreateSaleDTO, Sale } from "@/types/sales";

export async function criarVenda(venda: CreateSaleDTO) {
  console.log("Criando venda:", venda);

  // Buscar produtos para pegar preços, custos e códigos de barras
  const productIds = venda.items.map(item => item.product_id);
  const { data: produtos, error: produtosError } = await supabase
    .from("products")
    .select("sku, name, price, cost, barcode")
    .in("sku", productIds);

  if (produtosError || !produtos) {
    console.error("Erro ao buscar produtos:", produtosError);
    throw new Error("Erro ao buscar produtos");
  }

  // Criar mapa de produtos para acesso rápido
  const produtosMap = new Map(
    produtos.map(p => [p.sku, { 
      name: p.name, 
      price: p.price, 
      cost: p.cost,
      barcode: p.barcode
    }])
  );

  // Verificar se todos os produtos foram encontrados
  for (const item of venda.items) {
    if (!produtosMap.has(item.product_id)) {
      throw new Error(`Produto ${item.product_id} não encontrado`);
    }
  }

  // Calcular totais e preparar itens
  let totalAmount = 0;
  const saleItems = venda.items.map(item => {
    const produto = produtosMap.get(item.product_id)!;
    const unitPrice = produto.price;
    const unitCost = produto.cost || 0;
    const discount = item.discount || 0;
    const itemTotal = (unitPrice * item.quantity) - discount;

    totalAmount += itemTotal;

    return {
      product_id: item.product_id,
      product_name: produto.name,
      product_sku: `SKU-${item.product_id}`,
      product_barcode: produto.barcode, // <-- Agora salva o barcode (pode ser null)
      quantity: item.quantity,
      unit_price: unitPrice,
      unit_cost: unitCost,
      discount_per_item: discount,
      total_price: itemTotal
    };
  });

  const discountAmount = venda.discount_amount || 0;
  const finalAmount = totalAmount - discountAmount;

  // Inserir venda
  const { data: sale, error: saleError } = await supabase
    .from("sales")
    .insert([{
      customer_id: venda.customer_id || null,
      total_amount: totalAmount,
      discount_amount: discountAmount,
      final_amount: finalAmount,
      payment_method: venda.payment_method || null,
      payment_status: venda.payment_status || 'pending',
      observation: venda.observation || null,
      sale_date: new Date().toISOString()
    }])
    .select()
    .single();

  if (saleError || !sale) {
    console.error("Erro ao criar venda:", saleError);
    throw new Error(`Erro ao criar venda: ${saleError?.message}`);
  }

  // Inserir itens
  const itemsWithSaleId = saleItems.map(item => ({
    ...item,
    sale_id: sale.id
  }));

  const { error: itemsError } = await supabase
    .from("sale_items")
    .insert(itemsWithSaleId);

  if (itemsError) {
    console.error("Erro ao criar itens da venda:", itemsError);
    // Rollback: deletar a venda
    await supabase.from("sales").delete().eq("id", sale.id);
    throw new Error(`Erro ao criar itens da venda: ${itemsError.message}`);
  }

  // Atualizar estoque dos produtos
  for (const item of venda.items) {
    const { error: stockError } = await supabase.rpc('decrement_stock', {
      product_sku: item.product_id,
      quantity: item.quantity
    });

    if (stockError) {
      console.error(`Erro ao atualizar estoque do produto ${item.product_id}:`, stockError);
    }
  }

  return buscarVendaPorId(sale.id);
}

export async function buscarVendaPorId(id: number) {
  console.log("Buscando venda ID:", id);

  const { data: sale, error: saleError } = await supabase
    .from("sales")
    .select(`
      *,
      customer:people(id, name, email, phone)
    `)
    .eq("id", id)
    .single();

  if (saleError) {
    console.error("Erro ao buscar venda:", saleError);
    throw new Error(saleError.message);
  }

  const { data: items, error: itemsError } = await supabase
    .from("sale_items")
    .select("*")
    .eq("sale_id", id);

  if (itemsError) {
    console.error("Erro ao buscar itens da venda:", itemsError);
    throw new Error(itemsError.message);
  }

  return {
    ...sale,
    items: items || []
  };
}

export async function listarVendas(
  pagina: number = 1,
  itensPorPagina: number = 20
) {
  console.log(`Listando vendas - página ${pagina}, ${itensPorPagina} por página`);

  const inicio = (pagina - 1) * itensPorPagina;
  const fim = inicio + itensPorPagina - 1;

  const { data: sales, error, count } = await supabase
    .from("sales")
    .select(`
      *,
      customer:people(id, name, email)
    `, { count: 'exact' })
    .order("created_at", { ascending: false })
    .range(inicio, fim);

  if (error) {
    console.error("Erro ao listar vendas:", error);
    throw new Error(error.message);
  }

  // Buscar itens para cada venda
  const salesWithItems = await Promise.all(
    (sales || []).map(async (sale) => {
      const { data: items } = await supabase
        .from("sale_items")
        .select("*")
        .eq("sale_id", sale.id);

      return {
        ...sale,
        items: items || []
      };
    })
  );

  return {
    sales: salesWithItems,
    total: count || 0,
    pagina,
    totalPaginas: Math.ceil((count || 0) / itensPorPagina),
    itensPorPagina
  };
}

export async function atualizarStatusPagamento(
  saleId: number, 
  status: 'paid' | 'cancelled'
) {
  console.log(`Atualizando status da venda ${saleId} para ${status}`);

  const { error } = await supabase
    .from("sales")
    .update({ payment_status: status })
    .eq("id", saleId);

  if (error) {
    console.error("Erro ao atualizar status:", error);
    throw new Error(error.message);
  }

  return { success: true };
}

export async function getResumoVendas(periodo?: { inicio: string; fim: string }) {
  console.log("Buscando resumo de vendas", periodo);

  let query = supabase
    .from("sales")
    .select(`
      id,
      final_amount,
      payment_status,
      created_at
    `);

  if (periodo) {
    query = query
      .gte("created_at", periodo.inicio)
      .lte("created_at", periodo.fim);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Erro ao buscar resumo:", error);
    throw new Error(error.message);
  }

  const totalVendas = data?.length || 0;
  const totalFaturado = data?.reduce((acc, sale) => acc + (sale.final_amount || 0), 0) || 0;
  const vendasPagas = data?.filter(s => s.payment_status === 'paid').length || 0;

  return {
    totalVendas,
    totalFaturado,
    vendasPagas,
    vendasPendentes: totalVendas - vendasPagas
  };
}
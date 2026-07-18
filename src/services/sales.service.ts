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
      operator_id: venda.operator_id || null,
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

  console.log("Venda criada com sucesso, ID:", sale.id);

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

  // Atualizar estoque dos produtos - BLOCO CORRIGIDO
  console.log("Itens da venda para decrementar estoque:", venda.items);
  for (const item of venda.items) {
    console.log(`Decrementando estoque para produto SKU: ${item.product_id}, quantidade: ${item.quantity}`);
    const { data: stockData, error: stockError } = await supabase.rpc('decrement_stock', {
      product_sku: item.product_id,
      quantity: item.quantity
    });

    if (stockError) {
      console.error(`Erro ao atualizar estoque do produto ${item.product_id}:`, stockError);
    } else {
      console.log(`Estoque decrementado com sucesso para produto ${item.product_id}. Resultado:`, stockData);
    }
  }

  return buscarVendaPorId(sale.id);
}

/**
 * Conta quantas vendas (não canceladas) um cliente já possui.
 * Usado para identificar "cliente novo" (0 compras) no PDV.
 */
export async function contarVendasDoCliente(customerId: number): Promise<number> {
  const { count, error } = await supabase
    .from("sales")
    .select("id", { count: "exact", head: true })
    .eq("customer_id", customerId)
    .neq("payment_status", "cancelled");

  if (error) {
    console.error("Erro ao contar vendas do cliente:", error);
    return 0;
  }

  return count || 0;
}

export async function buscarVendaPorId(id: number) {
  console.log("Buscando venda ID:", id);

  const { data, error } = await supabase
    .from("sales")
    .select(`
      *,
      customer:people(id, name, email, phone),
      items:sale_items(
        *,
        product:products(sku, name, price, size)
      )
    `)
    .eq("id", id)
    .single();

  if (error) {
    console.error("Erro ao buscar venda:", error);
    throw new Error(error.message);
  }

  return data;
}

export interface FiltrosVendas {
  busca?: string;   // id da venda (numérico) ou nome do cliente
  status?: string;  // 'todos' | 'Concluída' | 'Pendente' | 'Cancelada'
  data?: string;    // 'YYYY-MM-DD' (dia exato, em UTC)
}

export async function listarVendas(
  pagina: number = 1,
  itensPorPagina: number = 20,
  filtros?: FiltrosVendas
) {
  const inicio = (pagina - 1) * itensPorPagina;
  const fim = inicio + itensPorPagina - 1;

  let query = supabase
    .from("sales")
    .select(`
      *,
      customer:people(id, name, email),
      items:sale_items(
        *,
        product:products(sku, name, price, size)
      )
    `, { count: 'exact' })
    .order("created_at", { ascending: false });

  // Status (mapeia o rótulo da tela para o payment_status)
  const statusMap: Record<string, string> = {
    "Concluída": "paid",
    "Pendente": "pending",
    "Cancelada": "cancelled",
  };
  if (filtros?.status && filtros.status !== "todos" && statusMap[filtros.status]) {
    query = query.eq("payment_status", statusMap[filtros.status]);
  }

  // Data (dia exato sobre sale_date, em UTC para bater com a exibição)
  if (filtros?.data) {
    query = query
      .gte("sale_date", `${filtros.data}T00:00:00.000Z`)
      .lte("sale_date", `${filtros.data}T23:59:59.999Z`);
  }

  // Busca: número → id da venda; texto → nome do cliente (via lookup de people)
  const termo = filtros?.busca?.trim();
  if (termo) {
    if (/^\d+$/.test(termo)) {
      query = query.eq("id", Number(termo));
    } else {
      const { data: pessoas } = await supabase
        .from("people")
        .select("id")
        .ilike("name", `%${termo}%`)
        .limit(500);
      const ids = (pessoas || []).map((p) => p.id);
      if (ids.length === 0) {
        return { sales: [], total: 0, pagina, totalPaginas: 0, itensPorPagina };
      }
      query = query.in("customer_id", ids);
    }
  }

  const { data, error, count } = await query.range(inicio, fim);

  if (error) {
    console.error("Erro ao listar vendas:", error);
    throw new Error(error.message);
  }

  return {
    sales: data || [],
    total: count || 0,
    pagina,
    totalPaginas: Math.ceil((count || 0) / itensPorPagina),
    itensPorPagina
  };
}

export async function atualizarStatusPagamento(saleId: number, status: 'paid' | 'pending' | 'cancelled') {
  console.log(`Atualizando status da venda ${saleId} para ${status}`);

  // Se o status for cancelado, precisamos retornar os itens ao estoque
  if (status === 'cancelled') {
    const { data: itens, error: itensError } = await supabase
      .from('sale_items')
      .select('product_id, quantity')
      .eq('sale_id', saleId);
    
    if (itensError) throw itensError;

    for (const item of (itens || [])) {
      if (item.quantity > 0) {
        const { data: produto, error: pError } = await supabase
          .from('products')
          .select('stock_quantity')
          .eq('sku', item.product_id)
          .single();
        
        if (!pError && produto) {
          await supabase
            .from('products')
            .update({ stock_quantity: (produto.stock_quantity || 0) + item.quantity })
            .eq('sku', item.product_id);
        }
      }
    }
  }

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

export async function atualizarVendaConsignado(
  saleId: number,
  dados: {
    payment_status: 'paid' | 'pending';
    final_amount: number;
    observation?: string;
    consignado_commission_percent?: number;
    consignado_net_before_commission?: number;
    settled_at?: string | null;
  }
) {
  console.log(`Finalizando consignado da venda ${saleId}`, dados);

  // Registra a data de fechamento quando o consignado é marcado como pago
  // (usada nos relatórios como a data efetiva da venda). Ao reabrir, limpa.
  const payload = { ...dados };
  if (!("settled_at" in payload)) {
    payload.settled_at = dados.payment_status === "paid" ? new Date().toISOString() : null;
  }

  const { data, error } = await supabase
    .from("sales")
    .update(payload)
    .eq("id", saleId)
    .select();

  if (error) {
    console.error("Erro ao atualizar venda consignada:", error);
    return { error };
  }

  return { success: true, data };
}

export type MetodoPagamento = 'credit_card' | 'debit' | 'cash' | 'pix' | 'consignado';

/**
 * Corrige o método de pagamento de uma venda já registrada.
 * - Para consignado: exige data prevista, muda o status para 'pending' e grava
 *   o marcador "Venda consignada - Pagamento previsto: ..." na observação.
 * - Saindo de consignado/pendente para método à vista: marca como 'paid' e
 *   remove o marcador de consignado (senão a venda continuaria sendo tratada
 *   como consignado pelas telas).
 * - Toda alteração deixa trilha de auditoria na observação.
 */
export async function atualizarMetodoPagamento(
  saleId: number,
  novoMetodo: MetodoPagamento,
  dataPrevistaConsignado?: string // YYYY-MM-DD, obrigatória ao trocar para consignado
) {
  const { data: venda, error: fetchError } = await supabase
    .from("sales")
    .select("payment_method, payment_status, observation")
    .eq("id", saleId)
    .single();

  if (fetchError || !venda) {
    throw new Error("Venda não encontrada");
  }
  if (venda.payment_status === 'cancelled') {
    throw new Error("Não é possível alterar o método de uma venda cancelada");
  }
  if (venda.payment_method === novoMetodo) {
    throw new Error("A venda já está com esse método de pagamento");
  }

  const metodoAntigo = venda.payment_method || "não informado";
  let observation = venda.observation || "";
  const patch: {
    payment_method: string;
    payment_status?: 'paid' | 'pending';
    observation?: string;
  } = { payment_method: novoMetodo };

  if (novoMetodo === 'consignado') {
    if (!dataPrevistaConsignado) {
      throw new Error("Informe a data prevista de pagamento do consignado");
    }
    patch.payment_status = 'pending';
    if (/Pagamento previsto: \d{4}-\d{2}-\d{2}/.test(observation)) {
      observation = observation.replace(
        /Pagamento previsto: \d{4}-\d{2}-\d{2}/,
        `Pagamento previsto: ${dataPrevistaConsignado}`
      );
      if (!observation.includes("Venda consignada")) {
        observation = `Venda consignada - ${observation}`;
      }
    } else {
      observation = [`Venda consignada - Pagamento previsto: ${dataPrevistaConsignado}`, observation]
        .filter(Boolean)
        .join("\n");
    }
  } else {
    // Corrigindo para método à vista: se estava pendente, considera paga
    if (venda.payment_status === 'pending') {
      patch.payment_status = 'paid';
    }
    // Remove o marcador de consignado da observação
    observation = observation
      .replace(/Venda consignada - Pagamento previsto: \d{4}-\d{2}-\d{2}( - )?/g, "")
      .replace(/Venda consignada/g, "")
      .trim();
  }

  patch.observation = [
    observation,
    `[MÉTODO ALTERADO em ${new Date().toLocaleDateString('pt-BR')}: ${metodoAntigo} → ${novoMetodo}]`,
  ].filter(Boolean).join("\n");

  const { error } = await supabase
    .from("sales")
    .update(patch)
    .eq("id", saleId);

  if (error) {
    throw new Error(`Erro ao alterar método de pagamento: ${error.message}`);
  }

  return buscarVendaPorId(saleId);
}

export async function atualizarDataAcertoConsignado(saleId: number, novaData: string) {
  const { data: venda, error: fetchError } = await supabase
    .from("sales")
    .select("observation")
    .eq("id", saleId)
    .single();

  if (fetchError || !venda) {
    return { error: fetchError || new Error("Venda não encontrada") };
  }

  const observacaoAtualizada = (venda.observation || "").replace(
    /Pagamento previsto: \d{4}-\d{2}-\d{2}/,
    `Pagamento previsto: ${novaData}`
  );

  const { error } = await supabase
    .from("sales")
    .update({ observation: observacaoAtualizada })
    .eq("id", saleId);

  if (error) return { error };
  return { success: true, observation: observacaoAtualizada };
}

export async function atualizarQuantidadeItemVenda(itemId: number, novaQuantidade: number) {
  console.log(`Atualizando quantidade do item ${itemId} para ${novaQuantidade}`);

  // Buscamos o preço unitário para recalcular o total
  const { data: item, error: buscaError } = await supabase
    .from("sale_items")
    .select("unit_price")
    .eq("id", itemId)
    .single();

  if (buscaError) throw buscaError;

  const novoTotal = item.unit_price * (novaQuantidade > 0 ? novaQuantidade : 0);

  // Apenas atualizamos a quantidade e o total_price, nunca deletamos
  // para evitar erros de chave estrangeira com a tabela de devoluções
  const { error } = await supabase
    .from("sale_items")
    .update({ 
      quantity: novaQuantidade > 0 ? novaQuantidade : 0,
      total_price: novoTotal
    })
    .eq("id", itemId);

  if (error) throw error;
  return { success: true };
}

export async function adicionarItemVenda(saleId: number, item: any) {
  console.log(`Adicionando novo item à venda ${saleId}:`, item);

  // Buscar os dados do produto para garantir integridade
  const { data: produto, error: pError } = await supabase
    .from("products")
    .select("name, price, cost, barcode")
    .eq("sku", item.product_id)
    .single();

  if (pError) throw pError;

  const itemParaInserir = {
    sale_id: saleId,
    product_id: item.product_id,
    product_name: produto.name,
    product_sku: `SKU-${item.product_id}`,
    product_barcode: produto.barcode,
    quantity: item.quantity,
    unit_price: produto.price,
    unit_cost: produto.cost || 0,
    discount_per_item: 0,
    total_price: produto.price * item.quantity
  };

  const { data, error } = await supabase
    .from("sale_items")
    .insert([itemParaInserir])
    .select()
    .single();

  if (error) throw error;

  // Decrementar estoque do novo produto adicionado na troca
  await supabase.rpc('decrement_stock', {
    product_sku: item.product_id,
    quantity: item.quantity
  });

  return data;
}

export async function atualizarClienteVenda(saleId: number, customerId: number | null) {
  const { error } = await supabase
    .from("sales")
    .update({ customer_id: customerId })
    .eq("id", saleId);

  if (error) throw error;
  return { success: true };
}

// Observação interna da venda — texto livre manual, NÃO impresso na notinha.
export async function atualizarNotaInterna(saleId: number, note: string | null) {
  const { error } = await supabase
    .from("sales")
    .update({ internal_note: note && note.trim() ? note.trim() : null })
    .eq("id", saleId);

  if (error) throw error;
  return { success: true };
}

export async function atualizarValorVenda(saleId: number, novoValor: number) {
  console.log(`Atualizando valor total da venda ${saleId} para ${novoValor}`);

  const { error } = await supabase
    .from("sales")
    .update({ 
      total_amount: novoValor,
      final_amount: novoValor // Por enquanto assumindo que final = total
    })
    .eq("id", saleId);

  if (error) throw error;
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

/* =========================
   DASHBOARD: BUSCA ÚNICA DAS VENDAS DO PERÍODO
   Traz todas as vendas pagas do período com o superconjunto de campos que os
   agregadores do dashboard precisam. Assim o dashboard faz UMA leitura da
   tabela sales e todos os indicadores são calculados em memória a partir dela.
========================= */
export async function fetchDashboardSales(periodo: { inicio: string; fim: string }) {
  const { data, error } = await supabase
    .from("sales")
    .select(`
      id,
      final_amount,
      sale_date,
      operator_id,
      customer_id,
      source,
      payment_method,
      sale_items (
        quantity,
        unit_cost,
        total_price,
        products ( sku, name, category, stock_quantity, minimum_stock )
      ),
      operator:operators ( id, name, role ),
      customer:people ( id, name )
    `)
    .eq("payment_status", "paid")
    .gte("sale_date", periodo.inicio)
    .lte("sale_date", periodo.fim)
    .order("sale_date", { ascending: true });

  if (error) {
    console.error("Erro ao buscar vendas do dashboard:", error);
    throw new Error(error.message);
  }

  return data || [];
}

/* =========================
   DASHBOARD KPIS
========================= */
export async function getDashboardKPIs(
  periodo: { inicio: string; fim: string },
  preloaded?: any[]
) {
  // Usa os dados já buscados (preloaded) quando disponíveis; senão faz a busca
  // mínima própria (usado, por ex., para o período anterior na comparação).
  let data = preloaded;
  if (!data) {
    const res = await supabase
      .from("sales")
      .select("final_amount, id")
      .eq("payment_status", "paid")
      .gte("sale_date", periodo.inicio)
      .lte("sale_date", periodo.fim);

    if (res.error) {
      console.error("Erro ao buscar dados para KPIs:", res.error);
      throw new Error(res.error.message);
    }
    data = res.data || [];
  }

  if (!data) {
    return {
      faturamentoBruto: 0,
      totalVendas: 0,
      ticketMedio: 0,
    };
  }

  // Calcula o faturamento bruto somando o valor final de todas as vendas
  const faturamentoBruto = data.reduce((acc, venda) => acc + (venda.final_amount || 0), 0);
  
  // Conta o total de vendas
  const totalVendas = data.length;

  // Calcula o ticket médio
  const ticketMedio = totalVendas > 0 ? faturamentoBruto / totalVendas : 0;

  return {
    faturamentoBruto,
    totalVendas,
    ticketMedio,
  };
}

/* =========================
   DASHBOARD FINANCIAL PERFORMANCE
========================= */
export async function getFinancialPerformance(
  periodo: { inicio: string; fim: string },
  preloaded?: any[]
) {
  const data = preloaded ?? await fetchDashboardSales(periodo);

  if (!data) return [];

  // Agrupar e somar por dia
  const performanceByDay: { [key: string]: { dia: string; receita: number; custo: number } } = {};

  data.forEach(sale => {
    const saleDate = new Date(sale.sale_date);
    // Formata para 'DD'
    const dayKey = saleDate.toLocaleDateString('pt-BR', { day: '2-digit' });

    if (!performanceByDay[dayKey]) {
      performanceByDay[dayKey] = { dia: dayKey, receita: 0, custo: 0 };
    }

    performanceByDay[dayKey].receita += sale.final_amount || 0;
    
    const saleCost = sale.sale_items.reduce((acc: number, item: any) => {
      return acc + (item.quantity * item.unit_cost);
    }, 0);
    performanceByDay[dayKey].custo += saleCost;
  });

  // Converte o objeto para um array de resultados ordenado por dia
  return Object.values(performanceByDay).sort((a, b) => a.dia.localeCompare(b.dia));
}

/* =========================
   DASHBOARD SALES BY CATEGORY
========================= */
export async function getSalesByCategory(
  periodo: { inicio: string; fim: string },
  preloaded?: any[]
) {
  const salesData = preloaded ?? await fetchDashboardSales(periodo);

  if (!salesData) return [];

  const categoryTotals: { [key: string]: number } = {};
  let totalSalesValue = 0;

  // Itera sobre cada venda e seus itens para somar os totais por categoria
  salesData.forEach(sale => {
    sale.sale_items.forEach((item: any) => {
      const category = item.products?.category || 'Outros';
      const price = item.total_price || 0;
      
      if (!categoryTotals[category]) {
        categoryTotals[category] = 0;
      }
      categoryTotals[category] += price;
      totalSalesValue += price;
    });
  });

  if (totalSalesValue === 0) return [];

  // Define uma paleta de cores para o gráfico
  const colors = ["#4f46e5", "#06b6d4", "#8b5cf6", "#f59e0b", "#10b981", "#71717a"];
  let colorIndex = 0;

  // Converte os totais para o formato de porcentagem que o gráfico espera
  const result = Object.entries(categoryTotals).map(([name, value]) => ({
    name,
    value: parseFloat(((value / totalSalesValue) * 100).toFixed(1)), // Valor em porcentagem
    color: colors[colorIndex++ % colors.length],
  }));

  return result;
}

/* =========================
   DASHBOARD SALES BY HOUR
========================= */
export async function getSalesByHour(
  periodo: { inicio: string; fim: string },
  preloaded?: any[]
) {
  const data = preloaded ?? await fetchDashboardSales(periodo);

  if (!data) return [];

  // Inicializa um objeto para contar vendas em cada hora do dia (0-23)
  const salesByHour: { [key: number]: number } = {};
  for (let i = 0; i < 24; i++) {
    // Vamos focar no horário comercial para um gráfico mais limpo
    if (i >= 8 && i <= 22) {
      salesByHour[i] = 0;
    }
  }

  // Preenche com os dados reais
  data.forEach(sale => {
    const saleHour = new Date(sale.sale_date).getHours();
    if (salesByHour[saleHour] !== undefined) {
      salesByHour[saleHour]++;
    }
  });

  // Converte para o formato que o gráfico espera, formatando a hora para 'HHh'
  const result = Object.entries(salesByHour)
    .map(([hour, sales]) => ({
      hora: `${String(hour).padStart(2, '0')}h`,
      vendas: sales
    }));

  return result;
}

/* =========================
   DASHBOARD TOP PERFORMING PRODUCTS
========================= */
export async function getTopPerformingProducts(
  periodo: { inicio: string; fim: string },
  limit: number = 4,
  preloaded?: any[]
) {
  const salesData = preloaded ?? await fetchDashboardSales(periodo);

  if (!salesData) return [];

  const productPerformance: { [key: number]: { 
    nome: string; 
    vendas: number; 
    receita: number; 
    custoTotal: number;
    estoque: number;
    estoqueMinimo: number;
  } } = {};

  // 2. Processa e agrega os dados por produto
  salesData.forEach(sale => {
    sale.sale_items.forEach((item: any) => {
      const product = item.products;
      if (!product) return; // Pula se o produto foi deletado mas o item de venda ainda existe

      if (!productPerformance[product.sku]) {
        productPerformance[product.sku] = {
          nome: product.name,
          vendas: 0,
          receita: 0,
          custoTotal: 0,
          estoque: product.stock_quantity || 0,
          estoqueMinimo: product.minimum_stock || 0
        };
      }
      
      productPerformance[product.sku].vendas += item.quantity;
      productPerformance[product.sku].receita += item.total_price || 0;
      productPerformance[product.sku].custoTotal += (item.unit_cost || 0) * item.quantity;
    });
  });

  // 3. Calcula a margem e o status do estoque para cada produto
  const result = Object.values(productPerformance).map(prod => {
    const receita = prod.receita;
    const custo = prod.custoTotal;
    const margem = receita > 0 ? parseFloat((((receita - custo) / receita) * 100).toFixed(1)) : 0;
    
    let status = 'ok';
    // Considera 5 como um valor padrão para estoque mínimo se não estiver definido
    if (prod.estoque <= (prod.estoqueMinimo || 5) && prod.estoque > 0) {
      status = 'low';
    } else if (prod.estoque <= 0) {
      status = 'critical';
    }

    return { ...prod, margem, status };
  });
  
  // 4. Ordena os produtos por receita (do maior para o menor) e retorna o limite solicitado
  return result.sort((a, b) => b.receita - a.receita).slice(0, limit);
}

/* =========================
   DASHBOARD STOCK RUPTURE KPI
========================= */
export async function getStockRuptureKPI() {
  const { data, error } = await supabase
    .from("products")
    .select("stock_quantity, minimum_stock")
    .eq("is_active", true);

  if (error) throw new Error(error.message);

  const products = data || [];
  const rupturas = products.filter(p => (p.stock_quantity ?? 0) <= 0).length;
  const criticos = products.filter(p => {
    const stock = p.stock_quantity ?? 0;
    const min = p.minimum_stock ?? 5;
    return stock > 0 && stock <= min;
  }).length;

  return { rupturas, criticos };
}

/* =========================
   DASHBOARD SALES BY OPERATOR
========================= */
export async function getSalesByOperator(
  periodo: { inicio: string; fim: string },
  preloaded?: any[]
) {
  const data = preloaded ?? await fetchDashboardSales(periodo);
  if (!data || data.length === 0) return [];

  const byOperator: Record<string, {
    id: string;
    nome: string;
    cargo: string;
    vendas: number;
    faturamento: number;
  }> = {};

  data.forEach((sale: any) => {
    const op = sale.operator;
    if (!op) return;
    if (!byOperator[op.id]) {
      byOperator[op.id] = { id: op.id, nome: op.name, cargo: op.role, vendas: 0, faturamento: 0 };
    }
    byOperator[op.id].vendas++;
    byOperator[op.id].faturamento += sale.final_amount || 0;
  });

  return Object.values(byOperator)
    .map(op => ({ ...op, ticketMedio: op.vendas > 0 ? op.faturamento / op.vendas : 0 }))
    .sort((a, b) => b.faturamento - a.faturamento);
}

/* =========================
   DASHBOARD TOP CLIENTES DO MÊS
========================= */
export async function getTopCustomers(
  periodo: { inicio: string; fim: string },
  limit: number = 5,
  preloaded?: any[]
) {
  const data = preloaded ?? await fetchDashboardSales(periodo);
  if (!data || data.length === 0) return [];

  const byCustomer: Record<number, { id: number; nome: string; vendas: number; faturamento: number }> = {};

  data.forEach((sale: any) => {
    const customer = sale.customer;
    if (!customer) return;
    if (!byCustomer[customer.id]) {
      byCustomer[customer.id] = { id: customer.id, nome: customer.name, vendas: 0, faturamento: 0 };
    }
    byCustomer[customer.id].vendas++;
    byCustomer[customer.id].faturamento += sale.final_amount || 0;
  });

  return Object.values(byCustomer)
    .sort((a, b) => b.faturamento - a.faturamento)
    .slice(0, limit);
}

/* =========================
   DASHBOARD: VENDAS POR ORIGEM (loja física x site)
========================= */
export async function getSalesBySource(
  periodo: { inicio: string; fim: string },
  preloaded?: any[]
) {
  const data = preloaded ?? await fetchDashboardSales(periodo);

  const resultado = {
    loja: { vendas: 0, faturamento: 0 },
    site: { vendas: 0, faturamento: 0 },
  };

  (data || []).forEach((s: any) => {
    // Vendas do site marcam source='site'; PDV/loja física fica sem source.
    const bucket = s.source === "site" ? resultado.site : resultado.loja;
    bucket.vendas++;
    bucket.faturamento += s.final_amount || 0;
  });

  return resultado;
}

/* =========================
   DASHBOARD: VENDAS POR FORMA DE PAGAMENTO
========================= */
export async function getSalesByPaymentMethod(
  periodo: { inicio: string; fim: string },
  preloaded?: any[]
) {
  const data = preloaded ?? await fetchDashboardSales(periodo);

  const labels: Record<string, string> = {
    credit_card: "Crédito",
    debit: "Débito",
    cash: "Dinheiro",
    pix: "Pix",
    consignado: "Consignado",
  };
  const colors: Record<string, string> = {
    "Crédito": "#4f46e5",
    "Débito": "#06b6d4",
    "Pix": "#10b981",
    "Dinheiro": "#f59e0b",
    "Consignado": "#8b5cf6",
    "Outro": "#71717a",
  };

  const byMethod: Record<string, { metodo: string; vendas: number; faturamento: number; color: string }> = {};

  (data || []).forEach((s: any) => {
    const label = labels[s.payment_method] || "Outro";
    if (!byMethod[label]) {
      byMethod[label] = { metodo: label, vendas: 0, faturamento: 0, color: colors[label] || "#71717a" };
    }
    byMethod[label].vendas++;
    byMethod[label].faturamento += s.final_amount || 0;
  });

  return Object.values(byMethod).sort((a, b) => b.faturamento - a.faturamento);
}

/* =========================
   RELATÓRIO: PRODUTOS POR REVENDEDOR
========================= */
export interface ProdutoPorRevendedor {
  clienteId: number;
  clienteNome: string;
  produtoSku: string;
  produtoNome: string;
  quantidadeTotal: number;
  receitaTotal: number;
  numeroPedidos: number;
}

export async function getTopProductsByCustomer(
  periodo: { inicio: string; fim: string }
): Promise<ProdutoPorRevendedor[]> {
  const { data, error } = await supabase
    .from("sales")
    .select(`
      customer_id,
      customer:people(id, name),
      sale_items(
        product_id,
        quantity,
        total_price,
        products(sku, name)
      )
    `)
    .eq("payment_status", "paid")
    .not("customer_id", "is", null)
    // Período considera a data do acerto (settled_at) no consignado; senão a data da venda.
    .or(`and(settled_at.gte.${periodo.inicio},settled_at.lte.${periodo.fim}),and(settled_at.is.null,sale_date.gte.${periodo.inicio},sale_date.lte.${periodo.fim})`);

  if (error) throw new Error(error.message);
  if (!data || data.length === 0) return [];

  const map = new Map<string, ProdutoPorRevendedor>();

  (data as any[]).forEach((sale) => {
    const customer = sale.customer;
    if (!customer) return;

    (sale.sale_items || []).forEach((item: any) => {
      const product = item.products;
      if (!product) return;

      const key = `${sale.customer_id}_${item.product_id}`;
      const existing = map.get(key);

      if (existing) {
        existing.quantidadeTotal += item.quantity || 0;
        existing.receitaTotal += item.total_price || 0;
        existing.numeroPedidos += 1;
      } else {
        map.set(key, {
          clienteId: sale.customer_id,
          clienteNome: customer.name || "Sem nome",
          produtoSku: String(product.sku),
          produtoNome: product.name || "Produto sem nome",
          quantidadeTotal: item.quantity || 0,
          receitaTotal: item.total_price || 0,
          numeroPedidos: 1,
        });
      }
    });
  });

  return Array.from(map.values()).sort(
    (a, b) => b.receitaTotal - a.receitaTotal
  );
}

/* =========================
   RELATÓRIO: CONSIGNADOS FECHADOS (ACERTOS)
========================= */
export interface ConsignadoFechado {
  vendaId: number;
  clienteNome: string;
  mes: string;              // ex.: "Jun/2026"
  mesKey: string;           // ex.: "2026-06" (para ordenação)
  dataAceite: string | null; // "Pagamento previsto" (YYYY-MM-DD)
  valorKit: number;          // total_amount (todas as peças entregues)
  valorVendas: number;       // saldo das peças que ficaram (net antes da comissão)
  qtdKit: number;            // peças entregues no kit
  qtdRetornada: number;      // peças devolvidas
  qtdVendida: number;        // peças que ficaram (vendidas)
  percentualVendas: number;  // sell-through: qtdVendida / qtdKit * 100
  comissaoPercent: number;   // % de comissão (desconto de lucro)
  comissaoValor: number;     // saldo * comissaoPercent / 100
  liquidoRecebido: number;   // final_amount (cobrado = saldo - comissão)
}

const MESES_ABREV = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

// Extrai a data de "Pagamento previsto: YYYY-MM-DD" da observação
function extrairDataPrevista(obs: string | null): string | null {
  if (!obs) return null;
  const m = obs.match(/Pagamento previsto: (\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

// Soma as quantidades de uma lista no formato "Nome (x3); Outro (x1)"
function somarQuantidades(lista: string): number {
  if (!lista || lista === "Nenhuma") return 0;
  return lista.split("; ").reduce((acc, e) => {
    const m = e.match(/\(x(\d+)\)$/);
    return acc + (m ? parseInt(m[1], 10) : 0);
  }, 0);
}

// Extrai quantidades do kit/devolvidas/mantidas do breakdown salvo na observação
function extrairQuantidadesConsignado(obs: string | null) {
  if (!obs) return null;
  const m = obs.match(/Saídas: (.+?) \| Devolvidas: (.+?) \| Mantidas: (.+?)(?:\n|$)/);
  if (!m) return null;
  return {
    kit: somarQuantidades(m[1]),
    retornada: somarQuantidades(m[2]),
    vendida: somarQuantidades(m[3]),
  };
}

export async function getConsignadosFechados(
  periodo: { inicio: string; fim: string }
): Promise<ConsignadoFechado[]> {
  const { data, error } = await supabase
    .from("sales")
    .select(`
      id,
      sale_date,
      settled_at,
      total_amount,
      final_amount,
      observation,
      consignado_commission_percent,
      consignado_net_before_commission,
      customer:people(id, name),
      sale_items(quantity)
    `)
    .eq("payment_status", "paid")
    .or("payment_method.eq.consignado,consignado_net_before_commission.not.is.null")
    // Período considera a data de fechamento (settled_at) quando existir; senão a data da venda.
    .or(`and(settled_at.gte.${periodo.inicio},settled_at.lte.${periodo.fim}),and(settled_at.is.null,sale_date.gte.${periodo.inicio},sale_date.lte.${periodo.fim})`);

  if (error) throw new Error(error.message);
  if (!data || data.length === 0) return [];

  return (data as any[]).map((sale) => {
    const saldo = sale.consignado_net_before_commission ?? sale.final_amount ?? 0;
    const comissaoPercent = sale.consignado_commission_percent ?? 0;
    const comissaoValor = (saldo * comissaoPercent) / 100;
    const liquidoRecebido = sale.final_amount ?? (saldo - comissaoValor);

    const qty = extrairQuantidadesConsignado(sale.observation);
    const qtdKit = qty?.kit ?? 0;
    const qtdRetornada = qty?.retornada ?? 0;
    const qtdVendida =
      qty?.vendida ??
      (sale.sale_items || []).reduce((s: number, i: any) => s + (i.quantity || 0), 0);

    // % de Vendas calculado pelo VALOR de fato vendido (saldo, antes da comissão)
    // sobre o valor total do kit (total_amount) — não pela quantidade de itens,
    // pois peças de preços diferentes distorceriam o percentual.
    const valorKit = sale.total_amount ?? 0;
    const percentualVendas = valorKit > 0 ? (saldo / valorKit) * 100 : 0;

    const dataAceite = extrairDataPrevista(sale.observation);
    // Data efetiva do relatório: fechamento (settled_at) quando houver, senão a data da venda.
    const baseData = (sale.settled_at || sale.sale_date || "").slice(0, 10); // YYYY-MM-DD
    const [ano, mesNum] = baseData.split("-");
    const mesIdx = parseInt(mesNum || "1", 10) - 1;
    const mes = `${MESES_ABREV[mesIdx] ?? mesNum}/${ano}`;
    const mesKey = `${ano}-${mesNum}`;

    return {
      vendaId: sale.id,
      clienteNome: sale.customer?.name || "Sem cliente",
      mes,
      mesKey,
      dataAceite,
      valorKit,
      valorVendas: saldo,
      qtdKit,
      qtdRetornada,
      qtdVendida,
      percentualVendas,
      comissaoPercent,
      comissaoValor,
      liquidoRecebido,
    };
  }).sort((a, b) => b.mesKey.localeCompare(a.mesKey));
}

/* =========================
   BUSCAR VENDAS POR CLIENTE
========================= */
export async function getSalesByCustomerId(customerId: number) {
  console.log("Buscando vendas para o cliente ID:", customerId);

  const { data, error } = await supabase
    .from("sales")
    .select(`
      *,
      items:sale_items(
        *,
        product:products(sku, name)
      )
    `)
    .eq("customer_id", customerId)
    .order("sale_date", { ascending: false });

  if (error) {
    console.error("Erro ao buscar vendas do cliente:", error);
    throw new Error(error.message);
  }

  return data || [];
}
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

  const { data, error } = await supabase
    .from("sales")
    .select(`
      *,
      customer:people(id, name, email, phone),
      items:sale_items(
        *,
        product:products(sku, name, price)
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

export async function listarVendas(
  pagina: number = 1,
  itensPorPagina: number = 20
) {
  console.log(`Listando vendas - página ${pagina}, ${itensPorPagina} por página`);

  const inicio = (pagina - 1) * itensPorPagina;
  const fim = inicio + itensPorPagina - 1;

  const { data, error, count } = await supabase
    .from("sales")
    .select(`
      *,
      customer:people(id, name, email),
      items:sale_items(
        *,
        product:products(sku, name, price)
      )
    `, { count: 'exact' })
    .order("created_at", { ascending: false })
    .range(inicio, fim);

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

/* =========================
   DASHBOARD KPIS
========================= */
export async function getDashboardKPIs(periodo: { inicio: string; fim: string }) {
  console.log("Buscando KPIs do dashboard para o período:", periodo);

  // Busca todas as vendas 'pagas' dentro do período
  const { data, error } = await supabase
    .from("sales")
    .select("final_amount, id")
    .eq("payment_status", "paid")
    .gte("sale_date", periodo.inicio)
    .lte("sale_date", periodo.fim);

  if (error) {
    console.error("Erro ao buscar dados para KPIs:", error);
    throw new Error(error.message);
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
export async function getFinancialPerformance(periodo: { inicio: string; fim: string }) {
  console.log("Buscando dados de performance financeira para o período:", periodo);

  const { data, error } = await supabase
    .from("sales")
    .select(`
      sale_date,
      final_amount,
      sale_items (
        quantity,
        unit_cost
      )
    `)
    .eq("payment_status", "paid")
    .gte("sale_date", periodo.inicio)
    .lte("sale_date", periodo.fim)
    .order("sale_date", { ascending: true });

  if (error) {
    console.error("Erro ao buscar dados de performance:", error);
    throw new Error(error.message);
  }

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
export async function getSalesByCategory(periodo: { inicio: string; fim: string }) {
  console.log("Buscando dados de vendas por categoria:", periodo);

  const { data: salesData, error: salesError } = await supabase
    .from("sales")
    .select(`
      sale_items (
        total_price,
        products ( category )
      )
    `)
    .eq("payment_status", "paid")
    .gte("sale_date", periodo.inicio)
    .lte("sale_date", periodo.fim);

  if (salesError) {
    console.error("Erro ao buscar vendas para categorias:", salesError);
    throw new Error(salesError.message);
  }

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
export async function getSalesByHour(periodo: { inicio: string; fim: string }) {
  console.log("Buscando dados de picos de venda por hora:", periodo);

  const { data, error } = await supabase
    .from("sales")
    .select("sale_date")
    .eq("payment_status", "paid")
    .gte("sale_date", periodo.inicio)
    .lte("sale_date", periodo.fim);

  if (error) {
    console.error("Erro ao buscar vendas por hora:", error);
    throw new Error(error.message);
  }

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
export async function getTopPerformingProducts(periodo: { inicio: string; fim: string }, limit: number = 4) {
  console.log(`Buscando top ${limit} produtos com melhor performance:`, periodo);

  // 1. Busca as vendas pagas no período, junto com seus itens e detalhes do produto
  const { data: salesData, error: salesError } = await supabase
    .from("sales")
    .select(`
      sale_items (
        quantity,
        total_price,
        unit_cost,
        products (
          sku,
          name,
          stock_quantity,
          minimum_stock
        )
      )
    `)
    .eq("payment_status", "paid")
    .gte("sale_date", periodo.inicio)
    .lte("sale_date", periodo.fim);

  if (salesError) {
    console.error("Erro ao buscar vendas para top produtos:", salesError);
    throw new Error(salesError.message);
  }

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
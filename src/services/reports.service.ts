// src/services/reports.service.ts
// Consultas dos relatórios: financeiro mensal, estoque e consignados na rua.
import { supabase } from "@/src/lib/supabase/client";

const MESES_ABREV = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

/* =========================================================
   CONSIGNADOS NA RUA (pendentes, aguardando acerto)
========================================================= */

export interface ConsignadoNaRua {
  vendaId: number;
  clienteNome: string;
  dataSaida: string;        // YYYY-MM-DD
  dataPrevista: string | null;
  valorKit: number;
  qtdItens: number;
  diasNaRua: number;
  diasAtraso: number;       // 0 = em dia
  atrasado: boolean;
}

export async function getConsignadosNaRua(): Promise<ConsignadoNaRua[]> {
  const { data, error } = await supabase
    .from("sales")
    .select(`
      id, sale_date, total_amount, final_amount, observation, payment_method,
      customer:people(id, name),
      sale_items(quantity)
    `)
    .eq("payment_status", "pending")
    .or("payment_method.eq.consignado,observation.ilike.%Venda consignada%");

  if (error) throw new Error(error.message);

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  return (data as any[] || []).map((s) => {
    const match = (s.observation as string | null)?.match(/Pagamento previsto: (\d{4}-\d{2}-\d{2})/);
    const dataPrevista = match ? match[1] : null;
    const saida = new Date(s.sale_date);
    const diasNaRua = Math.max(Math.floor((hoje.getTime() - saida.getTime()) / 86400000), 0);
    const diasAtraso = dataPrevista
      ? Math.max(Math.floor((hoje.getTime() - new Date(dataPrevista + "T12:00:00").getTime()) / 86400000), 0)
      : 0;

    return {
      vendaId: s.id,
      clienteNome: s.customer?.name || "Sem cliente",
      dataSaida: String(s.sale_date).slice(0, 10),
      dataPrevista,
      valorKit: s.total_amount ?? s.final_amount ?? 0,
      qtdItens: (s.sale_items || []).reduce((t: number, i: any) => t + (i.quantity || 0), 0),
      diasNaRua,
      diasAtraso,
      atrasado: diasAtraso > 0,
    };
  }).sort((a, b) => b.diasAtraso - a.diasAtraso || b.diasNaRua - a.diasNaRua);
}

/* =========================================================
   ESTOQUE (posição atual, valorizada)
========================================================= */

export interface EstoqueRow {
  sku: number;
  produtoNome: string;
  categoria: string;
  quantidade: number;
  custoUnit: number;
  precoVenda: number;
  valorEstoque: number;     // quantidade × custo
  valorPotencial: number;   // quantidade × preço de venda
  margem: number;           // % sobre o preço de venda
}

export async function getRelatorioEstoque(): Promise<EstoqueRow[]> {
  // Pagina de 1000 em 1000 (limite do Supabase) para cobrir todo o catálogo
  const rows: any[] = [];
  for (let page = 0; ; page++) {
    const { data, error } = await supabase
      .from("products")
      .select("sku, name, category, stock_quantity, cost, price")
      .or("is_active.eq.true,is_active.is.null")
      .gt("stock_quantity", 0)
      .order("sku")
      .range(page * 1000, page * 1000 + 999);

    if (error) throw new Error(error.message);
    rows.push(...(data || []));
    if (!data || data.length < 1000) break;
  }

  return rows.map((p) => {
    const qtd = p.stock_quantity || 0;
    const custo = p.cost || 0;
    const preco = p.price || 0;
    return {
      sku: p.sku,
      produtoNome: p.name || `SKU-${p.sku}`,
      categoria: p.category || "Sem categoria",
      quantidade: qtd,
      custoUnit: custo,
      precoVenda: preco,
      valorEstoque: qtd * custo,
      valorPotencial: qtd * preco,
      margem: preco > 0 ? ((preco - custo) / preco) * 100 : 0,
    };
  });
}

/* =========================================================
   FINANCEIRO MENSAL (receita, custo, lucro, despesas)
========================================================= */

export interface FinanceiroMensal {
  mesKey: string;           // YYYY-MM (ordenação)
  mes: string;              // "Jul/2026"
  numVendas: number;
  receita: number;          // vendas pagas
  custo: number;            // custo dos itens vendidos
  lucroBruto: number;
  margem: number;           // % sobre a receita
  pctPeriodo: number;       // participação do mês na receita do período
  despesasPagas: number;    // saídas do financeiro (baixas de contas a pagar etc.)
  resultado: number;        // lucro bruto − despesas
}

export async function getRelatorioFinanceiroMensal(
  periodo: { inicio: string; fim: string }
): Promise<FinanceiroMensal[]> {
  // Vendas pagas do período (paginadas), com itens para calcular o custo
  const vendas: any[] = [];
  for (let page = 0; ; page++) {
    const { data, error } = await supabase
      .from("sales")
      .select("id, sale_date, final_amount, items:sale_items(quantity, unit_cost)")
      .eq("payment_status", "paid")
      .gte("sale_date", periodo.inicio)
      .lte("sale_date", periodo.fim)
      .order("sale_date")
      .range(page * 1000, page * 1000 + 999);

    if (error) throw new Error(error.message);
    vendas.push(...(data || []));
    if (!data || data.length < 1000) break;
  }

  // Despesas pagas no período (módulo Financeiro); estornos (in) abatem
  const { data: transacoes, error: txError } = await supabase
    .from("financial_transactions")
    .select("direction, amount, reversed_of, transaction_date")
    .gte("transaction_date", periodo.inicio.slice(0, 10))
    .lte("transaction_date", periodo.fim.slice(0, 10));

  // Se o módulo financeiro ainda não tiver dados/tabelas, segue com zero
  const despesasPorMes = new Map<string, number>();
  if (!txError) {
    for (const t of transacoes || []) {
      const key = String(t.transaction_date).slice(0, 7);
      const sinal = t.direction === "out" ? 1 : t.reversed_of ? -1 : 0;
      if (sinal !== 0) {
        despesasPorMes.set(key, (despesasPorMes.get(key) || 0) + sinal * (t.amount || 0));
      }
    }
  }

  const meses = new Map<string, FinanceiroMensal>();
  for (const v of vendas) {
    const key = String(v.sale_date).slice(0, 7); // YYYY-MM
    let m = meses.get(key);
    if (!m) {
      const [ano, mesNum] = key.split("-");
      m = {
        mesKey: key,
        mes: `${MESES_ABREV[parseInt(mesNum, 10) - 1] || mesNum}/${ano}`,
        numVendas: 0, receita: 0, custo: 0, lucroBruto: 0,
        margem: 0, pctPeriodo: 0, despesasPagas: 0, resultado: 0,
      };
      meses.set(key, m);
    }
    m.numVendas += 1;
    m.receita += v.final_amount || 0;
    m.custo += (v.items || []).reduce(
      (s: number, i: any) => s + (i.quantity || 0) * (i.unit_cost || 0), 0
    );
  }

  const receitaTotal = [...meses.values()].reduce((s, m) => s + m.receita, 0);

  return [...meses.values()]
    .map((m) => {
      const despesas = despesasPorMes.get(m.mesKey) || 0;
      const lucro = m.receita - m.custo;
      return {
        ...m,
        lucroBruto: lucro,
        margem: m.receita > 0 ? (lucro / m.receita) * 100 : 0,
        pctPeriodo: receitaTotal > 0 ? (m.receita / receitaTotal) * 100 : 0,
        despesasPagas: despesas,
        resultado: lucro - despesas,
      };
    })
    .sort((a, b) => b.mesKey.localeCompare(a.mesKey));
}

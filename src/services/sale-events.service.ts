// src/services/sale-events.service.ts
// Linha do tempo de uma venda. Junta três fontes, porque o histórico antigo
// está espalhado e não dá para jogar fora:
//   1. sale_events  — o registro novo, gravado a cada troca/devolução/fechamento
//   2. returns      — as devoluções já registradas antes desta tela existir
//   3. observation  — os blocos "[FECHADO EM ...]" e "[REABERTO EM ...]" que o
//                     fechamento de consignado empurrava como texto
import { supabase } from "@/src/lib/supabase/client";

const TABELA_INEXISTENTE = "42P01";

export type TipoEvento =
  | "troca"
  | "devolucao"
  | "fechamento_consignado"
  | "reabertura_consignado"
  | "pagamento"
  | "cancelamento"
  | "ajuste";

export interface PecaMovimentada {
  nome: string;
  qtd: number;
  valor?: number;
}

export interface NovoEventoVenda {
  saleId: number;
  tipo: TipoEvento;
  resumo: string;
  saiu?: PecaMovimentada[];
  entrou?: PecaMovimentada[];
  valorAntes?: number | null;
  valorDepois?: number | null;
  extras?: Record<string, unknown>;
}

export interface ItemHistorico {
  chave: string;
  quando: string;                 // ISO
  tipo: TipoEvento;
  resumo: string;
  saiu: PecaMovimentada[];
  entrou: PecaMovimentada[];
  valorAntes?: number | null;
  valorDepois?: number | null;
  saldo?: number;
  comissaoPercent?: number;
  comissaoValor?: number;
  cobrado?: number;
  origem: "evento" | "devolucao" | "observacao";
  /** >1 quando o mesmo registro entrou várias vezes (o clique repetido antigo). */
  repeticoes: number;
}

/* =========================================================
   GRAVAÇÃO
========================================================= */

/**
 * Registra um acontecimento da venda. Nunca derruba a operação principal:
 * se o histórico falhar, a troca já aconteceu e o que importa é não perder
 * a venda — o erro vai para o console.
 */
export async function registrarEventoVenda(evento: NovoEventoVenda): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from("sale_events").insert({
      sale_id: evento.saleId,
      type: evento.tipo,
      summary: evento.resumo,
      details: {
        saiu: evento.saiu ?? [],
        entrou: evento.entrou ?? [],
        ...(evento.extras ?? {}),
      },
      valor_antes: evento.valorAntes ?? null,
      valor_depois: evento.valorDepois ?? null,
      created_by: user?.id ?? null,
    });

    if (error) throw new Error(error.message);
  } catch (e) {
    console.error("Não foi possível registrar o histórico da venda:", e);
  }
}

/* =========================================================
   LEITURA
========================================================= */

/** "R$ 5.171,68" (inclusive com o espaço quebrado do texto antigo) → 5171.68 */
function moeda(texto: string | undefined | null): number | undefined {
  if (!texto) return undefined;
  const limpo = texto.replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, "");
  const n = Number(limpo);
  return Number.isFinite(n) ? n : undefined;
}

/** "16/09/2026" → ISO, para ordenar junto com os demais eventos. */
function dataBRparaISO(d: string): string {
  const [dia, mes, ano] = d.split("/");
  return new Date(`${ano}-${mes}-${dia}T12:00:00`).toISOString();
}

/** "PIJAMA (x1); CALCINHA (x2)" → lista de peças. */
function parsearPecas(lista: string | undefined): PecaMovimentada[] {
  if (!lista || /nenhuma/i.test(lista)) return [];
  return lista
    .split(";")
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      const m = p.match(/^(.*?)\s*\(x(\d+)\)$/);
      return m ? { nome: m[1].trim(), qtd: Number(m[2]) } : { nome: p, qtd: 1 };
    })
    .filter((p) => p.qtd > 0);
}

/**
 * Lê os fechamentos e reaberturas que ficaram gravados como texto na
 * observação da venda. É histórico de verdade — só estava no lugar errado.
 */
function lerDaObservacao(observacao: string | null): ItemHistorico[] {
  if (!observacao) return [];
  const itens: ItemHistorico[] = [];

  // [FECHADO EM 16/09/2026] Saldo: R$ 5.171,68 | Desconto de lucro: 30% (R$ 1.551,50) | Cobrado: R$ 3.620,18
  const reFechado = /\[FECHADO EM (\d{2}\/\d{2}\/\d{4})\]([^[]*)/g;
  let m: RegExpExecArray | null;
  let i = 0;

  while ((m = reFechado.exec(observacao)) !== null) {
    const corpo = m[2];
    const saldo = moeda(corpo.match(/Saldo:\s*R\$\s*([\d.,]+)/)?.[1]);
    const pct = Number(corpo.match(/Desconto de lucro:\s*(\d+(?:[.,]\d+)?)\s*%/)?.[1]?.replace(",", "."));
    const comissao = moeda(corpo.match(/\(R\$\s*([\d.,]+)\)/)?.[1]);
    const cobrado = moeda(corpo.match(/Cobrado:\s*R\$\s*([\d.,]+)/)?.[1]);

    itens.push({
      chave: `obs-fechado-${i++}`,
      quando: dataBRparaISO(m[1]),
      tipo: "fechamento_consignado",
      resumo: "Consignado fechado",
      saiu: parsearPecas(corpo.match(/Devolvidas:\s*([^|]*)/)?.[1]),
      entrou: [],
      saldo,
      comissaoPercent: Number.isFinite(pct) ? pct : undefined,
      comissaoValor: comissao,
      cobrado,
      origem: "observacao",
      repeticoes: 1,
    });
  }

  const reReaberto = /\[REABERTO EM (\d{2}\/\d{2}\/\d{4})\]([^[]*)/g;
  i = 0;
  while ((m = reReaberto.exec(observacao)) !== null) {
    itens.push({
      chave: `obs-reaberto-${i++}`,
      quando: dataBRparaISO(m[1]),
      tipo: "reabertura_consignado",
      resumo: "Consignado reaberto — voltou a pendente",
      saiu: [],
      entrou: [],
      saldo: moeda(m[2].match(/saldo de R\$\s*([\d.,]+)/)?.[1]),
      origem: "observacao",
      repeticoes: 1,
    });
  }

  return itens;
}

interface ReturnBruto {
  id: number;
  created_at: string;
  type: string | null;
  motive: string | null;
  return_items: { quantity: number; total_price: number | null; product_id: number }[] | null;
}

/**
 * Devoluções antigas viram itens do histórico. Registros idênticos em poucos
 * minutos são agrupados num só: eram o mesmo clique repetido, e mostrar cinco
 * linhas iguais confundiria mais do que explicaria.
 */
function agruparDevolucoes(
  returns: ReturnBruto[],
  nomePorProduto: Map<number, string>
): ItemHistorico[] {
  const JANELA_MS = 5 * 60 * 1000;
  const usados = new Set<number>();
  const itens: ItemHistorico[] = [];

  const assinatura = (r: ReturnBruto) => {
    const its = r.return_items ?? [];
    const valor = its.reduce((t, i) => t + (i.total_price || 0), 0);
    return `${its.length}|${its.reduce((t, i) => t + i.quantity, 0)}|${valor.toFixed(2)}`;
  };

  for (const r of returns) {
    if (usados.has(r.id)) continue;
    const assin = assinatura(r);
    const base = Date.parse(r.created_at);

    const iguais = returns.filter(
      (x) => !usados.has(x.id) && assinatura(x) === assin && Math.abs(Date.parse(x.created_at) - base) <= JANELA_MS
    );
    iguais.forEach((x) => usados.add(x.id));

    const its = r.return_items ?? [];
    const pecas = new Map<string, PecaMovimentada>();
    for (const i of its) {
      const nome = nomePorProduto.get(i.product_id) || `Produto ${i.product_id}`;
      const atual = pecas.get(nome);
      if (atual) {
        atual.qtd += i.quantity;
        atual.valor = (atual.valor || 0) + (i.total_price || 0);
      } else {
        pecas.set(nome, { nome, qtd: i.quantity, valor: i.total_price || 0 });
      }
    }

    const total = its.reduce((t, i) => t + (i.total_price || 0), 0);
    const qtd = its.reduce((t, i) => t + i.quantity, 0);

    itens.push({
      chave: `ret-${r.id}`,
      quando: r.created_at,
      tipo: r.type === "troca" ? "troca" : "devolucao",
      resumo: `${qtd} ${qtd === 1 ? "peça devolvida" : "peças devolvidas"} ao estoque`,
      saiu: [...pecas.values()],
      entrou: [],
      valorDepois: null,
      saldo: total,
      origem: "devolucao",
      repeticoes: iguais.length,
    });
  }

  return itens;
}

export interface HistoricoVenda {
  itens: ItemHistorico[];
  /** true quando sql/historico_venda.sql ainda não foi executado. */
  migracaoPendente: boolean;
}

export async function listarHistoricoVenda(
  saleId: number,
  observacao: string | null
): Promise<HistoricoVenda> {
  // 1. Eventos novos
  let migracaoPendente = false;
  const eventos: ItemHistorico[] = [];

  const { data: evs, error: errEv } = await supabase
    .from("sale_events")
    .select("id, type, summary, details, valor_antes, valor_depois, created_at")
    .eq("sale_id", saleId)
    .order("created_at", { ascending: false });

  if (errEv) {
    if (errEv.code === TABELA_INEXISTENTE) migracaoPendente = true;
    else throw new Error(errEv.message);
  }

  const returnsJaContados = new Set<number>();
  for (const e of evs || []) {
    const d = (e.details || {}) as {
      saiu?: PecaMovimentada[];
      entrou?: PecaMovimentada[];
      return_id?: number;
      saldo?: number;
      comissao_percent?: number;
      comissao_valor?: number;
      cobrado?: number;
    };
    if (typeof d.return_id === "number") returnsJaContados.add(d.return_id);
    eventos.push({
      chave: `ev-${e.id}`,
      quando: e.created_at,
      tipo: e.type as TipoEvento,
      resumo: e.summary,
      saiu: d.saiu ?? [],
      entrou: d.entrou ?? [],
      valorAntes: e.valor_antes,
      valorDepois: e.valor_depois,
      saldo: d.saldo,
      comissaoPercent: d.comissao_percent,
      comissaoValor: d.comissao_valor,
      cobrado: d.cobrado,
      origem: "evento",
      repeticoes: 1,
    });
  }

  // 2. Devoluções antigas (as que nenhum evento já descreve)
  const { data: rets } = await supabase
    .from("returns")
    .select("id, created_at, type, motive, return_items(quantity, total_price, product_id)")
    .eq("sale_id", saleId)
    .order("created_at", { ascending: false });

  const antigas = ((rets || []) as ReturnBruto[]).filter((r) => !returnsJaContados.has(r.id));

  const skus = [...new Set(antigas.flatMap((r) => (r.return_items || []).map((i) => i.product_id)))];
  const nomePorProduto = new Map<number, string>();
  if (skus.length > 0) {
    const { data: prods } = await supabase.from("products").select("sku, name").in("sku", skus);
    for (const p of prods || []) nomePorProduto.set(p.sku, p.name);
  }

  // 3. Fechamentos e reaberturas que ficaram no texto da observação
  const doTexto = lerDaObservacao(observacao);

  const itens = [...eventos, ...agruparDevolucoes(antigas, nomePorProduto), ...doTexto].sort(
    (a, b) => Date.parse(b.quando) - Date.parse(a.quando)
  );

  return { itens, migracaoPendente };
}

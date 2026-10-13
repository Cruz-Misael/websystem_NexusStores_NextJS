// src/lib/consignado.ts
// O histórico de peças do consignado (saiu / devolveu / ficou) é reconstruído a
// partir do texto gravado na observação da venda, que guarda só nome e
// quantidade: "PIJAMA SUEDE (x2); CALCINHA DORA (x1)".
//
// Para mostrar SKU e tamanho junto, cruzamos esse histórico com os itens da
// própria venda, que trazem produto completo. O cruzamento é por nome — e como
// a mesma peça aparece em linhas diferentes por tamanho ("PIJAMA SUEDE" P, M e
// G), casar só pelo nome traria sempre o primeiro. Por isso consumimos as
// ocorrências em fila: a segunda linha "PIJAMA SUEDE" do histórico recebe o
// segundo "PIJAMA SUEDE" da venda, que é a ordem em que o fechamento gravou.
import { ConsignadoItemBreakdown, SaleItem } from "@/types/sales";

export interface FichaDaPeca {
  sku?: number | string;
  tamanho?: string;
}

const nomeDoItem = (item: SaleItem): string =>
  item.product?.name || item.product_name || "Produto";

/** Fila de fichas por nome, na ordem em que os itens estão na venda. */
function fichasPorNome(itens: SaleItem[]): Map<string, FichaDaPeca[]> {
  const filas = new Map<string, FichaDaPeca[]>();

  for (const item of itens) {
    const nome = nomeDoItem(item);
    const ficha: FichaDaPeca = {
      sku: item.product?.sku ?? item.product_id ?? undefined,
      tamanho: item.product?.size?.trim() || undefined,
    };
    const fila = filas.get(nome);
    if (fila) fila.push(ficha);
    else filas.set(nome, [ficha]);
  }

  return filas;
}

/**
 * Devolve o breakdown com sku e tamanho preenchidos onde foi possível
 * identificar a peça. Quem não casar fica como está — nome e quantidade —,
 * que é o caso de produto renomeado ou excluído depois do fechamento.
 */
export function enriquecerBreakdown(
  breakdown: ConsignadoItemBreakdown,
  itensDaVenda: SaleItem[] | undefined | null
): ConsignadoItemBreakdown {
  if (!itensDaVenda?.length) return breakdown;

  const filas = fichasPorNome(itensDaVenda);

  // Cada lista consome as fichas do começo: dentro de "saiu", "devolveu" e
  // "ficou" a ordem é a mesma da venda, mas uma lista não continua de onde a
  // outra parou.
  const enriquecerLista = (lista: ConsignadoItemBreakdown["itensOriginais"]) => {
    const usadas = new Map<string, number>();

    return lista.map((linha) => {
      const fila = filas.get(linha.nome);
      if (!fila?.length) return linha;

      const posicao = usadas.get(linha.nome) ?? 0;
      usadas.set(linha.nome, posicao + 1);

      // Passou do fim da fila: a peça existe, mas não dá para dizer qual
      // variação é. Melhor repetir a primeira do que inventar.
      const ficha = fila[posicao] ?? fila[0];
      return { ...linha, sku: ficha.sku, tamanho: ficha.tamanho };
    });
  };

  return {
    itensOriginais: enriquecerLista(breakdown.itensOriginais),
    itensDevolvidos: enriquecerLista(breakdown.itensDevolvidos),
    itensFicaram: enriquecerLista(breakdown.itensFicaram),
  };
}

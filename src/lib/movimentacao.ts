// src/lib/movimentacao.ts
// De onde a peça saiu e para onde ela foi, dito sempre do mesmo ponto de vista.
//
// "Saíram" e "Entraram" sozinhos trocavam de sentido de uma tela para outra: no
// placar da troca, "saíram" eram as peças que saíram da LOJA (o kit inteiro que
// a cliente levou); no histórico, eram as que saíram do KIT (ou seja, voltaram
// para a loja). Mesma palavra, sentido oposto — e quem lê não tem como saber
// qual dos dois está vendo.
//
// Daqui em diante o ponto de vista é o da cliente: o que ela tem em mãos é o
// kit (ou a compra, quando não é consignado). Peça que volta para a loja SAI do
// kit; peça que ela leva ENTRA no kit. E todo texto que diz "saiu" ou "entrou"
// diz junto de onde e para onde.

export type Recipiente = "kit" | "compra";

export const recipienteDe = (isConsignado?: boolean | null): Recipiente =>
  isConsignado ? "kit" : "compra";

const DE: Record<Recipiente, string> = { kit: "do kit", compra: "da compra" };
const EM: Record<Recipiente, string> = { kit: "no kit", compra: "na compra" };

/** Título da lista de peças que voltaram para a loja. */
export const tituloSaiu = (r: Recipiente) => `Saiu ${DE[r]} · voltou para a loja`;

/** Título da lista de peças que a cliente levou. */
export const tituloEntrou = (r: Recipiente) => `Entrou ${EM[r]} · saiu da loja`;

/**
 * "8 peças · 7 itens".
 *
 * O cabeçalho da troca contava LINHAS e escrevia "7 item(ns)" embaixo de uma
 * lista de 8 peças — uma delas tinha duas unidades. Quem confere na mão conta
 * peça, então a peça vem primeiro e grande; o número de itens fica junto para
 * a conta fechar quando alguma linha tiver mais de uma unidade.
 */
export function contagemPecas(pecas: number, itens: number): string {
  const umaPeca = pecas === 1 ? "peça" : "peças";
  const umItem = itens === 1 ? "item" : "itens";
  return `${pecas} ${umaPeca} · ${itens} ${umItem}`;
}

/** Texto longo da mesma contagem, para o `title` do rótulo. */
export const contagemExplicada = (pecas: number, itens: number) =>
  `${itens} ${itens === 1 ? "item" : "itens"} na lista, ${pecas} ${pecas === 1 ? "peça" : "peças"} no total — ` +
  `um item com 2 unidades conta como 1 item e 2 peças.`;

/**
 * "15 peças saíram do kit · 11 entraram no kit".
 * Devolve null quando não houve movimento nenhum, para quem chama decidir o
 * que dizer no lugar.
 */
export function resumoMovimentacao(
  nSaiu: number,
  nEntrou: number,
  r: Recipiente
): string | null {
  const partes: string[] = [];
  if (nSaiu > 0) {
    partes.push(`${nSaiu} ${nSaiu === 1 ? "peça saiu" : "peças saíram"} ${DE[r]}`);
  }
  if (nEntrou > 0) {
    partes.push(`${nEntrou} ${nEntrou === 1 ? "entrou" : "entraram"} ${EM[r]}`);
  }
  return partes.length > 0 ? partes.join(" · ") : null;
}

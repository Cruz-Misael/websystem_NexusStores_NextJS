// src/lib/limite.ts
// Quanto de mercadoria uma cliente pode estar carregando sem autorização.
//
// O teto era conferido só no caixa e só contra ESTA venda. Duas brechas saíam
// daí: a troca acrescentava peça sem passar por conferência nenhuma (a #267
// nasceu em R$ 1.714,54 e chegou a R$ 2.852,44 com teto de R$ 2.500), e três
// kits abertos de R$ 2.400 cada passavam por um teto de R$ 2.500 porque nenhum
// deles, sozinho, o ultrapassava.
//
// Agora o teto vale sobre o que a cliente DEVE: o que já está em aberto em
// outras vendas mais o que esta operação vai deixar em aberto. A regra antiga
// continua valendo por cima — uma venda que sozinha passa do teto segue pedindo
// PIN mesmo se for paga na hora. Afrouxar um controle que já existe não era o
// pedido.

/** Margem de 1 centavo: evita que um total igual ao teto caia na trava por arredondamento. */
const FOLGA = 0.01;

export interface EntradaLimite {
  /** people.sales_limit. null/undefined = cliente sem teto definido. */
  limite: number | null | undefined;
  /** Soma das outras vendas do cliente ainda em aberto. */
  saldoEmAberto: number;
  /** Quanto esta venda vale depois da operação. */
  valorDaVenda: number;
  /** true quando esta venda fica (ou continua) em aberto. */
  ficaEmAberto: boolean;
  /**
   * Quanto a venda valia ANTES desta operação, quando ela já existia.
   *
   * Sem isto, uma devolução numa venda que já está acima do teto pediria
   * autorização — e devolver peça diminui a exposição, é o contrário do que a
   * trava existe para impedir. Operação que não aumenta o que a cliente deve
   * nunca precisa de gerente.
   */
  valorAnterior?: number;
}

export type MotivoEstouro =
  /** O que o cliente ficaria devendo no total passa do teto. */
  | "acumulado"
  /** Esta venda, sozinha, passa do teto — mesmo paga na hora. */
  | "venda"
  /** Não deu para somar o saldo em aberto; pedir autorização é o lado seguro. */
  | "desconhecido";

export interface Estouro {
  limite: number;
  /** O valor que passou do teto — o acumulado ou a venda, conforme o motivo. */
  exposicao: number;
  motivo: MotivoEstouro;
  /** Só no motivo "acumulado": o que já havia antes desta venda. */
  saldoAnterior: number;
}

/**
 * Devolve o estouro quando a operação precisa de autorização de gerente, ou
 * null quando pode seguir sozinha.
 */
export function estouroDeLimite({
  limite,
  saldoEmAberto,
  valorDaVenda,
  ficaEmAberto,
  valorAnterior,
}: EntradaLimite): Estouro | null {
  if (limite === null || limite === undefined || !Number.isFinite(limite)) return null;

  if (valorAnterior !== undefined && valorDaVenda <= valorAnterior + FOLGA) return null;

  if (!Number.isFinite(saldoEmAberto)) {
    return { limite, exposicao: valorDaVenda, motivo: "desconhecido", saldoAnterior: 0 };
  }

  const exposicao = saldoEmAberto + (ficaEmAberto ? valorDaVenda : 0);
  if (exposicao > limite + FOLGA) {
    return { limite, exposicao, motivo: "acumulado", saldoAnterior: saldoEmAberto };
  }

  // Regra antiga, mantida: uma venda grande paga na hora também é conferida.
  if (valorDaVenda > limite + FOLGA) {
    return { limite, exposicao: valorDaVenda, motivo: "venda", saldoAnterior: saldoEmAberto };
  }

  return null;
}

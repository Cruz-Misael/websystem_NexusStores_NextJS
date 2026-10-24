// src/lib/cep.ts
// Busca de endereço por CEP, usada no cadastro de clientes.
//
// Os Correios não servem aqui: a API deles hoje exige contrato comercial e
// credenciais, e o serviço aberto de consulta foi descontinuado. Quem responde
// de graça e sem chave é o ViaCEP — e, como reserva, o BrasilAPI, que consulta
// várias fontes (inclusive os próprios Correios) e devolve a primeira que
// responder. Se um estiver fora do ar ou não conhecer o CEP, o outro atende.

export interface EnderecoDoCep {
  logradouro: string;
  bairro: string;
  cidade: string;
  uf: string;
  /** Nome do serviço que respondeu — só para diagnóstico. */
  fonte: "ViaCEP" | "BrasilAPI";
}

export type ResultadoCep =
  | { ok: true; endereco: EnderecoDoCep }
  | { ok: false; motivo: "incompleto" | "nao_encontrado" | "indisponivel" };

/** Deixa só os dígitos. "95010-000" e "95010000" viram a mesma coisa. */
export const limparCep = (cep: string): string => (cep || "").replace(/\D/g, "");

export const cepCompleto = (cep: string): boolean => limparCep(cep).length === 8;

const TEMPO_LIMITE_MS = 6000;

async function buscarComPrazo(url: string): Promise<Response> {
  const cancelar = new AbortController();
  const relogio = setTimeout(() => cancelar.abort(), TEMPO_LIMITE_MS);
  try {
    return await fetch(url, { signal: cancelar.signal });
  } finally {
    clearTimeout(relogio);
  }
}

/** ViaCEP responde 200 com { erro: true } quando o CEP não existe. */
async function noViaCep(cep: string): Promise<EnderecoDoCep | null> {
  const r = await buscarComPrazo(`https://viacep.com.br/ws/${cep}/json/`);
  if (!r.ok) throw new Error(`ViaCEP respondeu ${r.status}`);

  const d = await r.json();
  if (d?.erro) return null;

  return {
    logradouro: d.logradouro || "",
    bairro: d.bairro || "",
    cidade: d.localidade || "",
    uf: d.uf || "",
    fonte: "ViaCEP",
  };
}

/** BrasilAPI devolve 404 quando nenhuma das fontes dela conhece o CEP. */
async function noBrasilApi(cep: string): Promise<EnderecoDoCep | null> {
  const r = await buscarComPrazo(`https://brasilapi.com.br/api/cep/v2/${cep}`);
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`BrasilAPI respondeu ${r.status}`);

  const d = await r.json();
  return {
    logradouro: d.street || "",
    bairro: d.neighborhood || "",
    cidade: d.city || "",
    uf: d.state || "",
    fonte: "BrasilAPI",
  };
}

/**
 * Procura o endereço do CEP. Tenta o ViaCEP e, se ele falhar ou não conhecer
 * o CEP, tenta o BrasilAPI — são bases diferentes, e o que falta em uma às
 * vezes existe na outra.
 *
 * Distingue "não existe" de "não consegui perguntar": o primeiro é erro de
 * digitação, o segundo é problema de rede, e o operador precisa saber qual é.
 */
export async function buscarEnderecoPorCep(cepBruto: string): Promise<ResultadoCep> {
  const cep = limparCep(cepBruto);
  if (cep.length !== 8) return { ok: false, motivo: "incompleto" };

  let algumRespondeu = false;

  for (const consultar of [noViaCep, noBrasilApi]) {
    try {
      const endereco = await consultar(cep);
      algumRespondeu = true;
      if (endereco) return { ok: true, endereco };
    } catch {
      // Fora do ar, sem internet ou demorou demais: tenta o próximo.
    }
  }

  // Os dois responderam e nenhum conhece o CEP — aí é digitação errada.
  return { ok: false, motivo: algumRespondeu ? "nao_encontrado" : "indisponivel" };
}

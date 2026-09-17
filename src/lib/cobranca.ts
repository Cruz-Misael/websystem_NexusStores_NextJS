// src/lib/cobranca.ts
// Regras puras da cobrança de consignado — sem Supabase, sem React.
// Ficam aqui porque são usadas dos dois lados: pela tela (browser, via
// collections.service) e pelas rotas de API (servidor, via supabaseAdmin).

/** Fuso da loja. O container de produção roda em UTC; depois das 21h ele já
 *  virou o dia e um acerto de hoje apareceria como atrasado. */
export const TZ_LOJA = "America/Sao_Paulo";

/** Data de hoje na loja, em YYYY-MM-DD (ordenável como texto). */
export function hojeNaLoja(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ_LOJA }).format(new Date());
}

/** A data combinada de acerto mora na observação da venda, no mesmo formato
 *  que o caixa grava e que o sino de notificações já lê. */
export function dataPrevistaDe(observation: string | null | undefined): string | null {
  return observation?.match(/Pagamento previsto: (\d{4}-\d{2}-\d{2})/)?.[1] ?? null;
}

/** Diferença em dias entre duas datas YYYY-MM-DD (meio-dia UTC evita horário de verão). */
export function diasEntre(de: string, ate: string): number {
  return Math.round((Date.parse(`${ate}T12:00:00Z`) - Date.parse(`${de}T12:00:00Z`)) / 86400000);
}

export function formatarDataBR(iso: string | null): string {
  return iso ? iso.split("-").reverse().join("/") : "—";
}

export function formatarValor(valor: unknown): string {
  return Number(valor ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function primeiroNome(nome: string | null | undefined): string {
  return (nome || "").trim().split(/\s+/)[0] || "cliente";
}

/**
 * Normaliza o telefone do cadastro para o formato que o wa.me aceita
 * (DDI + DDD + número, só dígitos). Retorna null quando não dá para confiar —
 * a tela desabilita o botão do WhatsApp nesse caso em vez de abrir uma
 * conversa com número errado.
 */
export function normalizarTelefoneBR(phone: string | null | undefined): string | null {
  let digitos = (phone || "").replace(/\D/g, "");
  if (!digitos) return null;

  // "011 99999-9999" → tira o zero da operadora
  if (digitos.length > 11 && digitos.startsWith("0")) digitos = digitos.replace(/^0+/, "");

  // Já veio com DDI do Brasil
  if ((digitos.length === 12 || digitos.length === 13) && digitos.startsWith("55")) {
    const ddd = Number(digitos.slice(2, 4));
    return ddd >= 11 && ddd <= 99 ? digitos : null;
  }

  // DDD + número (fixo com 8 ou celular com 9 dígitos)
  if (digitos.length === 10 || digitos.length === 11) {
    const ddd = Number(digitos.slice(0, 2));
    return ddd >= 11 && ddd <= 99 ? `55${digitos}` : null;
  }

  // Sem DDD não dá para adivinhar a região — melhor não mandar.
  return null;
}

export function emailValido(email: string | null | undefined): boolean {
  const e = (email || "").trim();
  return e.length > 4 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
}

/**
 * Uma cobrança pendente. Definida aqui (e não no service) porque o mesmo
 * formato é montado nos dois lados: pela tela e pelo disparo automático.
 */
export interface CobrancaPendente {
  saleId: number;
  clienteId: number | null;
  clienteNome: string;
  email: string | null;
  telefone: string | null;          // como está no cadastro
  whatsapp: string | null;          // normalizado (55 + DDD + número) ou null
  dataSaida: string;                // YYYY-MM-DD
  dataPrevista: string;             // YYYY-MM-DD
  valor: number;
  qtdItens: number;
  diasAtraso: number;               // 0 = vence hoje
  situacao: "atrasada" | "hoje";
  ultimoEmail: string | null;       // ISO do último e-mail enviado
  ultimoWhatsapp: string | null;    // ISO da última mensagem de WhatsApp
  totalCobrancas: number;
}

/** Colunas da venda que a cobrança precisa, com cliente e itens aninhados. */
interface VendaBruta {
  id: number;
  sale_date: string;
  total_amount: number | null;
  final_amount: number | null;
  observation: string | null;
  customer: { id: number; name: string; email: string | null; phone: string | null } | null;
  sale_items: { quantity: number | null }[] | null;
}

/**
 * Converte uma venda pendente em cobrança. Devolve null quando a venda ainda
 * está no prazo (ou nem tem data combinada) — esse é o filtro que define
 * "quem está devendo hoje".
 */
export function vendaParaCobranca(venda: unknown, hoje: string): CobrancaPendente | null {
  const s = venda as VendaBruta;
  const dataPrevista = dataPrevistaDe(s.observation);
  if (!dataPrevista || dataPrevista > hoje) return null;

  const diasAtraso = diasEntre(dataPrevista, hoje);

  return {
    saleId: s.id,
    clienteId: s.customer?.id ?? null,
    clienteNome: s.customer?.name || "Sem cliente",
    email: emailValido(s.customer?.email) ? s.customer!.email!.trim() : null,
    telefone: s.customer?.phone ?? null,
    whatsapp: normalizarTelefoneBR(s.customer?.phone),
    dataSaida: String(s.sale_date).slice(0, 10),
    dataPrevista,
    valor: s.final_amount ?? s.total_amount ?? 0,
    qtdItens: (s.sale_items || []).reduce((t, i) => t + (i.quantity || 0), 0),
    diasAtraso,
    situacao: diasAtraso > 0 ? "atrasada" : "hoje",
    ultimoEmail: null,
    ultimoWhatsapp: null,
    totalCobrancas: 0,
  };
}

/** Colunas que a consulta de cobranças precisa trazer, nos dois lados. */
export const SELECT_COBRANCA = `
  id, sale_date, total_amount, final_amount, observation, payment_method,
  customer:people(id, name, email, phone),
  sale_items(quantity)
`;

/** Dados que qualquer mensagem de cobrança precisa para ser escrita. */
export interface ContextoMensagem {
  clienteNome: string;
  vendaId: number;
  valor: number;
  dataPrevista: string | null;
  diasAtraso: number;
  qtdItens: number;
  nomeLoja: string;
}

export const VARIAVEIS_MENSAGEM = [
  { chave: "{cliente}", descricao: "Nome completo da cliente" },
  { chave: "{primeiro_nome}", descricao: "Só o primeiro nome" },
  { chave: "{venda}", descricao: "Número do consignado" },
  { chave: "{valor}", descricao: "Valor em aberto, já formatado" },
  { chave: "{data_prevista}", descricao: "Data combinada do acerto (DD/MM/AAAA)" },
  { chave: "{dias_atraso}", descricao: "Quantos dias de atraso" },
  { chave: "{itens}", descricao: "Quantidade de peças do kit" },
  { chave: "{loja}", descricao: "Nome da loja" },
] as const;

/** Troca as variáveis do template pelos valores da cobrança. */
export function aplicarVariaveis(template: string, ctx: ContextoMensagem): string {
  const mapa: Record<string, string> = {
    "{cliente}": ctx.clienteNome,
    "{primeiro_nome}": primeiroNome(ctx.clienteNome),
    "{venda}": String(ctx.vendaId),
    "{valor}": formatarValor(ctx.valor),
    "{data_prevista}": formatarDataBR(ctx.dataPrevista),
    "{dias_atraso}": String(ctx.diasAtraso),
    "{itens}": String(ctx.qtdItens),
    "{loja}": ctx.nomeLoja,
  };
  return template.replace(/\{(cliente|primeiro_nome|venda|valor|data_prevista|dias_atraso|itens|loja)\}/g,
    (m) => mapa[m] ?? m);
}

/** Link do WhatsApp com a mensagem já escrita — é só a pessoa apertar enviar. */
export function linkWhatsapp(telefoneNormalizado: string, mensagem: string): string {
  return `https://wa.me/${telefoneNormalizado}?text=${encodeURIComponent(mensagem)}`;
}

/** Configuração da cobrança (espelha a tabela collection_settings). */
export interface CollectionSettings {
  auto_email_enabled: boolean;
  send_on_due_date: boolean;
  min_days_between_emails: number;
  whatsapp_template: string;
  email_subject: string;
  email_intro: string;
}

export const SETTINGS_PADRAO: CollectionSettings = {
  auto_email_enabled: false,
  send_on_due_date: false,
  min_days_between_emails: 3,
  whatsapp_template:
    "Oi {primeiro_nome}, tudo bem? Passando para lembrar do acerto do consignado #{venda}, no valor de {valor}, que estava previsto para {data_prevista}. Quando puder, me avisa como prefere acertar? Se já tiver acertado, pode ignorar esta mensagem. Obrigada! — {loja}",
  email_subject: "Lembrete de acerto — consignado #{venda}",
  email_intro:
    "Passando para lembrar do acerto do consignado abaixo. Quando puder, é só responder este e-mail ou falar com a gente no WhatsApp para combinar. Se já tiver acertado, pode ignorar esta mensagem.",
};

// src/services/collections.service.ts
// Cobrança de consignado: quem está devendo, o que já foi enviado para cada uma
// e os textos das mensagens. Tudo que é regra pura (data prevista, telefone,
// variáveis do template) mora em src/lib/cobranca.ts, porque o disparo
// automático no servidor usa as mesmas regras.
import { supabase } from "@/src/lib/supabase/client";
import {
  CobrancaPendente,
  CollectionSettings,
  SELECT_COBRANCA,
  SETTINGS_PADRAO,
  hojeNaLoja,
  vendaParaCobranca,
} from "@/src/lib/cobranca";

import { ehTabelaInexistente } from "@/src/lib/supabase/erros";

export type { CobrancaPendente };

export interface ListaCobrancas {
  cobrancas: CobrancaPendente[];
  /** true quando sql/cobrancas.sql ainda não foi executado no banco. */
  migracaoPendente: boolean;
}

/**
 * Consignados pendentes cuja data combinada de acerto já chegou (hoje) ou
 * passou (atrasada). O critério de "consignado" é o mesmo do relatório
 * Consignados na Rua, e a data sai da observação da venda.
 */
export async function listarCobrancas(): Promise<ListaCobrancas> {
  const { data, error } = await supabase
    .from("sales")
    .select(SELECT_COBRANCA)
    .eq("payment_status", "pending")
    .or("payment_method.eq.consignado,observation.ilike.%Venda consignada%");

  if (error) throw new Error(error.message);

  const hoje = hojeNaLoja();

  const cobrancas: CobrancaPendente[] = (data || [])
    .map((venda) => vendaParaCobranca(venda, hoje))
    .filter((c): c is CobrancaPendente => c !== null)
    .sort((a, b) => b.diasAtraso - a.diasAtraso || b.valor - a.valor);

  const migracaoPendente = await anexarHistorico(cobrancas);
  return { cobrancas, migracaoPendente };
}

/** Preenche última cobrança por canal. Devolve true se a tabela ainda não existe. */
async function anexarHistorico(cobrancas: CobrancaPendente[]): Promise<boolean> {
  if (cobrancas.length === 0) return false;

  const { data, error } = await supabase
    .from("collection_messages")
    .select("sale_id, channel, sent_at")
    .in("sale_id", cobrancas.map((c) => c.saleId))
    .eq("status", "sent")
    .order("sent_at", { ascending: false });

  if (error) return ehTabelaInexistente(error);

  for (const msg of data || []) {
    const alvo = cobrancas.find((c) => c.saleId === msg.sale_id);
    if (!alvo) continue;
    alvo.totalCobrancas += 1;
    // A consulta vem da mais recente para a mais antiga: a primeira de cada
    // canal já é a última cobrança feita por ali.
    if (msg.channel === "email" && !alvo.ultimoEmail) alvo.ultimoEmail = msg.sent_at;
    if (msg.channel === "whatsapp" && !alvo.ultimoWhatsapp) alvo.ultimoWhatsapp = msg.sent_at;
  }
  return false;
}

/* =========================================================
   CONFIGURAÇÃO
========================================================= */

export interface ConfigCobranca {
  settings: CollectionSettings;
  migracaoPendente: boolean;
}

export async function carregarConfigCobranca(): Promise<ConfigCobranca> {
  const { data, error } = await supabase
    .from("collection_settings")
    .select("auto_email_enabled, send_on_due_date, min_days_between_emails, whatsapp_template, email_subject, email_intro")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    if (ehTabelaInexistente(error)) return { settings: SETTINGS_PADRAO, migracaoPendente: true };
    throw new Error(error.message);
  }

  return { settings: (data as CollectionSettings) ?? SETTINGS_PADRAO, migracaoPendente: false };
}

export async function salvarConfigCobranca(settings: CollectionSettings): Promise<void> {
  const { error } = await supabase
    .from("collection_settings")
    .upsert({ id: 1, ...settings, updated_at: new Date().toISOString() });

  if (error) throw new Error(error.message);
}

/** Nome que assina as mensagens: o fantasia da loja, com o razão social de reserva. */
export async function getNomeLoja(): Promise<string> {
  const { data } = await supabase
    .from("companies")
    .select("name, fantasy_name")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return data?.fantasy_name?.trim() || data?.name?.trim() || "nossa loja";
}

/* =========================================================
   REGISTRO DE ENVIO
========================================================= */

/**
 * Registra que a conversa do WhatsApp foi aberta com a mensagem pronta.
 * O envio em si acontece no aparelho de quem clicou — o sistema não tem como
 * confirmar que a mensagem saiu, e a coluna "última cobrança" deve ser lida
 * como "foi cobrada por aqui", não como entrega garantida.
 */
export async function registrarEnvioWhatsapp(cobranca: CobrancaPendente): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase.from("collection_messages").insert({
    sale_id: cobranca.saleId,
    customer_id: cobranca.clienteId,
    channel: "whatsapp",
    origin: "manual",
    status: "sent",
    days_late: cobranca.diasAtraso,
    amount: cobranca.valor,
    destination: cobranca.whatsapp,
    sent_by: user?.id ?? null,
  });

  if (error) throw new Error(error.message);
}

export interface ResultadoEnvioEmail {
  enviados: number;
  falhas: { sale_id: number; motivo: string }[];
}

/** Dispara os e-mails pelo servidor (a chave do Resend não vai para o browser). */
export async function enviarEmailsCobranca(saleIds: number[]): Promise<ResultadoEnvioEmail> {
  const res = await fetch("/api/cobrancas/email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sale_ids: saleIds }),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || "Falha ao enviar e-mails");
  return json as ResultadoEnvioEmail;
}

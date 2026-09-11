// src/lib/cobranca-server.ts
// Parte da cobrança que roda no servidor: ler a configuração, achar quem está
// devendo, enviar o e-mail e registrar o que saiu. Usado tanto pelo envio
// manual (/api/cobrancas/email) quanto pelo disparo diário (/api/cobrancas/cron),
// para que os dois cobrem exatamente pelas mesmas regras.
import { supabaseAdmin } from "@/src/lib/supabase/admin";
import { sendCollectionEmail } from "@/src/services/email.service";
import {
  CobrancaPendente,
  CollectionSettings,
  SELECT_COBRANCA,
  SETTINGS_PADRAO,
  aplicarVariaveis,
  hojeNaLoja,
  normalizarTelefoneBR,
  vendaParaCobranca,
} from "@/src/lib/cobranca";

export interface IdentidadeLoja {
  nomeLoja: string;
  whatsappLoja: string | null;
}

/** Configuração da cobrança. Cai no padrão se sql/cobrancas.sql não rodou ainda. */
export async function carregarSettings(): Promise<CollectionSettings> {
  const { data } = await supabaseAdmin
    .from("collection_settings")
    .select("auto_email_enabled, send_on_due_date, min_days_between_emails, whatsapp_template, email_subject, email_intro")
    .eq("id", 1)
    .maybeSingle();

  return (data as CollectionSettings) ?? SETTINGS_PADRAO;
}

/** Nome que assina a mensagem e número para o botão de resposta do e-mail. */
export async function carregarIdentidadeLoja(): Promise<IdentidadeLoja> {
  const [{ data: empresa }, { data: site }] = await Promise.all([
    supabaseAdmin.from("companies").select("name, fantasy_name, phone")
      .order("created_at", { ascending: true }).limit(1).maybeSingle(),
    supabaseAdmin.from("website_config").select("whatsapp_number").limit(1).maybeSingle(),
  ]);

  return {
    nomeLoja: empresa?.fantasy_name?.trim() || empresa?.name?.trim() || "nossa loja",
    whatsappLoja: normalizarTelefoneBR(site?.whatsapp_number) ?? normalizarTelefoneBR(empresa?.phone),
  };
}

/** Consignados pendentes cujo acerto já venceu (ou vence hoje). */
export async function buscarCobrancas(): Promise<CobrancaPendente[]> {
  const { data, error } = await supabaseAdmin
    .from("sales")
    .select(SELECT_COBRANCA)
    .eq("payment_status", "pending")
    .or("payment_method.eq.consignado,observation.ilike.%Venda consignada%");

  if (error) throw new Error(error.message);

  const hoje = hojeNaLoja();
  return (data || [])
    .map((venda) => vendaParaCobranca(venda, hoje))
    .filter((c): c is CobrancaPendente => c !== null)
    .sort((a, b) => b.diasAtraso - a.diasAtraso || b.valor - a.valor);
}

/** Data do último e-mail enviado com sucesso, por venda — a trava anti-repetição. */
export async function ultimosEmailsPorVenda(saleIds: number[]): Promise<Map<number, string>> {
  const mapa = new Map<number, string>();
  if (saleIds.length === 0) return mapa;

  const { data } = await supabaseAdmin
    .from("collection_messages")
    .select("sale_id, sent_at")
    .in("sale_id", saleIds)
    .eq("channel", "email")
    .eq("status", "sent")
    .order("sent_at", { ascending: false });

  // Vem da mais recente para a mais antiga: a primeira de cada venda é a última.
  for (const m of data || []) {
    if (!mapa.has(m.sale_id)) mapa.set(m.sale_id, m.sent_at);
  }
  return mapa;
}

async function registrar(
  cobranca: CobrancaPendente,
  origin: "manual" | "auto",
  status: "sent" | "failed",
  extras: { destination?: string | null; error?: string; sentBy?: string | null }
): Promise<void> {
  const { error } = await supabaseAdmin.from("collection_messages").insert({
    sale_id: cobranca.saleId,
    customer_id: cobranca.clienteId,
    channel: "email",
    origin,
    status,
    error: extras.error ?? null,
    days_late: cobranca.diasAtraso,
    amount: cobranca.valor,
    destination: extras.destination ?? cobranca.email,
    sent_by: extras.sentBy ?? null,
  });

  // Falhar o registro não desfaz o e-mail já enviado — mas tem que aparecer no
  // log, senão a trava anti-repetição some sem ninguém notar.
  if (error) console.error(`Cobrança #${cobranca.saleId}: e-mail ${status}, mas o registro falhou:`, error.message);
}

export interface ResultadoEnvio {
  enviados: number;
  falhas: { sale_id: number; motivo: string }[];
}

// O Resend aceita ~2 envios por segundo na conta padrão; acima disso devolve
// 429 e a cobrança simplesmente não sai. Espaçar é mais barato que tratar o erro.
const INTERVALO_ENTRE_ENVIOS_MS = 600;

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Envia o lembrete para cada cobrança da lista e registra o resultado.
 * Quem não tem e-mail válido entra como falha explicada, não some da conta.
 */
export async function enviarCobrancas(
  cobrancas: CobrancaPendente[],
  opcoes: { origin: "manual" | "auto"; sentBy?: string | null }
): Promise<ResultadoEnvio> {
  const [settings, loja] = await Promise.all([carregarSettings(), carregarIdentidadeLoja()]);
  const resultado: ResultadoEnvio = { enviados: 0, falhas: [] };
  let jaEnviouAlgum = false;

  for (const cobranca of cobrancas) {
    if (!cobranca.email) {
      resultado.falhas.push({ sale_id: cobranca.saleId, motivo: "cliente sem e-mail no cadastro" });
      continue;
    }

    if (jaEnviouAlgum) await espera(INTERVALO_ENTRE_ENVIOS_MS);
    jaEnviouAlgum = true;

    const ctx = {
      clienteNome: cobranca.clienteNome,
      vendaId: cobranca.saleId,
      valor: cobranca.valor,
      dataPrevista: cobranca.dataPrevista,
      diasAtraso: cobranca.diasAtraso,
      qtdItens: cobranca.qtdItens,
      nomeLoja: loja.nomeLoja,
    };

    try {
      await sendCollectionEmail({
        to: cobranca.email,
        customerName: cobranca.clienteNome,
        saleId: cobranca.saleId,
        storeName: loja.nomeLoja,
        amount: cobranca.valor,
        dueDate: cobranca.dataPrevista,
        daysLate: cobranca.diasAtraso,
        itemCount: cobranca.qtdItens,
        subject: aplicarVariaveis(settings.email_subject, ctx),
        intro: aplicarVariaveis(settings.email_intro, ctx),
        whatsappNumber: loja.whatsappLoja,
      });

      await registrar(cobranca, opcoes.origin, "sent", { sentBy: opcoes.sentBy });
      resultado.enviados += 1;
    } catch (e) {
      const motivo = e instanceof Error ? e.message : "falha desconhecida no envio";
      await registrar(cobranca, opcoes.origin, "failed", { error: motivo, sentBy: opcoes.sentBy });
      resultado.falhas.push({ sale_id: cobranca.saleId, motivo });
    }
  }

  return resultado;
}

// app/api/cobrancas/cron/route.ts
// Disparo automático do lembrete de acerto — é esta rota que o agendador chama
// uma vez por dia, de manhã. Não tem tela: quem manda são as regras salvas em
// collection_settings.
//
// COMO LIGAR: defina CRON_SECRET no ambiente e configure o agendador para
// chamar GET /api/cobrancas/cron com o header:
//     Authorization: Bearer <CRON_SECRET>
// Na Vercel, o vercel.json na raiz já agenda a chamada e o header é mandado
// automaticamente a partir da variável CRON_SECRET.
import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import {
  buscarCobrancas,
  carregarSettings,
  enviarCobrancas,
  ultimosEmailsPorVenda,
} from "@/src/lib/cobranca-server";

// A função serverless tem tempo contado e os envios são espaçados para não
// bater no limite do Resend (~2/s). Com isso cabem uns 50 lembretes por
// execução — o que sobrar sai na manhã seguinte, e não some da fila.
export const maxDuration = 60;
const MAX_POR_EXECUCAO = 50;

function segredoConfere(req: NextRequest): boolean {
  const esperado = process.env.CRON_SECRET;

  // Sem segredo configurado, qualquer um na internet dispararia a cobrança:
  // em produção isso é recusa; em dev, libera para dar para testar local.
  if (!esperado) return process.env.NODE_ENV !== "production";

  const recebido = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const a = Buffer.from(recebido);
  const b = Buffer.from(esperado);
  return a.length === b.length && timingSafeEqual(a, b);
}

function diasDesde(iso: string): number {
  return Math.floor((Date.now() - Date.parse(iso)) / 86400000);
}

async function disparar(req: NextRequest) {
  if (!segredoConfere(req)) {
    if (!process.env.CRON_SECRET) {
      console.error("CRON_SECRET não configurado — disparo automático de cobrança recusado.");
    }
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const settings = await carregarSettings();
  if (!settings.auto_email_enabled) {
    return NextResponse.json({ ok: true, enviados: 0, motivo: "envio automático desligado nas configurações" });
  }

  const todas = await buscarCobrancas();

  // Quem entra na régua hoje: as atrasadas sempre; as que vencem hoje só se a
  // loja pediu para avisar antes de virar atraso.
  const naRegua = todas.filter((c) => c.situacao === "atrasada" || settings.send_on_due_date);
  const candidatas = naRegua.filter((c) => c.email !== null);

  // Não insistir com quem já recebeu há pouco: é a diferença entre lembrar e importunar.
  const ultimos = await ultimosEmailsPorVenda(candidatas.map((c) => c.saleId));
  const elegiveis = candidatas.filter((c) => {
    const ultimo = ultimos.get(c.saleId);
    return !ultimo || diasDesde(ultimo) >= settings.min_days_between_emails;
  });

  const resultado = await enviarCobrancas(elegiveis.slice(0, MAX_POR_EXECUCAO), { origin: "auto" });

  return NextResponse.json({
    ok: true,
    ...resultado,
    avaliadas: todas.length,
    na_regua: naRegua.length,
    elegiveis: elegiveis.length,
    adiadas_por_intervalo: candidatas.length - elegiveis.length,
    sem_email: naRegua.length - candidatas.length,
  });
}

export async function GET(req: NextRequest) {
  return disparar(req);
}

// Alguns agendadores (e testes manuais) preferem POST — mesma regra, mesmo segredo.
export async function POST(req: NextRequest) {
  return disparar(req);
}

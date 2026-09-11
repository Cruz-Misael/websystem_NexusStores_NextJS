// app/api/cobrancas/email/route.ts
// Envio manual do lembrete de acerto: a tela manda os ids dos consignados e
// esta rota envia. Fica no servidor porque a chave do Resend não pode ir para
// o browser — e porque só o servidor decide se a venda ainda está em aberto.
import { NextRequest, NextResponse } from "next/server";
import { requireOperator } from "@/src/lib/supabase/server";
import { buscarCobrancas, enviarCobrancas } from "@/src/lib/cobranca-server";

// Cobrança é assunto de quem manda na loja — mesmo recorte do menu Financeiro.
const PAPEIS_PERMITIDOS = ["admin", "gerente"];

// Teto por chamada: evita que um clique acidental dispare a base inteira.
const MAX_POR_CHAMADA = 100;

export async function POST(req: NextRequest) {
  const auth = await requireOperator();
  if (!auth) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (!PAPEIS_PERMITIDOS.includes(auth.role)) {
    return NextResponse.json({ error: "Só administrador ou gerente pode enviar cobrança" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const ids: unknown = body?.sale_ids;

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "Informe ao menos um consignado em sale_ids" }, { status: 400 });
  }
  if (ids.length > MAX_POR_CHAMADA) {
    return NextResponse.json(
      { error: `Máximo de ${MAX_POR_CHAMADA} cobranças por vez (foram ${ids.length})` },
      { status: 400 }
    );
  }

  const pedidos = new Set(ids.map(Number).filter((n) => Number.isInteger(n)));
  if (pedidos.size === 0) {
    return NextResponse.json({ error: "sale_ids inválido" }, { status: 400 });
  }

  // Relê a situação no banco: a tela pode estar aberta há um tempo e a venda já
  // ter sido acertada nesse meio-tempo. Ninguém cobra quem já pagou.
  const abertas = await buscarCobrancas();
  const aCobrar = abertas.filter((c) => pedidos.has(c.saleId));

  const resultado = await enviarCobrancas(aCobrar, { origin: "manual", sentBy: auth.user.id });

  const encontradas = new Set(aCobrar.map((c) => c.saleId));
  for (const id of pedidos) {
    if (!encontradas.has(id)) {
      resultado.falhas.push({ sale_id: id, motivo: "consignado não está mais em aberto" });
    }
  }

  return NextResponse.json(resultado);
}

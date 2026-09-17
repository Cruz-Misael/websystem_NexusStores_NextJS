// app/api/email/teste/route.ts
// Manda um e-mail de teste com o remetente configurado. Serve para descobrir na
// hora se os lembretes vão chegar — em vez de só notar que ninguém recebeu.
import { NextRequest, NextResponse } from "next/server";
import { requireOperator } from "@/src/lib/supabase/server";
import { sendTestEmail } from "@/src/services/email.service";

/** Traduz as recusas mais comuns do Resend para algo acionável. */
function explicar(mensagem: string): string {
  const m = mensagem.toLowerCase();

  if (m.includes("own email address") || m.includes("testing emails")) {
    return "Enquanto o remetente for @resend.dev, o Resend só entrega para o e-mail dono da conta. " +
      "Verifique um domínio em resend.com/domains e use um endereço dele como remetente.";
  }
  if (m.includes("domain is not verified") || m.includes("verify a domain")) {
    return "O domínio deste remetente não está verificado no Resend. Conclua a verificação em resend.com/domains (exige registros de DNS).";
  }
  if (m.includes("invalid") && m.includes("from")) {
    return "O endereço remetente está em formato inválido. Use algo como contato@seudominio.com.br.";
  }
  return mensagem;
}

export async function POST(req: NextRequest) {
  const auth = await requireOperator();
  if (!auth) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (auth.role !== "admin") {
    return NextResponse.json({ error: "Só administrador pode testar o envio" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const destino = String(body?.to || auth.user.email || "").trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(destino)) {
    return NextResponse.json({ error: "Informe um e-mail válido para receber o teste" }, { status: 400 });
  }

  try {
    const r = await sendTestEmail(destino);
    return NextResponse.json({ ok: true, to: destino, ...r });
  } catch (e) {
    const bruto = e instanceof Error ? e.message : "falha desconhecida";
    return NextResponse.json({ ok: false, error: explicar(bruto), detalhe: bruto }, { status: 502 });
  }
}

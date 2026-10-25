import { Resend } from 'resend';
import { supabaseAdmin } from '@/src/lib/supabase/admin';
import { DEMO_ATIVO, MSG_DESLIGADO_NA_DEMO } from '@/src/lib/demo';

// Último recurso: o que estiver no ambiente. O endereço padrão do Resend
// (onboarding@resend.dev) só entrega para o dono da conta — serve para testar,
// não para falar com cliente.
const FROM_AMBIENTE = process.env.FROM_EMAIL || 'Pedidos <onboarding@resend.dev>';

function getResend() {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
}

export interface Remetente {
  from: string;              // "Nome <endereco@dominio>" pronto para o Resend
  replyTo?: string;
  /** true quando ainda está no endereço de teste do Resend. */
  usandoEnderecoDeTeste: boolean;
}

/**
 * Remetente configurado pela loja (Configurações › E-mail), com o ambiente
 * como reserva. Lido a cada envio: é uma consulta barata e evita ter que
 * reiniciar a aplicação para trocar o endereço.
 */
export async function carregarRemetente(): Promise<Remetente> {
  const { data } = await supabaseAdmin
    .from('email_settings')
    .select('from_name, from_address, reply_to')
    .eq('id', 1)
    .maybeSingle();

  const endereco = data?.from_address?.trim();
  const nome = data?.from_name?.trim();
  const replyTo = data?.reply_to?.trim();

  const from = endereco
    ? (nome ? `${nome} <${endereco}>` : endereco)
    : FROM_AMBIENTE;

  return {
    from,
    replyTo: replyTo || undefined,
    usandoEnderecoDeTeste: from.includes('resend.dev'),
  };
}

const STATUS_LABELS: Record<string, string> = {
  preparing: 'Em Preparo',
  shipped: 'Enviado',
  delivered: 'Entregue',
};

const STATUS_EMOJIS: Record<string, string> = {
  preparing: '📦',
  shipped: '🚚',
  delivered: '✅',
};

const STATUS_MESSAGES: Record<string, string> = {
  preparing: 'Ótimas notícias! Seu pedido já está sendo preparado com muito cuidado.',
  shipped: 'Seu pedido está a caminho! Acompanhe a entrega com o código de rastreio abaixo.',
  delivered: 'Seu pedido foi entregue! Esperamos que você aproveite muito sua compra. 💜',
};

export interface OrderStatusEmailParams {
  to: string;
  customerName: string;
  orderId: string;
  storeName: string;
  newStatus: string;
  trackingCode?: string | null;
  items?: Array<{ name: string; quantity: number; unit_price: number }>;
}

function buildHtml(params: OrderStatusEmailParams): string {
  const { customerName, orderId, storeName, newStatus, trackingCode, items } = params;
  const emoji = STATUS_EMOJIS[newStatus] || '📦';
  const label = STATUS_LABELS[newStatus] || newStatus;
  const message = STATUS_MESSAGES[newStatus] || 'Seu pedido foi atualizado.';

  const trackingHtml = trackingCode ? `
    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:16px;margin:20px 0;">
      <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#3b82f6;text-transform:uppercase;letter-spacing:0.1em;">Código de Rastreio</p>
      <p style="margin:0;font-family:monospace;font-size:18px;font-weight:800;color:#1e40af;letter-spacing:0.05em;">${trackingCode}</p>
    </div>` : '';

  const itemsHtml = items?.length ? `
    <div style="margin:20px 0;">
      <p style="font-size:11px;font-weight:700;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 10px;">Itens do Pedido</p>
      ${items.map(item => `
        <div style="display:flex;justify-content:space-between;font-size:13px;color:#3f3f46;padding:6px 0;border-bottom:1px solid #f4f4f5;">
          <span>${item.name} <span style="color:#a1a1aa;">×${item.quantity}</span></span>
          <span style="font-weight:700;">${(item.unit_price * item.quantity).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
        </div>`).join('')}
    </div>` : '';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e4e4e7;box-shadow:0 4px 24px rgba(0,0,0,0.06);">

    <div style="background:#18181b;padding:28px 32px;">
      <p style="margin:0 0 4px;color:#71717a;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.15em;">${storeName}</p>
      <h1 style="margin:0;color:#fff;font-size:24px;font-weight:800;">${emoji} Pedido ${label}</h1>
    </div>

    <div style="padding:32px;">
      <p style="color:#52525b;font-size:14px;margin:0 0 6px;">Olá, <strong style="color:#18181b;">${customerName}</strong>!</p>
      <p style="color:#71717a;font-size:14px;margin:0 0 24px;line-height:1.6;">${message}</p>

      <div style="background:#fafafa;border:1px solid #e4e4e7;border-radius:10px;padding:14px 18px;margin-bottom:8px;">
        <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.1em;">Número do Pedido</p>
        <p style="margin:0;font-family:monospace;font-size:15px;font-weight:700;color:#18181b;">#${orderId.slice(0, 8).toUpperCase()}</p>
      </div>

      ${trackingHtml}
      ${itemsHtml}

      <p style="color:#a1a1aa;font-size:12px;margin:28px 0 0;padding-top:20px;border-top:1px solid #f4f4f5;text-align:center;line-height:1.6;">
        Obrigado por comprar na <strong style="color:#71717a;">${storeName}</strong>!<br>
        Dúvidas? Responda este e-mail.
      </p>
    </div>
  </div>
</body>
</html>`;
}

export async function sendOrderStatusEmail(params: OrderStatusEmailParams): Promise<void> {
  // Na demonstração os endereços são fictícios e a chave do Resend é a do dono.
  if (DEMO_ATIVO) return;
  const resend = getResend();
  if (!resend) {
    console.error('RESEND_API_KEY não configurada — e-mail de pedido não enviado.');
    return;
  }

  const emoji = STATUS_EMOJIS[params.newStatus] || '📦';
  const label = STATUS_LABELS[params.newStatus] || params.newStatus;
  const remetente = await carregarRemetente();

  const { error } = await resend.emails.send({
    from: remetente.from,
    replyTo: remetente.replyTo,
    to: params.to,
    subject: `${emoji} Pedido #${params.orderId.slice(0, 8).toUpperCase()} — ${label} | ${params.storeName}`,
    html: buildHtml(params),
  });

  // Quem chama trata este envio como melhor esforço e engole a exceção. Sem o
  // log, uma recusa do Resend (domínio não verificado, por exemplo) sumia sem
  // deixar rastro — foi o que aconteceu enquanto o remetente era o de teste.
  if (error) {
    console.error(`E-mail de pedido ${params.orderId} recusado pelo Resend:`, error.message);
    throw new Error(error.message);
  }
}

/* =========================================================
   COBRANÇA DE CONSIGNADO
   Lembrete de acerto. O texto é deliberadamente sóbrio: cobrança não pode
   constranger nem expor a cliente (CDC, art. 42), e quem recebe pode já ter
   acertado — por isso o "se já acertou, ignore" fica logo no começo.
========================================================= */

export interface CollectionEmailParams {
  to: string;
  customerName: string;
  saleId: number;
  storeName: string;
  amount: number;
  dueDate: string | null;   // YYYY-MM-DD
  daysLate: number;         // 0 = vence hoje
  itemCount: number;
  subject: string;          // já com as variáveis do template aplicadas
  intro: string;            // idem
  whatsappNumber?: string | null; // DDI+DDD+número, para o botão de resposta
}

function buildCollectionHtml(params: CollectionEmailParams): string {
  const { customerName, saleId, storeName, amount, dueDate, daysLate, itemCount, intro, whatsappNumber } = params;

  const valorFmt = amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const dataFmt = dueDate ? dueDate.split('-').reverse().join('/') : '—';
  const chamada = daysLate > 0
    ? `Acerto previsto para ${dataFmt} (${daysLate} ${daysLate === 1 ? 'dia' : 'dias'} atrás)`
    : `Acerto combinado para hoje, ${dataFmt}`;

  const linha = (rotulo: string, valor: string, destaque = false) => `
        <div style="display:flex;justify-content:space-between;font-size:13px;color:#3f3f46;padding:8px 0;border-bottom:1px solid #f4f4f5;">
          <span style="color:#71717a;">${rotulo}</span>
          <span style="font-weight:${destaque ? 800 : 600};color:${destaque ? '#18181b' : '#3f3f46'};">${valor}</span>
        </div>`;

  const whatsappHtml = whatsappNumber ? `
      <div style="text-align:center;margin:24px 0 4px;">
        <a href="https://wa.me/${whatsappNumber}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;font-size:13px;font-weight:700;padding:12px 24px;border-radius:10px;">
          Falar com a loja no WhatsApp
        </a>
      </div>` : '';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e4e4e7;box-shadow:0 4px 24px rgba(0,0,0,0.06);">

    <div style="background:#18181b;padding:28px 32px;">
      <p style="margin:0 0 4px;color:#71717a;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.15em;">${storeName}</p>
      <h1 style="margin:0;color:#fff;font-size:22px;font-weight:800;">Lembrete de acerto</h1>
    </div>

    <div style="padding:32px;">
      <p style="color:#52525b;font-size:14px;margin:0 0 6px;">Olá, <strong style="color:#18181b;">${customerName}</strong>!</p>
      <p style="color:#71717a;font-size:14px;margin:0 0 24px;line-height:1.6;">${intro}</p>

      <div style="background:#fafafa;border:1px solid #e4e4e7;border-radius:10px;padding:18px;">
        <p style="margin:0 0 12px;font-size:11px;font-weight:700;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.1em;">Consignado #${saleId}</p>
        ${linha('Situação', chamada)}
        ${linha('Peças do kit', String(itemCount))}
        ${linha('Valor em aberto', valorFmt, true)}
      </div>

      ${whatsappHtml}

      <p style="color:#a1a1aa;font-size:12px;margin:28px 0 0;padding-top:20px;border-top:1px solid #f4f4f5;text-align:center;line-height:1.6;">
        Este é um lembrete automático da <strong style="color:#71717a;">${storeName}</strong>.<br>
        Se já acertou, desconsidere — ou responda este e-mail que a gente confere.
      </p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Envia o lembrete de acerto. Diferente do e-mail de pedido, aqui a falta da
 * chave do Resend é erro e não silêncio: quem clicou em "cobrar" precisa saber
 * que nada saiu.
 */
export async function sendCollectionEmail(params: CollectionEmailParams): Promise<void> {
  if (DEMO_ATIVO) throw new Error(MSG_DESLIGADO_NA_DEMO.email);
  const resend = getResend();
  if (!resend) throw new Error('RESEND_API_KEY não configurada — nenhum e-mail foi enviado.');

  const remetente = await carregarRemetente();

  const { error } = await resend.emails.send({
    from: remetente.from,
    replyTo: remetente.replyTo,
    to: params.to,
    subject: params.subject,
    html: buildCollectionHtml(params),
  });

  if (error) throw new Error(error.message || 'O Resend recusou o envio.');
}

/**
 * E-mail de teste, usado na tela de configuração para descobrir se o remetente
 * funciona ANTES de a cobrança sair. É aqui que a recusa por domínio não
 * verificado aparece de forma legível, em vez de virar silêncio.
 */
export async function sendTestEmail(to: string): Promise<{ from: string; usandoEnderecoDeTeste: boolean }> {
  if (DEMO_ATIVO) throw new Error(MSG_DESLIGADO_NA_DEMO.email);
  const resend = getResend();
  if (!resend) throw new Error('RESEND_API_KEY não configurada no servidor.');

  const remetente = await carregarRemetente();

  const { error } = await resend.emails.send({
    from: remetente.from,
    replyTo: remetente.replyTo,
    to,
    subject: 'Teste de envio — configuração de e-mail',
    html: `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:520px;margin:32px auto;background:#fff;border-radius:16px;border:1px solid #e4e4e7;padding:32px;">
    <h1 style="margin:0 0 12px;color:#18181b;font-size:20px;font-weight:800;">Deu certo!</h1>
    <p style="color:#52525b;font-size:14px;line-height:1.6;margin:0 0 16px;">
      Se este e-mail chegou, o remetente está configurado e os lembretes de cobrança
      vão sair por aqui.
    </p>
    <p style="color:#a1a1aa;font-size:12px;margin:0;">Enviado por <strong>${remetente.from}</strong></p>
  </div>
</body>
</html>`,
  });

  if (error) throw new Error(error.message || 'O Resend recusou o envio.');
  return { from: remetente.from, usandoEnderecoDeTeste: remetente.usandoEnderecoDeTeste };
}

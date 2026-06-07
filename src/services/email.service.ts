import { Resend } from 'resend';

const FROM = process.env.FROM_EMAIL || 'Pedidos <onboarding@resend.dev>';

function getResend() {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
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
  const resend = getResend();
  if (!resend) return;

  const emoji = STATUS_EMOJIS[params.newStatus] || '📦';
  const label = STATUS_LABELS[params.newStatus] || params.newStatus;

  await resend.emails.send({
    from: FROM,
    to: params.to,
    subject: `${emoji} Pedido #${params.orderId.slice(0, 8).toUpperCase()} — ${label} | ${params.storeName}`,
    html: buildHtml(params),
  });
}

'use client';
import { useEffect, useState } from 'react';
import { CheckCircle2, ShoppingBag, MessageCircle, Package } from 'lucide-react';
import { CartProvider, useCart } from '@/components/loja/CartContext';

interface OrderItem {
  sku: number;
  name: string;
  unit_price: number;
  quantity: number;
}

interface Order {
  id: string;
  customer_name: string;
  customer_email: string | null;
  items: OrderItem[];
  total_amount: number;
  payment_status: string;
  created_at: string;
}

interface StoreConfig {
  store_name: string;
  primary_color: string;
  whatsapp_number: string | null;
  show_prices: boolean;
}

function SucessoContent({ slug, orderId }: { slug: string; orderId: string | null }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [config, setConfig] = useState<StoreConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const { clearCart } = useCart();

  useEffect(() => {
    clearCart();

    if (orderId) {
      // Finaliza pedido (fallback para quando o webhook não chegou a tempo)
      fetch('/api/loja/finalizar-pedido', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId, mp_status: 'approved' }),
      }).catch(() => {});

      // Busca detalhes do pedido
      fetch(`/api/loja/pedido/${orderId}?slug=${slug}`)
        .then(r => r.json())
        .then(data => {
          if (data.order) setOrder(data.order);
          if (data.config) setConfig(data.config);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    } else {
      // Sem order ID, busca apenas config
      fetch(`/api/loja/${slug}`)
        .then(r => r.json())
        .then(data => { if (data.config) setConfig(data.config); })
        .finally(() => setLoading(false));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, orderId]);

  const color = config?.primary_color || '#6366f1';
  const orderNum = order?.id?.slice(0, 8).toUpperCase() ?? '—';
  const orderDate = order?.created_at
    ? new Date(order.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : null;

  const whatsappLink = config?.whatsapp_number
    ? `https://wa.me/55${config.whatsapp_number.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá! Realizei um pedido na ${config.store_name} (Pedido #${orderNum}) e gostaria de mais informações.`)}`
    : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-zinc-200 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 font-sans">
      <main className="max-w-lg mx-auto px-4 py-10 space-y-5">

        {/* Confirmação */}
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-8 text-center space-y-3">
          <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mx-auto">
            <CheckCircle2 size={44} className="text-emerald-500" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-zinc-900 mt-2">Pedido confirmado!</h1>
            <p className="text-zinc-500 text-sm mt-1">
              {order?.customer_name ? `Obrigada, ${order.customer_name.split(' ')[0]}!` : 'Obrigada pela compra!'} Seu pedido foi recebido com sucesso.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold px-4 py-2 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Pagamento aprovado
          </div>

          <div className="pt-2 flex items-center justify-center gap-6 text-xs text-zinc-400">
            <div className="text-center">
              <p className="font-black text-zinc-800 text-base">#{orderNum}</p>
              <p className="font-medium">Nº do pedido</p>
            </div>
            {orderDate && (
              <>
                <div className="w-px h-8 bg-zinc-100" />
                <div className="text-center">
                  <p className="font-black text-zinc-800 text-sm">{orderDate}</p>
                  <p className="font-medium">Data e hora</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Itens do pedido */}
        {order && (
          <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-50 flex items-center gap-2">
              <Package size={15} className="text-zinc-400" />
              <p className="text-xs font-black text-zinc-500 uppercase tracking-widest">Itens do pedido</p>
            </div>
            <div className="divide-y divide-zinc-50">
              {order.items.map((item, i) => (
                <div key={i} className="px-5 py-3.5 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-zinc-800">{item.name}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">Quantidade: {item.quantity}</p>
                  </div>
                  {config?.show_prices && (
                    <span className="text-sm font-black text-zinc-900">
                      {(item.unit_price * item.quantity).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  )}
                </div>
              ))}
            </div>
            {config?.show_prices && (
              <div className="px-5 py-4 bg-zinc-50 border-t border-zinc-100 flex justify-between items-center">
                <span className="text-sm font-black text-zinc-700">Total pago</span>
                <span className="text-lg font-black text-zinc-900">
                  {order.total_amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Próximos passos */}
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5 space-y-3">
          <p className="text-xs font-black text-zinc-500 uppercase tracking-widest">O que acontece agora?</p>
          <ul className="space-y-2.5 text-sm text-zinc-600">
            <li className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white shrink-0 mt-0.5" style={{ backgroundColor: color }}>1</span>
              Recebemos seu pedido e o pagamento foi confirmado pelo Mercado Pago.
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white shrink-0 mt-0.5" style={{ backgroundColor: color }}>2</span>
              Nossa equipe irá preparar o seu pedido em breve.
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white shrink-0 mt-0.5" style={{ backgroundColor: color }}>3</span>
              Entraremos em contato para combinar a entrega ou retirada.
            </li>
          </ul>
        </div>

        {/* Ações */}
        <div className="flex flex-col gap-3">
          {whatsappLink && (
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3.5 rounded-xl font-bold text-sm text-center flex items-center justify-center gap-2 bg-[#25D366] text-white hover:opacity-90 transition-opacity active:scale-[0.98]"
            >
              <MessageCircle size={18} />
              Falar com a loja pelo WhatsApp
            </a>
          )}
          <a
            href={`/loja/${slug}`}
            style={{ color }}
            className="w-full py-3 rounded-xl font-bold text-sm text-center flex items-center justify-center gap-2 border border-zinc-200 bg-white hover:bg-zinc-50 transition-colors text-zinc-700"
          >
            <ShoppingBag size={16} />
            Continuar comprando
          </a>
        </div>

      </main>
    </div>
  );
}

export default function SucessoPage({ params }: { params: Promise<{ slug: string }> }) {
  const [slug, setSlug] = useState('');
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    params.then(p => setSlug(p.slug));
    const url = new URL(window.location.href);
    setOrderId(url.searchParams.get('order'));
  }, [params]);

  if (!slug) return null;

  return (
    <CartProvider slug={slug}>
      <SucessoContent slug={slug} orderId={orderId} />
    </CartProvider>
  );
}

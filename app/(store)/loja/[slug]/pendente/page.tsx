'use client';
import { useEffect, useState } from 'react';
import { Clock, ShoppingBag, MessageCircle, Package, RefreshCw } from 'lucide-react';

interface OrderItem {
  sku: number;
  name: string;
  unit_price: number;
  quantity: number;
}

interface Order {
  id: string;
  customer_name: string;
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

export default function PendentePage({ params }: { params: Promise<{ slug: string }> }) {
  const [slug, setSlug] = useState('');
  const [order, setOrder] = useState<Order | null>(null);
  const [config, setConfig] = useState<StoreConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    params.then(p => {
      const currentSlug = p.slug;
      setSlug(currentSlug);

      const url = new URL(window.location.href);
      const orderId = url.searchParams.get('order');

      if (orderId) {
        fetch(`/api/loja/pedido/${orderId}?slug=${currentSlug}`)
          .then(r => r.json())
          .then(data => {
            if (data.order) setOrder(data.order);
            if (data.config) setConfig(data.config);
            // Se já foi pago (webhook chegou a tempo), redireciona para sucesso
            if (data.order?.payment_status === 'paid') {
              window.location.href = `/loja/${currentSlug}/sucesso?order=${orderId}`;
            }
          })
          .finally(() => setLoading(false));
      } else {
        fetch(`/api/loja/${currentSlug}`)
          .then(r => r.json())
          .then(data => { if (data.config) setConfig(data.config); })
          .finally(() => setLoading(false));
      }
    });
  }, [params]);

  const handleCheckStatus = async () => {
    const orderId = order?.id;
    if (!orderId || !slug) return;
    setChecking(true);
    try {
      const res = await fetch(`/api/loja/pedido/${orderId}?slug=${slug}`);
      const data = await res.json();
      if (data.order?.payment_status === 'paid') {
        window.location.href = `/loja/${slug}/sucesso?order=${orderId}`;
      }
    } finally {
      setChecking(false);
    }
  };

  const color = config?.primary_color || '#6366f1';
  const orderNum = order?.id?.slice(0, 8).toUpperCase() ?? '—';

  const whatsappLink = config?.whatsapp_number
    ? `https://wa.me/55${config.whatsapp_number.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá! Realizei um pedido via PIX na ${config.store_name} (Pedido #${orderNum}) e gostaria de confirmar o recebimento.`)}`
    : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-zinc-200 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 font-sans">
      <main className="max-w-lg mx-auto px-4 py-10 space-y-5">

        {/* Status */}
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-8 text-center space-y-3">
          <div className="w-20 h-20 rounded-full bg-amber-50 flex items-center justify-center mx-auto">
            <Clock size={44} className="text-amber-500" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-zinc-900 mt-2">Aguardando pagamento</h1>
            <p className="text-zinc-500 text-sm mt-1">
              {order?.customer_name ? `${order.customer_name.split(' ')[0]}, seu` : 'Seu'} pedido foi criado e está aguardando a confirmação do PIX.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-100 text-amber-700 text-xs font-bold px-4 py-2 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            Pagamento em processamento
          </div>

          {order && (
            <p className="text-xs text-zinc-400 font-medium">Pedido #{orderNum}</p>
          )}
        </div>

        {/* Como pagar via PIX */}
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 space-y-3">
          <p className="text-xs font-black text-amber-800 uppercase tracking-widest">Como confirmar seu PIX</p>
          <ol className="space-y-2 text-sm text-amber-700">
            <li className="flex items-start gap-2">
              <span className="font-black shrink-0">1.</span>
              Abra o aplicativo do seu banco e acesse a área Pix.
            </li>
            <li className="flex items-start gap-2">
              <span className="font-black shrink-0">2.</span>
              Escaneie o QR Code ou cole o código Pix Copia e Cola exibido no Mercado Pago.
            </li>
            <li className="flex items-start gap-2">
              <span className="font-black shrink-0">3.</span>
              Confirme o pagamento. A aprovação é instantânea na maioria dos bancos.
            </li>
          </ol>
        </div>

        {/* Itens */}
        {order && (
          <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-50 flex items-center gap-2">
              <Package size={15} className="text-zinc-400" />
              <p className="text-xs font-black text-zinc-500 uppercase tracking-widest">Resumo do pedido</p>
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
                <span className="text-sm font-black text-zinc-700">Total</span>
                <span className="text-lg font-black text-zinc-900">
                  {order.total_amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Ações */}
        <div className="flex flex-col gap-3">
          <button
            onClick={handleCheckStatus}
            disabled={checking}
            className="w-full py-3.5 rounded-xl font-bold text-sm text-center flex items-center justify-center gap-2 text-white hover:opacity-90 transition-opacity active:scale-[0.98] disabled:opacity-60"
            style={{ backgroundColor: color }}
          >
            <RefreshCw size={16} className={checking ? 'animate-spin' : ''} />
            {checking ? 'Verificando...' : 'Verificar pagamento'}
          </button>

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
            className="w-full py-3 rounded-xl font-bold text-sm text-center flex items-center justify-center gap-2 border border-zinc-200 bg-white hover:bg-zinc-50 transition-colors text-zinc-700"
          >
            <ShoppingBag size={16} />
            Voltar à loja
          </a>
        </div>

      </main>
    </div>
  );
}

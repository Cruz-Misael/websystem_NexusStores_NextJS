'use client';
import { useEffect, useState } from 'react';
import { CheckCircle2, ShoppingBag } from 'lucide-react';
import { CartProvider, useCart } from '@/components/loja/CartContext';

function SucessoContent({ slug, orderId }: { slug: string; orderId: string | null }) {
  const [color, setColor] = useState('#6366f1');
  const [storeName, setStoreName] = useState('');
  const { clearCart } = useCart();

  useEffect(() => {
    fetch(`/api/loja/${slug}`)
      .then(r => r.json())
      .then(data => {
        if (data.config) {
          setColor(data.config.primary_color);
          setStoreName(data.config.store_name);
        }
      });

    // Finaliza o pedido criando a venda no sistema (fallback para quando o webhook não chega a tempo)
    if (orderId) {
      fetch('/api/loja/finalizar-pedido', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId, mp_status: 'approved' }),
      }).catch(() => { /* silencia — o webhook é o mecanismo principal */ });
    }

    clearCart();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, orderId]);

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-6 text-center gap-6">
      <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center">
        <CheckCircle2 size={40} className="text-emerald-600" />
      </div>
      <div>
        <h1 className="text-2xl font-black text-zinc-900">Pedido realizado!</h1>
        <p className="text-zinc-500 mt-2 text-sm">Obrigado pela compra em {storeName}. Em breve entraremos em contato.</p>
      </div>
      <a href={`/loja/${slug}`} style={{ backgroundColor: color }} className="px-8 py-3 rounded-xl text-white font-bold text-sm hover:opacity-90 transition-opacity flex items-center gap-2">
        <ShoppingBag size={16} />
        Continuar comprando
      </a>
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

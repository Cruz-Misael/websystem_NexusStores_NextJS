'use client';
import { useEffect, useState } from 'react';
import { ArrowLeft, Loader2, ShoppingBag, LogOut, User } from 'lucide-react';
import { CartProvider, useCart } from '@/components/loja/CartContext';
import { supabase } from '@/src/lib/supabase/client';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface StoreConfig {
  slug: string;
  store_name: string;
  primary_color: string;
  show_prices: boolean;
}

function CheckoutContent({ slug }: { slug: string }) {
  const [config, setConfig] = useState<StoreConfig | null>(null);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { items, total } = useCart();

  useEffect(() => {
    fetch(`/api/loja/${slug}`)
      .then(r => r.json())
      .then(data => { if (data.config) setConfig(data.config); });
  }, [slug]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        window.location.href = `/loja/${slug}/login?next=/loja/${slug}/checkout`;
        return;
      }
      setUser(session.user);
      // Pré-preenche nome a partir do perfil do Google
      const meta = session.user.user_metadata;
      const googleName = meta?.full_name || meta?.name || '';
      if (googleName) setName(googleName);
      setAuthChecked(true);
    });
  }, [slug]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = `/loja/${slug}/login?next=/loja/${slug}/checkout`;
  };

  const handlePay = async () => {
    if (!name.trim()) { setError('Informe seu nome'); return; }
    if (items.length === 0) { setError('Carrinho vazio'); return; }
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/mercadopago/preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          items: items.map(i => ({ sku: i.sku, name: i.name, unit_price: i.unit_price, quantity: i.quantity })),
          customer: { name, email: user?.email, phone },
        }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); setLoading(false); return; }
      window.location.href = data.init_point || data.sandbox_init_point;
    } catch {
      setError('Erro ao conectar com o gateway de pagamento');
      setLoading(false);
    }
  };

  const color = config?.primary_color || '#6366f1';

  // Aguarda verificação de auth
  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <Loader2 size={28} className="animate-spin text-zinc-300" />
      </div>
    );
  }

  if (items.length === 0 && config) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-zinc-50">
        <ShoppingBag size={48} className="text-zinc-300" />
        <p className="text-zinc-500">Seu carrinho está vazio</p>
        <a href={`/loja/${slug}`} className="text-sm font-bold hover:underline" style={{ color }}>← Voltar à loja</a>
      </div>
    );
  }

  const avatarUrl = user?.user_metadata?.avatar_url;
  const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || '';

  return (
    <div className="min-h-screen bg-zinc-50 font-sans">
      <header className="sticky top-0 z-30 bg-white border-b border-zinc-100 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <a href={`/loja/${slug}/carrinho`} className="flex items-center gap-2 text-zinc-600 hover:text-zinc-900 text-sm font-medium">
            <ArrowLeft size={16} />
            Voltar ao carrinho
          </a>
          <span className="text-sm font-black text-zinc-700">{config?.store_name}</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-4">
        <h1 className="text-lg font-black text-zinc-900">Finalizar Pedido</h1>

        {/* Card do usuário logado */}
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-4 flex items-center gap-3">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt={displayName} className="w-9 h-9 rounded-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-zinc-100 flex items-center justify-center">
              <User size={16} className="text-zinc-400" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-zinc-800 truncate">{displayName}</p>
            <p className="text-[11px] text-zinc-400 truncate">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-[11px] font-bold text-zinc-400 hover:text-red-500 transition-colors"
          >
            <LogOut size={13} />
            Sair
          </button>
        </div>

        {/* Resumo do pedido */}
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5 space-y-3">
          <p className="text-xs font-black uppercase tracking-widest text-zinc-400">Resumo</p>
          {items.map(item => (
            <div key={item.sku} className="flex justify-between items-center text-sm">
              <span className="text-zinc-700">{item.name} <span className="text-zinc-400">×{item.quantity}</span></span>
              {config?.show_prices && (
                <span className="font-bold text-zinc-900">
                  {(item.unit_price * item.quantity).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              )}
            </div>
          ))}
          {config?.show_prices && (
            <div className="border-t border-zinc-100 pt-3 flex justify-between items-center">
              <span className="text-sm font-black text-zinc-700">Total</span>
              <span className="text-lg font-black text-zinc-900">
                {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </div>
          )}
        </div>

        {/* Dados do cliente */}
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5 space-y-4">
          <p className="text-xs font-black uppercase tracking-widest text-zinc-400">Confirmar dados</p>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-600">Nome *</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:border-transparent"
              style={{ '--tw-ring-color': color } as React.CSSProperties}
              placeholder="Seu nome completo"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-600">E-mail</label>
            <input
              value={user?.email || ''}
              disabled
              className="w-full px-3 py-2.5 text-sm border border-zinc-100 rounded-xl bg-zinc-50 text-zinc-500 cursor-not-allowed"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-600">WhatsApp</label>
            <input
              value={phone}
              onChange={e => setPhone(e.target.value.replace(/\D/g, '').replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2').slice(0, 15))}
              className="w-full px-3 py-2.5 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:border-transparent"
              style={{ '--tw-ring-color': color } as React.CSSProperties}
              placeholder="(00) 00000-0000"
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        <button
          onClick={handlePay}
          disabled={loading}
          style={{ backgroundColor: color }}
          className="w-full py-4 rounded-xl text-white font-black text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-60"
        >
          {loading ? <><Loader2 size={18} className="animate-spin" /> Redirecionando...</> : 'Pagar com MercadoPago →'}
        </button>

        <p className="text-center text-xs text-zinc-400">
          Você será redirecionado para o ambiente seguro do MercadoPago
        </p>
      </main>
    </div>
  );
}

export default function CheckoutPage({ params }: { params: Promise<{ slug: string }> }) {
  const [slug, setSlug] = useState('');

  useEffect(() => {
    params.then(p => setSlug(p.slug));
  }, [params]);

  if (!slug) return null;

  return (
    <CartProvider slug={slug}>
      <CheckoutContent slug={slug} />
    </CartProvider>
  );
}

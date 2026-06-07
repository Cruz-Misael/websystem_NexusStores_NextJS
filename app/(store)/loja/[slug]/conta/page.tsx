'use client';
import { useEffect, useState, useCallback } from 'react';
import { ArrowLeft, User, Package, LogOut, Loader2, ShoppingBag, ShoppingCart, Truck, CheckCircle2, Clock, RefreshCw, Copy } from 'lucide-react';
import { supabase } from '@/src/lib/supabase/client';
import { CartProvider, useCart } from '@/components/loja/CartContext';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface Order {
  id: string;
  created_at: string;
  items: Array<{ sku: number; name: string; quantity: number; unit_price: number }>;
  total_amount: number;
  payment_status: 'pending' | 'paid' | 'cancelled';
  shipping_status: 'pending' | 'preparing' | 'shipped' | 'delivered' | null;
  tracking_code: string | null;
  customer_name: string;
}

interface StoreConfig {
  slug: string;
  store_name: string;
  primary_color: string;
  logo_url?: string;
  show_prices: boolean;
}

const SHIPPING_LABELS: Record<string, string> = {
  pending:   'Aguardando',
  preparing: 'Em Preparo',
  shipped:   'Enviado',
  delivered: 'Entregue',
};

const SHIPPING_ICONS: Record<string, React.ElementType> = {
  pending:   Clock,
  preparing: Package,
  shipped:   Truck,
  delivered: CheckCircle2,
};

const SHIPPING_COLORS: Record<string, { bg: string; text: string }> = {
  pending:   { bg: '#f4f4f5', text: '#71717a' },
  preparing: { bg: '#fffbeb', text: '#d97706' },
  shipped:   { bg: '#eff6ff', text: '#3b82f6' },
  delivered: { bg: '#f0fdf4', text: '#16a34a' },
};

function ContaContent({ slug }: { slug: string }) {
  const [config, setConfig] = useState<StoreConfig | null>(null);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { count } = useCart();

  const fetchOrders = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await fetch('/api/loja/conta/pedidos');
      const data = await res.json();
      if (data.orders) setOrders(data.orders);
    } finally {
      if (isManual) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetch(`/api/loja/${slug}`)
      .then(r => r.json())
      .then(data => { if (data.config) setConfig(data.config); });
  }, [slug]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(session.user);
        fetchOrders().finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });
  }, [fetchOrders]);

  // Atualiza pedidos quando o cliente volta para a aba
  useEffect(() => {
    const onFocus = () => { if (user) fetchOrders(); };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [user, fetchOrders]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = `/loja/${slug}`;
  };

  const copyTracking = (code: string, orderId: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedId(orderId);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const color = config?.primary_color || '#6366f1';
  const avatarUrl = user?.user_metadata?.avatar_url;
  const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || '';

  return (
    <div className="min-h-screen bg-zinc-50 font-sans">
      <header className="sticky top-0 z-30 bg-white border-b border-zinc-100 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <a href={`/loja/${slug}`} className="flex items-center gap-2 text-zinc-600 hover:text-zinc-900 text-sm font-medium">
            <ArrowLeft size={16} />
            {config?.store_name || 'Voltar'}
          </a>
          <a href={`/loja/${slug}/carrinho`} className="relative p-2 rounded-xl hover:bg-zinc-100 transition-colors">
            <ShoppingCart size={20} className="text-zinc-700" />
            {count > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-white text-[10px] font-black flex items-center justify-center" style={{ backgroundColor: color }}>
                {count}
              </span>
            )}
          </a>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <h1 className="text-lg font-black text-zinc-900">Minha Conta</h1>

        {!user && !loading && (
          <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-10 flex flex-col items-center gap-4">
            <User size={40} className="text-zinc-300" />
            <p className="text-zinc-500 text-sm">Você não está logado</p>
            <a
              href={`/loja/${slug}/login?next=/loja/${slug}/conta`}
              className="px-6 py-2.5 rounded-xl text-white font-bold text-sm hover:opacity-90 transition-opacity"
              style={{ backgroundColor: color }}
            >
              Entrar com Google
            </a>
          </div>
        )}

        {user && (
          <>
            {/* Perfil */}
            <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5 flex items-center gap-4">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt={displayName} className="w-12 h-12 rounded-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center">
                  <User size={20} className="text-zinc-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-zinc-900 truncate">{displayName}</p>
                <p className="text-xs text-zinc-400 truncate">{user.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 text-xs font-bold text-zinc-400 hover:text-red-500 transition-colors"
              >
                <LogOut size={14} />
                Sair
              </button>
            </div>

            {/* Pedidos */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                  <Package size={13} />
                  Meus Pedidos
                </p>
                <button
                  onClick={() => fetchOrders(true)}
                  disabled={refreshing}
                  className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-700 transition-colors disabled:opacity-50"
                >
                  <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
                  Atualizar
                </button>
              </div>

              {loading && (
                <div className="flex justify-center py-12">
                  <Loader2 size={24} className="animate-spin text-zinc-300" />
                </div>
              )}

              {!loading && orders.length === 0 && (
                <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-10 flex flex-col items-center gap-3">
                  <ShoppingBag size={36} className="text-zinc-300" />
                  <p className="text-zinc-500 text-sm">Nenhum pedido ainda</p>
                  <a href={`/loja/${slug}`} className="text-sm font-bold hover:underline" style={{ color }}>
                    Ir às compras →
                  </a>
                </div>
              )}

              {orders.map(order => {
                const shippingStatus = order.shipping_status ?? 'pending';
                const StatusIcon = SHIPPING_ICONS[shippingStatus] || Clock;
                const statusColors = SHIPPING_COLORS[shippingStatus] || SHIPPING_COLORS.pending;

                return (
                  <div key={order.id} className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5 space-y-4">

                    {/* Header do pedido */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-medium text-zinc-600">
                          {new Date(order.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                        </p>
                        <p className="text-[10px] text-zinc-300 font-mono mt-0.5">#{order.id.slice(0, 8).toUpperCase()}</p>
                      </div>
                      <span className={`shrink-0 text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
                        order.payment_status === 'paid'
                          ? 'bg-emerald-50 text-emerald-600'
                          : order.payment_status === 'cancelled'
                          ? 'bg-red-50 text-red-500'
                          : 'bg-amber-50 text-amber-600'
                      }`}>
                        {order.payment_status === 'paid' ? 'Pago' : order.payment_status === 'cancelled' ? 'Cancelado' : 'Pendente'}
                      </span>
                    </div>

                    {/* Status de envio */}
                    <div
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
                      style={{ backgroundColor: statusColors.bg }}
                    >
                      <StatusIcon size={15} style={{ color: statusColors.text }} />
                      <span className="text-xs font-bold" style={{ color: statusColors.text }}>
                        {SHIPPING_LABELS[shippingStatus]}
                      </span>
                    </div>

                    {/* Código de rastreio */}
                    {order.tracking_code && (
                      <div className="border border-blue-100 bg-blue-50 rounded-xl p-3">
                        <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-1">Código de Rastreio</p>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-sm font-bold text-blue-800">{order.tracking_code}</span>
                          <button
                            onClick={() => copyTracking(order.tracking_code!, order.id)}
                            className="flex items-center gap-1 text-[10px] font-bold text-blue-500 hover:text-blue-700 transition-colors"
                          >
                            <Copy size={11} />
                            {copiedId === order.id ? 'Copiado!' : 'Copiar'}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Itens */}
                    <div className="space-y-1.5 border-t border-zinc-50 pt-3">
                      {order.items.map((item, i) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span className="text-zinc-600">
                            {item.name} <span className="text-zinc-400">×{item.quantity}</span>
                          </span>
                          {config?.show_prices && (
                            <span className="font-medium text-zinc-800">
                              {(item.unit_price * item.quantity).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>

                    {config?.show_prices && (
                      <div className="flex justify-between items-center border-t border-zinc-50 pt-3">
                        <span className="text-xs font-black uppercase text-zinc-400">Total</span>
                        <span className="font-black text-zinc-900">
                          {order.total_amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>

      <footer className="text-center py-8 text-xs text-zinc-400 border-t border-zinc-100 mt-8">
        <p>© {new Date().getFullYear()} {config?.store_name} · Powered by NexusStores</p>
      </footer>
    </div>
  );
}

export default function ContaPage({ params }: { params: Promise<{ slug: string }> }) {
  const [slug, setSlug] = useState('');

  useEffect(() => {
    params.then(p => setSlug(p.slug));
  }, [params]);

  if (!slug) return null;

  return (
    <CartProvider slug={slug}>
      <ContaContent slug={slug} />
    </CartProvider>
  );
}

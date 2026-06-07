'use client';
import { useEffect, useState, useCallback } from 'react';
import { ArrowLeft, Loader2, ShoppingBag, LogOut, User, MapPin, Truck, Tag, X, CheckCircle, ChevronDown } from 'lucide-react';
import { CartProvider, useCart } from '@/components/loja/CartContext';
import { supabase } from '@/src/lib/supabase/client';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface StoreConfig {
  slug: string;
  store_name: string;
  primary_color: string;
  show_prices: boolean;
  // Discount config
  discount_global_percent?: number;
  discount_min_order_amount?: number | null;
  discount_min_order_percent?: number;
  free_shipping_min_amount?: number | null;
  // Shipping config
  melhor_envio_token?: string;
}

interface ShippingOption {
  id: number;
  name: string;
  company: string;
  price: number;
  original_price: number;
  delivery_time: number | null;
  free: boolean;
}

interface CouponResult {
  valid: boolean;
  id?: string;
  type?: 'percentage' | 'fixed';
  value?: number;
  discount_amount?: number;
  message: string;
}

interface ViaCepResult {
  logradouro: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

function CheckoutContent({ slug }: { slug: string }) {
  const [config, setConfig] = useState<StoreConfig | null>(null);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { items, total } = useCart();

  // Customer fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  // Address fields
  const [cep, setCep] = useState('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState('');

  // Shipping
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [selectedShipping, setSelectedShipping] = useState<ShippingOption | null>(null);
  const [shippingLoading, setShippingLoading] = useState(false);
  const [hasShippingConfig, setHasShippingConfig] = useState(false);

  // Coupon
  const [couponCode, setCouponCode] = useState('');
  const [couponResult, setCouponResult] = useState<CouponResult | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/loja/${slug}`)
      .then(r => r.json())
      .then(data => {
        if (data.config) setConfig(data.config);
      });
  }, [slug]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        window.location.href = `/loja/${slug}/login?next=/loja/${slug}/checkout`;
        return;
      }
      setUser(session.user);
      const meta = session.user.user_metadata;
      const googleName = meta?.full_name || meta?.name || '';
      if (googleName) setName(googleName);
      setAuthChecked(true);
    });
  }, [slug]);

  // Check if store has shipping config
  useEffect(() => {
    if (!config) return;
    fetch(`/api/loja/calcular-frete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, destination_cep: '01310100', total_amount: 1 }),
    }).then(r => {
      if (r.status !== 400 || r.url.includes('frete')) {
        r.json().then(d => setHasShippingConfig(!d.error?.includes('não configurado')));
      }
    }).catch(() => {});
  }, [config, slug]);

  const fetchCep = useCallback(async (rawCep: string) => {
    const cleaned = rawCep.replace(/\D/g, '');
    if (cleaned.length !== 8) return;
    setCepLoading(true);
    setCepError('');
    try {
      const r = await fetch(`https://viacep.com.br/ws/${cleaned}/json/`);
      const data: ViaCepResult = await r.json();
      if (data.erro) { setCepError('CEP não encontrado'); return; }
      setStreet(data.logradouro || '');
      setCity(data.localidade || '');
      setState(data.uf || '');
    } catch {
      setCepError('Erro ao buscar CEP');
    } finally {
      setCepLoading(false);
    }
  }, []);

  const calculateShipping = useCallback(async (rawCep: string) => {
    const cleaned = rawCep.replace(/\D/g, '');
    if (cleaned.length !== 8 || !hasShippingConfig) return;
    setShippingLoading(true);
    setSelectedShipping(null);
    setShippingOptions([]);
    try {
      const r = await fetch('/api/loja/calcular-frete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, destination_cep: cleaned, total_amount: total }),
      });
      const data = await r.json();
      if (data.options?.length > 0) {
        setShippingOptions(data.options);
        setSelectedShipping(data.options[0]);
      }
    } catch {
      // silently fail — user can still proceed without shipping calc
    } finally {
      setShippingLoading(false);
    }
  }, [slug, total, hasShippingConfig]);

  const handleCepChange = (val: string) => {
    const fmt = val.replace(/\D/g, '').replace(/(\d{5})(\d)/, '$1-$2').slice(0, 9);
    setCep(fmt);
    const cleaned = fmt.replace(/\D/g, '');
    if (cleaned.length === 8) {
      fetchCep(cleaned);
      calculateShipping(cleaned);
    }
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponResult(null);
    try {
      const r = await fetch('/api/loja/validar-cupom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode, order_amount: total }),
      });
      const data = await r.json();
      setCouponResult(data);
    } catch {
      setCouponResult({ valid: false, message: 'Erro ao validar cupom' });
    } finally {
      setCouponLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = `/loja/${slug}/login?next=/loja/${slug}/checkout`;
  };

  // Compute discounts
  const globalDiscountPercent = config?.discount_global_percent ?? 0;
  const minOrderAmount = config?.discount_min_order_amount ?? null;
  const minOrderPercent = config?.discount_min_order_percent ?? 0;

  const autoDiscountPercent = (() => {
    let best = globalDiscountPercent;
    if (minOrderAmount != null && total >= minOrderAmount && minOrderPercent > best) best = minOrderPercent;
    return best;
  })();
  const autoDiscountAmount = Math.round((total * autoDiscountPercent) / 100 * 100) / 100;
  const couponDiscount = (couponResult?.valid && couponResult.discount_amount) ? couponResult.discount_amount : 0;
  const shippingCost = selectedShipping?.price ?? 0;
  const finalTotal = Math.max(0, total - autoDiscountAmount - couponDiscount + shippingCost);

  const handlePay = async () => {
    if (!name.trim()) { setError('Informe seu nome'); return; }
    if (items.length === 0) { setError('Carrinho vazio'); return; }
    if (hasShippingConfig && !cep.replace(/\D/g, '').length) { setError('Informe seu CEP para calcular o frete'); return; }
    if (hasShippingConfig && shippingOptions.length > 0 && !selectedShipping) { setError('Selecione uma opção de frete'); return; }
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
          user_id: user?.id || null,
          shipping: selectedShipping ? {
            cost: selectedShipping.price,
            method: selectedShipping.name,
            carrier: selectedShipping.company,
          } : null,
          discount: autoDiscountAmount + couponDiscount,
          coupon_code: couponResult?.valid ? couponCode.toUpperCase().trim() : null,
          recipient: { cep: cep.replace(/\D/g, ''), street, number, complement, city, state },
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

        {/* Logged-in user */}
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
          <button onClick={handleLogout} className="flex items-center gap-1.5 text-[11px] font-bold text-zinc-400 hover:text-red-500 transition-colors">
            <LogOut size={13} /> Sair
          </button>
        </div>

        {/* Customer data */}
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5 space-y-4">
          <p className="text-xs font-black uppercase tracking-widest text-zinc-400">Dados do cliente</p>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-600">Nome *</label>
            <input value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2.5 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:border-transparent" style={{ '--tw-ring-color': color } as React.CSSProperties} placeholder="Seu nome completo" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-600">E-mail</label>
            <input value={user?.email || ''} disabled className="w-full px-3 py-2.5 text-sm border border-zinc-100 rounded-xl bg-zinc-50 text-zinc-500 cursor-not-allowed" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-600">WhatsApp</label>
            <input value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2').slice(0, 15))} className="w-full px-3 py-2.5 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:border-transparent" style={{ '--tw-ring-color': color } as React.CSSProperties} placeholder="(00) 00000-0000" />
          </div>
        </div>

        {/* Delivery address */}
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5 space-y-4">
          <p className="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2"><MapPin size={13} /> Endereço de entrega</p>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-600">CEP {hasShippingConfig ? '*' : ''}</label>
              <div className="relative">
                <input value={cep} onChange={e => handleCepChange(e.target.value)} className="w-full px-3 py-2.5 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:border-transparent pr-8" style={{ '--tw-ring-color': color } as React.CSSProperties} placeholder="00000-000" />
                {cepLoading && <Loader2 size={13} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-zinc-400" />}
              </div>
              {cepError && <p className="text-[11px] text-red-500">{cepError}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-600">Número</label>
              <input value={number} onChange={e => setNumber(e.target.value)} className="w-full px-3 py-2.5 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:border-transparent" style={{ '--tw-ring-color': color } as React.CSSProperties} placeholder="123" />
            </div>
            <div className="col-span-2 space-y-1">
              <label className="text-xs font-semibold text-zinc-600">Rua / Logradouro</label>
              <input value={street} onChange={e => setStreet(e.target.value)} className="w-full px-3 py-2.5 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:border-transparent" style={{ '--tw-ring-color': color } as React.CSSProperties} placeholder="Rua..." />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-600">Complemento</label>
              <input value={complement} onChange={e => setComplement(e.target.value)} className="w-full px-3 py-2.5 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:border-transparent" style={{ '--tw-ring-color': color } as React.CSSProperties} placeholder="Apto, bloco..." />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-600">Cidade / UF</label>
              <input value={city && state ? `${city} - ${state}` : city} readOnly className="w-full px-3 py-2.5 text-sm border border-zinc-100 rounded-xl bg-zinc-50 text-zinc-500 cursor-not-allowed" placeholder="Preenchido pelo CEP" />
            </div>
          </div>
        </div>

        {/* Shipping options */}
        {hasShippingConfig && (
          <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5 space-y-3">
            <p className="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2"><Truck size={13} /> Frete</p>
            {shippingLoading ? (
              <div className="flex items-center gap-2 text-zinc-400 text-sm py-3">
                <Loader2 size={16} className="animate-spin" /> Calculando fretes...
              </div>
            ) : shippingOptions.length > 0 ? (
              <div className="space-y-2">
                {shippingOptions.map(opt => (
                  <label key={opt.id} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${selectedShipping?.id === opt.id ? 'border-indigo-500 bg-indigo-50/50' : 'border-zinc-100 hover:border-zinc-200'}`} style={selectedShipping?.id === opt.id ? { borderColor: color } : {}}>
                    <input type="radio" name="shipping" value={opt.id} checked={selectedShipping?.id === opt.id} onChange={() => setSelectedShipping(opt)} className="hidden" />
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${selectedShipping?.id === opt.id ? 'border-indigo-500' : 'border-zinc-300'}`} style={selectedShipping?.id === opt.id ? { borderColor: color } : {}}>
                      {selectedShipping?.id === opt.id && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-zinc-800">{opt.company} — {opt.name}</p>
                      {opt.delivery_time && <p className="text-[11px] text-zinc-400">{opt.delivery_time} dias úteis</p>}
                    </div>
                    <div className="text-right">
                      {opt.free ? (
                        <span className="text-sm font-black text-emerald-600">Grátis</span>
                      ) : (
                        <span className="text-sm font-bold text-zinc-800">{opt.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            ) : cep.replace(/\D/g, '').length === 8 ? (
              <p className="text-sm text-zinc-400 py-2">Nenhuma opção de frete disponível para este CEP</p>
            ) : (
              <p className="text-sm text-zinc-400 py-2">Informe o CEP para calcular o frete</p>
            )}
          </div>
        )}

        {/* Coupon */}
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5 space-y-3">
          <p className="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2"><Tag size={13} /> Cupom de desconto</p>
          <div className="flex gap-2">
            <input
              value={couponCode}
              onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponResult(null); }}
              className="flex-1 px-3 py-2.5 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:border-transparent font-mono"
              style={{ '--tw-ring-color': color } as React.CSSProperties}
              placeholder="Código do cupom"
              onKeyDown={e => e.key === 'Enter' && handleApplyCoupon()}
            />
            <button onClick={handleApplyCoupon} disabled={couponLoading || !couponCode.trim()} className="px-4 py-2.5 text-sm font-bold rounded-xl text-white transition-all disabled:opacity-50 hover:opacity-90" style={{ backgroundColor: color }}>
              {couponLoading ? <Loader2 size={14} className="animate-spin" /> : 'Aplicar'}
            </button>
          </div>
          {couponResult && (
            <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-xl ${couponResult.valid ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
              {couponResult.valid ? <CheckCircle size={14} /> : <X size={14} />}
              {couponResult.message}
              {couponResult.valid && (
                <button onClick={() => { setCouponCode(''); setCouponResult(null); }} className="ml-auto text-zinc-400 hover:text-zinc-700"><X size={12} /></button>
              )}
            </div>
          )}
        </div>

        {/* Order summary */}
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5 space-y-3">
          <p className="text-xs font-black uppercase tracking-widest text-zinc-400">Resumo do pedido</p>
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
            <div className="border-t border-zinc-100 pt-3 space-y-2">
              <div className="flex justify-between text-sm text-zinc-500">
                <span>Subtotal</span>
                <span>{total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
              </div>
              {autoDiscountAmount > 0 && (
                <div className="flex justify-between text-sm text-emerald-600">
                  <span>Desconto ({autoDiscountPercent}%)</span>
                  <span>-{autoDiscountAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </div>
              )}
              {couponDiscount > 0 && (
                <div className="flex justify-between text-sm text-emerald-600">
                  <span>Cupom {couponCode}</span>
                  <span>-{couponDiscount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </div>
              )}
              {shippingCost > 0 && (
                <div className="flex justify-between text-sm text-zinc-500">
                  <span>Frete ({selectedShipping?.name})</span>
                  <span>{shippingCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </div>
              )}
              {shippingCost === 0 && selectedShipping && (
                <div className="flex justify-between text-sm text-emerald-600">
                  <span>Frete ({selectedShipping.name})</span>
                  <span>Grátis</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-1 border-t border-zinc-100">
                <span className="text-sm font-black text-zinc-700">Total</span>
                <span className="text-xl font-black text-zinc-900">
                  {finalTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
            </div>
          )}
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
          {loading ? <><Loader2 size={18} className="animate-spin" /> Redirecionando...</> : `Pagar ${config?.show_prices ? finalTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : ''} com MercadoPago →`}
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

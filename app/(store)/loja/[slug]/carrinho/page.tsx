'use client';
import { useEffect, useState } from 'react';
import { ShoppingCart, ArrowLeft, Trash2, Plus, Minus, ImageOff } from 'lucide-react';
import { CartProvider, useCart } from '@/components/loja/CartContext';

interface StoreConfig {
  slug: string;
  store_name: string;
  primary_color: string;
  show_prices: boolean;
}

function CartContent({ slug }: { slug: string }) {
  const [config, setConfig] = useState<StoreConfig | null>(null);
  const { items, removeItem, updateQty, total } = useCart();

  useEffect(() => {
    fetch(`/api/loja/${slug}`)
      .then(r => r.json())
      .then(data => { if (data.config) setConfig(data.config); });
  }, [slug]);

  const color = config?.primary_color || '#6366f1';

  return (
    <div className="min-h-screen bg-zinc-50 font-sans">
      <header className="sticky top-0 z-30 bg-white border-b border-zinc-100 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <a href={`/loja/${slug}`} className="flex items-center gap-2 text-zinc-600 hover:text-zinc-900 text-sm font-medium">
            <ArrowLeft size={16} />
            Continuar comprando
          </a>
          <div className="flex items-center gap-2 text-zinc-700">
            <ShoppingCart size={18} />
            <span className="text-sm font-black">{config?.store_name}</span>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-lg font-black text-zinc-900 mb-6">Carrinho</h1>

        {items.length === 0 ? (
          <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-12 text-center">
            <ShoppingCart size={48} className="mx-auto mb-3 text-zinc-300" />
            <p className="text-zinc-500 font-medium">Seu carrinho está vazio</p>
            <a href={`/loja/${slug}`} className="mt-4 inline-block text-sm font-bold hover:underline" style={{ color }}>
              Ver produtos →
            </a>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map(item => (
              <div key={item.sku} className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-4 flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-zinc-50 overflow-hidden shrink-0 flex items-center justify-center">
                  {item.imagem ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.imagem} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <ImageOff size={20} className="text-zinc-300" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-zinc-900 truncate">{item.name}</p>
                  {config?.show_prices && (
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {item.unit_price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} un.
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => updateQty(item.sku, item.quantity - 1)} className="w-7 h-7 rounded-lg bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center transition-colors">
                    <Minus size={12} />
                  </button>
                  <span className="text-sm font-bold w-6 text-center">{item.quantity}</span>
                  <button onClick={() => updateQty(item.sku, item.quantity + 1)} className="w-7 h-7 rounded-lg bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center transition-colors">
                    <Plus size={12} />
                  </button>
                </div>

                {config?.show_prices && (
                  <span className="text-sm font-black text-zinc-900 w-20 text-right shrink-0">
                    {(item.unit_price * item.quantity).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                )}

                <button onClick={() => removeItem(item.sku)} className="p-2 text-zinc-400 hover:text-red-500 transition-colors">
                  <Trash2 size={15} />
                </button>
              </div>
            ))}

            {config?.show_prices && (
              <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-4 flex justify-between items-center">
                <span className="text-sm font-bold text-zinc-600">Total</span>
                <span className="text-xl font-black text-zinc-900">
                  {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
            )}

            <a
              href={`/loja/${slug}/checkout`}
              style={{ backgroundColor: color }}
              className="block w-full py-3.5 rounded-xl text-white font-black text-sm text-center hover:opacity-90 transition-opacity active:scale-[0.98] mt-4"
            >
              Finalizar Pedido →
            </a>
          </div>
        )}
      </main>
    </div>
  );
}

export default function CartPage({ params }: { params: Promise<{ slug: string }> }) {
  const [slug, setSlug] = useState('');

  useEffect(() => {
    params.then(p => setSlug(p.slug));
  }, [params]);

  if (!slug) return null;

  return (
    <CartProvider slug={slug}>
      <CartContent slug={slug} />
    </CartProvider>
  );
}

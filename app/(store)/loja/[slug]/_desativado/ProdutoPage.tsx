'use client';
import { useEffect, useState } from 'react';
import { ShoppingCart, ArrowLeft, ImageOff, Check } from 'lucide-react';
import { CartProvider, useCart } from '@/components/loja/CartContext';

interface StoreConfig {
  slug: string;
  store_name: string;
  primary_color: string;
  show_prices: boolean;
}

interface Product {
  sku: number;
  name: string;
  description?: string;
  price?: number;
  imagem?: string;
  category?: string;
  color?: string;
  size?: string;
  stock_quantity?: number;
}

function ProductContent({ slug, sku }: { slug: string; sku: string }) {
  const [config, setConfig] = useState<StoreConfig | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [added, setAdded] = useState(false);
  const { addItem, count } = useCart();

  useEffect(() => {
    fetch(`/api/loja/${slug}`)
      .then(r => r.json())
      .then(data => {
        if (data.config) setConfig(data.config);
        const found = data.products?.find((p: Product) => String(p.sku) === String(sku));
        setProduct(found || null);
      })
      .finally(() => setLoading(false));
  }, [slug, sku]);

  const handleAdd = () => {
    if (!product) return;
    addItem({ sku: product.sku, name: product.name, unit_price: product.price ?? 0, imagem: product.imagem });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-zinc-200 border-t-indigo-600 rounded-full animate-spin" /></div>;
  }

  if (!product || !config) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-zinc-500">Produto não encontrado</p>
        <a href={`/loja/${slug}`} className="text-indigo-600 text-sm hover:underline">← Voltar à loja</a>
      </div>
    );
  }

  const color = config.primary_color || '#6366f1';

  return (
    <div className="min-h-screen bg-zinc-50 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-zinc-100 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <a href={`/loja/${slug}`} className="flex items-center gap-2 text-zinc-600 hover:text-zinc-900 transition-colors text-sm font-medium">
            <ArrowLeft size={16} />
            {config.store_name}
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

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
          <div className="md:flex">
            <div className="md:w-1/2 aspect-square bg-zinc-50 flex items-center justify-center">
              {product.imagem ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.imagem} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <div className="text-zinc-300"><ImageOff size={64} /></div>
              )}
            </div>

            <div className="md:w-1/2 p-6 md:p-8 flex flex-col gap-4">
              {product.category && (
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{product.category}</span>
              )}
              <h1 className="text-xl font-black text-zinc-900 leading-tight">{product.name}</h1>

              {(product.color || product.size) && (
                <div className="flex gap-2 flex-wrap">
                  {product.color && <span className="text-xs bg-zinc-100 text-zinc-600 px-3 py-1 rounded-full">{product.color}</span>}
                  {product.size && <span className="text-xs bg-zinc-100 text-zinc-600 px-3 py-1 rounded-full">Tam. {product.size}</span>}
                </div>
              )}

              {product.description && (
                <p className="text-sm text-zinc-500 leading-relaxed">{product.description}</p>
              )}

              {config.show_prices && product.price && (
                <div className="mt-auto pt-4 border-t border-zinc-100">
                  <p className="text-[11px] text-zinc-400 uppercase tracking-widest font-bold mb-1">Preço</p>
                  <p className="text-3xl font-black text-zinc-900">
                    {product.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                </div>
              )}

              <button
                onClick={handleAdd}
                style={{ backgroundColor: added ? '#10b981' : color }}
                className="w-full py-3 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-all active:scale-95 mt-2"
              >
                {added ? <><Check size={18} /> Adicionado!</> : <><ShoppingCart size={18} /> Adicionar ao carrinho</>}
              </button>

              <a
                href={`/loja/${slug}/carrinho`}
                className="text-center text-sm text-zinc-500 hover:text-zinc-800 underline-offset-4 hover:underline"
              >
                Ver carrinho
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function ProductPage({ params }: { params: Promise<{ slug: string; sku: string }> }) {
  const [slugSku, setSlugSku] = useState<{ slug: string; sku: string } | null>(null);

  useEffect(() => {
    params.then(p => setSlugSku(p));
  }, [params]);

  if (!slugSku) return null;

  return (
    <CartProvider slug={slugSku.slug}>
      <ProductContent slug={slugSku.slug} sku={slugSku.sku} />
    </CartProvider>
  );
}

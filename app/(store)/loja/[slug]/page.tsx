'use client';
import { useEffect, useState, useMemo } from 'react';
import { ShoppingCart, Search, Instagram, MessageCircle, Store, X } from 'lucide-react';
import { CartProvider, useCart } from '@/components/loja/CartContext';
import { ProdutoCard } from '@/components/loja/ProdutoCard';

interface StoreConfig {
  slug: string;
  store_name: string;
  tagline?: string;
  description?: string;
  banner_url?: string;
  logo_url?: string;
  primary_color: string;
  whatsapp_number?: string;
  instagram_url?: string;
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
}

function StoreContent({ slug }: { slug: string }) {
  const [config, setConfig] = useState<StoreConfig | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const { count } = useCart();

  useEffect(() => {
    fetch(`/api/loja/${slug}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); return; }
        setConfig(data.config);
        setProducts(data.products);
      })
      .catch(() => setError('Erro ao carregar a loja'))
      .finally(() => setLoading(false));
  }, [slug]);

  const categories = useMemo(() => {
    const cats = [...new Set(products.map(p => p.category).filter(Boolean))] as string[];
    return cats.sort();
  }, [products]);

  const filtered = useMemo(() => {
    return products.filter(p => {
      const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
      const matchCat = !selectedCategory || p.category === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [products, search, selectedCategory]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="w-8 h-8 border-4 border-zinc-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !config) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 gap-4">
        <Store size={48} className="text-zinc-300" />
        <p className="text-zinc-500 text-lg font-medium">{error || 'Loja não encontrada'}</p>
      </div>
    );
  }

  const color = config.primary_color || '#6366f1';

  return (
    <div className="min-h-screen bg-zinc-50 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-zinc-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {config.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={config.logo_url} alt={config.store_name} className="w-9 h-9 rounded-xl object-cover border border-zinc-100" />
            ) : (
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-sm" style={{ backgroundColor: color }}>
                {config.store_name.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="font-black text-zinc-900 text-base">{config.store_name}</span>
          </div>

          <div className="flex-1 max-w-sm hidden sm:block">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar produtos..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-zinc-200 rounded-xl bg-zinc-50 focus:outline-none focus:ring-2 focus:border-transparent"
                style={{ '--tw-ring-color': color } as React.CSSProperties}
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700">
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {config.instagram_url && (
              <a href={config.instagram_url} target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-pink-500 transition-colors">
                <Instagram size={18} />
              </a>
            )}
            {config.whatsapp_number && (
              <a href={`https://wa.me/${config.whatsapp_number.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-green-500 transition-colors">
                <MessageCircle size={18} />
              </a>
            )}
            <a href={`/loja/${slug}/carrinho`} className="relative p-2 rounded-xl hover:bg-zinc-100 transition-colors">
              <ShoppingCart size={20} className="text-zinc-700" />
              {count > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-white text-[10px] font-black flex items-center justify-center" style={{ backgroundColor: color }}>
                  {count}
                </span>
              )}
            </a>
          </div>
        </div>

        {/* Mobile search */}
        <div className="sm:hidden px-4 pb-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar produtos..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-zinc-200 rounded-xl bg-zinc-50 focus:outline-none"
            />
          </div>
        </div>
      </header>

      {/* Hero / Banner */}
      <div
        className="relative h-40 md:h-56 flex flex-col items-center justify-center text-center px-4 overflow-hidden"
        style={!config.banner_url ? { backgroundColor: color + '18' } : undefined}
      >
        {config.banner_url && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={config.banner_url} alt="Banner" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40" />
          </>
        )}
        <div className="relative z-10 flex flex-col items-center gap-2">
          <h1
            className="text-2xl md:text-3xl font-black"
            style={{ color: config.banner_url ? '#fff' : color }}
          >
            {config.store_name}
          </h1>
          {config.tagline && (
            <p className={`text-sm ${config.banner_url ? 'text-white/90' : 'text-zinc-500'}`}>
              {config.tagline}
            </p>
          )}
        </div>
      </div>

      {/* Category filter */}
      {categories.length > 0 && (
        <div className="max-w-6xl mx-auto px-4 pt-6 pb-2">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <button
              onClick={() => setSelectedCategory('')}
              className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${!selectedCategory ? 'text-white border-transparent' : 'bg-white border-zinc-200 text-zinc-600 hover:border-zinc-300'}`}
              style={!selectedCategory ? { backgroundColor: color, borderColor: color } : {}}
            >
              Todos
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat === selectedCategory ? '' : cat)}
                className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${selectedCategory === cat ? 'text-white border-transparent' : 'bg-white border-zinc-200 text-zinc-600 hover:border-zinc-300'}`}
                style={selectedCategory === cat ? { backgroundColor: color, borderColor: color } : {}}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Products grid */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {filtered.length === 0 ? (
          <div className="py-20 text-center">
            <Store size={48} className="mx-auto mb-3 text-zinc-300" />
            <p className="text-zinc-500">Nenhum produto encontrado</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-zinc-400 mb-4">{filtered.length} produto{filtered.length !== 1 ? 's' : ''}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {filtered.map(product => (
                <ProdutoCard
                  key={product.sku}
                  product={product}
                  primaryColor={color}
                  showPrices={config.show_prices}
                  slug={slug}
                />
              ))}
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center py-8 text-xs text-zinc-400 border-t border-zinc-100 mt-8">
        <p>© {new Date().getFullYear()} {config.store_name} · Powered by NexusStores</p>
      </footer>
    </div>
  );
}

export default function StorePage({ params }: { params: Promise<{ slug: string }> }) {
  const [slug, setSlug] = useState('');

  useEffect(() => {
    params.then(p => setSlug(p.slug));
  }, [params]);

  if (!slug) return null;

  return (
    <CartProvider slug={slug}>
      <StoreContent slug={slug} />
    </CartProvider>
  );
}

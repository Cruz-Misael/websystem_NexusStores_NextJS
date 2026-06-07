'use client';
import { useEffect, useState, useMemo } from 'react';
import { ShoppingCart, Search, Instagram, MessageCircle, Store, X, User, LogIn, LogOut, Package } from 'lucide-react';
import { CartProvider, useCart } from '@/components/loja/CartContext';
import { ProdutoCard } from '@/components/loja/ProdutoCard';
import { supabase } from '@/src/lib/supabase/client';

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

interface Category {
  name: string;
  color: string;
  image_url?: string | null;
}

function StoreContent({ slug }: { slug: string }) {
  const [config, setConfig] = useState<StoreConfig | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const { count } = useCart();
  const [user, setUser] = useState<any>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
    });
  }, []);

  useEffect(() => {
    fetch(`/api/loja/${slug}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); return; }
        setConfig(data.config);
        setProducts(data.products);
        setCategories(data.categories || []);
      })
      .catch(() => setError('Erro ao carregar a loja'))
      .finally(() => setLoading(false));
  }, [slug]);

  // Merge DB categories (with images) + any product category not yet registered
  const displayCategories = useMemo(() => {
    const dbNames = new Set(categories.map(c => c.name));
    const productCatNames = [...new Set(products.map(p => p.category).filter(Boolean))] as string[];
    const withProducts = new Set(productCatNames);
    const dbWithProducts = categories.filter(c => withProducts.has(c.name));
    const extras = productCatNames
      .filter(name => !dbNames.has(name))
      .map(name => ({ name, color: '#6366f1', image_url: null as string | null }));
    return [...dbWithProducts, ...extras];
  }, [categories, products]);

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

            {/* Login / Avatar */}
            <div className="relative">
              {user ? (
                <>
                  <button
                    onClick={() => setShowUserMenu(v => !v)}
                    className="flex items-center gap-1.5 hover:bg-zinc-50 rounded-xl px-2 py-1 transition-colors"
                  >
                    {user.user_metadata?.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={user.user_metadata.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-zinc-100 flex items-center justify-center">
                        <User size={14} className="text-zinc-500" />
                      </div>
                    )}
                    <span className="text-xs font-bold text-zinc-700 hidden sm:block max-w-[72px] truncate">
                      {user.user_metadata?.full_name?.split(' ')[0] || 'Conta'}
                    </span>
                  </button>
                  {showUserMenu && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                      <div className="absolute right-0 top-full mt-2 w-44 bg-white rounded-xl shadow-lg border border-zinc-100 py-1 z-50">
                        <a
                          href={`/loja/${slug}/conta`}
                          className="flex items-center gap-2 px-4 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50"
                        >
                          <Package size={14} />
                          Minha conta
                        </a>
                        <button
                          onClick={async () => { await supabase.auth.signOut(); setUser(null); setShowUserMenu(false); }}
                          className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50"
                        >
                          <LogOut size={14} />
                          Sair
                        </button>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <a
                  href={`/loja/${slug}/login?next=/loja/${slug}/conta`}
                  className="flex items-center gap-1.5 text-xs font-bold text-zinc-600 hover:text-zinc-900 border border-zinc-200 rounded-xl px-3 py-1.5 hover:bg-zinc-50 transition-colors"
                >
                  <LogIn size={14} />
                  Entrar
                </a>
              )}
            </div>

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

      {/* Category cards */}
      {displayCategories.length > 0 && (
        <div className="max-w-6xl mx-auto px-4 pt-8 pb-2">
          <div className="flex gap-2.5 overflow-x-auto pt-1 px-1 pb-3 scrollbar-hide">

            {/* "Todos" card */}
            <button
              onClick={() => setSelectedCategory('')}
              className="shrink-0 w-[84px] h-[106px] rounded-2xl overflow-hidden relative transition-all duration-200 hover:shadow-md hover:scale-[1.02]"
              style={!selectedCategory ? { boxShadow: `0 0 0 2.5px ${color}` } : {}}
            >
              <div
                className="absolute inset-0"
                style={{ background: !selectedCategory ? `linear-gradient(145deg, ${color}, ${color}cc)` : 'linear-gradient(145deg, #f4f4f5, #e4e4e7)' }}
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${!selectedCategory ? 'bg-white/20' : 'bg-zinc-200/80'}`}>
                  <Store size={15} className={!selectedCategory ? 'text-white' : 'text-zinc-500'} />
                </div>
                <div className="text-center">
                  <p className={`text-[11px] font-black leading-none ${!selectedCategory ? 'text-white' : 'text-zinc-700'}`}>Todos</p>
                  <p className={`text-[9px] font-medium mt-0.5 ${!selectedCategory ? 'text-white/60' : 'text-zinc-400'}`}>{products.length} itens</p>
                </div>
              </div>
            </button>

            {/* Category cards */}
            {displayCategories.map(cat => {
              const isActive = selectedCategory === cat.name;
              const catCount = products.filter(p => p.category === cat.name).length;
              return (
                <button
                  key={cat.name}
                  onClick={() => setSelectedCategory(cat.name === selectedCategory ? '' : cat.name)}
                  className="shrink-0 w-[84px] h-[106px] rounded-2xl overflow-hidden relative transition-all duration-200 hover:shadow-md hover:scale-[1.02]"
                  style={isActive ? { boxShadow: `0 0 0 2.5px ${color}` } : {}}
                >
                  {cat.image_url ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={cat.image_url} alt={cat.name} className="absolute inset-0 w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
                      <div className="absolute inset-x-0 bottom-0 p-2.5 text-center">
                        <p className="text-white text-[10px] font-black leading-tight line-clamp-2 drop-shadow-sm">{cat.name}</p>
                        <p className="text-white/60 text-[9px] font-medium mt-0.5">{catCount} {catCount === 1 ? 'item' : 'itens'}</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="absolute inset-0" style={{ background: `linear-gradient(145deg, ${cat.color}30, ${cat.color}18)` }} />
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                        <div className="w-7 h-7 rounded-full shadow-sm" style={{ backgroundColor: cat.color }} />
                        <div className="text-center px-1.5">
                          <p className="text-zinc-800 text-[10px] font-black leading-tight line-clamp-2">{cat.name}</p>
                          <p className="text-zinc-400 text-[9px] font-medium mt-0.5">{catCount} {catCount === 1 ? 'item' : 'itens'}</p>
                        </div>
                      </div>
                    </>
                  )}
                </button>
              );
            })}
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

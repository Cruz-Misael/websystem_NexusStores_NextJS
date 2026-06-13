'use client';
import { useEffect, useState, useMemo, useRef } from 'react';
import {
  ShoppingCart, Search, Instagram, MessageCircle, Store,
  X, User, LogIn, LogOut, Package, SlidersHorizontal,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { CartProvider, useCart } from '@/components/loja/CartContext';
import { ProdutoCard } from '@/components/loja/ProdutoCard';
import { supabase } from '@/src/lib/supabase/client';

/* ─── Types ─────────────────────────────────── */
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

/* ─── Skeleton ───────────────────────────────── */
function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-zinc-100 animate-pulse rounded-2xl ${className}`} />;
}

function SkeletonStore() {
  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header skeleton */}
      <div className="h-16 bg-white border-b border-zinc-100 flex items-center px-6 gap-4">
        <Skeleton className="w-9 h-9 rounded-xl" />
        <Skeleton className="w-28 h-5" />
        <div className="flex-1 max-w-sm mx-auto hidden sm:block">
          <Skeleton className="h-9 w-full rounded-xl" />
        </div>
        <div className="flex gap-3 ml-auto">
          <Skeleton className="w-8 h-8 rounded-xl" />
          <Skeleton className="w-8 h-8 rounded-xl" />
        </div>
      </div>
      {/* Banner skeleton */}
      <Skeleton className="h-52 md:h-72 w-full rounded-none" />
      {/* Category cards row */}
      <div className="max-w-6xl mx-auto px-4 pt-8 pb-2 flex gap-3.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="shrink-0 w-[110px] h-[140px] md:w-[124px] md:h-[156px] rounded-3xl" />
        ))}
      </div>
      {/* Product grid */}
      <div className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-white rounded-3xl overflow-hidden shadow-sm">
            <Skeleton className="aspect-[4/5] w-full rounded-none" />
            <div className="p-3.5 space-y-2">
              <Skeleton className="h-3.5 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <div className="flex justify-between items-center pt-1">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="w-9 h-9 rounded-2xl" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Store Content ──────────────────────────── */
function StoreContent({ slug }: { slug: string }) {
  const [config, setConfig] = useState<StoreConfig | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [user, setUser] = useState<any>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [headerScrolled, setHeaderScrolled] = useState(false);
  const { count } = useCart();
  const catRowRef = useRef<HTMLDivElement>(null);

  /* Auth */
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user || null));
  }, []);

  /* Fetch store data */
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

  /* Header shadow on scroll */
  useEffect(() => {
    const onScroll = () => setHeaderScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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

  if (loading) return <SkeletonStore />;

  if (error || !config) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 gap-4">
        <div className="w-16 h-16 rounded-2xl bg-zinc-100 flex items-center justify-center">
          <Store size={28} className="text-zinc-300" />
        </div>
        <p className="text-zinc-500 font-medium">{error || 'Loja não encontrada'}</p>
      </div>
    );
  }

  const color = config.primary_color || '#6366f1';

  return (
    <div className="min-h-screen bg-zinc-50/80 font-sans">

      {/* ── Header ─────────────────────────────────── */}
      <header
        className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl transition-shadow duration-300"
        style={headerScrolled ? { boxShadow: '0 4px 24px rgba(0,0,0,0.07)' } : {}}
      >
        {/* Gradient hairline */}
        <div
          className="absolute inset-x-0 bottom-0 h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${color}50, transparent)` }}
        />
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          {/* Logo + name */}
          <a href={`/loja/${slug}`} className="flex items-center gap-3 shrink-0 group">
            {config.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={config.logo_url}
                alt={config.store_name}
                className="w-9 h-9 rounded-xl object-cover shadow-sm border border-zinc-100"
              />
            ) : (
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-md group-hover:scale-105 transition-transform"
                style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}
              >
                {config.store_name.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="font-black text-zinc-900 text-base tracking-tight hidden sm:block">{config.store_name}</span>
          </a>

          {/* Desktop search */}
          <div className="flex-1 max-w-sm hidden sm:block">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar produtos..."
                className="w-full pl-9 pr-8 py-2 text-sm border border-zinc-200/80 rounded-full bg-zinc-50/80 focus:outline-none focus:ring-2 focus:border-transparent focus:bg-white transition-all"
                style={{ '--tw-ring-color': color + '40' } as React.CSSProperties}
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors">
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            {config.instagram_url && (
              <a href={config.instagram_url} target="_blank" rel="noopener noreferrer"
                className="w-8 h-8 flex items-center justify-center rounded-xl text-zinc-400 hover:text-pink-500 hover:bg-pink-50 transition-all">
                <Instagram size={17} />
              </a>
            )}
            {config.whatsapp_number && (
              <a href={`https://wa.me/${config.whatsapp_number.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                className="w-8 h-8 flex items-center justify-center rounded-xl text-zinc-400 hover:text-green-500 hover:bg-green-50 transition-all">
                <MessageCircle size={17} />
              </a>
            )}

            {/* User menu */}
            <div className="relative">
              {user ? (
                <>
                  <button
                    onClick={() => setShowUserMenu(v => !v)}
                    className="flex items-center gap-1.5 hover:bg-zinc-50 rounded-xl px-2 py-1.5 transition-colors"
                  >
                    {user.user_metadata?.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={user.user_metadata.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover ring-2 ring-zinc-100" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-zinc-100 flex items-center justify-center">
                        <User size={14} className="text-zinc-500" />
                      </div>
                    )}
                    <span className="text-xs font-bold text-zinc-700 hidden sm:block max-w-[64px] truncate">
                      {user.user_metadata?.full_name?.split(' ')[0] || 'Conta'}
                    </span>
                  </button>
                  <AnimatePresence>
                    {showUserMenu && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: -6 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: -6 }}
                          transition={{ duration: 0.15 }}
                          className="absolute right-0 top-full mt-2 w-44 bg-white rounded-2xl shadow-xl border border-zinc-100 py-1.5 z-50 overflow-hidden"
                        >
                          <a href={`/loja/${slug}/conta`} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors">
                            <Package size={14} /> Minha conta
                          </a>
                          <div className="mx-3 my-1 border-t border-zinc-100" />
                          <button
                            onClick={async () => { await supabase.auth.signOut(); setUser(null); setShowUserMenu(false); }}
                            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                          >
                            <LogOut size={14} /> Sair
                          </button>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </>
              ) : (
                <a
                  href={`/loja/${slug}/login?next=/loja/${slug}/conta`}
                  className="flex items-center gap-1.5 text-xs font-bold text-zinc-600 hover:text-zinc-900 border border-zinc-200 rounded-xl px-3 py-1.5 hover:bg-zinc-50 transition-all"
                >
                  <LogIn size={13} /> Entrar
                </a>
              )}
            </div>

            {/* Cart */}
            <a href={`/loja/${slug}/carrinho`} className="relative w-9 h-9 flex items-center justify-center rounded-xl hover:bg-zinc-100 transition-colors">
              <ShoppingCart size={19} className="text-zinc-700" />
              <AnimatePresence>
                {count > 0 && (
                  <motion.span
                    key="badge"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-white text-[10px] font-black flex items-center justify-center shadow-sm"
                    style={{ backgroundColor: color }}
                  >
                    {count}
                  </motion.span>
                )}
              </AnimatePresence>
            </a>
          </div>
        </div>

        {/* Mobile search */}
        <div className="sm:hidden px-4 pb-3">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar produtos..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-zinc-200/80 rounded-full bg-zinc-50/80 focus:outline-none focus:ring-2 focus:border-transparent focus:bg-white transition-all"
              style={{ '--tw-ring-color': color + '40' } as React.CSSProperties}
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400">
                <X size={12} />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── Hero / Banner ──────────────────────────── */}
      <div className="relative h-56 md:h-[320px] overflow-hidden flex flex-col items-center justify-center text-center px-4">
        {config.banner_url ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={config.banner_url}
              alt="Banner"
              className="absolute inset-0 w-full h-full object-cover animate-slow-zoom"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/25 to-black/10" />
            {/* Color tint at the bottom to blend with the page */}
            <div
              className="absolute inset-x-0 bottom-0 h-24 opacity-40"
              style={{ background: `linear-gradient(to top, ${color}40, transparent)` }}
            />
          </>
        ) : (
          <>
            {/* Gradient fallback */}
            <div
              className="absolute inset-0"
              style={{ background: `linear-gradient(135deg, ${color}1f 0%, ${color}08 45%, ${color}1a 100%)` }}
            />
            {/* Animated dot grid */}
            <div
              className="absolute inset-0 opacity-50"
              style={{
                backgroundImage: `radial-gradient(circle, ${color}30 1px, transparent 1px)`,
                backgroundSize: '28px 28px',
                maskImage: 'radial-gradient(ellipse 70% 80% at 50% 50%, black 30%, transparent 100%)',
                WebkitMaskImage: 'radial-gradient(ellipse 70% 80% at 50% 50%, black 30%, transparent 100%)',
              }}
            />
            {/* Aurora blobs */}
            <div className="absolute top-0 right-0 w-80 h-80 rounded-full opacity-25 blur-3xl -translate-y-1/2 translate-x-1/4 animate-aurora"
              style={{ backgroundColor: color }} />
            <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full opacity-20 blur-3xl translate-y-1/2 -translate-x-1/4 animate-aurora-slow"
              style={{ backgroundColor: color }} />
            <div className="absolute top-1/2 left-1/2 w-48 h-48 rounded-full opacity-10 blur-3xl -translate-x-1/2 -translate-y-1/2 animate-aurora"
              style={{ backgroundColor: color, animationDelay: '-5s' }} />
          </>
        )}

        {/* Text */}
        <div className="relative z-10 flex flex-col items-center gap-2.5">
          {config.logo_url && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="relative mb-1"
            >
              {/* Glow behind logo */}
              <div className="absolute inset-0 rounded-2xl blur-xl opacity-40 scale-110" style={{ backgroundColor: color }} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={config.logo_url}
                alt={config.store_name}
                className="relative w-16 h-16 md:w-20 md:h-20 rounded-2xl object-cover shadow-xl border-2 border-white/50"
              />
            </motion.div>
          )}
          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="text-3xl md:text-5xl font-black tracking-tight drop-shadow-sm"
            style={
              config.banner_url
                ? { color: '#fff' }
                : {
                    background: `linear-gradient(110deg, ${color} 25%, ${color}99 50%, ${color} 75%)`,
                    backgroundSize: '200% auto',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    animation: 'shimmer 4s linear infinite',
                  }
            }
          >
            {config.store_name}
          </motion.h1>
          {config.tagline && (
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.12 }}
              className={`text-sm md:text-base font-medium max-w-md ${config.banner_url ? 'text-white/85' : 'text-zinc-500'}`}
            >
              {config.tagline}
            </motion.p>
          )}
          {config.description && !config.tagline && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className={`text-xs max-w-sm ${config.banner_url ? 'text-white/70' : 'text-zinc-400'}`}
            >
              {config.description}
            </motion.p>
          )}
          {/* Glass badge */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className={`mt-1 inline-flex items-center gap-1.5 text-[11px] font-bold px-3.5 py-1.5 rounded-full backdrop-blur-md border shadow-sm ${
              config.banner_url
                ? 'bg-white/15 border-white/25 text-white'
                : 'bg-white/70 border-white text-zinc-600'
            }`}
          >
            <span className="relative flex w-1.5 h-1.5">
              <span className="absolute inline-flex w-full h-full rounded-full opacity-75 animate-ping" style={{ backgroundColor: config.banner_url ? '#fff' : color }} />
              <span className="relative inline-flex w-1.5 h-1.5 rounded-full" style={{ backgroundColor: config.banner_url ? '#fff' : color }} />
            </span>
            {products.length} produto{products.length !== 1 ? 's' : ''} disponíve{products.length !== 1 ? 'is' : 'l'}
          </motion.div>
        </div>
      </div>

      {/* ── Categories ─────────────────────────────── */}
      {displayCategories.length > 0 && (
        <div className="max-w-6xl mx-auto px-4 pt-7 pb-1">
          <div
            ref={catRowRef}
            className="flex gap-3.5 overflow-x-auto pb-3 pt-1.5 px-1 scrollbar-hide"
          >
            {/* Todos */}
            <button
              onClick={() => setSelectedCategory('')}
              className="group/cat shrink-0 w-[110px] h-[140px] md:w-[124px] md:h-[156px] rounded-3xl overflow-hidden relative
                         transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl"
              style={!selectedCategory ? {
                boxShadow: `0 0 0 2.5px ${color}, 0 12px 32px ${color}40`,
              } : { boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
            >
              <div
                className="absolute inset-0"
                style={{ background: `linear-gradient(160deg, ${color}, ${color}99)` }}
              />
              {/* Dot pattern overlay */}
              <div
                className="absolute inset-0 opacity-25"
                style={{
                  backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.5) 1px, transparent 1px)',
                  backgroundSize: '14px 14px',
                }}
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5">
                <div className="w-11 h-11 rounded-2xl bg-white/25 backdrop-blur-sm flex items-center justify-center
                                group-hover/cat:scale-110 transition-transform duration-300">
                  <Store size={20} className="text-white" />
                </div>
                <div className="text-center">
                  <p className="text-white text-xs font-black leading-none drop-shadow-sm">Todos</p>
                  <p className="text-white/75 text-[10px] font-medium mt-1">{products.length} itens</p>
                </div>
              </div>
            </button>

            {displayCategories.map(cat => {
              const isActive = selectedCategory === cat.name;
              const catCount = products.filter(p => p.category === cat.name).length;
              return (
                <button
                  key={cat.name}
                  onClick={() => setSelectedCategory(cat.name === selectedCategory ? '' : cat.name)}
                  className="group/cat shrink-0 w-[110px] h-[140px] md:w-[124px] md:h-[156px] rounded-3xl overflow-hidden relative
                             transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl"
                  style={isActive ? {
                    boxShadow: `0 0 0 2.5px ${color}, 0 12px 32px ${color}40`,
                  } : { boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
                >
                  {cat.image_url ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={cat.image_url}
                        alt={cat.name}
                        className="absolute inset-0 w-full h-full object-cover
                                   group-hover/cat:scale-110 transition-transform duration-500 ease-out"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      {/* Active color tint */}
                      {isActive && (
                        <div className="absolute inset-0 opacity-30 mix-blend-overlay" style={{ backgroundColor: color }} />
                      )}
                      <div className="absolute inset-x-0 bottom-0 p-3 text-center">
                        <p className="text-white text-[11px] md:text-xs font-black leading-tight line-clamp-2 drop-shadow">{cat.name}</p>
                        <p className="text-white/65 text-[10px] font-medium mt-0.5">{catCount} {catCount === 1 ? 'item' : 'itens'}</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div
                        className="absolute inset-0"
                        style={{ background: `linear-gradient(160deg, ${cat.color}33, ${cat.color}14 55%, ${cat.color}26)` }}
                      />
                      <div className="absolute inset-0 bg-white/55 backdrop-blur-[2px]" />
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 px-2">
                        <div
                          className="w-11 h-11 rounded-full group-hover/cat:scale-110 transition-transform duration-300"
                          style={{
                            background: `linear-gradient(135deg, ${cat.color}, ${cat.color}bb)`,
                            boxShadow: `0 6px 16px ${cat.color}50`,
                          }}
                        />
                        <div className="text-center">
                          <p className="text-zinc-800 text-[11px] md:text-xs font-black leading-tight line-clamp-2">{cat.name}</p>
                          <p className="text-zinc-400 text-[10px] font-medium mt-0.5">{catCount} {catCount === 1 ? 'item' : 'itens'}</p>
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

      {/* ── Products ───────────────────────────────── */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Results header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-1 h-5 rounded-full" style={{ background: `linear-gradient(to bottom, ${color}, ${color}55)` }} />
            {selectedCategory ? (
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-zinc-700">{selectedCategory}</span>
                <button
                  onClick={() => setSelectedCategory('')}
                  className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-700 bg-zinc-100 hover:bg-zinc-200 px-2 py-0.5 rounded-full transition-colors"
                >
                  <X size={10} /> limpar
                </button>
              </div>
            ) : (
              <span className="text-sm font-bold text-zinc-700">
                Catálogo <span className="font-medium text-zinc-400">· {filtered.length} produto{filtered.length !== 1 ? 's' : ''}</span>
              </span>
            )}
          </div>
          {filtered.length > 0 && (
            <span className="text-xs text-zinc-400 flex items-center gap-1.5">
              <SlidersHorizontal size={12} />
              {filtered.length} {filtered.length !== 1 ? 'resultados' : 'resultado'}
            </span>
          )}
        </div>

        <AnimatePresence mode="wait">
          {filtered.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="py-20 text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-zinc-100 flex items-center justify-center mx-auto mb-4">
                <Store size={28} className="text-zinc-300" />
              </div>
              <p className="text-zinc-500 font-medium mb-1">Nenhum produto encontrado</p>
              <p className="text-xs text-zinc-400">Tente outro filtro ou busca</p>
              {(search || selectedCategory) && (
                <button
                  onClick={() => { setSearch(''); setSelectedCategory(''); }}
                  className="mt-4 text-xs font-bold px-4 py-2 rounded-xl border border-zinc-200 hover:bg-zinc-50 transition-colors text-zinc-600"
                >
                  Limpar filtros
                </button>
              )}
            </motion.div>
          ) : (
            <motion.div
              key={`grid-${selectedCategory}-${search}`}
              initial="hidden"
              animate="visible"
              variants={{ visible: { transition: { staggerChildren: 0.045 } } }}
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4"
            >
              {filtered.map((product, i) => (
                <motion.div
                  key={product.sku}
                  variants={{
                    hidden: { opacity: 0, y: 20, scale: 0.97 },
                    visible: {
                      opacity: 1, y: 0, scale: 1,
                      transition: {
                        duration: 0.4,
                        delay: Math.min(i, 11) * 0.045,
                        ease: [0.22, 1, 0.36, 1],
                      },
                    },
                  }}
                >
                  <ProdutoCard
                    product={product}
                    primaryColor={color}
                    showPrices={config.show_prices}
                    slug={slug}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ── Floating WhatsApp ──────────────────────── */}
      {config.whatsapp_number && (
        <motion.a
          initial={{ opacity: 0, scale: 0, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 22, delay: 0.8 }}
          href={`https://wa.me/${config.whatsapp_number.replace(/\D/g, '')}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Falar no WhatsApp"
          className="fixed bottom-5 right-5 z-40 w-14 h-14 rounded-full flex items-center justify-center text-white
                     bg-gradient-to-br from-green-400 to-green-600 shadow-xl shadow-green-500/30
                     hover:scale-110 active:scale-95 transition-transform animate-pulse-ring"
        >
          <MessageCircle size={24} />
        </motion.a>
      )}

      {/* ── Footer ─────────────────────────────────── */}
      <footer className="mt-10 relative bg-white/60 backdrop-blur-sm">
        <div
          className="absolute inset-x-0 top-0 h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${color}45, transparent)` }}
        />
        <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-xl flex items-center justify-center text-white text-xs font-black"
              style={{ background: `linear-gradient(135deg, ${color}, ${color}bb)` }}
            >
              {config.store_name.charAt(0).toUpperCase()}
            </div>
            <span className="font-bold text-zinc-700 text-sm">{config.store_name}</span>
          </div>
          <p className="text-xs text-zinc-400">
            © {new Date().getFullYear()} {config.store_name} · <span className="text-zinc-300">Powered by NexusStores</span>
          </p>
          <div className="flex items-center gap-3">
            {config.instagram_url && (
              <a href={config.instagram_url} target="_blank" rel="noopener noreferrer"
                className="text-zinc-400 hover:text-pink-500 transition-colors">
                <Instagram size={16} />
              </a>
            )}
            {config.whatsapp_number && (
              <a href={`https://wa.me/${config.whatsapp_number.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                className="text-zinc-400 hover:text-green-500 transition-colors">
                <MessageCircle size={16} />
              </a>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ─── Page Export ────────────────────────────── */
export default function StorePage({ params }: { params: Promise<{ slug: string }> }) {
  const [slug, setSlug] = useState('');
  useEffect(() => { params.then(p => setSlug(p.slug)); }, [params]);
  if (!slug) return null;
  return (
    <CartProvider slug={slug}>
      <StoreContent slug={slug} />
    </CartProvider>
  );
}

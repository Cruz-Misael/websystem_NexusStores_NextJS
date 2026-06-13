'use client';
import { useState } from 'react';
import { ShoppingCart, ImageOff, Check } from 'lucide-react';
import { useCart } from './CartContext';

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

export function ProdutoCard({
  product,
  primaryColor,
  showPrices,
  slug,
}: {
  product: Product;
  primaryColor: string;
  showPrices: boolean;
  slug: string;
}) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    addItem({ sku: product.sku, name: product.name, unit_price: product.price ?? 0, imagem: product.imagem });
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  };

  return (
    <a
      href={`/loja/${slug}/produto/${product.sku}`}
      style={{ '--glow': primaryColor + '30' } as React.CSSProperties}
      className="group flex flex-col bg-white rounded-3xl overflow-hidden border border-zinc-100
                 shadow-[0_1px_8px_rgba(0,0,0,0.06)]
                 hover:shadow-[0_18px_44px_-12px_var(--glow),0_8px_24px_rgba(0,0,0,0.08)]
                 hover:-translate-y-1.5 transition-all duration-300 ease-out"
    >
      {/* Image */}
      <div className="relative aspect-[4/5] overflow-hidden bg-zinc-100">
        {product.imagem ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imagem}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-[1.07] transition-transform duration-500 ease-out"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-zinc-50 to-zinc-100">
            <ImageOff size={32} className="text-zinc-300" />
          </div>
        )}

        {/* Shine sweep on hover */}
        <div className="card-shine" />

        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/[0.04] transition-colors duration-300" />

        {/* Category badge */}
        {product.category && (
          <span className="absolute top-3 left-3 text-[10px] font-bold uppercase tracking-wider
                           bg-white/80 backdrop-blur-md border border-white/60 px-2.5 py-1 rounded-full text-zinc-600 shadow-sm">
            {product.category}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col flex-1 p-3.5 gap-1">
        <h3 className="text-sm font-bold text-zinc-800 leading-snug line-clamp-2">{product.name}</h3>

        {(product.color || product.size) && (
          <p className="text-[11px] text-zinc-400">
            {[product.color, product.size].filter(Boolean).join(' · ')}
          </p>
        )}

        <div className="flex items-center justify-between mt-auto pt-2.5">
          {showPrices && product.price ? (
            <span className="text-base font-black" style={{ color: primaryColor }}>
              {product.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          ) : (
            <span className="text-xs text-zinc-400 italic">Sob consulta</span>
          )}

          <button
            onClick={handleAdd}
            aria-label="Adicionar ao carrinho"
            style={{
              background: added
                ? 'linear-gradient(135deg, #34d399, #059669)'
                : `linear-gradient(135deg, ${primaryColor}, ${primaryColor}cc)`,
              boxShadow: `0 4px 14px ${added ? '#10b98155' : primaryColor + '55'}`,
            }}
            className="w-9 h-9 rounded-2xl flex items-center justify-center text-white
                       transition-all duration-300 active:scale-90 shrink-0
                       hover:scale-110 hover:rotate-3"
          >
            {added ? (
              <Check size={16} strokeWidth={2.5} />
            ) : (
              <ShoppingCart size={15} />
            )}
          </button>
        </div>
      </div>
    </a>
  );
}

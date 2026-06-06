'use client';
import { ShoppingCart, ImageOff } from 'lucide-react';
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

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    addItem({
      sku: product.sku,
      name: product.name,
      unit_price: product.price ?? 0,
      imagem: product.imagem,
    });
  };

  return (
    <a href={`/loja/${slug}/produto/${product.sku}`} className="group flex flex-col bg-white rounded-2xl border border-zinc-100 shadow-sm hover:shadow-md transition-all overflow-hidden">
      <div className="relative aspect-square bg-zinc-50 overflow-hidden">
        {product.imagem ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imagem}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-300">
            <ImageOff size={40} />
          </div>
        )}
        {product.category && (
          <span className="absolute top-2 left-2 text-[10px] font-bold uppercase bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full text-zinc-600">
            {product.category}
          </span>
        )}
      </div>

      <div className="flex flex-col flex-1 p-4 gap-2">
        <h3 className="text-sm font-bold text-zinc-800 leading-tight line-clamp-2">{product.name}</h3>
        {(product.color || product.size) && (
          <p className="text-[11px] text-zinc-400">
            {[product.color, product.size].filter(Boolean).join(' · ')}
          </p>
        )}

        <div className="flex items-center justify-between mt-auto pt-2">
          {showPrices && product.price ? (
            <span className="text-base font-black text-zinc-900">
              {product.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          ) : (
            <span className="text-xs text-zinc-400">Sob consulta</span>
          )}

          <button
            onClick={handleAdd}
            style={{ backgroundColor: primaryColor }}
            className="p-2 rounded-xl text-white hover:opacity-90 transition-opacity active:scale-95"
            aria-label="Adicionar ao carrinho"
          >
            <ShoppingCart size={16} />
          </button>
        </div>
      </div>
    </a>
  );
}

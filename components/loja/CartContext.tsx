'use client';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface CartItem {
  sku: number;
  name: string;
  unit_price: number;
  imagem?: string;
  quantity: number;
}

interface CartContextValue {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (sku: number) => void;
  updateQty: (sku: number, qty: number) => void;
  clearCart: () => void;
  total: number;
  count: number;
}

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = 'nexus_cart';

export function CartProvider({ slug, children }: { slug: string; children: React.ReactNode }) {
  const key = `${STORAGE_KEY}_${slug}`;
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored) setItems(JSON.parse(stored));
    } catch { /* ignore */ }
  }, [key]);

  const persist = useCallback((next: CartItem[]) => {
    setItems(next);
    try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* ignore */ }
  }, [key]);

  const addItem = useCallback((item: Omit<CartItem, 'quantity'>) => {
    setItems(prev => {
      const existing = prev.find(i => i.sku === item.sku);
      const next = existing
        ? prev.map(i => i.sku === item.sku ? { ...i, quantity: i.quantity + 1 } : i)
        : [...prev, { ...item, quantity: 1 }];
      try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, [key]);

  const removeItem = useCallback((sku: number) => {
    persist(items.filter(i => i.sku !== sku));
  }, [items, persist]);

  const updateQty = useCallback((sku: number, qty: number) => {
    if (qty <= 0) { persist(items.filter(i => i.sku !== sku)); return; }
    persist(items.map(i => i.sku === sku ? { ...i, quantity: qty } : i));
  }, [items, persist]);

  const clearCart = useCallback(() => persist([]), [persist]);

  const total = items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);
  const count = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQty, clearCart, total, count }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}

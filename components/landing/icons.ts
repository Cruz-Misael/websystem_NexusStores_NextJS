// components/landing/icons.ts
//
// Os benefícios da landing guardam no banco só o NOME do ícone, não o desenho.
// Este mapa é a ponte. Ícone desconhecido cai no padrão em vez de quebrar a
// página — o conteúdo é editado por quem vende lingerie, não por quem conhece
// o catálogo do lucide.

import {
  BadgeCheck, CalendarDays, Clock, Crown, Gift, HandCoins, Heart, Home,
  Package, ShieldCheck, Shirt, Smile, Sparkles, Star, TrendingUp, Truck,
  Users, Wallet, type LucideIcon,
} from 'lucide-react';

export const ICONES_LANDING: Record<string, LucideIcon> = {
  wallet: Wallet,
  clock: Clock,
  sparkles: Sparkles,
  shield: ShieldCheck,
  heart: Heart,
  'trending-up': TrendingUp,
  package: Package,
  users: Users,
  truck: Truck,
  star: Star,
  gift: Gift,
  smile: Smile,
  'badge-check': BadgeCheck,
  calendar: CalendarDays,
  home: Home,
  shirt: Shirt,
  crown: Crown,
  'hand-coins': HandCoins,
};

/** Rótulos em português para o seletor de ícone em Configurações. */
export const ROTULOS_ICONES: Record<keyof typeof ICONES_LANDING, string> = {
  wallet: 'Carteira',
  clock: 'Relógio',
  sparkles: 'Brilho',
  shield: 'Escudo',
  heart: 'Coração',
  'trending-up': 'Crescimento',
  package: 'Pacote',
  users: 'Pessoas',
  truck: 'Entrega',
  star: 'Estrela',
  gift: 'Presente',
  smile: 'Sorriso',
  'badge-check': 'Selo',
  calendar: 'Calendário',
  home: 'Casa',
  shirt: 'Roupa',
  crown: 'Coroa',
  'hand-coins': 'Dinheiro na mão',
};

export function iconeDoBeneficio(nome: string | undefined): LucideIcon {
  return ICONES_LANDING[nome ?? ''] ?? Sparkles;
}

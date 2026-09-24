// src/services/landing.service.ts
//
// Leitura da landing page pública. Roda SÓ no servidor: usa a chave de serviço,
// que ignora RLS. Não importe este arquivo de um componente com 'use client'.
//
// A página é um Server Component e chama esta função direto, sem passar por
// /api/loja/[slug]. Um site de divulgação vive de ser encontrado no Google e de
// abrir rápido no 4G: buscar os dados aqui deixa o HTML já pronto na primeira
// resposta, em vez de mandar o navegador pedir de novo depois de carregar o JS.

import { supabaseAdmin } from '@/src/lib/supabase/admin';
import type { LandingBenefit, LandingFaqItem, LandingStep } from './website.service';

export interface LandingData {
  slug: string;
  store_name: string;
  logo_url: string | null;
  banner_url: string;
  primary_color: string;
  whatsapp_number: string;
  instagram_url: string;

  hero_eyebrow: string;
  hero_title: string;
  tagline: string;
  description: string;

  cta_revendedora_label: string;
  cta_revendedora_message: string;
  cta_cliente_label: string;
  cta_cliente_message: string;

  consignado_title: string;
  consignado_subtitle: string;
  consignado_steps: LandingStep[];

  benefits_title: string;
  benefits_subtitle: string;
  benefits: LandingBenefit[];

  about_title: string;
  about_text: string;
  about_image_url: string;
  owner_name: string;
  owner_role: string;
  owner_quote: string;
  owner_photo_url: string;

  faq_title: string;
  faq: LandingFaqItem[];

  contact_title: string;
  contact_text: string;
  show_address: boolean;
  endereco: string;
  telefone: string;
}

const COLUNAS = `
  slug, store_name, banner_url, primary_color, whatsapp_number, instagram_url, is_published,
  hero_eyebrow, hero_title, tagline, description,
  cta_revendedora_label, cta_revendedora_message, cta_cliente_label, cta_cliente_message,
  consignado_title, consignado_subtitle, consignado_steps,
  benefits_title, benefits_subtitle, benefits,
  about_title, about_text, about_image_url,
  owner_name, owner_role, owner_quote, owner_photo_url,
  faq_title, faq,
  contact_title, contact_text, show_address, logo_site_url
`;

const texto = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

/** jsonb chega como `unknown`. A constraint no banco garante que é array, mas
 *  linha antiga pode ter null e item pode vir sem campo — a página não é lugar
 *  de descobrir isso. */
function lista<T>(valor: unknown, obrigatorios: (keyof T)[]): T[] {
  if (!Array.isArray(valor)) return [];
  return valor.filter((item): item is T => {
    if (!item || typeof item !== 'object') return false;
    return obrigatorios.every(campo => texto((item as Record<string, unknown>)[campo as string]) !== '');
  });
}

/** O campo do Instagram é texto livre, e o que está lá dentro pode ser um
 *  arroba, um endereço completo ou um erro de digitação. Aceita o que dá para
 *  aproveitar, normaliza, e devolve vazio para o resto — um ícone que leva a
 *  lugar nenhum é pior do que ícone nenhum. */
function normalizarInstagram(valor: unknown): string {
  const bruto = texto(valor);
  if (!bruto) return '';

  if (bruto.startsWith('@')) {
    const usuario = bruto.slice(1).replace(/\/+$/, '');
    return /^[A-Za-z0-9._]{1,30}$/.test(usuario) ? `https://instagram.com/${usuario}` : '';
  }

  try {
    const url = new URL(bruto.includes('://') ? bruto : `https://${bruto}`);
    const host = url.hostname.replace(/^www\./, '');
    if (host !== 'instagram.com' && !host.endsWith('.instagram.com')) return '';
    return url.toString();
  } catch {
    return '';
  }
}

function montarEndereco(c: Record<string, unknown> | null): string {
  if (!c) return '';
  const rua = [texto(c.address_street), texto(c.address_number)].filter(Boolean).join(', ');
  const cidade = [texto(c.city), texto(c.state)].filter(Boolean).join('/');
  return [rua, texto(c.neighbourhood), cidade, texto(c.cep)].filter(Boolean).join(' · ');
}

export async function getLandingData(slug: string): Promise<LandingData | null> {
  const { data: config, error } = await supabaseAdmin
    .from('website_config')
    .select(COLUNAS)
    .eq('slug', slug)
    .maybeSingle();

  if (error || !config) return null;

  const c = config as unknown as Record<string, unknown>;
  if (!c.is_published) return null;

  const { data: empresa } = await supabaseAdmin
    .from('companies')
    .select('logo_url, phone, address_street, address_number, neighbourhood, city, state, cep')
    .limit(1)
    .maybeSingle();

  const e = (empresa ?? null) as Record<string, unknown> | null;
  const nome = texto(c.store_name) || 'Nossa loja';

  return {
    slug: texto(c.slug),
    store_name: nome,
    // A logo do site (já aparada) vem primeiro; a da empresa é o plano B.
    logo_url: texto(c.logo_site_url) || texto(e?.logo_url) || null,
    banner_url: texto(c.banner_url),
    primary_color: texto(c.primary_color) || '#6366f1',
    whatsapp_number: texto(c.whatsapp_number).replace(/\D/g, ''),
    instagram_url: normalizarInstagram(c.instagram_url),

    hero_eyebrow: texto(c.hero_eyebrow),
    hero_title: texto(c.hero_title) || nome,
    tagline: texto(c.tagline),
    description: texto(c.description),

    cta_revendedora_label: texto(c.cta_revendedora_label) || 'Quero ser revendedora',
    cta_revendedora_message: texto(c.cta_revendedora_message)
      || `Oi! Vi o site da ${nome} e quero saber como ser revendedora.`,
    cta_cliente_label: texto(c.cta_cliente_label) || 'Quero comprar',
    cta_cliente_message: texto(c.cta_cliente_message)
      || `Oi! Vi o site da ${nome} e gostaria de conhecer as peças.`,

    consignado_title: texto(c.consignado_title),
    consignado_subtitle: texto(c.consignado_subtitle),
    consignado_steps: lista<LandingStep>(c.consignado_steps, ['title', 'text']),

    benefits_title: texto(c.benefits_title),
    benefits_subtitle: texto(c.benefits_subtitle),
    benefits: lista<LandingBenefit>(c.benefits, ['title', 'text']),

    about_title: texto(c.about_title),
    about_text: texto(c.about_text),
    about_image_url: texto(c.about_image_url),
    owner_name: texto(c.owner_name),
    owner_role: texto(c.owner_role),
    owner_quote: texto(c.owner_quote),
    owner_photo_url: texto(c.owner_photo_url),

    faq_title: texto(c.faq_title),
    faq: lista<LandingFaqItem>(c.faq, ['q', 'a']),

    contact_title: texto(c.contact_title),
    contact_text: texto(c.contact_text),
    show_address: c.show_address !== false,
    endereco: montarEndereco(e),
    telefone: texto(e?.phone),
  };
}

/** Link de WhatsApp já com a mensagem escrita. Sem número configurado devolve
 *  vazio — e quem chama esconde o botão, em vez de mostrar um link morto. */
export function linkWhatsApp(numero: string, mensagem: string): string {
  if (!numero) return '';
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
}

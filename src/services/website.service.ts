import { supabase } from "@/src/lib/supabase/client";

/* ─── Listas editáveis da landing ─────────────────────────────────────────── */

export interface LandingStep {
  title: string;
  text: string;
}

export interface LandingBenefit {
  /** Chave do mapa em components/landing/icons.ts. Desconhecida cai no ícone padrão. */
  icon: string;
  title: string;
  text: string;
}

export interface LandingFaqItem {
  q: string;
  a: string;
}

/** Só os campos que a aba Landing edita. Serve para salvar um recorte da
 *  configuração sem arrastar junto token de pagamento e dados de frete. */
export interface LandingContent {
  /** Logo usada só no site, sem a margem que a arte de recibo costuma ter.
   *  Vazio: a landing cai na logo da empresa (companies.logo_url). */
  logo_site_url?: string;
  hero_eyebrow?: string;
  hero_title?: string;
  tagline?: string;
  description?: string;
  cta_revendedora_label?: string;
  cta_revendedora_message?: string;
  cta_cliente_label?: string;
  cta_cliente_message?: string;
  consignado_title?: string;
  consignado_subtitle?: string;
  consignado_steps?: LandingStep[];
  benefits_title?: string;
  benefits_subtitle?: string;
  benefits?: LandingBenefit[];
  about_title?: string;
  about_text?: string;
  about_image_url?: string;
  owner_name?: string;
  owner_role?: string;
  owner_quote?: string;
  owner_photo_url?: string;
  faq_title?: string;
  faq?: LandingFaqItem[];
  contact_title?: string;
  contact_text?: string;
  show_address?: boolean;
}

export interface WebsiteConfig extends LandingContent {
  id?: string;
  slug: string;
  store_name: string;
  banner_url?: string;
  primary_color: string;
  whatsapp_number?: string;
  instagram_url?: string;
  show_prices: boolean;
  mercadopago_access_token?: string;
  mercadopago_public_key?: string;
  is_published: boolean;
  /** Loja online (catálogo, carrinho, checkout). Desligada desde que o site
   *  virou landing page — ver app/(store)/loja/[slug]/_desativado/README.md. */
  online_store_enabled?: boolean;
  // Shipping
  melhor_envio_token?: string;
  shipping_origin_cep?: string;
  package_default_weight?: number;
  package_default_height?: number;
  package_default_width?: number;
  package_default_length?: number;
  free_shipping_min_amount?: number | null;
  // Discounts
  discount_global_percent?: number;
  discount_min_order_amount?: number | null;
  discount_min_order_percent?: number;
  created_at?: string;
  updated_at?: string;
}

/** Colunas que a aba Landing pode escrever. Existe para que um `...config`
 *  distraído nunca mande `id`, `created_at` ou token de pagamento no update. */
const CAMPOS_LANDING: (keyof LandingContent)[] = [
  'logo_site_url',
  'hero_eyebrow', 'hero_title', 'tagline', 'description',
  'cta_revendedora_label', 'cta_revendedora_message',
  'cta_cliente_label', 'cta_cliente_message',
  'consignado_title', 'consignado_subtitle', 'consignado_steps',
  'benefits_title', 'benefits_subtitle', 'benefits',
  'about_title', 'about_text', 'about_image_url',
  'owner_name', 'owner_role', 'owner_quote', 'owner_photo_url',
  'faq_title', 'faq',
  'contact_title', 'contact_text', 'show_address',
];

export async function getWebsiteConfig(): Promise<WebsiteConfig | null> {
  const { data, error } = await supabase
    .from("website_config")
    .select("*")
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function upsertWebsiteConfig(config: WebsiteConfig): Promise<WebsiteConfig> {
  if (config.id) {
    const { data, error } = await supabase
      .from("website_config")
      .update({ ...config, updated_at: new Date().toISOString() })
      .eq("id", config.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }
  const { data, error } = await supabase
    .from("website_config")
    .insert([config])
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

/** Salva só o conteúdo da landing. Ao contrário do upsert acima, não devolve a
 *  configuração inteira para o banco — então duas abas abertas ao mesmo tempo
 *  não desfazem o trabalho uma da outra. */
export async function updateLandingContent(id: string, content: LandingContent): Promise<WebsiteConfig> {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const campo of CAMPOS_LANDING) {
    if (content[campo] !== undefined) patch[campo] = content[campo];
  }

  const { data, error } = await supabase
    .from("website_config")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function uploadBanner(file: File): Promise<string> {
  return uploadImagemSite(file, 'banner');
}

/** Sobe uma imagem da landing (banner, foto da loja, retrato da fundadora)
 *  para o bucket público `logos`, que já é o bucket de imagens da marca. */
export async function uploadImagemSite(file: File, prefixo: string): Promise<string> {
  const ext = file.name.split('.').pop();
  const filePath = `${prefixo}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('logos').upload(filePath, file);
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from('logos').getPublicUrl(filePath);
  return data.publicUrl;
}

export async function toggleProdutoNoSite(sku: number, showOnWebsite: boolean) {
  const { error } = await supabase
    .from("products")
    .update({ show_on_website: showOnWebsite })
    .eq("sku", sku);
  if (error) throw new Error(error.message);
}

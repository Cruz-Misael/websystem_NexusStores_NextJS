import { supabase } from "@/src/lib/supabase/client";

export interface WebsiteConfig {
  id?: string;
  slug: string;
  store_name: string;
  tagline?: string;
  description?: string;
  banner_url?: string;
  primary_color: string;
  whatsapp_number?: string;
  instagram_url?: string;
  show_prices: boolean;
  mercadopago_access_token?: string;
  mercadopago_public_key?: string;
  is_published: boolean;
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

export async function uploadBanner(file: File): Promise<string> {
  const ext = file.name.split('.').pop();
  const filePath = `banner-${Date.now()}.${ext}`;
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

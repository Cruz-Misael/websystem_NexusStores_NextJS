import { supabase } from "@/src/lib/supabase/client";

export interface ProductCategory {
  id: string;
  name: string;
  description: string | null;
  color: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export async function listarCategorias(): Promise<ProductCategory[]> {
  const { data, error } = await supabase
    .from("product_categories")
    .select("*")
    .eq("is_active", true)
    .order("name");
  if (error) throw new Error(`Erro ao listar categorias: ${error.message}`);
  return data || [];
}

export async function listarTodasCategorias(): Promise<ProductCategory[]> {
  const { data, error } = await supabase
    .from("product_categories")
    .select("*")
    .order("name");
  if (error) throw new Error(`Erro ao listar categorias: ${error.message}`);
  return data || [];
}

export async function criarCategoria(categoria: {
  name: string;
  description?: string;
  color?: string;
}): Promise<ProductCategory> {
  const { data, error } = await supabase
    .from("product_categories")
    .insert([categoria])
    .select()
    .single();
  if (error) throw new Error(`Erro ao criar categoria: ${error.message}`);
  return data;
}

export async function atualizarCategoria(
  id: string,
  categoria: Partial<Omit<ProductCategory, "id" | "created_at">>
): Promise<ProductCategory> {
  const { data, error } = await supabase
    .from("product_categories")
    .update({ ...categoria, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(`Erro ao atualizar categoria: ${error.message}`);
  return data;
}

export async function deletarCategoria(id: string): Promise<void> {
  const { error } = await supabase
    .from("product_categories")
    .delete()
    .eq("id", id);
  if (error) throw new Error(`Erro ao deletar categoria: ${error.message}`);
}

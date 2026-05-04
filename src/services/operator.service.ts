import { supabase } from "@/src/lib/supabase/client";

export interface OperatorPermissions {
  can_cancel_sale: boolean;
  can_give_discount: boolean;
  can_process_return: boolean;
  max_discount_percentage: number;
}

export interface Operator {
  id: string;
  name: string;
  code: string | null;
  pin: string | null;
  email: string | null;
  phone: string | null;
  role: "operator" | "supervisor" | "manager";
  permissions: OperatorPermissions;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const defaultPermissions: OperatorPermissions = {
  can_cancel_sale: false,
  can_give_discount: true,
  can_process_return: false,
  max_discount_percentage: 10,
};

export async function listarOperadores(): Promise<Operator[]> {
  const { data, error } = await supabase
    .from("operators")
    .select("*")
    .order("name");
  if (error) throw new Error(`Erro ao listar operadores: ${error.message}`);
  return (data || []).map((op) => ({
    ...op,
    permissions: op.permissions ?? defaultPermissions,
  }));
}

export async function criarOperador(
  operador: Omit<Operator, "id" | "created_at" | "updated_at">
): Promise<Operator> {
  const { data, error } = await supabase
    .from("operators")
    .insert([operador])
    .select()
    .single();
  if (error) throw new Error(`Erro ao criar operador: ${error.message}`);
  return data;
}

export async function atualizarOperador(
  id: string,
  operador: Partial<Omit<Operator, "id" | "created_at">>
): Promise<Operator> {
  const { data, error } = await supabase
    .from("operators")
    .update({ ...operador, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(`Erro ao atualizar operador: ${error.message}`);
  return data;
}

export async function deletarOperador(id: string): Promise<void> {
  const { error } = await supabase
    .from("operators")
    .delete()
    .eq("id", id);
  if (error) throw new Error(`Erro ao deletar operador: ${error.message}`);
}

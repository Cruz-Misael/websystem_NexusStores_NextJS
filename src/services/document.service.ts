// src/services/document.service.ts
import { supabase } from "@/src/lib/supabase/client";

export async function criarDocumento(
  document_file: string, 
  people_id: number, 
  fileInfo?: { name: string; type: string; size: number }
) {
  console.log("Criando documento para people_id:", people_id);

  const { data, error } = await supabase
    .from("documents")
    .insert([{ 
      document_file, 
      people_id, // Nome correto da coluna
      file_name: fileInfo?.name,
      file_type: fileInfo?.type,
      file_size: fileInfo?.size
    }])
    .select()
    .single();

  if (error) {
    console.error("Erro ao criar documento:", error);
    throw new Error(`Erro ao criar documento: ${error.message}`);
  }

  console.log("Documento criado:", data);
  return data;
}

export async function listarDocumentosPorPessoa(peopleId: number) {
  console.log("Listando documentos da people_id:", peopleId);

  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("people_id", peopleId) // Nome correto da coluna
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro ao listar documentos:", error);
    throw new Error(`Erro ao listar documentos: ${error.message}`);
  }

  return data || [];
}

export async function deletarDocumento(id: number) {
  console.log("Deletando documento ID:", id);

  const { error } = await supabase
    .from("documents")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Erro ao deletar documento:", error);
    throw new Error(`Erro ao deletar documento: ${error.message}`);
  }

  return { success: true };
}
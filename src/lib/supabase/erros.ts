// src/lib/supabase/erros.ts
// Leitura dos erros do Supabase que a interface precisa distinguir.

/** O formato mínimo de erro devolvido pelo supabase-js. */
interface ErroSupabase {
  code?: string | null;
  message?: string | null;
}

/**
 * A tabela ainda não existe — é migration pendente, não erro de uso, e a tela
 * deve avisar qual arquivo SQL falta em vez de mostrar uma falha.
 *
 * São dois códigos porque são duas camadas: o PostgREST responde `PGRST205`
 * ("Could not find the table 'public.x' in the schema cache") quando a tabela
 * não está no cache de schema, e o Postgres responde `42P01` quando o erro sobe
 * de dentro de uma função ou RPC. Tratar só um deixa o outro vazar como erro
 * genérico — foi o que aconteceu na tela de histórico.
 */
export function ehTabelaInexistente(erro: ErroSupabase | null | undefined): boolean {
  if (!erro) return false;
  if (erro.code === "PGRST205" || erro.code === "42P01") return true;
  return /could not find the table/i.test(erro.message || "");
}

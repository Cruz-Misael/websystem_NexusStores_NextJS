// src/lib/supabase/admin.ts
import { createClient } from '@supabase/supabase-js';

// NOTA: Estas variáveis de ambiente são usadas apenas no lado do servidor.
// NUNCA exponha a service_role_key no lado do cliente.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Este é o cliente "admin" do Supabase. Ele bypassa as políticas de RLS.
// Use-o com cuidado e apenas em rotas de API seguras no servidor.
export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

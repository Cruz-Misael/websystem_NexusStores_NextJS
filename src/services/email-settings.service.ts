// src/services/email-settings.service.ts
// Remetente dos e-mails do sistema, configurável pela loja em
// Configurações › E-mail (sem mexer em variável de ambiente nem redeploy).
import { supabase } from "@/src/lib/supabase/client";

import { ehTabelaInexistente } from "@/src/lib/supabase/erros";

export interface EmailSettings {
  from_name: string;
  from_address: string;
  reply_to: string;
}

export const EMAIL_SETTINGS_PADRAO: EmailSettings = {
  from_name: "",
  from_address: "",
  reply_to: "",
};

export async function carregarEmailSettings(): Promise<{ settings: EmailSettings; migracaoPendente: boolean }> {
  const { data, error } = await supabase
    .from("email_settings")
    .select("from_name, from_address, reply_to")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    if (ehTabelaInexistente(error)) return { settings: EMAIL_SETTINGS_PADRAO, migracaoPendente: true };
    throw new Error(error.message);
  }

  return { settings: (data as EmailSettings) ?? EMAIL_SETTINGS_PADRAO, migracaoPendente: false };
}

export async function salvarEmailSettings(settings: EmailSettings): Promise<void> {
  const { error } = await supabase.from("email_settings").upsert({
    id: 1,
    from_name: settings.from_name.trim(),
    from_address: settings.from_address.trim(),
    reply_to: settings.reply_to.trim(),
    updated_at: new Date().toISOString(),
  });

  if (error) throw new Error(error.message);
}

export interface ResultadoTeste {
  ok: boolean;
  to?: string;
  from?: string;
  usandoEnderecoDeTeste?: boolean;
  error?: string;
}

/** Dispara o e-mail de teste pelo servidor e devolve o motivo legível se falhar. */
export async function enviarEmailDeTeste(to?: string): Promise<ResultadoTeste> {
  const res = await fetch("/api/email/teste", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ to }),
  });

  const json = await res.json();
  if (!res.ok) return { ok: false, error: json?.error || "Falha ao enviar o teste" };
  return json as ResultadoTeste;
}

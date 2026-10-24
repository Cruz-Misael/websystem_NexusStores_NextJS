// src/lib/loja-online.ts
//
// O site público virou landing page: não há mais catálogo, carrinho nem
// checkout. As rotas que criavam pedido, calculavam frete e validavam cupom
// continuam no repositório (a decisão foi desligar, não apagar) — mas continuar
// existindo não é motivo para continuar aceitando requisição.
//
// Sem esta trava, /api/loja/finalizar-pedido seguiria sendo uma porta de
// escrita pública, sem tela nenhuma na frente, para um recurso que ninguém
// mais usa. Porta que não serve a nada deve estar fechada.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from './supabase/admin';

/** Devolve uma resposta 404 quando a loja online está desligada, e `null`
 *  quando está ligada. Uso: `const off = await bloqueioLojaOnline(); if (off) return off;` */
export async function bloqueioLojaOnline(): Promise<NextResponse | null> {
  const { data } = await supabaseAdmin
    .from('website_config')
    .select('online_store_enabled')
    .limit(1)
    .maybeSingle();

  if (data?.online_store_enabled === true) return null;

  return NextResponse.json(
    { error: 'A loja online está desativada.' },
    { status: 404 },
  );
}

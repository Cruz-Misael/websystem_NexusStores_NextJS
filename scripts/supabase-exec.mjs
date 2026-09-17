#!/usr/bin/env node
// scripts/supabase-exec.mjs
//
// Porta única de acesso ao banco pela linha de comando. Existe para que a
// permissão dada ao assistente seja estreita: em vez de liberar `curl` para a
// internet inteira, libera-se só este script, que fala apenas com o Supabase
// deste projeto e registra o que faz.
//
// PROTEÇÃO PRINCIPAL: escrita (POST/PATCH/DELETE) roda em modo simulação por
// padrão — mostra exatamente quais linhas seriam afetadas e não muda nada.
// Só com --confirm a operação acontece de verdade.
//
// USO
//   node scripts/supabase-exec.mjs --path "sales?id=eq.214&select=*"
//   node scripts/supabase-exec.mjs --method DELETE --path "sale_items?id=in.(1,2)"
//   node scripts/supabase-exec.mjs --method DELETE --path "sale_items?id=in.(1,2)" --confirm
//   node scripts/supabase-exec.mjs --method PATCH  --path "sales?id=eq.214" --body ajuste.json --confirm
//
// As chaves saem do .env.local e nunca são impressas.

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const METODOS = ['GET', 'POST', 'PATCH', 'DELETE'];

function lerEnv() {
  const texto = readFileSync(resolve(RAIZ, '.env.local'), 'utf8');
  const pegar = (chave) =>
    texto.match(new RegExp(`^${chave}=(.*)$`, 'm'))?.[1]?.trim().replace(/\r$/, '');

  const url = pegar('NEXT_PUBLIC_SUPABASE_URL');
  const key = pegar('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) {
    console.error('Faltam NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY no .env.local');
    process.exit(1);
  }
  return { url: url.replace(/\/$/, ''), key };
}

function lerArgs(argv) {
  const args = { method: 'GET', path: null, body: null, confirm: false, limit: 200 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--method') args.method = String(argv[++i]).toUpperCase();
    else if (a === '--path') args.path = argv[++i];
    else if (a === '--body') args.body = argv[++i];
    else if (a === '--confirm') args.confirm = true;
    else if (a === '--limit') args.limit = Number(argv[++i]);
  }
  return args;
}

const { url, key } = lerEnv();
const args = lerArgs(process.argv.slice(2));

if (!args.path) {
  console.error('Informe --path (ex.: "sales?id=eq.214&select=*")');
  process.exit(1);
}
if (!METODOS.includes(args.method)) {
  console.error(`Método inválido: ${args.method}. Use um de ${METODOS.join(', ')}.`);
  process.exit(1);
}

const escrita = args.method !== 'GET';
const cabecalhos = {
  apikey: key,
  Authorization: `Bearer ${key}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
};

async function chamar(method, caminho, corpo) {
  const resp = await fetch(`${url}/rest/v1/${caminho}`, {
    method,
    headers: cabecalhos,
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const texto = await resp.text();
  let json;
  try { json = texto ? JSON.parse(texto) : null; } catch { json = texto; }
  return { ok: resp.ok, status: resp.status, json };
}

// Em simulação, troca a escrita por uma leitura do mesmo filtro: é a forma de
// mostrar o alvo exato sem encostar nele.
function caminhoDeLeitura(caminho) {
  const [tabela, query = ''] = caminho.split('?');
  const filtros = query
    .split('&')
    .filter((p) => p && !p.startsWith('select='))
    .join('&');
  return `${tabela}?${filtros}${filtros ? '&' : ''}select=*`;
}

const corpo = args.body ? JSON.parse(readFileSync(resolve(RAIZ, args.body), 'utf8')) : null;

if (escrita && !args.confirm) {
  console.log(`SIMULAÇÃO — ${args.method} em "${args.path}" (nada foi alterado)`);
  const { ok, status, json } = await chamar('GET', caminhoDeLeitura(args.path));
  if (!ok) {
    console.error(`Falha ao consultar o alvo (HTTP ${status}):`, json);
    process.exit(1);
  }
  const linhas = Array.isArray(json) ? json : [json];
  console.log(`linhas que seriam afetadas: ${linhas.length}`);
  console.log(JSON.stringify(linhas.slice(0, args.limit), null, 2));
  console.log('\nPara aplicar de verdade, repita o comando com --confirm');
  process.exit(0);
}

const { ok, status, json } = await chamar(args.method, args.path, corpo);
if (!ok) {
  console.error(`HTTP ${status}`);
  console.error(JSON.stringify(json, null, 2));
  process.exit(1);
}

const linhas = Array.isArray(json) ? json : json ? [json] : [];
console.log(`${args.method} ok (HTTP ${status}) — ${linhas.length} linha(s)`);
console.log(JSON.stringify(linhas.slice(0, args.limit), null, 2));

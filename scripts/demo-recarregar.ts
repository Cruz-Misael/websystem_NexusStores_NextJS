// scripts/demo-recarregar.ts
// Recarrega AGORA os dados de exemplo do ambiente de demonstração — o mesmo
// que o cron diário faz. Útil antes de uma apresentação ou depois de mudar os
// dados de exemplo em src/lib/demo-dados.ts.
//
// USO (a partir da raiz do repositório)
//   npx tsx scripts/demo-recarregar.ts                       usa o .env.local daqui
//   npx tsx scripts/demo-recarregar.ts --env ../outro/.env.local
//
// Só roda contra o projeto de demonstração: com o .env.local de uma loja de
// verdade, recarregarDemo() recusa antes de apagar qualquer coisa.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { recarregarDemo } from '../src/lib/demo-dados';

const iEnv = process.argv.indexOf('--env');
const arquivo = resolve(iEnv > -1 ? process.argv[iEnv + 1] : '.env.local');
const env = Object.fromEntries(
  readFileSync(arquivo, 'utf8').split(/\r?\n/)
    .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/))
    .filter((m): m is RegExpMatchArray => m !== null)
    .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]),
);
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const chave = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !chave) {
  console.error(`NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY precisam estar em ${arquivo}`);
  process.exit(1);
}

const db = createClient(url, chave, { auth: { autoRefreshToken: false, persistSession: false } });
recarregarDemo(db, url)
  .then((resumo) => console.log(JSON.stringify(resumo, null, 2)))
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });

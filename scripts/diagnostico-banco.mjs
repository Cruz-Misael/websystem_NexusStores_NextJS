#!/usr/bin/env node
// scripts/diagnostico-banco.mjs
//
// Retrato do banco: tamanho, uso de índice, cache, conexões e o porte da
// máquina. Só leitura — não altera nada. Serve para responder "está lento por
// causa do plano ou por causa do código?" com número em vez de palpite.
//
// USO: node scripts/diagnostico-banco.mjs

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const url = readFileSync(resolve(RAIZ, '.env.local'), 'utf8')
  .match(/^DATABASE_URL=(.*)$/m)?.[1]?.trim().replace(/\r$/, '');
if (!url) { console.error('DATABASE_URL não encontrada no .env.local'); process.exit(1); }

const cli = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });

const titulo = (t) => console.log(`\n===== ${t} =====`);
const tabela = (linhas) => {
  if (!linhas.length) return console.log('  (nada)');
  for (const l of linhas) console.log('  ' + Object.values(l).map(String).join(' | '));
};

async function q(sql, params) {
  try {
    return (await cli.query(sql, params)).rows;
  } catch (e) {
    console.log('  (indisponível: ' + e.message.split('\n')[0] + ')');
    return [];
  }
}

await cli.connect();

titulo('PORTE DA MÁQUINA');
tabela(await q(`
  select name, setting, unit from pg_settings
   where name in ('shared_buffers','effective_cache_size','max_connections','work_mem','maintenance_work_mem')
   order by name`));
tabela(await q(`select version() as versao`));

titulo('TAMANHO');
tabela(await q(`select pg_size_pretty(pg_database_size(current_database())) as banco_total`));
tabela(await q(`
  select relname as tabela,
         to_char(n_live_tup, 'FM999G999') as linhas,
         pg_size_pretty(pg_total_relation_size(relid)) as tamanho
    from pg_stat_user_tables
   where schemaname = 'public'
   order by pg_total_relation_size(relid) desc
   limit 12`));

titulo('VARREDURA SEQUENCIAL (tabela lida inteira; índice faltando aparece aqui)');
tabela(await q(`
  select relname as tabela,
         seq_scan as varreduras,
         to_char(seq_tup_read,'FM999G999G999') as linhas_lidas,
         idx_scan as por_indice,
         n_live_tup as linhas_hoje
    from pg_stat_user_tables
   where schemaname = 'public' and seq_scan > 0
   order by seq_tup_read desc
   limit 12`));

titulo('ÍNDICES NAS COLUNAS QUENTES');
tabela(await q(`
  select tablename as tabela, indexname as indice
    from pg_indexes
   where schemaname = 'public'
     and tablename in ('sale_items','sales','returns','return_items','products','people','sale_events')
   order by tablename, indexname`));

titulo('CACHE (quanto é servido da memória)');
tabela(await q(`
  select case when blks_hit + blks_read = 0 then 'sem dados'
              else round(100.0 * blks_hit / (blks_hit + blks_read), 2) || '%' end as acerto_de_cache,
         xact_commit as transacoes,
         deadlocks
    from pg_stat_database where datname = current_database()`));

titulo('CONEXÕES AGORA');
tabela(await q(`
  select state, count(*) as quantas
    from pg_stat_activity where datname = current_database()
   group by state order by count(*) desc`));

titulo('CONSULTAS MAIS CARAS (pg_stat_statements)');
tabela(await q(`
  select round(total_exec_time::numeric)::text || ' ms' as tempo_total,
         calls as chamadas,
         round(mean_exec_time::numeric, 1)::text || ' ms' as media,
         left(regexp_replace(query, '\\s+', ' ', 'g'), 110) as consulta
    from pg_stat_statements
   order by total_exec_time desc
   limit 12`));

titulo('LATÊNCIA DAQUI ATÉ O BANCO');
for (let i = 0; i < 5; i++) {
  const t0 = Date.now();
  await cli.query('select 1');
  console.log(`  ida e volta ${i + 1}: ${Date.now() - t0} ms`);
}

await cli.end();

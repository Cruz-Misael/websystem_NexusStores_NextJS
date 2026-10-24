#!/usr/bin/env node
// scripts/aplicar-sql.mjs
// Aplica arquivos .sql no banco usando a DATABASE_URL do .env.local.
//
// Tudo roda numa transação única: DDL no Postgres é transacional, então ou os
// arquivos entram inteiros ou não entra nada. Depois de aplicar (e antes de
// confirmar), roda os testes de acesso pedidos em --verificar; se algum falhar,
// desfaz. Sem --confirm, sempre desfaz — é o modo de ensaio.
//
// USO
//   node scripts/aplicar-sql.mjs sql/a.sql sql/b.sql            (ensaio)
//   node scripts/aplicar-sql.mjs sql/a.sql --confirm            (aplica)

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const url = readFileSync(resolve(RAIZ, '.env.local'), 'utf8')
  .match(/^DATABASE_URL=(.*)$/m)?.[1]?.trim().replace(/\r$/, '');
if (!url) {
  console.error('DATABASE_URL não encontrada no .env.local');
  process.exit(1);
}

const args = process.argv.slice(2);
const confirmar = args.includes('--confirm');
const arquivos = args.filter((a) => !a.startsWith('--'));
if (arquivos.length === 0) {
  console.error('Informe ao menos um arquivo .sql');
  process.exit(1);
}

/**
 * Roda uma consulta no papel de um usuário logado, como o PostgREST faria.
 * Cada teste vai dentro de um savepoint: um erro de permissão aborta só o
 * savepoint, e não a transação inteira — senão o primeiro tropeço derruba
 * todas as verificações seguintes e esconde a causa.
 */
async function comoUsuario(cli, uid, sql) {
  await cli.query('savepoint teste_acesso');
  try {
    await cli.query('set local role authenticated');
    await cli.query(`select set_config('request.jwt.claims', $1, true)`,
      [JSON.stringify({ sub: uid, role: 'authenticated' })]);
    const r = await cli.query(sql);
    await cli.query('reset role');
    await cli.query('release savepoint teste_acesso');
    return r;
  } catch (e) {
    await cli.query('rollback to savepoint teste_acesso');
    await cli.query('reset role').catch(() => {});
    return { erro: e.message };
  }
}

const cliente = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await cliente.connect();

let falhas = 0;
const checa = (desc, ok, detalhe = '') => {
  if (!ok) falhas++;
  console.log(`  ${ok ? 'ok   ' : 'FALHA'} ${desc}${detalhe ? ' — ' + detalhe : ''}`);
};

try {
  await cliente.query('begin');

  console.log('APLICANDO');
  for (const arq of arquivos) {
    const sql = readFileSync(resolve(RAIZ, arq), 'utf8');
    await cliente.query(sql);
    console.log(`  aplicado: ${arq}`);
  }

  // ── Verificações ──────────────────────────────────────────────────────────
  console.log('\nVERIFICANDO');

  const { rows: semRls } = await cliente.query(`
    select c.relname from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname='public' and c.relkind='r' and not c.relrowsecurity`);
  checa('RLS ligada em todas as tabelas', semRls.length === 0,
    semRls.length ? 'sem RLS: ' + semRls.map(r => r.relname).join(', ') : '');

  const { rows: semPol } = await cliente.query(`
    select c.relname, count(p.policyname)::int n
      from pg_class c
      join pg_namespace nn on nn.oid = c.relnamespace
      left join pg_policies p on p.schemaname='public' and p.tablename=c.relname
     where nn.nspname='public' and c.relkind='r'
     group by c.relname having count(p.policyname) <> 2`);
  checa('duas políticas por tabela', semPol.length === 0,
    semPol.length ? semPol.map(r => `${r.relname}=${r.n}`).join(', ') : '');

  const { rows: grantsAnon } = await cliente.query(`
    select table_name, privilege_type from information_schema.role_table_grants
     where grantee='anon' and table_schema='public'`);
  checa('papel anon sem nenhum privilégio', grantsAnon.length === 0,
    grantsAnon.length ? grantsAnon.length + ' privilégios restantes' : '');

  const linhas = (r) => (r.erro ? null : r.rows[0].n);

  // Operador ativo continua enxergando o sistema
  const operador = process.env.UID_OPERADOR;
  if (operador) {
    const r = await comoUsuario(cliente, operador, 'select count(*)::int n from public.sales');
    checa('operador ativo lê vendas', linhas(r) > 0, r.erro || linhas(r) + ' vendas');
    const p = await comoUsuario(cliente, operador, 'select count(*)::int n from public.products');
    checa('operador ativo lê produtos', linhas(p) > 0, p.erro || linhas(p) + ' produtos');
    const w = await comoUsuario(cliente, operador,
      `insert into public.notifications (type,title,message,reference_id)
       values ('stock_critical','teste','teste','__probe__') returning id`);
    checa('operador ativo consegue gravar', !w.erro, w.erro || 'insert aceito');
  }

  // Cliente da loja (logado, mas não operador) não enxerga nada
  const estranho = '00000000-0000-4000-8000-000000000000';
  const r1 = await comoUsuario(cliente, estranho, 'select count(*)::int n from public.sales');
  checa('cliente da loja NÃO lê vendas', linhas(r1) === 0 || r1.erro, r1.erro || linhas(r1) + ' linhas');
  const r2 = await comoUsuario(cliente, estranho, 'select count(*)::int n from public.people');
  checa('cliente da loja NÃO lê cadastro', linhas(r2) === 0 || r2.erro, r2.erro || linhas(r2) + ' linhas');
  const r3 = await comoUsuario(cliente, estranho,
    `insert into public.people (name) values ('__invasor__') returning id`);
  checa('cliente da loja NÃO consegue gravar', !!r3.erro, r3.erro ? 'recusado' : 'INSERT PASSOU');

  // Tabelas novas existem
  const { rows: novas } = await cliente.query(`
    select table_name from information_schema.tables
     where table_schema='public'
       and table_name in ('collection_settings','collection_messages','email_settings','sale_events')
     order by table_name`);
  checa('tabelas novas criadas', novas.length === 4, novas.map(r => r.table_name).join(', '));

  if (falhas > 0) {
    await cliente.query('rollback');
    console.log(`\n${falhas} verificação(ões) falharam — NADA foi gravado (rollback).`);
    process.exit(1);
  }

  if (confirmar) {
    await cliente.query('commit');
    console.log('\nTudo verificado. COMMIT aplicado.');
  } else {
    await cliente.query('rollback');
    console.log('\nTudo verificado, mas este foi um ENSAIO — desfeito.');
    console.log('Repita com --confirm para gravar.');
  }
} catch (e) {
  await cliente.query('rollback').catch(() => {});
  console.error('\nERRO — nada foi gravado:', e.message);
  if (e.position) console.error('posição no SQL:', e.position);
  process.exit(1);
} finally {
  await cliente.end().catch(() => {});
}

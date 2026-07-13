-- ============================================================================
-- INDICADORES DO SITE — rastreamento anônimo de visitas da loja online
--
-- Cria a tabela store_visits, alimentada pela rota /api/loja/track a cada
-- página aberta na loja pública. NÃO guarda IP nem dados pessoais: a coluna
-- visitor_hash é um hash diário (SHA-256 de dia+IP+user-agent+salt) que permite
-- contar visitantes únicos por dia sem cookies e sem identificar a pessoa (LGPD).
--
-- Geolocalização (país/região/cidade) vem dos headers da Vercel, sem custo.
--
-- COMO USAR: cole no SQL Editor do Supabase e execute (idempotente).
-- ============================================================================

create table if not exists public.store_visits (
  id            bigserial primary key,
  created_at    timestamptz not null default now(),
  slug          text,            -- loja acessada (segmento após /loja/)
  path          text,            -- caminho da página visitada
  referrer_host text,            -- domínio de origem (sem query string, por privacidade)
  device        text,            -- mobile | tablet | desktop
  browser       text,            -- Chrome, Safari, Firefox, ...
  os            text,            -- Windows, Android, iOS, ...
  country       text,            -- código do país (ex.: BR)
  region        text,            -- UF/região (ex.: SP)
  city          text,            -- cidade
  visitor_hash  text             -- identificador anônimo, único por dia+visitante
);

create index if not exists idx_store_visits_created_at on public.store_visits (created_at);
create index if not exists idx_store_visits_slug        on public.store_visits (slug);
create index if not exists idx_store_visits_visitor     on public.store_visits (visitor_hash);

-- Segurança: RLS ligado. A gravação é feita apenas pela rota /api/loja/track
-- usando a service_role (que ignora RLS). Leitura liberada para usuários
-- autenticados do app (a aba "Indicadores do Site" em Configurações).
alter table public.store_visits enable row level security;

drop policy if exists store_visits_select_authenticated on public.store_visits;
create policy store_visits_select_authenticated
  on public.store_visits for select
  to authenticated
  using (true);

-- ============================================================================
-- LANDING PAGE DA LOJA — o site público deixa de vender e passa a divulgar
--
-- POR QUE
-- O site embutido no sistema nasceu como e-commerce (catálogo, carrinho,
-- checkout, frete, pagamento). Para a Íntima Sedução isso está errado: o que a
-- loja precisa é de uma página que apresente a marca, explique como funciona a
-- venda consignada e convença alguém a chamar no WhatsApp — como revendedora
-- ou como cliente. Nada de vitrine de produto.
--
-- O QUE ESTE SCRIPT FAZ
--   1. Desliga a loja online (online_store_enabled = false por padrão). O
--      código do e-commerce continua no repositório; só não é mais servido.
--   2. Cria as colunas de conteúdo da landing em website_config, de modo que
--      TODO o texto da página seja editável em Configurações → Landing, sem
--      precisar de deploy.
--   3. Preenche um rascunho de conteúdo na linha que já existe, para a página
--      nascer apresentável. ATENÇÃO: esse texto é um RASCUNHO escrito de fora
--      — prazos, margens, região atendida e política de troca precisam ser
--      conferidos e corrigidos pela dona da loja na tela antes de divulgar.
--
-- SEGURANÇA: nada a fazer. As políticas de seguranca_rls.sql são por tabela
-- (operador ativo lê e escreve; service_role idem; anon não tem privilégio
-- nenhum), não por coluna — colunas novas já nascem sob a mesma regra.
--
-- COMO USAR
--   node scripts/aplicar-sql.mjs sql/landing_page.sql            (ensaio)
--   node scripts/aplicar-sql.mjs sql/landing_page.sql --confirm  (aplica)
-- Idempotente: pode rodar de novo sem duplicar nada nem sobrescrever edições.
-- ============================================================================


-- ── 1. Chave que liga/desliga o e-commerce ──────────────────────────────────
-- Nasce desligada. As rotas /api/loja de pedido, frete e cupom consultam esta
-- coluna e respondem 404 enquanto ela for false: a loja não fica com uma porta
-- de escrita aberta para um recurso que ninguém mais usa.
alter table public.website_config
  add column if not exists online_store_enabled boolean not null default false;

comment on column public.website_config.online_store_enabled is
  'Quando false, o site é só landing page: catálogo, carrinho e checkout ficam fora do ar.';


-- ── 2. Conteúdo da landing ──────────────────────────────────────────────────
-- Campos escalares para os textos únicos; jsonb para as listas que a dona da
-- loja pode aumentar ou encurtar (passos, benefícios, perguntas). jsonb em vez
-- de tabelas-filhas porque são listas curtas, sempre lidas junto com a
-- configuração e nunca consultadas por si só — uma tabela por lista só
-- acrescentaria join e formulário sem devolver nada em troca.
alter table public.website_config
  -- Herói
  add column if not exists hero_eyebrow          text,
  add column if not exists hero_title            text,
  -- (tagline e description já existiam: viram o subtítulo e o parágrafo do herói)

  -- Os dois caminhos de conversa
  add column if not exists cta_revendedora_label   text,
  add column if not exists cta_revendedora_message text,
  add column if not exists cta_cliente_label       text,
  add column if not exists cta_cliente_message     text,

  -- Como funciona o consignado
  add column if not exists consignado_title    text,
  add column if not exists consignado_subtitle text,
  add column if not exists consignado_steps    jsonb not null default '[]'::jsonb,

  -- Benefícios de revender
  add column if not exists benefits_title    text,
  add column if not exists benefits_subtitle text,
  add column if not exists benefits          jsonb not null default '[]'::jsonb,

  -- A loja e quem está por trás dela
  add column if not exists about_title      text,
  add column if not exists about_text       text,
  add column if not exists about_image_url  text,
  add column if not exists owner_name       text,
  add column if not exists owner_role       text,
  add column if not exists owner_quote      text,
  add column if not exists owner_photo_url  text,

  -- Perguntas frequentes
  add column if not exists faq_title text,
  add column if not exists faq       jsonb not null default '[]'::jsonb,

  -- Contato / fechamento
  add column if not exists contact_title text,
  add column if not exists contact_text  text,
  add column if not exists show_address  boolean not null default true,

  -- Logo própria do site
  add column if not exists logo_site_url text;

-- Por que uma logo separada da que está em `companies.logo_url`: aquela é a do
-- recibo e do PDV, e costuma vir do jeito que o designer entregou — arte num
-- canvas quadrado com margem enorme em volta. Impressa não faz diferença; num
-- cabeçalho de site de 44px de altura, a arte ocupa 20% disso e a marca vira um
-- borrão. Aqui entra a mesma marca já aparada, sem margem. Vazio: a landing usa
-- a logo da empresa.
comment on column public.website_config.logo_site_url is
  'Logo usada só no site, sem margem em volta. Vazio = usa companies.logo_url.';

comment on column public.website_config.consignado_steps is
  'Array de {"title","text"} — os passos da venda consignada, na ordem em que aparecem.';
comment on column public.website_config.benefits is
  'Array de {"icon","title","text"} — icon é uma chave do mapa em components/landing/icons.ts.';
comment on column public.website_config.faq is
  'Array de {"q","a"} — pergunta e resposta, na ordem em que aparecem.';


-- ── 3. As listas têm que ser listas ─────────────────────────────────────────
-- Sem isto, um objeto salvo por engano no lugar de um array derruba a página
-- inteira no .map(). Barato de verificar na escrita, caro de descobrir em
-- produção.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'website_config_steps_array') then
    alter table public.website_config
      add constraint website_config_steps_array
      check (jsonb_typeof(consignado_steps) = 'array');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'website_config_benefits_array') then
    alter table public.website_config
      add constraint website_config_benefits_array
      check (jsonb_typeof(benefits) = 'array');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'website_config_faq_array') then
    alter table public.website_config
      add constraint website_config_faq_array
      check (jsonb_typeof(faq) = 'array');
  end if;
end $$;


-- ── 4. Rascunho de conteúdo ─────────────────────────────────────────────────
-- Só preenche o que está vazio. Rodar de novo depois de a loja editar a tela
-- não desfaz nada do que ela escreveu.
update public.website_config set
  hero_eyebrow = coalesce(nullif(hero_eyebrow, ''),
    'Moda íntima · Canoas, RS'),

  tagline = coalesce(nullif(tagline, ''),
    'Lingerie que veste confiança — e renda para quem vende.'),

  description = coalesce(nullif(description, ''),
    'Somos uma loja de moda íntima em Canoas que trabalha com venda consignada: '
    'você recebe uma mala de peças escolhidas, mostra para as suas clientes e '
    'acerta só o que vender.'),

  cta_revendedora_label = coalesce(nullif(cta_revendedora_label, ''),
    'Quero ser revendedora'),
  cta_revendedora_message = coalesce(nullif(cta_revendedora_message, ''),
    'Oi! Vi o site da Íntima Sedução e quero saber como funciona para ser revendedora consignada.'),

  cta_cliente_label = coalesce(nullif(cta_cliente_label, ''),
    'Quero receber uma mala'),
  cta_cliente_message = coalesce(nullif(cta_cliente_message, ''),
    'Oi! Vi o site da Íntima Sedução e gostaria de receber uma mala para conhecer as peças.'),

  consignado_title = coalesce(nullif(consignado_title, ''),
    'Como funciona o consignado'),
  consignado_subtitle = coalesce(nullif(consignado_subtitle, ''),
    'Quatro passos, sem investimento para começar e sem risco de ficar com peça parada na mão.'),

  benefits_title = coalesce(nullif(benefits_title, ''),
    'Por que revender com a gente'),
  benefits_subtitle = coalesce(nullif(benefits_subtitle, ''),
    'Uma renda que cabe na sua rotina, sem virar um segundo emprego.'),

  about_title = coalesce(nullif(about_title, ''),
    'A loja'),
  about_text = coalesce(nullif(about_text, ''),
    'A Íntima Sedução nasceu em Canoas da vontade de fazer moda íntima chegar '
    'perto de quem compra — sem vitrine intimidadora, sem provador apertado, sem '
    'constrangimento. Trabalhamos com lingerie, pijamas e moda praia escolhidos '
    'peça a peça, pensando no corpo real de quem veste.' || chr(10) || chr(10) ||
    'A venda consignada é o coração do negócio: é ela que transforma uma cliente '
    'satisfeita em uma vendedora com renda própria.'),

  owner_name = coalesce(nullif(owner_name, ''),
    'Franciele Machado'),
  owner_role = coalesce(nullif(owner_role, ''),
    'Fundadora da Íntima Sedução'),
  owner_quote = coalesce(nullif(owner_quote, ''),
    'Comecei vendendo para as minhas amigas, com uma mala emprestada. Hoje é a '
    'minha mala que sai para outras mulheres começarem do mesmo jeito.'),

  faq_title = coalesce(nullif(faq_title, ''),
    'Perguntas frequentes'),

  contact_title = coalesce(nullif(contact_title, ''),
    'Vamos conversar?'),
  contact_text = coalesce(nullif(contact_text, ''),
    'Chame no WhatsApp e conte o que você procura. A gente responde de segunda a '
    'sábado, em horário comercial.');


update public.website_config set consignado_steps = jsonb_build_array(
  jsonb_build_object('title', 'Você chama no WhatsApp',
    'text', 'Uma conversa rápida para a gente entender seu perfil, o seu público e o tamanho de mala ideal para começar.'),
  jsonb_build_object('title', 'A mala chega até você',
    'text', 'Peças escolhidas a dedo, com variedade de tamanhos e modelos. Receber não custa nada.'),
  jsonb_build_object('title', 'Você vende no seu ritmo',
    'text', 'Para amigas, clientes, colegas de trabalho. No grupo, na roda de conversa ou na sua própria casa.'),
  jsonb_build_object('title', 'Acerta só o que vendeu',
    'text', 'No fim do prazo combinado você devolve o que sobrou e paga apenas as peças que saíram. O lucro é seu.')
) where jsonb_array_length(consignado_steps) = 0;


update public.website_config set benefits = jsonb_build_array(
  jsonb_build_object('icon', 'wallet', 'title', 'Zero investimento',
    'text', 'Você não compra estoque. Recebe a mala, vende, e só depois acerta o que saiu.'),
  jsonb_build_object('icon', 'clock', 'title', 'No seu tempo',
    'text', 'Sem meta, sem horário e sem chefe. Você vende quando e como der na sua rotina.'),
  jsonb_build_object('icon', 'sparkles', 'title', 'Peças que giram',
    'text', 'Curadoria de lingerie, pijamas e moda praia — a gente já sabe o que sai e o que encalha.'),
  jsonb_build_object('icon', 'shield', 'title', 'Peça com defeito volta',
    'text', 'Se vier algum problema de fábrica, a peça volta para a gente. Você não fica no prejuízo.'),
  jsonb_build_object('icon', 'heart', 'title', 'Atendimento de gente',
    'text', 'Você fala direto com a dona da loja. Não tem robô, não tem call center, não tem fila.'),
  jsonb_build_object('icon', 'trending-up', 'title', 'Cresce junto',
    'text', 'Vendeu bem? A próxima mala vem maior, com mais variedade e prazo mais folgado.')
) where jsonb_array_length(benefits) = 0;


update public.website_config set faq = jsonb_build_array(
  jsonb_build_object('q', 'Preciso pagar alguma coisa para começar?',
    'a', 'Não. A mala sai sem custo e sem taxa. Você paga apenas as peças que vender, no acerto.'),
  jsonb_build_object('q', 'Quanto tempo eu tenho para vender?',
    'a', 'O prazo é combinado na hora da retirada. Se precisar de mais tempo, é só avisar antes do vencimento.'),
  jsonb_build_object('q', 'E se eu não vender nada?',
    'a', 'Você devolve a mala inteira e não deve nada. Sem multa e sem cobrança.'),
  jsonb_build_object('q', 'Quanto eu ganho por peça?',
    'a', 'A margem é combinada com você e melhora conforme o volume. A gente explica tudo no primeiro contato.'),
  jsonb_build_object('q', 'Preciso ter CNPJ ou experiência com vendas?',
    'a', 'Nenhum dos dois. A maior parte das nossas revendedoras começou vendendo para amigas e vizinhas.'),
  jsonb_build_object('q', 'Vocês atendem fora de Canoas?',
    'a', 'Sim. Combine com a gente pelo WhatsApp: dependendo da distância, a gente acerta a entrega da mala.')
) where jsonb_array_length(faq) = 0;

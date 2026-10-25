// src/lib/demo-dados.ts
// Recarga diária do ambiente de demonstração: apaga o que os visitantes
// mexeram e escreve de novo uma loja fictícia com um mês de movimento.
//
// Só servidor (usa a chave de serviço recebida por parâmetro). As datas são
// relativas ao momento da recarga, para o painel sempre mostrar "o último mês".
// Os números saem de um gerador com semente fixa: toda recarga produz a mesma
// loja, deslocada no tempo.
//
// Fica de fora de propósito: authorized_users (o seu acesso de admin e o de
// quem você cadastrou), contas e categorias do financeiro, e as configurações
// de e-mail e cobrança.

import type { SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { DEMO_EMAIL, DEMO_PIN_GERENTE, PROJETO_DEMO } from './demo';

const DIA = 86_400_000;

// ── Dados de exemplo ────────────────────────────────────────────────────────

const LOJA = {
  name: 'Aurora Moda Íntima (demonstração)',
  fantasy_name: 'Aurora Moda Íntima',
  description: 'Loja fictícia do ambiente de demonstração do Nexus Store.',
  cnpj: null,
  email: null,
  phone: null,
  website: null,
  address_street: 'Rua das Acácias',
  address_number: '120',
  address_complement: null,
  neighbourhood: 'Centro',
  city: 'São Paulo',
  state: 'SP',
  cep: '01000-000',
  pix_key: null,
  logo_url: null,
  receipt_image_url: null,
  receipt_note: 'Ambiente de demonstração — documento sem valor fiscal.',
};

const CATEGORIAS = [
  { name: 'Sutiãs', color: '#e11d48', description: 'Com e sem bojo, renda e microfibra' },
  { name: 'Calcinhas', color: '#db2777', description: 'Fio, hot pant e tanga' },
  { name: 'Conjuntos', color: '#9333ea', description: 'Sutiã e calcinha da mesma linha' },
  { name: 'Pijamas', color: '#4f46e5', description: 'Short doll, camisolas e robes' },
  { name: 'Moda Praia', color: '#0891b2', description: 'Biquínis e maiôs' },
  { name: 'Acessórios', color: '#ca8a04', description: 'Meias, necessaires e complementos' },
];

// [categoria, nome, cor, preço, custo, tamanhos]
const MODELOS: [string, string, string, number, number, string[]][] = [
  ['Sutiãs', 'Sutiã Renda Floral', 'Preto', 89.9, 38, ['P', 'M', 'G', 'GG']],
  ['Sutiãs', 'Sutiã Push-up Liso', 'Nude', 99.9, 42, ['P', 'M', 'G']],
  ['Sutiãs', 'Top Nadador Conforto', 'Branco', 59.9, 24, ['P', 'M', 'G']],
  ['Calcinhas', 'Calcinha Fio Renda', 'Vinho', 34.9, 12, ['P', 'M', 'G', 'GG']],
  ['Calcinhas', 'Calcinha Hot Pant Microfibra', 'Preto', 39.9, 14.5, ['P', 'M', 'G']],
  ['Conjuntos', 'Conjunto Renda Bordô', 'Bordô', 149.9, 62, ['P', 'M', 'G']],
  ['Conjuntos', 'Conjunto Tule Poá', 'Preto', 129.9, 55, ['M', 'G']],
  ['Pijamas', 'Pijama Short Doll Cetim', 'Rosa', 119.9, 48, ['P', 'M', 'G', 'GG']],
  ['Pijamas', 'Camisola Longa Viscose', 'Azul', 109.9, 44, ['M', 'G']],
  ['Moda Praia', 'Biquíni Cortininha', 'Coral', 99.9, 39, ['P', 'M', 'G']],
  ['Moda Praia', 'Maiô Decote V', 'Preto', 139.9, 58, ['M', 'G', 'GG']],
  ['Acessórios', 'Meia-calça Fio 40', 'Preto', 29.9, 9.5, ['ÚNICO']],
  ['Acessórios', 'Necessaire Matelassê', 'Rosa', 49.9, 18, ['ÚNICO']],
];

// Telefones no formato aceito pela tela de cobrança; na demonstração o
// WhatsApp não é aberto, então eles nunca recebem mensagem.
const PESSOAS: { name: string; person_type: 'consultora' | 'cliente'; sales_limit?: number }[] = [
  { name: 'Ana Beatriz Rocha', person_type: 'consultora', sales_limit: 2500 },
  { name: 'Camila Duarte', person_type: 'consultora', sales_limit: 1500 },
  { name: 'Fernanda Lopes', person_type: 'consultora' },
  { name: 'Juliana Prado', person_type: 'consultora', sales_limit: 2000 },
  { name: 'Larissa Moura', person_type: 'consultora' },
  { name: 'Mariana Teixeira', person_type: 'consultora', sales_limit: 1800 },
  { name: 'Patrícia Alves', person_type: 'consultora' },
  { name: 'Renata Campos', person_type: 'consultora' },
  { name: 'Tatiane Freitas', person_type: 'consultora' },
  { name: 'Vanessa Ribeiro', person_type: 'consultora' },
  { name: 'Bruna Martins', person_type: 'cliente' },
  { name: 'Daniela Costa', person_type: 'cliente' },
  { name: 'Gabriela Nunes', person_type: 'cliente' },
  { name: 'Helena Barros', person_type: 'cliente' },
];

const OPERADORES = [
  {
    name: 'Gerente Demonstração', code: 'G01', role: 'manager', pin: DEMO_PIN_GERENTE, is_active: true,
    permissions: { can_cancel_sale: true, can_give_discount: true, can_process_return: true, max_discount_percentage: 50 },
  },
  {
    name: 'Vendedora Demonstração', code: 'V01', role: 'operator', pin: null, is_active: true,
    permissions: { can_cancel_sale: false, can_give_discount: true, can_process_return: true, max_discount_percentage: 10 },
  },
];

// Ordem de apagar: filhos antes dos pais. As do financeiro ficam (contas e
// categorias são cadastro-base); só o movimento sai.
const TABELAS_A_LIMPAR: [tabela: string, chave: string][] = [
  ['return_items', 'id'], ['returns', 'id'], ['sale_events', 'id'], ['collection_messages', 'id'],
  ['sale_items', 'id'], ['notifications', 'id'], ['stock_movements', 'id'],
  ['goods_receipt_items', 'id'], ['payable_installments', 'id'], ['financial_transactions', 'id'],
  ['cash_movements', 'id'], ['sales', 'id'], ['cash_sessions', 'id'], ['payables', 'id'],
  ['goods_receipts', 'id'], ['purchase_order_items', 'id'], ['purchase_orders', 'id'],
  ['documents', 'id'], ['people', 'id'], ['products', 'sku'], ['product_categories', 'id'],
  ['suppliers', 'id'], ['operators', 'id'], ['store_coupons', 'id'], ['website_orders', 'id'],
  ['store_visits', 'id'], ['system_billing', 'id'],
];

// ── Utilitários ─────────────────────────────────────────────────────────────

/** Gerador determinístico (mulberry32): a mesma semente dá a mesma loja. */
function gerador(semente: number) {
  let a = semente >>> 0;
  const proximo = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    numero: proximo,
    inteiro: (min: number, max: number) => min + Math.floor(proximo() * (max - min + 1)),
    item: <T,>(lista: T[]) => lista[Math.floor(proximo() * lista.length)],
  };
}

const arred = (v: number) => Math.round(v * 100) / 100;
const moeda = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

/** Instante `dias` atrás, às `hora`:`minuto` de Brasília (UTC-3). */
function emBrasilia(agora: number, dias: number, hora: number, minuto = 0): Date {
  const d = new Date(agora - dias * DIA);
  d.setUTCHours(hora + 3, minuto, 0, 0);
  return d;
}

/** Data (AAAA-MM-DD) de Brasília deslocada em `dias` — o formato do "Pagamento previsto". */
function dataBrasilia(agora: number, dias: number): string {
  return new Date(agora - 3 * 3_600_000 + dias * DIA).toISOString().slice(0, 10);
}

const dataBR = (d: Date) => d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });

/** Leitura (ou escrita com .select()): falha com o nome do passo, e nunca devolve vazio. */
async function exigir<T>(passo: string, p: PromiseLike<{ data: T | null; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await p;
  if (error) throw new Error(`${passo}: ${error.message}`);
  if (data === null) throw new Error(`${passo}: resposta vazia`);
  return data;
}

/** Escrita sem retorno: só importa não ter dado erro. */
async function gravar(passo: string, p: PromiseLike<{ error: { message: string } | null }>): Promise<void> {
  const { error } = await p;
  if (error) throw new Error(`${passo}: ${error.message}`);
}

// ── Conta dos visitantes ────────────────────────────────────────────────────

/**
 * Garante a conta compartilhada: existe, está com o e-mail certo, confirmado,
 * senha nova (a que um visitante tenha posto deixa de valer) e autorizada como
 * gerente. É achada pela marca em app_metadata, que o visitante não altera.
 *
 * Conta "solta": o generateLink do Supabase CRIA o usuário quando o e-mail não
 * existe, sem a marca e sem autorização. Se ela aparecer sozinha, é adotada;
 * se aparecer ao lado da conta marcada (o visitante trocou o e-mail da marcada
 * e o link seguinte criou outra), é apagada para o e-mail voltar à marcada.
 */
export async function garantirUsuarioDemo(db: SupabaseClient): Promise<string> {
  const { data: lista, error: erroLista } = await db.auth.admin.listUsers({ perPage: 1000 });
  if (erroLista) throw new Error(`listar usuários: ${erroLista.message}`);
  const senha = `${randomUUID()}Aa1!`;
  const marcada = lista.users.find((u) => u.app_metadata?.demo === true);
  const comEmail = lista.users.find((u) => u.email?.toLowerCase() === DEMO_EMAIL);

  if (marcada && comEmail && comEmail.id !== marcada.id) {
    const { error } = await db.auth.admin.deleteUser(comEmail.id);
    if (error) throw new Error(`apagar conta solta da demonstração: ${error.message}`);
  }
  let usuario = marcada ?? comEmail;

  if (!usuario) {
    const { data: criado, error } = await db.auth.admin.createUser({
      email: DEMO_EMAIL,
      email_confirm: true,
      password: senha,
      app_metadata: { demo: true },
      user_metadata: { full_name: 'Visitante da demonstração' },
    });
    if (error || !criado.user) throw new Error(`criar usuário da demonstração: ${error?.message ?? 'sem retorno'}`);
    usuario = criado.user;
  } else {
    const { error } = await db.auth.admin.updateUserById(usuario.id, {
      email: DEMO_EMAIL,
      email_confirm: true,
      password: senha,
      app_metadata: { ...usuario.app_metadata, demo: true },
    });
    if (error) throw new Error(`restaurar usuário da demonstração: ${error.message}`);
  }

  await gravar('autorizar usuário da demonstração', db.from('authorized_users').upsert({
    user_id: usuario.id,
    email: DEMO_EMAIL,
    full_name: 'Visitante da demonstração',
    role: 'gerente',
    status: 'ativo',
    phone: null,
    department: null,
    permissions: [],
  }, { onConflict: 'user_id' }));

  return usuario.id;
}

// ── Recarga ─────────────────────────────────────────────────────────────────

export interface ResumoRecarga {
  apagadas: Record<string, number>;
  criadas: Record<string, number>;
}

/**
 * Apaga o movimento e o cadastro da loja de demonstração e escreve os dados de
 * exemplo. `url` é a NEXT_PUBLIC_SUPABASE_URL: fora do projeto de demonstração
 * a função se recusa a começar, independentemente de qualquer variável.
 */
export async function recarregarDemo(db: SupabaseClient, url: string, agora = Date.now()): Promise<ResumoRecarga> {
  if (!url.includes(`${PROJETO_DEMO}.supabase.co`)) {
    throw new Error(`Recusado: a recarga da demonstração só roda no projeto ${PROJETO_DEMO}.`);
  }
  const resumo: ResumoRecarga = { apagadas: {}, criadas: {} };
  const rnd = gerador(20261024);

  // 1. Limpa
  for (const [tabela, chave] of TABELAS_A_LIMPAR) {
    const { count, error } = await db.from(tabela).delete({ count: 'exact' }).not(chave, 'is', null);
    if (error) throw new Error(`apagar ${tabela}: ${error.message}`);
    resumo.apagadas[tabela] = count ?? 0;
  }

  // 2. Identidade da loja (há uma única linha em companies e em website_config)
  await gravar('loja', db.from('companies').update({ ...LOJA, updated_at: new Date(agora).toISOString() }).not('id', 'is', null));
  await gravar('site', db.from('website_config').update({ store_name: LOJA.fantasy_name, online_store_enabled: false }).not('id', 'is', null));

  // 3. Cadastro
  const categorias = await exigir('categorias', db.from('product_categories').insert(CATEGORIAS).select('id, name'));
  const idCategoria = new Map(categorias.map((c) => [c.name, c.id as string]));

  let codigo = 0;
  const linhasProduto = MODELOS.flatMap(([categoria, nome, cor, preco, custo, tamanhos]) =>
    tamanhos.map((tamanho) => {
      codigo += 1;
      return {
        name: tamanho === 'ÚNICO' ? nome : `${nome} ${tamanho}`,
        description: `${nome} — ${cor.toLowerCase()}`,
        category: categoria,
        category_id: idCategoria.get(categoria),
        color: cor,
        size: tamanho,
        price: preco,
        cost: custo,
        // Faixa 200… do GS1 é de uso interno da loja: não colide com código real.
        barcode: 2000000000000 + codigo,
        stock_quantity: rnd.inteiro(5, 18),
        minimum_stock: 3,
        maximum_stock: 30,
        units_type: 'un',
        is_active: true,
        show_on_website: true,
      };
    }),
  );
  // Três peças abaixo do mínimo, para o painel mostrar ruptura de estoque.
  for (const i of [2, 9, 20]) linhasProduto[i].stock_quantity = rnd.inteiro(0, 2);
  const produtos = await exigir('produtos', db.from('products').insert(linhasProduto).select('sku, name, size, price, cost, barcode, category'));

  const pessoas = await exigir('clientes', db.from('people').insert(
    PESSOAS.map((p, i) => {
      const [primeiro, ultimo] = [p.name.split(' ')[0], p.name.split(' ').slice(-1)[0]];
      const usuario = `${primeiro}.${ultimo}`.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
      return {
        name: p.name,
        person_type: p.person_type,
        phone: `(11) 90000-${String(i + 1).padStart(4, '0')}`,
        email: `${usuario}@example.com`,
        city: 'São Paulo',
        state: 'SP',
        sales_limit: p.sales_limit ?? null,
        is_active: true,
        created_at: new Date(agora - (60 + i * 5) * DIA).toISOString(),
      };
    }),
  ).select('id, name, person_type'));
  const consultoras = pessoas.filter((p) => p.person_type === 'consultora');
  const clientes = pessoas.filter((p) => p.person_type === 'cliente');

  const operadores = await exigir('operadores', db.from('operators').insert(OPERADORES).select('id, role'));
  const gerente = operadores.find((o) => o.role === 'manager')!.id as string;
  const vendedora = operadores.find((o) => o.role !== 'manager')!.id as string;

  // 4. Vendas. Cada venda é montada inteira aqui; depois vai em lote.
  type Produto = (typeof produtos)[number];
  type Linha = { produto: Produto; quantidade: number; devolvida: number };
  type Venda = {
    cabecalho: Record<string, unknown>;
    linhas: Linha[];
    fechamento?: Date;
  };
  const vendas: Venda[] = [];
  const semAcessorio = produtos.filter((p) => p.category !== 'Acessórios');
  const total = (linhas: Linha[], campo: 'vendida' | 'ficou') =>
    arred(linhas.reduce((s, l) => s + Number(l.produto.price) * (campo === 'vendida' ? l.quantidade : l.quantidade - l.devolvida), 0));
  const sortearLinhas = (pecas: number, devolverFracao = 0): Linha[] => {
    const escolhidos = new Map<number, Linha>();
    while ([...escolhidos.values()].reduce((s, l) => s + l.quantidade, 0) < pecas) {
      const p = rnd.item(rnd.numero() < 0.85 ? semAcessorio : produtos);
      const atual = escolhidos.get(Number(p.sku));
      if (atual) atual.quantidade += 1;
      else escolhidos.set(Number(p.sku), { produto: p, quantidade: 1, devolvida: 0 });
    }
    const linhas = [...escolhidos.values()];
    if (devolverFracao > 0) {
      for (const l of linhas) l.devolvida = Math.min(l.quantidade, Math.round(l.quantidade * devolverFracao + (rnd.numero() - 0.5)));
      // Ao menos uma peça fica com a revendedora.
      if (linhas.every((l) => l.devolvida === l.quantidade)) linhas[0].devolvida = linhas[0].quantidade - 1;
    }
    return linhas;
  };

  // 4a. À vista, ao longo dos últimos 30 dias (hoje começa vazio: é o dia do visitante)
  const metodos = ['pix', 'pix', 'pix', 'pix', 'credit_card', 'credit_card', 'credit_card', 'debit', 'debit', 'cash'];
  for (let i = 0; i < 42; i++) {
    const dias = 1 + Math.floor(rnd.numero() ** 1.3 * 29);
    const quando = emBrasilia(agora, dias, rnd.inteiro(9, 19), rnd.inteiro(0, 59));
    const linhas = sortearLinhas(rnd.inteiro(1, 3));
    const bruto = total(linhas, 'vendida');
    const desconto = rnd.numero() < 0.15 ? arred(bruto * 0.05) : 0;
    vendas.push({
      linhas,
      cabecalho: {
        customer_id: rnd.numero() < 0.5 ? rnd.item([...clientes, ...consultoras]).id : null,
        operator_id: rnd.numero() < 0.3 ? gerente : vendedora,
        total_amount: bruto,
        discount_amount: desconto,
        final_amount: arred(bruto - desconto),
        payment_method: rnd.item(metodos),
        payment_status: 'paid',
        source: 'loja',
        sale_date: quando.toISOString(),
        created_at: quando.toISOString(),
      },
    });
  }

  // 4b. Consignados em aberto: dois atrasados, um vencendo hoje, três no prazo
  const consultorasAbertas = consultoras.slice(0, 6);
  [-6, -2, 0, 3, 8, 15].forEach((vence, i) => {
    const saiu = emBrasilia(agora, Math.max(1, 20 - vence), rnd.inteiro(10, 17));
    const linhas = sortearLinhas(rnd.inteiro(6, 12));
    const bruto = total(linhas, 'vendida');
    vendas.push({
      linhas,
      cabecalho: {
        customer_id: consultorasAbertas[i].id,
        operator_id: gerente,
        total_amount: bruto,
        discount_amount: 0,
        final_amount: bruto,
        payment_method: 'consignado',
        payment_status: 'pending',
        source: 'loja',
        observation: `Venda consignada - Pagamento previsto: ${dataBrasilia(agora, vence)}`,
        sale_date: saiu.toISOString(),
        created_at: saiu.toISOString(),
      },
    });
  });

  // 4c. Consignados já acertados no mês: a revendedora devolveu parte e pagou o
  // que ficou, com 30% de desconto de lucro — o mesmo texto que o fechamento grava.
  for (let i = 0; i < 6; i++) {
    const saiuDias = 34 - i * 3;
    const saiu = emBrasilia(agora, saiuDias, rnd.inteiro(10, 17));
    const fechou = emBrasilia(agora, saiuDias - rnd.inteiro(14, 18), rnd.inteiro(10, 17));
    const linhas = sortearLinhas(rnd.inteiro(8, 12), 0.65);
    const bruto = total(linhas, 'vendida');
    const saldo = total(linhas, 'ficou');
    const pct = 30;
    const cobrado = arred((saldo * (100 - pct)) / 100);
    const ficha = (l: Linha, q: number) => `${l.produto.name} [sku ${l.produto.sku} · ${l.produto.size}] (x${q})`;
    const listar = (pares: [Linha, number][]) => pares.filter(([, q]) => q > 0).map(([l, q]) => ficha(l, q)).join('; ') || 'Nenhuma';
    vendas.push({
      linhas,
      fechamento: fechou,
      cabecalho: {
        customer_id: consultoras[(i + 4) % consultoras.length].id,
        operator_id: gerente,
        total_amount: bruto,
        discount_amount: 0,
        final_amount: cobrado,
        payment_method: 'consignado',
        payment_status: 'paid',
        source: 'loja',
        consignado_commission_percent: pct,
        consignado_net_before_commission: saldo,
        settled_at: fechou.toISOString(),
        observation: [
          `Venda consignada - Pagamento previsto: ${dataBrasilia(agora, -(saiuDias - 15))}`,
          `[FECHADO EM ${dataBR(fechou)}] Saldo: ${moeda(saldo)} | Desconto de lucro: ${pct}% (${moeda((saldo * pct) / 100)}) | Cobrado: ${moeda(cobrado)}`,
          `Saídas: ${listar(linhas.map((l) => [l, l.quantidade]))} | Devolvidas: ${listar(linhas.map((l) => [l, l.devolvida]))} | Mantidas: ${listar(linhas.map((l) => [l, l.quantidade - l.devolvida]))}`,
        ].join('\n'),
        sale_date: saiu.toISOString(),
        created_at: saiu.toISOString(),
      },
    });
  }

  // 5. Grava. O RETURNING de um INSERT em lote volta na ordem dos valores;
  // conferimos data e valor de cada uma para não casar item com a venda errada.
  const gravadas = await exigir('vendas', db.from('sales').insert(vendas.map((v) => v.cabecalho)).select('id, sale_date, final_amount'));
  gravadas.forEach((g, i) => {
    const esperado = vendas[i].cabecalho;
    if (new Date(g.sale_date).getTime() !== new Date(esperado.sale_date as string).getTime() || Number(g.final_amount) !== esperado.final_amount) {
      throw new Error(`vendas: a ordem do retorno não bate na posição ${i}`);
    }
  });

  const linhasItens = vendas.flatMap((v, i) => v.linhas.map((l) => {
    const ficou = v.fechamento ? l.quantidade - l.devolvida : l.quantidade;
    return {
      sale_id: gravadas[i].id,
      product_id: l.produto.sku,
      product_name: l.produto.name,
      product_sku: `SKU-${l.produto.sku}`,
      product_barcode: l.produto.barcode,
      quantity: ficou,
      unit_price: l.produto.price,
      unit_cost: l.produto.cost ?? 0,
      discount_per_item: 0,
      total_price: arred(Number(l.produto.price) * ficou),
      created_at: v.cabecalho.created_at,
    };
  }));
  const itens = await exigir('itens', db.from('sale_items').insert(linhasItens).select('id, sale_id, product_id'));
  const idItem = new Map(itens.map((it) => [`${it.sale_id}:${it.product_id}`, it.id]));

  const fechadas = vendas.map((v, i) => ({ v, id: gravadas[i].id })).filter(({ v }) => v.fechamento);
  const devolucoes = await exigir('devoluções', db.from('returns').insert(fechadas.map(({ v, id }) => ({
    sale_id: id,
    motive: 'Fechamento de Consignado',
    type: 'devolucao',
    status: 'completed',
    created_at: v.fechamento!.toISOString(),
    processed_at: v.fechamento!.toISOString(),
  }))).select('id, sale_id'));
  const idDevolucao = new Map(devolucoes.map((d) => [d.sale_id, d.id]));

  const itensDevolvidos = fechadas.flatMap(({ v, id }) => v.linhas.filter((l) => l.devolvida > 0).map((l) => ({
    return_id: idDevolucao.get(id),
    sale_item_id: idItem.get(`${id}:${l.produto.sku}`),
    product_id: l.produto.sku,
    quantity: l.devolvida,
    unit_price: l.produto.price,
    total_price: arred(Number(l.produto.price) * l.devolvida),
  })));
  await gravar('itens devolvidos', db.from('return_items').insert(itensDevolvidos));

  // 6. A conta dos visitantes por último: se algo acima falhar, ela não muda.
  await garantirUsuarioDemo(db);

  resumo.criadas = {
    categorias: categorias.length,
    produtos: produtos.length,
    clientes: pessoas.length,
    operadores: operadores.length,
    vendas: gravadas.length,
    itens: itens.length,
    devolucoes: devolucoes.length,
    itens_devolvidos: itensDevolvidos.length,
  };
  return resumo;
}

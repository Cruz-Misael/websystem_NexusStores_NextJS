# NexusStores

Sistema de gestao comercial desenvolvido para lojas do segmento de moda intima e lingerie. Centraliza o controle de vendas, estoque, clientes e caixa em uma unica interface web, eliminando o uso de planilhas e sistemas genericos que nao atendem as particularidades do nicho.

## Nicho

Lojas fisicas e semi-presenciais de lingerie, moda intima e correlatos que operam com venda direta, consignado e troca de mercadorias entre revendedoras e clientes fixos.

## Funcionalidades

**Caixa e Vendas**
- Registro de vendas com busca de produtos por codigo de barras, SKU ou nome
- Suporte a multiplas formas de pagamento (dinheiro, PIX, cartao de debito e credito)
- Desconto por item ou sobre o total da venda
- Emissao de recibo para impressao termica ou PDF

**Consignado**
- Abertura de venda consignada com prazo de devolucao
- Fechamento de consignado com devolucao parcial ou total dos itens
- Campo dinamico para o percentual de desconto de lucro aplicado pelo vendedor sobre o saldo remanescente
- Historico completo do acerto registrado na observacao da venda

**Trocas e Devolucoes**
- Processamento de trocas com bipagem dos itens devolvidos e dos itens novos
- Devolucao parcial com ajuste automatico de quantidade no pedido original
- Reincorporacao dos itens ao estoque na confirmacao

**Clientes**
- Cadastro de pessoas fisicas com nome, telefone e e-mail
- Historico de compras por cliente
- Identificacao de clientes consignados com alertas de prazo

**Estoque e Produtos**
- Catalogo de produtos com SKU, codigo de barras, preco, custo e categoria
- Controle de estoque minimo com alertas de ruptura
- Upload de imagem do produto

**Dashboard Gerencial**
- KPIs de faturamento bruto, total de vendas e ticket medio nos ultimos 30 dias
- Grafico de receita versus custo por dia
- Mix de vendas por categoria
- Ranking dos produtos com maior receita, margem e status de estoque
- Pico de vendas por hora do dia
- Desempenho por operador de caixa
- Top clientes do mes por faturamento

**Configuracoes**
- Dados cadastrais da loja com upload de logo
- Gestao de usuarios com controle de nivel de acesso (admin, gerente, colaborador)
- Categorias de produtos com cor de identificacao
- Operadores de caixa com permissoes granulares (desconto maximo, cancelamento, devolucao)
- Painel de assinatura do sistema com controle de vencimento, alerta de atraso e bloqueio automatico apos 10 dias em aberto
- Codigo PIX configuravel com geracao automatica de QR Code para pagamento da assinatura

## Tecnologias

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 16 com App Router |
| Linguagem | TypeScript |
| Banco de dados | Supabase (PostgreSQL) |
| Autenticacao | Supabase Auth com middleware SSR |
| Estilizacao | Tailwind CSS v4 |
| Graficos | Recharts |
| Icones | Lucide React |
| Notificacoes | React Hot Toast |

## Estrutura de Rotas

```
/dashboard       Visao geral e indicadores
/caixa           Ponto de venda
/vendas          Historico e gestao de vendas
/produtos        Catalogo e estoque
/clientes        Cadastro de clientes
/configuracoes   Ajustes do sistema
```

## Variaveis de Ambiente

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

## Instalacao

```bash
npm install
npm run dev
```

## Observacoes

O sistema utiliza Row Level Security (RLS) do Supabase. Novos usuarios precisam ser cadastrados na tabela `authorized_users` com status `ativo` para acessar o sistema apos o login.

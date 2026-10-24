# Loja online — desligada, não apagada

Estas páginas formavam o e-commerce público da loja: catálogo, produto,
carrinho, checkout com MercadoPago, login do cliente, "minha conta" e os
retornos de pagamento (sucesso, pendente, erro).

O site público deixou de vender e virou uma landing page de divulgação da loja.
O código ficou aqui em vez de ser apagado porque a decisão foi **desligar**, não
descartar: se um dia a loja quiser vender online de novo, é religar, não
reescrever.

## Por que esta pasta não é servida

O App Router do Next ignora, para efeito de rotas, qualquer pasta cujo nome
comece com `_`. Os arquivos continuam no repositório e continuam passando pelo
TypeScript, mas nenhuma URL chega neles. Por isso também os arquivos foram
renomeados de `page.tsx` para `<Nome>Page.tsx` — `page.tsx` é um nome com
significado especial para o framework, e não convém deixá-lo fora do lugar.

Quem atende `/loja/<slug>/qualquer-coisa` hoje é o `[...desligado]/page.tsx`
logo acima desta pasta: ele redireciona tudo para a landing, para que link
antigo compartilhado no WhatsApp não caia em 404.

## O que mais faz parte do desligamento

- `website_config.online_store_enabled` (migration `sql/landing_page.sql`) nasce
  `false`. As rotas que **começam uma compra** consultam essa coluna e respondem
  404 enquanto ela for `false`: `/api/loja/finalizar-pedido`,
  `/api/loja/calcular-frete`, `/api/loja/validar-cupom` e
  `/api/mercadopago/preference` (ver `src/lib/loja-online.ts`). O objetivo é não
  deixar porta de escrita pública aberta para recurso que ninguém mais usa.
- Continuam abertas, de propósito: `/api/mercadopago/webhook`, para não perder o
  retorno de um pagamento que já estava em andamento na virada; e as duas
  leituras de pedido antigo (`/api/loja/pedido/[id]` e `/api/loja/conta/pedidos`),
  que só devolvem o que já existe e não criam nada.
- `/api/loja/[slug]` também segue no ar: é a rota que alimentava o catálogo, e
  ainda serve dado de configuração. A landing não usa — lê direto do banco pelo
  `src/services/landing.service.ts`, por ser Server Component.
- `components/loja/` (CartContext, ProdutoCard) continua no lugar: é o que estas
  páginas importam.
- As abas **MercadoPago**, **Frete** e **Descontos** em Configurações continuam
  existindo e salvando. Não fazem efeito nenhum com a loja desligada.

## Como religar

1. Ligar `online_store_enabled` na tabela `website_config`.
2. Trazer os arquivos de volta para as pastas de rota (`carrinho/page.tsx`,
   `checkout/page.tsx`, ...).
3. Decidir quem fica com `/loja/<slug>`: a landing ou o catálogo. O mais
   provável é a landing ficar e o catálogo ir para `/loja/<slug>/catalogo`,
   com um botão na landing levando até ele.
4. Remover o `[...desligado]/page.tsx`, senão ele engole as rotas de volta.

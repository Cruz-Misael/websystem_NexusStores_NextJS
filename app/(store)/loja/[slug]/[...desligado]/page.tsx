// app/(store)/loja/[slug]/[...desligado]/page.tsx
//
// Tudo que ficava abaixo de /loja/<slug> era loja online: carrinho, checkout,
// produto, conta, retornos de pagamento. A loja deixou de vender e essas
// páginas foram para ../_desativado.
//
// Este arquivo existe para que link antigo não vire 404. Alguém que salvou
// /loja/site/carrinho, ou que recebeu /loja/site/produto/1234 num grupo de
// WhatsApp meses atrás, cai na landing em vez de numa página de erro.

import { redirect } from 'next/navigation';

export default async function RotaDesligada({
  params,
}: {
  params: Promise<{ slug: string; desligado: string[] }>;
}) {
  const { slug } = await params;
  redirect(`/loja/${slug}`);
}

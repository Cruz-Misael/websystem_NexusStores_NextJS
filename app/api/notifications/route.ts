import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/src/lib/supabase/admin";
import { requireOperator } from "@/src/lib/supabase/server";

export async function GET() {
  const auth = await requireOperator();
  if (!auth) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ notifications: data ?? [] });
}

// Insere avisando quando o banco recusa. Sem isto o erro passa em branco e o
// alerta some sem explicação — foi o que aconteceu com o CHECK de `type`, que
// rejeitava um tipo novo (23514) sem nada aparecer em lugar nenhum.
async function inserirNotificacoes(
  linhas: { type: string; title: string; message: string; reference_id: string }[]
) {
  if (linhas.length === 0) return;
  const { error } = await supabaseAdmin.from("notifications").insert(linhas);
  if (error) {
    console.error(
      `Falha ao criar notificação (${linhas.map((l) => l.reference_id).join(", ")}):`,
      error.message
    );
  }
}

// Sincroniza: cria notificações para condições novas, remove as que não se aplicam mais
export async function POST() {
  const auth = await requireOperator();
  if (!auth) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  // Busca referências já existentes (para evitar duplicatas)
  const { data: existing } = await supabaseAdmin
    .from("notifications")
    .select("reference_id");

  const existingRefs = new Set((existing ?? []).map((n) => n.reference_id).filter(Boolean));

  // ── Estoque crítico ──────────────────────────────────────────────────────────
  const { data: products } = await supabaseAdmin
    .from("products")
    .select("sku, name, stock_quantity, minimum_stock")
    .eq("is_active", true)
    .gt("minimum_stock", 0);

  const criticos = (products ?? []).filter((p) => p.stock_quantity <= p.minimum_stock);

  // Cria notificações novas para produtos críticos
  for (const p of criticos) {
    const ref = `stock_${p.sku}`;
    if (!existingRefs.has(ref)) {
      const msg =
        p.stock_quantity === 0
          ? `${p.name} está sem estoque.`
          : `${p.name} está com ${p.stock_quantity} unidade(s) (mínimo: ${p.minimum_stock}).`;

      await inserirNotificacoes([{
        type: "stock_critical",
        title: "Estoque Crítico",
        message: msg,
        reference_id: ref,
      }]);
    }
  }

  // Remove notificações de produtos que saíram do estado crítico
  const refsAtivos = new Set(criticos.map((p) => `stock_${p.sku}`));
  const staleStock = [...existingRefs].filter(
    (r) => typeof r === "string" && r.startsWith("stock_") && !refsAtivos.has(r)
  );
  if (staleStock.length > 0) {
    await supabaseAdmin.from("notifications").delete().in("reference_id", staleStock);
  }

  // ── Acertos de consignado: os de HOJE e os ATRASADOS ────────────────────────
  // Estar pendente é normal (consignado aguardando acerto); o alerta nasce da
  // data em "Pagamento previsto: YYYY-MM-DD" na observação.
  const { data: vendas } = await supabaseAdmin
    .from("sales")
    .select("id, sale_date, final_amount, observation, customer:people(name)")
    .eq("payment_status", "pending");

  // "Hoje" no fuso da loja, e não no do servidor: em produção o container roda
  // em UTC, então depois das 21h o servidor já viraria o dia e um acerto de hoje
  // apareceria como atrasado. Comparando as datas como texto YYYY-MM-DD (que é
  // ordenável) as duas listas também ficam mutuamente exclusivas por construção.
  const hojeISO = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" })
    .format(new Date());

  const diasEntre = (de: string, ate: string) =>
    Math.round((Date.parse(`${ate}T12:00:00Z`) - Date.parse(`${de}T12:00:00Z`)) / 86400000);

  const dataPrevistaDe = (v: { observation: string | null }) =>
    v.observation?.match(/Pagamento previsto: (\d{4}-\d{2}-\d{2})/)?.[1] ?? null;

  const formatarData = (iso: string) => iso.split("-").reverse().join("/");
  const formatarValor = (valor: unknown) =>
    Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const vendasComPrevisao = (vendas ?? [])
    .map((v) => ({ venda: v, dataPrevista: dataPrevistaDe(v) }))
    .filter((x): x is { venda: typeof x.venda; dataPrevista: string } => x.dataPrevista !== null);

  const vendasAtrasadas = vendasComPrevisao.filter((x) => x.dataPrevista < hojeISO);
  const vendasVencendoHoje = vendasComPrevisao.filter((x) => x.dataPrevista === hojeISO);

  for (const { venda: v, dataPrevista } of vendasAtrasadas) {
    const ref = `sale_${v.id}`;
    if (!existingRefs.has(ref)) {
      const diasAtraso = diasEntre(dataPrevista, hojeISO);
      const cliente = (v.customer as { name?: string } | null)?.name ?? "sem cliente";

      await inserirNotificacoes([{
        type: "sale_delayed",
        title: "Acerto Atrasado",
        message: `Consignado #${v.id} de ${cliente} (${formatarValor(v.final_amount)}) está atrasado há ${diasAtraso} dia(s) — acerto previsto para ${formatarData(dataPrevista)}.`,
        reference_id: ref,
      }]);
    }
  }

  // Acertos que vencem HOJE: é o aviso para cobrar a revendedora ainda em tempo,
  // antes de virar atraso. Prefixo de referência próprio (`duetoday_`) para não
  // colidir com a limpeza dos atrasados, que varre tudo que começa com `sale_`.
  for (const { venda: v, dataPrevista } of vendasVencendoHoje) {
    const ref = `duetoday_${v.id}`;
    if (!existingRefs.has(ref)) {
      const cliente = (v.customer as { name?: string } | null)?.name ?? "sem cliente";

      await inserirNotificacoes([{
        type: "sale_due_today",
        title: "Acerto Hoje",
        message: `Consignado #${v.id} de ${cliente} (${formatarValor(v.final_amount)}) tem acerto previsto para hoje (${formatarData(dataPrevista)}) — hora de cobrar.`,
        reference_id: ref,
      }]);
    }
  }

  // Remove notificações de vendas que foram pagas/canceladas ou não estão mais atrasadas
  const refsVendasAtivas = new Set(vendasAtrasadas.map((x) => `sale_${x.venda.id}`));
  const staleSales = [...existingRefs].filter(
    (r) => typeof r === "string" && r.startsWith("sale_") && !refsVendasAtivas.has(r)
  );
  if (staleSales.length > 0) {
    await supabaseAdmin.from("notifications").delete().in("reference_id", staleSales);
  }

  // Mesma limpeza para os acertos do dia: some ao ser pago ou ao virar atraso
  // (aí o bloco acima já criou o aviso de "Acerto Atrasado" no lugar).
  const refsVencendoHoje = new Set(vendasVencendoHoje.map((x) => `duetoday_${x.venda.id}`));
  const staleDueToday = [...existingRefs].filter(
    (r) => typeof r === "string" && r.startsWith("duetoday_") && !refsVencendoHoje.has(r)
  );
  if (staleDueToday.length > 0) {
    await supabaseAdmin.from("notifications").delete().in("reference_id", staleDueToday);
  }

  // ── Cadastros de clientes desatualizados (3+ meses sem edição) ───────────────
  const limiteCadastro = new Date();
  limiteCadastro.setMonth(limiteCadastro.getMonth() - 3);

  const { data: clientesDesatualizados, error: clientesError } = await supabaseAdmin
    .from("people")
    .select("id, name, updated_at")
    .eq("is_active", true)
    .lt("updated_at", limiteCadastro.toISOString());

  // Se a coluna updated_at ainda não existe (SQL não executado), pula o bloco
  // sem apagar notificações existentes.
  if (!clientesError) {
    const novas = (clientesDesatualizados ?? [])
      .filter((c) => !existingRefs.has(`customer_${c.id}`))
      .map((c) => {
        const meses = Math.floor(
          (Date.now() - new Date(c.updated_at).getTime()) / (1000 * 60 * 60 * 24 * 30)
        );
        return {
          type: "customer_stale",
          title: "Cadastro Desatualizado",
          message: `O cadastro de ${c.name?.trim() || `cliente #${c.id}`} está há ${meses} meses sem atualização. Confirme telefone e endereço.`,
          reference_id: `customer_${c.id}`,
        };
      });

    if (novas.length > 0) {
      await inserirNotificacoes(novas);
    }

    // Remove notificações de cadastros que foram atualizados (ou inativados)
    const refsClientesAtivos = new Set(
      (clientesDesatualizados ?? []).map((c) => `customer_${c.id}`)
    );
    const staleCustomers = [...existingRefs].filter(
      (r) => typeof r === "string" && r.startsWith("customer_") && !refsClientesAtivos.has(r)
    );
    if (staleCustomers.length > 0) {
      await supabaseAdmin.from("notifications").delete().in("reference_id", staleCustomers);
    }
  }

  return NextResponse.json({ ok: true });
}

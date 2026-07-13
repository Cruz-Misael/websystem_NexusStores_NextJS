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

      await supabaseAdmin.from("notifications").insert({
        type: "stock_critical",
        title: "Estoque Crítico",
        message: msg,
        reference_id: ref,
      });
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

  // ── Vendas ATRASADAS (data prevista de acerto já passou) ─────────────────────
  // Estar pendente é normal (consignado aguardando acerto); o alerta só dispara
  // quando o "Pagamento previsto: YYYY-MM-DD" da observação está no passado.
  const { data: vendas } = await supabaseAdmin
    .from("sales")
    .select("id, sale_date, final_amount, observation, customer:people(name)")
    .eq("payment_status", "pending");

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const vendasAtrasadas = (vendas ?? []).filter((v) => {
    const match = (v.observation as string | null)?.match(/Pagamento previsto: (\d{4}-\d{2}-\d{2})/);
    if (!match) return false; // pendente sem data prevista não é atraso
    return new Date(match[1] + "T12:00:00") < hoje;
  });

  for (const v of vendasAtrasadas) {
    const ref = `sale_${v.id}`;
    if (!existingRefs.has(ref)) {
      const dataPrevista = (v.observation as string).match(/Pagamento previsto: (\d{4}-\d{2}-\d{2})/)![1];
      const diasAtraso = Math.floor(
        (hoje.getTime() - new Date(dataPrevista + "T12:00:00").getTime()) / (1000 * 60 * 60 * 24)
      );
      const cliente = (v.customer as { name?: string } | null)?.name ?? "sem cliente";
      const valor = Number(v.final_amount).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      });

      await supabaseAdmin.from("notifications").insert({
        type: "sale_delayed",
        title: "Acerto Atrasado",
        message: `Consignado #${v.id} de ${cliente} (${valor}) está atrasado há ${diasAtraso} dia(s) — acerto previsto para ${new Date(dataPrevista + "T12:00:00").toLocaleDateString("pt-BR")}.`,
        reference_id: ref,
      });
    }
  }

  // Remove notificações de vendas que foram pagas/canceladas ou não estão mais atrasadas
  const refsVendasAtivas = new Set(vendasAtrasadas.map((v) => `sale_${v.id}`));
  const staleSales = [...existingRefs].filter(
    (r) => typeof r === "string" && r.startsWith("sale_") && !refsVendasAtivas.has(r)
  );
  if (staleSales.length > 0) {
    await supabaseAdmin.from("notifications").delete().in("reference_id", staleSales);
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
      await supabaseAdmin.from("notifications").insert(novas);
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

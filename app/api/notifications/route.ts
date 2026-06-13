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

  // ── Vendas atrasadas (pendentes há mais de 2 dias) ───────────────────────────
  const limite = new Date();
  limite.setDate(limite.getDate() - 2);

  const { data: vendas } = await supabaseAdmin
    .from("sales")
    .select("id, sale_date, final_amount, customer:customers(name)")
    .eq("payment_status", "pending")
    .lt("sale_date", limite.toISOString());

  for (const v of vendas ?? []) {
    const ref = `sale_${v.id}`;
    if (!existingRefs.has(ref)) {
      const dias = Math.floor(
        (Date.now() - new Date(v.sale_date).getTime()) / (1000 * 60 * 60 * 24)
      );
      const cliente = (v.customer as { name?: string } | null)?.name ?? "sem cliente";
      const valor = Number(v.final_amount).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      });

      await supabaseAdmin.from("notifications").insert({
        type: "sale_delayed",
        title: "Venda Atrasada",
        message: `Venda #${v.id} de ${cliente} (${valor}) está pendente há ${dias} dia(s).`,
        reference_id: ref,
      });
    }
  }

  // Remove notificações de vendas que foram pagas ou canceladas
  const refsVendasAtivas = new Set((vendas ?? []).map((v) => `sale_${v.id}`));
  const staleSales = [...existingRefs].filter(
    (r) => typeof r === "string" && r.startsWith("sale_") && !refsVendasAtivas.has(r)
  );
  if (staleSales.length > 0) {
    await supabaseAdmin.from("notifications").delete().in("reference_id", staleSales);
  }

  return NextResponse.json({ ok: true });
}

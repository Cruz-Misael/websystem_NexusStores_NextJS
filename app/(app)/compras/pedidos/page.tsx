"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search,
  Plus,
  ClipboardList,
  Loader2,
  X,
  Trash2,
  ChevronDown,
  ChevronUp,
  Send,
  CheckCircle2,
  PackageCheck,
  Ban,
  Pencil,
  Truck,
} from "lucide-react";
import { useDebounce } from "@/src/hooks/useDebounce";
import {
  PurchaseOrder,
  PurchaseOrderStatus,
  CreatePurchaseOrderDTO,
  ParcelaDTO,
  listarPedidosCompra,
  criarPedidoCompra,
  atualizarPedidoCompra,
  atualizarStatusPedido,
  receberMercadoria,
} from "@/src/services/purchases.service";
import { Supplier, listarFornecedores } from "@/src/services/suppliers.service";
import { listarProdutosPaginado } from "@/src/services/product.service";
import PopupConfirmacao from "@/components/estoque/PopupConfirmacao";
import ToastNotificacao from "@/components/estoque/ToastNotificacao";

/* ============ helpers ============ */

const fmtMoeda = (v: number) =>
  (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtData = (d?: string | null) =>
  d ? new Date(d.length <= 10 ? `${d}T12:00:00` : d).toLocaleDateString("pt-BR") : "—";

const STATUS_LABELS: Record<PurchaseOrderStatus, { label: string; cls: string }> = {
  draft:              { label: "Rascunho",            cls: "bg-zinc-100 text-zinc-600 border-zinc-200" },
  pending_approval:   { label: "Aguard. aprovação",   cls: "bg-blue-50 text-blue-700 border-blue-200" },
  approved:           { label: "Aprovado",            cls: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  sent:               { label: "Enviado",             cls: "bg-violet-50 text-violet-700 border-violet-200" },
  partially_received: { label: "Recebido parcial",    cls: "bg-amber-50 text-amber-700 border-amber-200" },
  received:           { label: "Recebido",            cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  cancelled:          { label: "Cancelado",           cls: "bg-red-50 text-red-600 border-red-200" },
};

interface ItemForm {
  product_sku: number | null;
  nome: string;
  quantity: number;
  unit_cost: number;
}

interface RecebimentoItemForm {
  purchase_order_item_id: number;
  product_sku: number | null;
  nome: string;
  pendente: number;
  quantidade: number;
  unit_cost: number;
}

/* ============ page ============ */

export default function PedidosCompraPage() {
  const [pedidos, setPedidos] = useState<PurchaseOrder[]>([]);
  const [fornecedores, setFornecedores] = useState<Supplier[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState<PurchaseOrderStatus | "all">("all");
  const [busca, setBusca] = useState("");
  const [expandido, setExpandido] = useState<Set<number>>(new Set());
  const debouncedBusca = useDebounce(busca, 300);

  const [toast, setToast] = useState<{ mensagem: string; tipo: "sucesso" | "erro" } | null>(null);
  const [confirmacao, setConfirmacao] = useState<{
    titulo: string;
    mensagem: string;
    acao: () => Promise<void>;
  } | null>(null);
  const [processando, setProcessando] = useState(false);

  /* ---- modal novo/editar pedido ---- */
  const [modalPedido, setModalPedido] = useState<{ editando: PurchaseOrder | null } | null>(null);
  const [formSupplier, setFormSupplier] = useState<number | "">("");
  const [formPrevisao, setFormPrevisao] = useState("");
  const [formCondicao, setFormCondicao] = useState("");
  const [formFrete, setFormFrete] = useState("");
  const [formDesconto, setFormDesconto] = useState("");
  const [formObs, setFormObs] = useState("");
  const [formItens, setFormItens] = useState<ItemForm[]>([]);
  const [buscaProduto, setBuscaProduto] = useState("");
  const [sugestoes, setSugestoes] = useState<any[]>([]);
  const debouncedBuscaProduto = useDebounce(buscaProduto, 250);
  const [salvando, setSalvando] = useState(false);

  /* ---- modal recebimento ---- */
  const [modalReceber, setModalReceber] = useState<PurchaseOrder | null>(null);
  const [recItens, setRecItens] = useState<RecebimentoItemForm[]>([]);
  const [recNF, setRecNF] = useState("");
  const [recFrete, setRecFrete] = useState("");
  const [recParcelas, setRecParcelas] = useState("1");
  const [recPrimeiroVenc, setRecPrimeiroVenc] = useState("");
  const [recIntervalo, setRecIntervalo] = useState("30");
  const [recebendo, setRecebendo] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const [peds, forns] = await Promise.all([
        listarPedidosCompra({ status: filtroStatus, busca: debouncedBusca }),
        listarFornecedores(),
      ]);
      setPedidos(peds);
      setFornecedores(forns);
    } catch (e: any) {
      setToast({ mensagem: e.message || "Erro ao carregar pedidos", tipo: "erro" });
    } finally {
      setCarregando(false);
    }
  }, [filtroStatus, debouncedBusca]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  /* busca de produtos para adicionar item */
  useEffect(() => {
    if (!modalPedido || !debouncedBuscaProduto.trim()) {
      setSugestoes([]);
      return;
    }
    listarProdutosPaginado(1, 8, debouncedBuscaProduto)
      .then((r) => setSugestoes(r.produtos))
      .catch(() => setSugestoes([]));
  }, [debouncedBuscaProduto, modalPedido]);

  /* KPIs */
  const kpis = useMemo(() => {
    const abertos = pedidos.filter((p) =>
      ["draft", "pending_approval", "approved", "sent", "partially_received"].includes(p.status)
    );
    const aguardandoEntrega = pedidos.filter((p) =>
      ["sent", "partially_received"].includes(p.status)
    );
    return {
      abertos: abertos.length,
      valorAberto: abertos.reduce((s, p) => s + (p.total_amount || 0), 0),
      aguardando: aguardandoEntrega.length,
    };
  }, [pedidos]);

  /* ---- ações do pedido ---- */

  const abrirNovoPedido = () => {
    setModalPedido({ editando: null });
    setFormSupplier("");
    setFormPrevisao("");
    setFormCondicao("");
    setFormFrete("");
    setFormDesconto("");
    setFormObs("");
    setFormItens([]);
    setBuscaProduto("");
  };

  const abrirEdicao = (p: PurchaseOrder) => {
    setModalPedido({ editando: p });
    setFormSupplier(p.supplier_id);
    setFormPrevisao(p.expected_date || "");
    setFormCondicao(p.payment_terms || "");
    setFormFrete(p.freight ? String(p.freight) : "");
    setFormDesconto(p.discount ? String(p.discount) : "");
    setFormObs(p.notes || "");
    setFormItens(
      p.items.map((i) => ({
        product_sku: i.product_sku,
        nome: i.product?.name || i.description || `SKU-${i.product_sku}`,
        quantity: i.quantity_ordered,
        unit_cost: i.unit_cost,
      }))
    );
    setBuscaProduto("");
  };

  const adicionarItem = (produto: any) => {
    if (formItens.some((i) => i.product_sku === produto.sku)) {
      setToast({ mensagem: "Produto já está no pedido", tipo: "erro" });
      return;
    }
    setFormItens((prev) => [
      ...prev,
      {
        product_sku: produto.sku,
        nome: produto.name,
        quantity: 1,
        unit_cost: produto.cost || 0,
      },
    ]);
    setBuscaProduto("");
    setSugestoes([]);
  };

  const totaisForm = useMemo(() => {
    const itens = formItens.reduce((s, i) => s + i.quantity * i.unit_cost, 0);
    const total = itens + (parseFloat(formFrete) || 0) - (parseFloat(formDesconto) || 0);
    return { itens, total };
  }, [formItens, formFrete, formDesconto]);

  const salvarPedido = async () => {
    if (!formSupplier) {
      setToast({ mensagem: "Selecione o fornecedor", tipo: "erro" });
      return;
    }
    if (!formItens.length) {
      setToast({ mensagem: "Adicione ao menos um item", tipo: "erro" });
      return;
    }
    setSalvando(true);
    try {
      const dto: CreatePurchaseOrderDTO = {
        supplier_id: Number(formSupplier),
        expected_date: formPrevisao || null,
        payment_terms: formCondicao || null,
        freight: parseFloat(formFrete) || 0,
        discount: parseFloat(formDesconto) || 0,
        notes: formObs || null,
        items: formItens.map((i) => ({
          product_sku: i.product_sku,
          description: i.nome,
          quantity_ordered: i.quantity,
          unit_cost: i.unit_cost,
        })),
      };

      if (modalPedido?.editando) {
        await atualizarPedidoCompra(modalPedido.editando.id, dto);
        setToast({ mensagem: "Pedido atualizado", tipo: "sucesso" });
      } else {
        const novo = await criarPedidoCompra(dto);
        setToast({ mensagem: `Pedido ${novo.code} criado como rascunho`, tipo: "sucesso" });
      }
      setModalPedido(null);
      carregar();
    } catch (e: any) {
      setToast({ mensagem: e.message || "Erro ao salvar pedido", tipo: "erro" });
    } finally {
      setSalvando(false);
    }
  };

  const mudarStatus = (p: PurchaseOrder, novo: PurchaseOrderStatus, titulo: string, msg: string) => {
    setConfirmacao({
      titulo,
      mensagem: msg,
      acao: async () => {
        await atualizarStatusPedido(p.id, novo);
        setToast({ mensagem: `${p.code}: ${STATUS_LABELS[novo].label}`, tipo: "sucesso" });
        carregar();
      },
    });
  };

  /* ---- recebimento ---- */

  const abrirRecebimento = (p: PurchaseOrder) => {
    setModalReceber(p);
    setRecItens(
      p.items
        .map((i) => ({
          purchase_order_item_id: i.id,
          product_sku: i.product_sku,
          nome: i.product?.name || i.description || `SKU-${i.product_sku}`,
          pendente: Math.max(i.quantity_ordered - (i.quantity_received || 0), 0),
          quantidade: Math.max(i.quantity_ordered - (i.quantity_received || 0), 0),
          unit_cost: i.unit_cost,
        }))
        .filter((i) => i.pendente > 0)
    );
    setRecNF("");
    setRecFrete("");
    setRecParcelas("1");
    setRecPrimeiroVenc(new Date().toISOString().slice(0, 10));
    setRecIntervalo("30");
  };

  const totalRecebimento = useMemo(() => {
    const itens = recItens.reduce((s, i) => s + i.quantidade * i.unit_cost, 0);
    return itens + (parseFloat(recFrete) || 0);
  }, [recItens, recFrete]);

  const parcelasGeradas: ParcelaDTO[] = useMemo(() => {
    const n = Math.max(parseInt(recParcelas, 10) || 1, 1);
    const intervalo = Math.max(parseInt(recIntervalo, 10) || 30, 1);
    const base = recPrimeiroVenc || new Date().toISOString().slice(0, 10);
    const valorParcela = Math.floor((totalRecebimento / n) * 100) / 100;

    const parcelas: ParcelaDTO[] = [];
    let acumulado = 0;
    for (let i = 0; i < n; i++) {
      const d = new Date(`${base}T12:00:00`);
      d.setDate(d.getDate() + i * intervalo);
      const valor =
        i === n - 1
          ? Math.round((totalRecebimento - acumulado) * 100) / 100
          : valorParcela;
      acumulado += valor;
      parcelas.push({ due_date: d.toISOString().slice(0, 10), amount: valor });
    }
    return parcelas;
  }, [recParcelas, recIntervalo, recPrimeiroVenc, totalRecebimento]);

  const confirmarRecebimentoPedido = async () => {
    if (!modalReceber) return;
    const itensValidos = recItens.filter((i) => i.quantidade > 0);
    if (!itensValidos.length) {
      setToast({ mensagem: "Informe a quantidade recebida de ao menos um item", tipo: "erro" });
      return;
    }
    if (itensValidos.some((i) => i.quantidade > i.pendente)) {
      setToast({ mensagem: "Quantidade recebida não pode exceder o saldo pendente", tipo: "erro" });
      return;
    }

    setRecebendo(true);
    try {
      await receberMercadoria(
        {
          purchase_order_id: modalReceber.id,
          supplier_id: modalReceber.supplier_id,
          invoice_number: recNF || null,
          freight: parseFloat(recFrete) || 0,
          items: itensValidos.map((i) => ({
            purchase_order_item_id: i.purchase_order_item_id,
            product_sku: i.product_sku,
            quantity: i.quantidade,
            unit_cost: i.unit_cost,
          })),
        },
        parcelasGeradas
      );
      setToast({
        mensagem: "Mercadoria recebida — estoque atualizado e conta a pagar gerada",
        tipo: "sucesso",
      });
      setModalReceber(null);
      carregar();
    } catch (e: any) {
      setToast({ mensagem: e.message || "Erro ao receber mercadoria", tipo: "erro" });
    } finally {
      setRecebendo(false);
    }
  };

  const toggleExpandido = (id: number) =>
    setExpandido((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  /* ============ render ============ */

  return (
    <div className="max-w-6xl mx-auto py-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 flex items-center gap-2">
            <ClipboardList className="text-indigo-600" size={24} />
            Pedidos de Compra
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Do pedido ao recebimento — estoque e contas a pagar atualizados automaticamente
          </p>
        </div>
        <button
          onClick={abrirNovoPedido}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
        >
          <Plus size={16} />
          Novo pedido
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Pedidos abertos</p>
          <p className="text-2xl font-bold text-zinc-900 mt-1">{kpis.abertos}</p>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Valor em aberto</p>
          <p className="text-2xl font-bold text-zinc-900 mt-1">{fmtMoeda(kpis.valorAberto)}</p>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Aguardando entrega</p>
          <p className="text-2xl font-bold text-zinc-900 mt-1">{kpis.aguardando}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar pelo número do pedido (ex.: PC-2026-0001)..."
            className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-zinc-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <select
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value as PurchaseOrderStatus | "all")}
          className="px-3 py-2.5 rounded-lg border border-zinc-200 bg-white text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">Todos os status</option>
          {(Object.keys(STATUS_LABELS) as PurchaseOrderStatus[]).map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s].label}</option>
          ))}
        </select>
      </div>

      {/* Lista */}
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        {carregando ? (
          <div className="flex items-center justify-center py-16 text-zinc-400">
            <Loader2 className="animate-spin mr-2" size={20} /> Carregando...
          </div>
        ) : pedidos.length === 0 ? (
          <div className="text-center py-16 text-zinc-400 text-sm">
            Nenhum pedido encontrado — crie o primeiro pedido de compra
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px]">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200">
                  {["", "Pedido", "Fornecedor", "Previsão", "Total", "Status", "Ações"].map((h, i) => (
                    <th
                      key={i}
                      className={`px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-zinc-500 ${
                        h === "Total" ? "text-right" : "text-left"
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pedidos.map((p) => {
                  const st = STATUS_LABELS[p.status];
                  const aberto = expandido.has(p.id);
                  return (
                    <PedidoRow
                      key={p.id}
                      pedido={p}
                      status={st}
                      aberto={aberto}
                      onToggle={() => toggleExpandido(p.id)}
                      onEditar={() => abrirEdicao(p)}
                      onEnviarAprovacao={() =>
                        mudarStatus(p, "pending_approval", "Enviar para aprovação",
                          `Enviar o pedido ${p.code} para aprovação? Ele não poderá mais ser editado até ser aprovado ou devolvido.`)
                      }
                      onAprovar={() =>
                        mudarStatus(p, "approved", "Aprovar pedido",
                          `Aprovar o pedido ${p.code} no valor de ${fmtMoeda(p.total_amount)}?`)
                      }
                      onEnviar={() =>
                        mudarStatus(p, "sent", "Enviar ao fornecedor",
                          `Marcar o pedido ${p.code} como enviado ao fornecedor? A partir daqui aguardamos a mercadoria.`)
                      }
                      onReceber={() => abrirRecebimento(p)}
                      onCancelar={() =>
                        mudarStatus(p, "cancelled", "Cancelar pedido",
                          p.status === "partially_received"
                            ? `Cancelar o saldo restante do pedido ${p.code}? O que já foi recebido permanece no estoque e no financeiro.`
                            : `Cancelar o pedido ${p.code}? Esta ação não movimenta estoque nem financeiro.`)
                      }
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ============ MODAL NOVO / EDITAR PEDIDO ============ */}
      {modalPedido && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-zinc-200 sticky top-0 bg-white z-10">
              <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
                <ClipboardList size={18} className="text-indigo-600" />
                {modalPedido.editando ? `Editar ${modalPedido.editando.code}` : "Novo pedido de compra"}
              </h3>
              <button onClick={() => setModalPedido(null)} className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Cabeçalho do pedido */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-1">
                  <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">
                    Fornecedor *
                  </label>
                  <select
                    value={formSupplier}
                    onChange={(e) => setFormSupplier(e.target.value ? Number(e.target.value) : "")}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Selecione...</option>
                    {fornecedores.map((f) => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">
                    Previsão de entrega
                  </label>
                  <input
                    type="date"
                    value={formPrevisao}
                    onChange={(e) => setFormPrevisao(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">
                    Condição de pagamento
                  </label>
                  <input
                    value={formCondicao}
                    onChange={(e) => setFormCondicao(e.target.value)}
                    placeholder='Ex.: "30/60/90"'
                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Itens */}
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">
                  Adicionar produto
                </label>
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    value={buscaProduto}
                    onChange={(e) => setBuscaProduto(e.target.value)}
                    placeholder="Busque por nome, SKU ou código de barras..."
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {sugestoes.length > 0 && (
                    <div className="absolute z-20 mt-1 w-full bg-white border border-zinc-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                      {sugestoes.map((s) => (
                        <button
                          key={s.sku}
                          onClick={() => adicionarItem(s)}
                          className="w-full flex justify-between items-start gap-2 px-3 py-2 text-left hover:bg-indigo-50 text-sm"
                        >
                          <span className="flex flex-col min-w-0">
                            <span className="text-zinc-800 truncate">
                              {s.name}
                              {s.size ? <span className="ml-1 text-zinc-500">· Tam. {s.size}</span> : null}
                            </span>
                            <span className="text-[11px] text-zinc-400 truncate">
                              Cód. barras: {s.barcode ?? "—"}
                            </span>
                          </span>
                          <span className="text-xs text-zinc-400 whitespace-nowrap ml-2 shrink-0">
                            SKU-{s.sku} · custo {fmtMoeda(s.cost || 0)} · est. {s.stock_quantity ?? 0}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {formItens.length > 0 && (
                  <div className="mt-3 border border-zinc-200 rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-zinc-50 border-b border-zinc-200">
                          <th className="px-3 py-2 text-left text-[11px] font-bold uppercase text-zinc-500">Produto</th>
                          <th className="px-3 py-2 text-right text-[11px] font-bold uppercase text-zinc-500 w-24">Qtd</th>
                          <th className="px-3 py-2 text-right text-[11px] font-bold uppercase text-zinc-500 w-32">Custo un.</th>
                          <th className="px-3 py-2 text-right text-[11px] font-bold uppercase text-zinc-500 w-28">Total</th>
                          <th className="w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {formItens.map((item, idx) => (
                          <tr key={idx} className="border-b border-zinc-100 last:border-0">
                            <td className="px-3 py-2 text-sm text-zinc-800">{item.nome}</td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                min={1}
                                value={item.quantity}
                                onChange={(e) =>
                                  setFormItens((prev) =>
                                    prev.map((it, i) =>
                                      i === idx ? { ...it, quantity: Math.max(parseInt(e.target.value) || 0, 0) } : it
                                    )
                                  )
                                }
                                className="w-full px-2 py-1 text-right text-sm rounded border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                min={0}
                                step="0.01"
                                value={item.unit_cost}
                                onChange={(e) =>
                                  setFormItens((prev) =>
                                    prev.map((it, i) =>
                                      i === idx ? { ...it, unit_cost: parseFloat(e.target.value) || 0 } : it
                                    )
                                  )
                                }
                                className="w-full px-2 py-1 text-right text-sm rounded border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              />
                            </td>
                            <td className="px-3 py-2 text-right text-sm font-semibold text-zinc-800 whitespace-nowrap">
                              {fmtMoeda(item.quantity * item.unit_cost)}
                            </td>
                            <td className="px-2">
                              <button
                                onClick={() => setFormItens((prev) => prev.filter((_, i) => i !== idx))}
                                className="p-1.5 rounded text-zinc-400 hover:text-red-600 hover:bg-red-50"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Frete / desconto / obs + totais */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Frete (R$)</label>
                  <input
                    type="number" min={0} step="0.01"
                    value={formFrete}
                    onChange={(e) => setFormFrete(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Desconto (R$)</label>
                  <input
                    type="number" min={0} step="0.01"
                    value={formDesconto}
                    onChange={(e) => setFormDesconto(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 flex flex-col justify-center">
                  <div className="flex justify-between text-xs text-indigo-700">
                    <span>Itens</span><span>{fmtMoeda(totaisForm.itens)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-indigo-800 mt-1">
                    <span>Total do pedido</span><span>{fmtMoeda(totaisForm.total)}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Observações</label>
                <textarea
                  value={formObs}
                  onChange={(e) => setFormObs(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 p-4 border-t border-zinc-200 bg-zinc-50">
              <button
                onClick={() => setModalPedido(null)}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-zinc-600 hover:bg-zinc-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={salvarPedido}
                disabled={salvando}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 transition-colors"
              >
                {salvando && <Loader2 size={14} className="animate-spin" />}
                {modalPedido.editando ? "Salvar alterações" : "Criar rascunho"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ MODAL RECEBIMENTO ============ */}
      {modalReceber && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-zinc-200 sticky top-0 bg-white z-10">
              <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
                <PackageCheck size={18} className="text-emerald-600" />
                Receber mercadoria — {modalReceber.code}
              </h3>
              <button onClick={() => setModalReceber(null)} className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-5">
              <p className="text-sm text-zinc-500">
                Confira as quantidades que chegaram. Ao confirmar, o estoque entra, o custo médio é
                recalculado e a <strong>conta a pagar é gerada automaticamente</strong> com as parcelas abaixo.
              </p>

              {/* Itens a receber */}
              <div className="border border-zinc-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-zinc-50 border-b border-zinc-200">
                      <th className="px-3 py-2 text-left text-[11px] font-bold uppercase text-zinc-500">Produto</th>
                      <th className="px-3 py-2 text-right text-[11px] font-bold uppercase text-zinc-500 w-24">Pendente</th>
                      <th className="px-3 py-2 text-right text-[11px] font-bold uppercase text-zinc-500 w-28">Recebido agora</th>
                      <th className="px-3 py-2 text-right text-[11px] font-bold uppercase text-zinc-500 w-32">Custo un. (NF)</th>
                      <th className="px-3 py-2 text-right text-[11px] font-bold uppercase text-zinc-500 w-28">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recItens.map((item, idx) => (
                      <tr key={item.purchase_order_item_id} className="border-b border-zinc-100 last:border-0">
                        <td className="px-3 py-2 text-sm text-zinc-800">{item.nome}</td>
                        <td className="px-3 py-2 text-right text-sm text-zinc-500">{item.pendente}</td>
                        <td className="px-3 py-2">
                          <input
                            type="number" min={0} max={item.pendente}
                            value={item.quantidade}
                            onChange={(e) =>
                              setRecItens((prev) =>
                                prev.map((it, i) =>
                                  i === idx
                                    ? { ...it, quantidade: Math.max(parseInt(e.target.value) || 0, 0) }
                                    : it
                                )
                              )
                            }
                            className="w-full px-2 py-1 text-right text-sm rounded border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number" min={0} step="0.01"
                            value={item.unit_cost}
                            onChange={(e) =>
                              setRecItens((prev) =>
                                prev.map((it, i) =>
                                  i === idx ? { ...it, unit_cost: parseFloat(e.target.value) || 0 } : it
                                )
                              )
                            }
                            className="w-full px-2 py-1 text-right text-sm rounded border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </td>
                        <td className="px-3 py-2 text-right text-sm font-semibold text-zinc-800 whitespace-nowrap">
                          {fmtMoeda(item.quantidade * item.unit_cost)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* NF + frete */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Nº da Nota Fiscal</label>
                  <input
                    value={recNF}
                    onChange={(e) => setRecNF(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Frete (R$)</label>
                  <input
                    type="number" min={0} step="0.01"
                    value={recFrete}
                    onChange={(e) => setRecFrete(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 flex flex-col justify-center">
                  <div className="flex justify-between text-sm font-bold text-emerald-800">
                    <span>Total do recebimento</span><span>{fmtMoeda(totalRecebimento)}</span>
                  </div>
                </div>
              </div>

              {/* Parcelas */}
              <div className="bg-amber-50/60 border border-amber-200 rounded-lg p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-3">
                  Conta a pagar — parcelamento
                </p>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-500 mb-1">Nº de parcelas</label>
                    <input
                      type="number" min={1} max={24}
                      value={recParcelas}
                      onChange={(e) => setRecParcelas(e.target.value)}
                      className="w-full px-2 py-1.5 rounded border border-zinc-200 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-500 mb-1">1º vencimento</label>
                    <input
                      type="date"
                      value={recPrimeiroVenc}
                      onChange={(e) => setRecPrimeiroVenc(e.target.value)}
                      className="w-full px-2 py-1.5 rounded border border-zinc-200 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-500 mb-1">Intervalo (dias)</label>
                    <input
                      type="number" min={1}
                      value={recIntervalo}
                      onChange={(e) => setRecIntervalo(e.target.value)}
                      className="w-full px-2 py-1.5 rounded border border-zinc-200 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {parcelasGeradas.map((p, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-amber-200 text-xs text-zinc-700"
                    >
                      <strong>{i + 1}ª</strong> {fmtData(p.due_date)} · {fmtMoeda(p.amount)}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 p-4 border-t border-zinc-200 bg-zinc-50">
              <button
                onClick={() => setModalReceber(null)}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-zinc-600 hover:bg-zinc-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarRecebimentoPedido}
                disabled={recebendo}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 transition-colors"
              >
                {recebendo && <Loader2 size={14} className="animate-spin" />}
                Confirmar recebimento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmações e toast */}
      <PopupConfirmacao
        aberto={!!confirmacao}
        titulo={confirmacao?.titulo || ""}
        mensagem={confirmacao?.mensagem || ""}
        tipo="aviso"
        confirmando={processando}
        onConfirmar={async () => {
          if (!confirmacao) return;
          setProcessando(true);
          try {
            await confirmacao.acao();
            setConfirmacao(null);
          } catch (e: any) {
            setToast({ mensagem: e.message || "Erro na operação", tipo: "erro" });
          } finally {
            setProcessando(false);
          }
        }}
        onCancelar={() => setConfirmacao(null)}
        onFechar={() => setConfirmacao(null)}
      />

      <ToastNotificacao
        aberto={!!toast}
        mensagem={toast?.mensagem || ""}
        tipo={toast?.tipo || "info"}
        onFechar={() => setToast(null)}
      />
    </div>
  );
}

/* ============ linha da tabela + detalhe expandido ============ */

function PedidoRow({
  pedido,
  status,
  aberto,
  onToggle,
  onEditar,
  onEnviarAprovacao,
  onAprovar,
  onEnviar,
  onReceber,
  onCancelar,
}: {
  pedido: PurchaseOrder;
  status: { label: string; cls: string };
  aberto: boolean;
  onToggle: () => void;
  onEditar: () => void;
  onEnviarAprovacao: () => void;
  onAprovar: () => void;
  onEnviar: () => void;
  onReceber: () => void;
  onCancelar: () => void;
}) {
  const podeCancelar = !["received", "cancelled"].includes(pedido.status);

  const btn = (
    onClick: () => void,
    title: string,
    icon: React.ReactNode,
    cls: string
  ) => (
    <button
      onClick={onClick}
      title={title}
      className={`p-2 rounded-lg text-zinc-400 transition-colors ${cls}`}
    >
      {icon}
    </button>
  );

  return (
    <>
      <tr className="border-b border-zinc-100 hover:bg-zinc-50/60">
        <td className="pl-3 w-8">
          <button onClick={onToggle} className="p-1 text-zinc-400 hover:text-zinc-700">
            {aberto ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        </td>
        <td className="px-4 py-3">
          <p className="text-sm font-bold text-zinc-800 whitespace-nowrap">{pedido.code}</p>
          <p className="text-[11px] text-zinc-400">{fmtData(pedido.created_at)}</p>
        </td>
        <td className="px-4 py-3 text-sm text-zinc-700">{pedido.supplier?.name || "—"}</td>
        <td className="px-4 py-3 text-sm text-zinc-600 whitespace-nowrap">{fmtData(pedido.expected_date)}</td>
        <td className="px-4 py-3 text-right text-sm font-semibold text-zinc-800 whitespace-nowrap">
          {fmtMoeda(pedido.total_amount)}
        </td>
        <td className="px-4 py-3">
          <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold border whitespace-nowrap ${status.cls}`}>
            {status.label}
          </span>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center justify-end gap-0.5">
            {pedido.status === "draft" && (
              <>
                {btn(onEditar, "Editar rascunho", <Pencil size={15} />, "hover:text-indigo-600 hover:bg-indigo-50")}
                {btn(onEnviarAprovacao, "Enviar para aprovação", <Send size={15} />, "hover:text-blue-600 hover:bg-blue-50")}
              </>
            )}
            {pedido.status === "pending_approval" &&
              btn(onAprovar, "Aprovar pedido", <CheckCircle2 size={15} />, "hover:text-indigo-600 hover:bg-indigo-50")}
            {pedido.status === "approved" &&
              btn(onEnviar, "Marcar como enviado ao fornecedor", <Truck size={15} />, "hover:text-violet-600 hover:bg-violet-50")}
            {["sent", "partially_received"].includes(pedido.status) &&
              btn(onReceber, "Receber mercadoria", <PackageCheck size={15} />, "hover:text-emerald-600 hover:bg-emerald-50")}
            {podeCancelar &&
              btn(onCancelar, "Cancelar", <Ban size={15} />, "hover:text-red-600 hover:bg-red-50")}
          </div>
        </td>
      </tr>

      {aberto && (
        <tr className="bg-zinc-50/80 border-b border-zinc-100">
          <td colSpan={7} className="px-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
                  Itens ({pedido.items.length})
                </p>
                <div className="space-y-1">
                  {pedido.items.map((i) => (
                    <div key={i.id} className="flex justify-between text-sm bg-white rounded-lg px-3 py-2 border border-zinc-100">
                      <span className="text-zinc-700">
                        {i.product?.name || i.description || `SKU-${i.product_sku}`}
                      </span>
                      <span className="text-zinc-500 whitespace-nowrap ml-3">
                        {i.quantity_received > 0 && (
                          <span className="text-emerald-600 font-medium">{i.quantity_received}/</span>
                        )}
                        {i.quantity_ordered} × {fmtMoeda(i.unit_cost)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="text-sm text-zinc-600 space-y-1">
                <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2">Resumo</p>
                <div className="flex justify-between"><span>Itens</span><span>{fmtMoeda(pedido.items_total)}</span></div>
                {pedido.freight > 0 && <div className="flex justify-between"><span>Frete</span><span>{fmtMoeda(pedido.freight)}</span></div>}
                {pedido.discount > 0 && <div className="flex justify-between"><span>Desconto</span><span>−{fmtMoeda(pedido.discount)}</span></div>}
                <div className="flex justify-between font-bold text-zinc-800 pt-1 border-t border-zinc-200">
                  <span>Total</span><span>{fmtMoeda(pedido.total_amount)}</span>
                </div>
                {pedido.payment_terms && (
                  <p className="pt-1 text-xs text-zinc-500">Condição: {pedido.payment_terms}</p>
                )}
                {pedido.notes && <p className="text-xs text-zinc-500">Obs.: {pedido.notes}</p>}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

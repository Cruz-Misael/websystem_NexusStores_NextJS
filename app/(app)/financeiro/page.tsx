"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search,
  Plus,
  Wallet,
  Loader2,
  X,
  ChevronDown,
  ChevronUp,
  Ban,
  AlertTriangle,
  CalendarClock,
  CalendarDays,
  CircleDollarSign,
  Landmark,
  Receipt,
  Undo2,
} from "lucide-react";
import { useDebounce } from "@/src/hooks/useDebounce";
import {
  Payable,
  PayableStatus,
  PayableInstallment,
  FinancialAccount,
  FinancialCategory,
  FinancialTransaction,
  ResumoContasPagar,
  listarContasPagar,
  listarContasFinanceiras,
  listarCategorias,
  criarContaPagarManual,
  cancelarContaPagar,
  baixarParcela,
  estornarBaixa,
  listarBaixasDaParcela,
  getResumoContasPagar,
} from "@/src/services/payables.service";
import { Supplier, listarFornecedores } from "@/src/services/suppliers.service";
import type { ParcelaDTO } from "@/src/services/purchases.service";
import PopupConfirmacao from "@/components/estoque/PopupConfirmacao";
import ToastNotificacao from "@/components/estoque/ToastNotificacao";

const fmtMoeda = (v: number) =>
  (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtData = (d?: string | null) =>
  d ? new Date(d.length <= 10 ? `${d}T12:00:00` : d).toLocaleDateString("pt-BR") : "—";

const hojeISO = () => new Date().toISOString().slice(0, 10);

const STATUS_LABELS: Record<PayableStatus, { label: string; cls: string }> = {
  open:           { label: "Em aberto",   cls: "bg-blue-50 text-blue-700 border-blue-200" },
  partially_paid: { label: "Parcial",     cls: "bg-amber-50 text-amber-700 border-amber-200" },
  paid:           { label: "Pago",        cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  cancelled:      { label: "Cancelado",   cls: "bg-zinc-100 text-zinc-500 border-zinc-200" },
};

const FORMAS_PAGAMENTO = ["PIX", "Dinheiro", "Transferência", "Boleto", "Cartão", "Outro"];

export default function FinanceiroPage() {
  const [contas, setContas] = useState<Payable[]>([]);
  const [resumo, setResumo] = useState<ResumoContasPagar | null>(null);
  const [contasFinanceiras, setContasFinanceiras] = useState<FinancialAccount[]>([]);
  const [categorias, setCategorias] = useState<FinancialCategory[]>([]);
  const [fornecedores, setFornecedores] = useState<Supplier[]>([]);
  const [carregando, setCarregando] = useState(true);

  const [filtroStatus, setFiltroStatus] = useState<PayableStatus | "all">("all");
  const [busca, setBusca] = useState("");
  const debouncedBusca = useDebounce(busca, 300);
  const [expandido, setExpandido] = useState<Set<number>>(new Set());

  const [toast, setToast] = useState<{ mensagem: string; tipo: "sucesso" | "erro" } | null>(null);
  const [confirmacao, setConfirmacao] = useState<{
    titulo: string;
    mensagem: string;
    acao: () => Promise<void>;
  } | null>(null);
  const [processando, setProcessando] = useState(false);

  /* modal nova conta manual */
  const [modalNova, setModalNova] = useState(false);
  const [nvDescricao, setNvDescricao] = useState("");
  const [nvCategoria, setNvCategoria] = useState<number | "">("");
  const [nvFornecedor, setNvFornecedor] = useState<number | "">("");
  const [nvTotal, setNvTotal] = useState("");
  const [nvParcelas, setNvParcelas] = useState("1");
  const [nvPrimeiroVenc, setNvPrimeiroVenc] = useState(hojeISO());
  const [nvIntervalo, setNvIntervalo] = useState("30");
  const [nvObs, setNvObs] = useState("");
  const [salvando, setSalvando] = useState(false);

  /* modal baixa */
  const [modalBaixa, setModalBaixa] = useState<{ conta: Payable; parcela: PayableInstallment } | null>(null);
  const [bxConta, setBxConta] = useState<number | "">("");
  const [bxValor, setBxValor] = useState("");
  const [bxJuros, setBxJuros] = useState("");
  const [bxDesconto, setBxDesconto] = useState("");
  const [bxForma, setBxForma] = useState("PIX");
  const [bxData, setBxData] = useState(hojeISO());
  const [baixando, setBaixando] = useState(false);

  /* modal histórico de baixas */
  const [modalBaixas, setModalBaixas] = useState<{ parcela: PayableInstallment } | null>(null);
  const [baixas, setBaixas] = useState<FinancialTransaction[]>([]);
  const [carregandoBaixas, setCarregandoBaixas] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const [lista, res, ctas, cats, forns] = await Promise.all([
        listarContasPagar({ status: filtroStatus, busca: debouncedBusca }),
        getResumoContasPagar(),
        listarContasFinanceiras(),
        listarCategorias("expense"),
        listarFornecedores(),
      ]);
      setContas(lista);
      setResumo(res);
      setContasFinanceiras(ctas);
      setCategorias(cats);
      setFornecedores(forns);
    } catch (e: any) {
      setToast({ mensagem: e.message || "Erro ao carregar contas a pagar", tipo: "erro" });
    } finally {
      setCarregando(false);
    }
  }, [filtroStatus, debouncedBusca]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  /* ---- nova conta manual ---- */

  const parcelasNovaConta: ParcelaDTO[] = useMemo(() => {
    const total = parseFloat(nvTotal) || 0;
    const n = Math.max(parseInt(nvParcelas, 10) || 1, 1);
    const intervalo = Math.max(parseInt(nvIntervalo, 10) || 30, 1);
    if (total <= 0) return [];

    const valorParcela = Math.floor((total / n) * 100) / 100;
    const parcelas: ParcelaDTO[] = [];
    let acumulado = 0;
    for (let i = 0; i < n; i++) {
      const d = new Date(`${nvPrimeiroVenc || hojeISO()}T12:00:00`);
      d.setDate(d.getDate() + i * intervalo);
      const valor = i === n - 1 ? Math.round((total - acumulado) * 100) / 100 : valorParcela;
      acumulado += valor;
      parcelas.push({ due_date: d.toISOString().slice(0, 10), amount: valor });
    }
    return parcelas;
  }, [nvTotal, nvParcelas, nvPrimeiroVenc, nvIntervalo]);

  const salvarNovaConta = async () => {
    const total = parseFloat(nvTotal) || 0;
    if (!nvDescricao.trim()) {
      setToast({ mensagem: "Informe a descrição da conta", tipo: "erro" });
      return;
    }
    if (total <= 0) {
      setToast({ mensagem: "Informe o valor total", tipo: "erro" });
      return;
    }
    setSalvando(true);
    try {
      await criarContaPagarManual({
        description: nvDescricao.trim(),
        total,
        parcelas: parcelasNovaConta,
        categoryId: nvCategoria ? Number(nvCategoria) : null,
        supplierId: nvFornecedor ? Number(nvFornecedor) : null,
        notes: nvObs.trim() || null,
      });
      setToast({ mensagem: "Conta a pagar criada", tipo: "sucesso" });
      setModalNova(false);
      setNvDescricao(""); setNvCategoria(""); setNvFornecedor("");
      setNvTotal(""); setNvParcelas("1"); setNvPrimeiroVenc(hojeISO());
      setNvIntervalo("30"); setNvObs("");
      carregar();
    } catch (e: any) {
      setToast({ mensagem: e.message || "Erro ao criar conta", tipo: "erro" });
    } finally {
      setSalvando(false);
    }
  };

  /* ---- baixa ---- */

  const abrirBaixa = (conta: Payable, parcela: PayableInstallment) => {
    const restante = Math.round(((parcela.amount || 0) - (parcela.paid_amount || 0)) * 100) / 100;
    setModalBaixa({ conta, parcela });
    setBxConta(contasFinanceiras[0]?.id ?? "");
    setBxValor(String(restante));
    setBxJuros("");
    setBxDesconto("");
    setBxForma("PIX");
    setBxData(hojeISO());
  };

  const confirmarBaixa = async () => {
    if (!modalBaixa) return;
    if (!bxConta) {
      setToast({ mensagem: "Selecione a conta de saída (caixa/banco)", tipo: "erro" });
      return;
    }
    const valor = parseFloat(bxValor) || 0;
    if (valor <= 0) {
      setToast({ mensagem: "Informe o valor pago", tipo: "erro" });
      return;
    }
    setBaixando(true);
    try {
      await baixarParcela({
        installmentId: modalBaixa.parcela.id,
        accountId: Number(bxConta),
        amount: valor,
        juros: parseFloat(bxJuros) || 0,
        desconto: parseFloat(bxDesconto) || 0,
        paymentMethod: bxForma,
        date: bxData,
      });
      setToast({ mensagem: "Pagamento registrado", tipo: "sucesso" });
      setModalBaixa(null);
      carregar();
    } catch (e: any) {
      setToast({ mensagem: e.message || "Erro ao registrar pagamento", tipo: "erro" });
    } finally {
      setBaixando(false);
    }
  };

  /* ---- histórico de baixas / estorno ---- */

  const abrirBaixas = async (parcela: PayableInstallment) => {
    setModalBaixas({ parcela });
    setCarregandoBaixas(true);
    try {
      setBaixas(await listarBaixasDaParcela(parcela.id));
    } catch (e: any) {
      setToast({ mensagem: e.message, tipo: "erro" });
    } finally {
      setCarregandoBaixas(false);
    }
  };

  const estornar = (tx: FinancialTransaction) => {
    setConfirmacao({
      titulo: "Estornar pagamento",
      mensagem: `Estornar o pagamento de ${fmtMoeda(tx.amount)}? O valor volta para a conta de origem e a parcela é reaberta.`,
      acao: async () => {
        await estornarBaixa(tx.id);
        setToast({ mensagem: "Pagamento estornado", tipo: "sucesso" });
        setModalBaixas(null);
        carregar();
      },
    });
  };

  const cancelarConta = (conta: Payable) => {
    setConfirmacao({
      titulo: "Cancelar conta a pagar",
      mensagem: `Cancelar a conta ${conta.code} (${fmtMoeda(conta.total_amount)})? Só é possível se nenhuma parcela tiver pagamento.`,
      acao: async () => {
        await cancelarContaPagar(conta.id);
        setToast({ mensagem: "Conta cancelada", tipo: "sucesso" });
        carregar();
      },
    });
  };

  const toggleExpandido = (id: number) =>
    setExpandido((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const hoje = hojeISO();

  /* ============ render ============ */

  const kpiCard = (
    titulo: string,
    valor: string,
    sub: string,
    icon: React.ReactNode,
    cls: string
  ) => (
    <div className="bg-white rounded-xl border border-zinc-200 p-4 flex items-start gap-3">
      <div className={`p-2 rounded-lg ${cls}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">{titulo}</p>
        <p className="text-xl font-bold text-zinc-900 mt-0.5 truncate">{valor}</p>
        <p className="text-[11px] text-zinc-400">{sub}</p>
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto py-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 flex items-center gap-2">
            <Wallet className="text-indigo-600" size={24} />
            Financeiro — Contas a Pagar
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Obrigações geradas pelas compras e despesas lançadas manualmente
          </p>
        </div>
        <button
          onClick={() => setModalNova(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
        >
          <Plus size={16} />
          Nova conta
        </button>
      </div>

      {/* Saldos das contas */}
      {contasFinanceiras.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {contasFinanceiras.map((c) => (
            <span
              key={c.id}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-zinc-200 text-sm"
            >
              <Landmark size={14} className="text-indigo-500" />
              <span className="text-zinc-500">{c.name}:</span>
              <span className={`font-bold ${c.current_balance < 0 ? "text-red-600" : "text-zinc-800"}`}>
                {fmtMoeda(c.current_balance)}
              </span>
            </span>
          ))}
        </div>
      )}

      {/* KPIs */}
      {resumo && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          {kpiCard("Vencidas", fmtMoeda(resumo.vencidas.valor), `${resumo.vencidas.qtd} parcela(s)`,
            <AlertTriangle size={18} className="text-red-600" />, "bg-red-50")}
          {kpiCard("Vence hoje", fmtMoeda(resumo.venceHoje.valor), `${resumo.venceHoje.qtd} parcela(s)`,
            <CalendarClock size={18} className="text-amber-600" />, "bg-amber-50")}
          {kpiCard("Próximos 7 dias", fmtMoeda(resumo.proximos7Dias.valor), `${resumo.proximos7Dias.qtd} parcela(s)`,
            <CalendarDays size={18} className="text-blue-600" />, "bg-blue-50")}
          {kpiCard("Total em aberto", fmtMoeda(resumo.emAberto.valor), `${resumo.emAberto.qtd} parcela(s)`,
            <CircleDollarSign size={18} className="text-indigo-600" />, "bg-indigo-50")}
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por descrição ou código (ex.: CP-2026-0001)..."
            className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-zinc-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <select
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value as PayableStatus | "all")}
          className="px-3 py-2.5 rounded-lg border border-zinc-200 bg-white text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">Todos os status</option>
          {(Object.keys(STATUS_LABELS) as PayableStatus[]).map((s) => (
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
        ) : contas.length === 0 ? (
          <div className="text-center py-16 text-zinc-400 text-sm">
            Nenhuma conta a pagar encontrada — elas surgem automaticamente ao receber mercadoria
            ou podem ser lançadas manualmente
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px]">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200">
                  {["", "Conta", "Fornecedor", "Categoria", "Total", "Pago", "Status", ""].map((h, i) => (
                    <th
                      key={i}
                      className={`px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-zinc-500 ${
                        ["Total", "Pago"].includes(h) ? "text-right" : "text-left"
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {contas.map((conta) => {
                  const st = STATUS_LABELS[conta.status];
                  const aberto = expandido.has(conta.id);
                  const pago = conta.installments.reduce((s, p) => s + (p.paid_amount || 0), 0);
                  const temVencida = conta.installments.some(
                    (p) => ["open", "partially_paid"].includes(p.status) && p.due_date < hoje
                  );
                  return (
                    <ContaRow
                      key={conta.id}
                      conta={conta}
                      status={st}
                      aberto={aberto}
                      pago={pago}
                      temVencida={temVencida}
                      hoje={hoje}
                      onToggle={() => toggleExpandido(conta.id)}
                      onBaixar={(parcela) => abrirBaixa(conta, parcela)}
                      onVerBaixas={(parcela) => abrirBaixas(parcela)}
                      onCancelar={() => cancelarConta(conta)}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ============ MODAL NOVA CONTA ============ */}
      {modalNova && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-zinc-200 sticky top-0 bg-white z-10">
              <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
                <Receipt size={18} className="text-indigo-600" />
                Nova conta a pagar
              </h3>
              <button onClick={() => setModalNova(false)} className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">
                  Descrição *
                </label>
                <input
                  value={nvDescricao}
                  onChange={(e) => setNvDescricao(e.target.value)}
                  placeholder="Ex.: Aluguel de julho, Energia elétrica..."
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Categoria</label>
                  <select
                    value={nvCategoria}
                    onChange={(e) => setNvCategoria(e.target.value ? Number(e.target.value) : "")}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Sem categoria</option>
                    {categorias.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Fornecedor (opcional)</label>
                  <select
                    value={nvFornecedor}
                    onChange={(e) => setNvFornecedor(e.target.value ? Number(e.target.value) : "")}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Nenhum</option>
                    {fornecedores.map((f) => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Valor total *</label>
                  <input
                    type="number" min={0} step="0.01"
                    value={nvTotal}
                    onChange={(e) => setNvTotal(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Parcelas</label>
                  <input
                    type="number" min={1} max={24}
                    value={nvParcelas}
                    onChange={(e) => setNvParcelas(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">1º vencimento</label>
                  <input
                    type="date"
                    value={nvPrimeiroVenc}
                    onChange={(e) => setNvPrimeiroVenc(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Intervalo (dias)</label>
                  <input
                    type="number" min={1}
                    value={nvIntervalo}
                    onChange={(e) => setNvIntervalo(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {parcelasNovaConta.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {parcelasNovaConta.map((p, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-xs text-indigo-800"
                    >
                      <strong>{i + 1}ª</strong> {fmtData(p.due_date)} · {fmtMoeda(p.amount)}
                    </span>
                  ))}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Observações</label>
                <textarea
                  value={nvObs}
                  onChange={(e) => setNvObs(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 p-4 border-t border-zinc-200 bg-zinc-50">
              <button
                onClick={() => setModalNova(false)}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-zinc-600 hover:bg-zinc-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={salvarNovaConta}
                disabled={salvando}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 transition-colors"
              >
                {salvando && <Loader2 size={14} className="animate-spin" />}
                Criar conta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ MODAL BAIXA ============ */}
      {modalBaixa && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-zinc-200">
              <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
                <CircleDollarSign size={18} className="text-emerald-600" />
                Registrar pagamento
              </h3>
              <button onClick={() => setModalBaixa(null)} className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-zinc-50 rounded-lg p-3 text-sm">
                <p className="font-semibold text-zinc-800">{modalBaixa.conta.description}</p>
                <p className="text-zinc-500 text-xs mt-0.5">
                  Parcela {modalBaixa.parcela.installment_number} · vence {fmtData(modalBaixa.parcela.due_date)} ·
                  restante {fmtMoeda((modalBaixa.parcela.amount || 0) - (modalBaixa.parcela.paid_amount || 0))}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">
                  Sai da conta *
                </label>
                <select
                  value={bxConta}
                  onChange={(e) => setBxConta(e.target.value ? Number(e.target.value) : "")}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Selecione...</option>
                  {contasFinanceiras.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} — saldo {fmtMoeda(c.current_balance)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Valor pago *</label>
                  <input
                    type="number" min={0} step="0.01"
                    value={bxValor}
                    onChange={(e) => setBxValor(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Data</label>
                  <input
                    type="date"
                    value={bxData}
                    onChange={(e) => setBxData(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Juros / multa</label>
                  <input
                    type="number" min={0} step="0.01"
                    value={bxJuros}
                    onChange={(e) => setBxJuros(e.target.value)}
                    placeholder="0,00"
                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Desconto</label>
                  <input
                    type="number" min={0} step="0.01"
                    value={bxDesconto}
                    onChange={(e) => setBxDesconto(e.target.value)}
                    placeholder="0,00"
                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Forma de pagamento</label>
                <div className="flex flex-wrap gap-2">
                  {FORMAS_PAGAMENTO.map((f) => (
                    <button
                      key={f}
                      onClick={() => setBxForma(f)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                        bxForma === f
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : "bg-white text-zinc-600 border-zinc-200 hover:border-emerald-300"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 p-4 border-t border-zinc-200 bg-zinc-50">
              <button
                onClick={() => setModalBaixa(null)}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-zinc-600 hover:bg-zinc-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarBaixa}
                disabled={baixando}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 transition-colors"
              >
                {baixando && <Loader2 size={14} className="animate-spin" />}
                Confirmar pagamento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ MODAL HISTÓRICO DE BAIXAS ============ */}
      {modalBaixas && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-zinc-200">
              <h3 className="text-lg font-bold text-zinc-900">
                Pagamentos — parcela {modalBaixas.parcela.installment_number}
              </h3>
              <button onClick={() => setModalBaixas(null)} className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100">
                <X size={18} />
              </button>
            </div>
            <div className="p-5">
              {carregandoBaixas ? (
                <div className="flex items-center justify-center py-8 text-zinc-400">
                  <Loader2 className="animate-spin mr-2" size={18} /> Carregando...
                </div>
              ) : baixas.length === 0 ? (
                <p className="text-center text-sm text-zinc-400 py-8">Nenhum pagamento registrado</p>
              ) : (
                <div className="space-y-2">
                  {baixas.map((tx) => {
                    const estornada = baixas.some((b) => b.reversed_of === tx.id);
                    const isEstorno = tx.reversed_of !== null;
                    return (
                      <div
                        key={tx.id}
                        className={`flex items-center justify-between rounded-lg border p-3 text-sm ${
                          isEstorno ? "border-zinc-200 bg-zinc-50 text-zinc-400" : "border-zinc-200 bg-white"
                        }`}
                      >
                        <div>
                          <p className={`font-semibold ${isEstorno ? "" : tx.direction === "out" ? "text-red-600" : "text-emerald-600"}`}>
                            {tx.direction === "out" ? "−" : "+"}{fmtMoeda(tx.amount)}
                            {isEstorno && " (estorno)"}
                            {estornada && " (estornado)"}
                          </p>
                          <p className="text-xs text-zinc-400">
                            {fmtData(tx.transaction_date)} · {tx.account?.name || "—"}
                            {tx.payment_method ? ` · ${tx.payment_method}` : ""}
                            {tx.interest_amount > 0 ? ` · juros ${fmtMoeda(tx.interest_amount)}` : ""}
                            {tx.discount_amount > 0 ? ` · desc. ${fmtMoeda(tx.discount_amount)}` : ""}
                          </p>
                        </div>
                        {!isEstorno && !estornada && (
                          <button
                            onClick={() => estornar(tx)}
                            title="Estornar pagamento"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 border border-red-200 transition-colors"
                          >
                            <Undo2 size={13} /> Estornar
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
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

/* ============ linha da conta + parcelas ============ */

function ContaRow({
  conta,
  status,
  aberto,
  pago,
  temVencida,
  hoje,
  onToggle,
  onBaixar,
  onVerBaixas,
  onCancelar,
}: {
  conta: Payable;
  status: { label: string; cls: string };
  aberto: boolean;
  pago: number;
  temVencida: boolean;
  hoje: string;
  onToggle: () => void;
  onBaixar: (parcela: PayableInstallment) => void;
  onVerBaixas: (parcela: PayableInstallment) => void;
  onCancelar: () => void;
}) {
  return (
    <>
      <tr className="border-b border-zinc-100 hover:bg-zinc-50/60">
        <td className="pl-3 w-8">
          <button onClick={onToggle} className="p-1 text-zinc-400 hover:text-zinc-700">
            {aberto ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        </td>
        <td className="px-4 py-3">
          <p className="text-sm font-semibold text-zinc-800 flex items-center gap-1.5">
            {temVencida && <AlertTriangle size={13} className="text-red-500 shrink-0" />}
            {conta.description}
          </p>
          <p className="text-[11px] text-zinc-400">
            {conta.code} · {conta.origin === "purchase" ? "Compra de mercadoria" : "Lançamento manual"}
          </p>
        </td>
        <td className="px-4 py-3 text-sm text-zinc-600">{conta.supplier?.name || "—"}</td>
        <td className="px-4 py-3 text-sm text-zinc-600">{conta.category?.name || "—"}</td>
        <td className="px-4 py-3 text-right text-sm font-semibold text-zinc-800 whitespace-nowrap">
          {fmtMoeda(conta.total_amount)}
        </td>
        <td className="px-4 py-3 text-right text-sm text-emerald-600 whitespace-nowrap">
          {pago > 0 ? fmtMoeda(pago) : "—"}
        </td>
        <td className="px-4 py-3">
          <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold border whitespace-nowrap ${status.cls}`}>
            {status.label}
          </span>
        </td>
        <td className="px-4 py-3">
          {["open"].includes(conta.status) && pago === 0 && (
            <button
              onClick={onCancelar}
              title="Cancelar conta"
              className="p-2 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            >
              <Ban size={15} />
            </button>
          )}
        </td>
      </tr>

      {aberto && (
        <tr className="bg-zinc-50/80 border-b border-zinc-100">
          <td colSpan={8} className="px-6 py-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
              Parcelas ({conta.installments.length})
            </p>
            <div className="space-y-1.5">
              {conta.installments.map((p) => {
                const vencida = ["open", "partially_paid"].includes(p.status) && p.due_date < hoje;
                const restante = (p.amount || 0) - (p.paid_amount || 0);
                return (
                  <div
                    key={p.id}
                    className="flex flex-wrap items-center gap-3 bg-white rounded-lg border border-zinc-100 px-3 py-2 text-sm"
                  >
                    <span className="font-bold text-zinc-500 w-8">{p.installment_number}ª</span>
                    <span className={`whitespace-nowrap ${vencida ? "text-red-600 font-semibold" : "text-zinc-600"}`}>
                      {fmtData(p.due_date)}{vencida && " (vencida)"}
                    </span>
                    <span className="font-semibold text-zinc-800 whitespace-nowrap">{fmtMoeda(p.amount)}</span>
                    {p.paid_amount > 0 && (
                      <span className="text-xs text-emerald-600 whitespace-nowrap">
                        pago {fmtMoeda(p.paid_amount)}
                      </span>
                    )}
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_LABELS[p.status].cls}`}
                    >
                      {STATUS_LABELS[p.status].label}
                    </span>
                    <span className="flex-1" />
                    {["open", "partially_paid"].includes(p.status) && (
                      <button
                        onClick={() => onBaixar(p)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                      >
                        Baixar {restante < p.amount ? fmtMoeda(restante) : ""}
                      </button>
                    )}
                    {p.paid_amount > 0 && (
                      <button
                        onClick={() => onVerBaixas(p)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-600 border border-zinc-200 hover:bg-zinc-100 transition-colors"
                      >
                        Ver pagamentos
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

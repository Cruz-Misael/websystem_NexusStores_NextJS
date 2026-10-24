"use client";

import { useState, useEffect, useMemo, useRef, Fragment } from "react";
import {
  getTopProductsByCustomer,
  ProdutoPorRevendedor,
  getConsignadosFechados,
  ConsignadoFechado,
} from "@/src/services/sales.service";
import {
  getConsignadosNaRua,
  ConsignadoNaRua,
  getRelatorioEstoque,
  EstoqueRow,
  getRelatorioFinanceiroMensal,
  FinanceiroMensal,
} from "@/src/services/reports.service";
import {
  BarChart2,
  Download,
  Search,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Loader2,
  Users,
  Package,
  ShoppingCart,
  TrendingUp,
  Settings2,
  User,
  Receipt,
  HandCoins,
  X,
  Truck,
  Wallet,
  Warehouse,
  AlertTriangle,
} from "lucide-react";

/* ─── Types ──────────────────────────────────────────────────── */
type ViewMode = "cliente" | "produto" | "consignado" | "narua" | "estoque" | "financeiro";
type ClienteSortKey = "clienteNome" | "totalItens" | "totalReceita" | "totalPedidos" | "ticketMedio";
type ProdutoSortKey = "clienteNome" | "produtoNome" | "quantidadeTotal" | "receitaTotal" | "numeroPedidos";
type ConsignadoSortKey =
  | "mes" | "clienteNome" | "valorKit" | "valorVendas" | "percentualVendas"
  | "comissaoValor" | "comissaoPercent" | "liquidoRecebido" | "dataAceite";

interface ClienteResumo {
  clienteId: number;
  clienteNome: string;
  totalItens: number;
  totalReceita: number;
  totalPedidos: number;
  ticketMedio: number;
  produtos: ProdutoPorRevendedor[];
}

interface ColDef {
  key: string;
  label: string;
  defaultVisible: boolean;
}

/* ─── Constants ──────────────────────────────────────────────── */
const PERIODOS = [
  { label: "Este mês", days: 30 },
  { label: "60 dias", days: 60 },
  { label: "90 dias", days: 90 },
  { label: "Este ano", days: 365 },
];

const COLUNAS_CLIENTE: ColDef[] = [
  { key: "totalItens",  label: "Itens",        defaultVisible: true },
  { key: "totalPedidos",label: "Pedidos",      defaultVisible: true },
  { key: "totalReceita",label: "Valor Total",  defaultVisible: true },
  { key: "ticketMedio", label: "Ticket Médio", defaultVisible: true },
];

const COLUNAS_PRODUTO: ColDef[] = [
  { key: "clienteNome",     label: "Cliente",  defaultVisible: true  },
  { key: "produtoNome",     label: "Produto",  defaultVisible: true  },
  { key: "produtoSku",      label: "SKU",      defaultVisible: false },
  { key: "quantidadeTotal", label: "Qtd.",     defaultVisible: true  },
  { key: "numeroPedidos",   label: "Pedidos",  defaultVisible: true  },
  { key: "receitaTotal",    label: "Receita",  defaultVisible: true  },
];

const COLUNAS_CONSIGNADO: ColDef[] = [
  { key: "mes",              label: "Mês",              defaultVisible: true },
  { key: "clienteNome",      label: "Cliente",          defaultVisible: true },
  { key: "valorKit",         label: "Valor do Kit",     defaultVisible: true },
  { key: "valorVendas",      label: "Valor das Vendas", defaultVisible: true },
  { key: "percentualVendas", label: "% de Vendas",      defaultVisible: true },
  { key: "comissaoValor",    label: "Comissão Paga",    defaultVisible: true },
  { key: "comissaoPercent",  label: "% Comissão",       defaultVisible: true },
  { key: "liquidoRecebido",  label: "Líquido Recebido", defaultVisible: true },
  { key: "dataAceite",       label: "Data do Aceite",   defaultVisible: true },
];

const COLUNAS_NARUA: ColDef[] = [
  { key: "clienteNome",  label: "Cliente",          defaultVisible: true },
  { key: "dataSaida",    label: "Saída do Kit",     defaultVisible: true },
  { key: "dataPrevista", label: "Acerto Previsto",  defaultVisible: true },
  { key: "qtdItens",     label: "Itens",            defaultVisible: true },
  { key: "valorKit",     label: "Valor na Rua",     defaultVisible: true },
  { key: "diasNaRua",    label: "Dias na Rua",      defaultVisible: true },
  { key: "diasAtraso",   label: "Situação",         defaultVisible: true },
];

const COLUNAS_ESTOQUE: ColDef[] = [
  { key: "produtoNome",    label: "Produto",           defaultVisible: true },
  { key: "sku",            label: "SKU",               defaultVisible: false },
  { key: "categoria",      label: "Categoria",         defaultVisible: true },
  { key: "quantidade",     label: "Qtd.",              defaultVisible: true },
  { key: "custoUnit",      label: "Custo Un.",         defaultVisible: true },
  { key: "precoVenda",     label: "Preço de Venda",    defaultVisible: false },
  { key: "valorEstoque",   label: "Valor em Estoque",  defaultVisible: true },
  { key: "valorPotencial", label: "Venda Potencial",   defaultVisible: true },
  { key: "margem",         label: "Margem %",          defaultVisible: true },
];

const COLUNAS_FINANCEIRO: ColDef[] = [
  { key: "mes",           label: "Mês",             defaultVisible: true },
  { key: "numVendas",     label: "Vendas",          defaultVisible: true },
  { key: "receita",       label: "Receita",         defaultVisible: true },
  { key: "custo",         label: "Custo",           defaultVisible: true },
  { key: "lucroBruto",    label: "Lucro Bruto",     defaultVisible: true },
  { key: "margem",        label: "Margem %",        defaultVisible: true },
  { key: "pctPeriodo",    label: "% do Período",    defaultVisible: false },
  { key: "despesasPagas", label: "Despesas Pagas",  defaultVisible: true },
  { key: "resultado",     label: "Resultado",       defaultVisible: true },
];

/* ─── Helpers ────────────────────────────────────────────────── */
function buildPeriodo(days: number) {
  const fim = new Date();
  const inicio = new Date();
  inicio.setDate(inicio.getDate() - days);
  return { inicio: inicio.toISOString(), fim: fim.toISOString() };
}

const money = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const pct = (v: number) => `${v.toFixed(1).replace(".", ",")}%`;

const formatarData = (d: string | null) => {
  if (!d) return "—";
  const [ano, mes, dia] = d.split("-");
  return `${dia}/${mes}/${ano}`;
};

function SortIcon({ active, asc }: { active: boolean; asc: boolean }) {
  if (!active) return <ChevronUp size={11} className="text-zinc-300" />;
  return asc
    ? <ChevronUp size={11} className="text-indigo-500" />
    : <ChevronDown size={11} className="text-indigo-500" />;
}

/* Tabela plana genérica — mesmo visual das tabelas de consignado/produto */
interface TabelaColuna {
  key: string;
  label: string;
  align?: "left" | "right";
  render: (row: any) => React.ReactNode;
}

function TabelaRelatorio({
  cols, vis, sort, onSort, rows, rowKey,
}: {
  cols: TabelaColuna[];
  vis: Set<string>;
  sort: { key: string; asc: boolean };
  onSort: (key: string) => void;
  rows: any[];
  rowKey: (row: any) => string;
}) {
  const visiveis = cols.filter((c) => vis.has(c.key));
  return (
    <table className="w-full text-sm">
      <thead className="bg-zinc-50 border-b border-zinc-200">
        <tr>
          <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-500 w-6">#</th>
          {visiveis.map((c) => (
            <th
              key={c.key}
              onClick={() => onSort(c.key)}
              className={`px-4 py-3 ${c.align === "right" ? "text-right" : "text-left"} text-[11px] font-bold uppercase tracking-wider text-zinc-500 cursor-pointer hover:text-zinc-800 select-none whitespace-nowrap`}
            >
              <span className={`inline-flex items-center gap-1 ${c.align === "right" ? "justify-end" : ""}`}>
                {c.label} <SortIcon active={sort.key === c.key} asc={sort.asc} />
              </span>
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-zinc-100">
        {rows.map((row, idx) => (
          <tr key={rowKey(row)} className="hover:bg-zinc-50 transition-colors">
            <td className="px-4 py-3 text-xs text-zinc-400 font-mono">{idx + 1}</td>
            {visiveis.map((c) => (
              <td key={c.key} className={`px-4 py-3 ${c.align === "right" ? "text-right" : ""} whitespace-nowrap`}>
                {c.render(row)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ─── Main Component ─────────────────────────────────────────── */
export default function RelatoriosPage() {
  /* Data state */
  const [dados, setDados] = useState<ProdutoPorRevendedor[]>([]);
  const [consignados, setConsignados] = useState<ConsignadoFechado[]>([]);
  const [naRua, setNaRua] = useState<ConsignadoNaRua[]>([]);
  const [estoque, setEstoque] = useState<EstoqueRow[]>([]);
  const [financeiro, setFinanceiro] = useState<FinanceiroMensal[]>([]);
  const [carregando, setCarregando] = useState(true);

  /* Filter state */
  const [periodoDays, setPeriodoDays] = useState(30);
  const [busca, setBusca] = useState("");
  const [filtroCliente, setFiltroCliente] = useState("todos");

  /* View / sort / columns */
  const [viewMode, setViewMode] = useState<ViewMode>("cliente");
  const [sortCliente, setSortCliente] = useState<{ key: ClienteSortKey; asc: boolean }>({ key: "totalReceita", asc: false });
  const [sortProduto, setSortProduto] = useState<{ key: ProdutoSortKey; asc: boolean }>({ key: "receitaTotal", asc: false });
  const [sortConsignado, setSortConsignado] = useState<{ key: ConsignadoSortKey; asc: boolean }>({ key: "dataAceite", asc: false });
  const [visColsCliente, setVisColsCliente] = useState<Set<string>>(
    () => new Set(COLUNAS_CLIENTE.filter((c) => c.defaultVisible).map((c) => c.key))
  );
  const [visColsProduto, setVisColsProduto] = useState<Set<string>>(
    () => new Set(COLUNAS_PRODUTO.filter((c) => c.defaultVisible).map((c) => c.key))
  );
  const [visColsConsignado, setVisColsConsignado] = useState<Set<string>>(
    () => new Set(COLUNAS_CONSIGNADO.filter((c) => c.defaultVisible).map((c) => c.key))
  );
  const [sortNaRua, setSortNaRua] = useState<{ key: string; asc: boolean }>({ key: "diasAtraso", asc: false });
  const [sortEstoque, setSortEstoque] = useState<{ key: string; asc: boolean }>({ key: "valorEstoque", asc: false });
  const [sortFinanceiro, setSortFinanceiro] = useState<{ key: string; asc: boolean }>({ key: "mes", asc: false });
  const [visColsNaRua, setVisColsNaRua] = useState<Set<string>>(
    () => new Set(COLUNAS_NARUA.filter((c) => c.defaultVisible).map((c) => c.key))
  );
  const [visColsEstoque, setVisColsEstoque] = useState<Set<string>>(
    () => new Set(COLUNAS_ESTOQUE.filter((c) => c.defaultVisible).map((c) => c.key))
  );
  const [visColsFinanceiro, setVisColsFinanceiro] = useState<Set<string>>(
    () => new Set(COLUNAS_FINANCEIRO.filter((c) => c.defaultVisible).map((c) => c.key))
  );
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [colPickerOpen, setColPickerOpen] = useState(false);
  const colPickerRef = useRef<HTMLDivElement>(null);

  /* Load data */
  useEffect(() => {
    setCarregando(true);
    setExpanded(new Set());
    const periodo = buildPeriodo(periodoDays);
    Promise.all([
      getTopProductsByCustomer(periodo),
      getConsignadosFechados(periodo),
      getConsignadosNaRua(),
      getRelatorioEstoque(),
      getRelatorioFinanceiroMensal(periodo),
    ])
      .then(([prod, cons, rua, est, fin]) => {
        setDados(prod);
        setConsignados(cons);
        setNaRua(rua);
        setEstoque(est);
        setFinanceiro(fin);
      })
      .catch(console.error)
      .finally(() => setCarregando(false));
  }, [periodoDays]);

  /* Close col picker on outside click */
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (colPickerRef.current && !colPickerRef.current.contains(e.target as Node)) {
        setColPickerOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* Derived: list of clients for filter select */
  const clientes = useMemo(() => {
    const set = new Set<string>();
    dados.forEach((d) => set.add(d.clienteNome));
    consignados.forEach((c) => set.add(c.clienteNome));
    naRua.forEach((c) => set.add(c.clienteNome));
    return [...set].sort();
  }, [dados, consignados, naRua]);

  /* Filtered flat data */
  const dadosFiltrados = useMemo(() => {
    let r = dados;
    if (filtroCliente !== "todos") r = r.filter((d) => d.clienteNome === filtroCliente);
    if (busca.trim()) {
      const q = busca.toLowerCase();
      r = r.filter(
        (d) =>
          d.clienteNome.toLowerCase().includes(q) ||
          d.produtoNome.toLowerCase().includes(q) ||
          d.produtoSku.toLowerCase().includes(q)
      );
    }
    return r;
  }, [dados, filtroCliente, busca]);

  /* Aggregate into customer-level summaries */
  const resumoClientes = useMemo((): ClienteResumo[] => {
    const map = new Map<number, ClienteResumo>();
    dadosFiltrados.forEach((row) => {
      const ex = map.get(row.clienteId);
      if (ex) {
        ex.totalItens += row.quantidadeTotal;
        ex.totalReceita += row.receitaTotal;
        ex.totalPedidos = Math.max(ex.totalPedidos, row.numeroPedidos);
        ex.produtos.push(row);
      } else {
        map.set(row.clienteId, {
          clienteId: row.clienteId,
          clienteNome: row.clienteNome,
          totalItens: row.quantidadeTotal,
          totalReceita: row.receitaTotal,
          totalPedidos: row.numeroPedidos,
          ticketMedio: 0,
          produtos: [row],
        });
      }
    });
    return Array.from(map.values())
      .map((c) => ({ ...c, ticketMedio: c.totalPedidos > 0 ? c.totalReceita / c.totalPedidos : 0 }))
      .sort((a, b) => {
        const av = a[sortCliente.key];
        const bv = b[sortCliente.key];
        if (typeof av === "string" && typeof bv === "string")
          return sortCliente.asc ? av.localeCompare(bv) : bv.localeCompare(av);
        return sortCliente.asc ? (av as number) - (bv as number) : (bv as number) - (av as number);
      });
  }, [dadosFiltrados, sortCliente]);

  /* Sorted product rows */
  const dadosProduto = useMemo(() => {
    return [...dadosFiltrados].sort((a, b) => {
      const av = a[sortProduto.key as keyof ProdutoPorRevendedor];
      const bv = b[sortProduto.key as keyof ProdutoPorRevendedor];
      if (typeof av === "string" && typeof bv === "string")
        return sortProduto.asc ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortProduto.asc ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
  }, [dadosFiltrados, sortProduto]);

  /* Filtered + sorted consignado rows */
  const dadosConsignado = useMemo(() => {
    let r = consignados;
    if (filtroCliente !== "todos") r = r.filter((c) => c.clienteNome === filtroCliente);
    if (busca.trim()) {
      const q = busca.toLowerCase();
      r = r.filter((c) => c.clienteNome.toLowerCase().includes(q) || c.mes.toLowerCase().includes(q));
    }
    return [...r].sort((a, b) => {
      // "mes" usa mesKey (cronológico); "dataAceite" trata nulos
      const key = sortConsignado.key;
      if (key === "mes") {
        return sortConsignado.asc ? a.mesKey.localeCompare(b.mesKey) : b.mesKey.localeCompare(a.mesKey);
      }
      const av = a[key as keyof ConsignadoFechado];
      const bv = b[key as keyof ConsignadoFechado];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "string" && typeof bv === "string")
        return sortConsignado.asc ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortConsignado.asc ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
  }, [consignados, filtroCliente, busca, sortConsignado]);

  /* KPIs do consignado */
  const kpisConsignado = useMemo(() => ({
    acertos: dadosConsignado.length,
    valorKit: dadosConsignado.reduce((s, c) => s + c.valorKit, 0),
    valorVendas: dadosConsignado.reduce((s, c) => s + c.valorVendas, 0),
    comissao: dadosConsignado.reduce((s, c) => s + c.comissaoValor, 0),
    liquido: dadosConsignado.reduce((s, c) => s + c.liquidoRecebido, 0),
  }), [dadosConsignado]);

  /* Ordenação genérica (mesma semântica das demais tabelas) */
  const ordenar = <T,>(rows: T[], sort: { key: string; asc: boolean }): T[] =>
    [...rows].sort((a, b) => {
      const av = (a as Record<string, unknown>)[sort.key];
      const bv = (b as Record<string, unknown>)[sort.key];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "string" && typeof bv === "string")
        return sort.asc ? av.localeCompare(bv) : bv.localeCompare(av);
      return sort.asc ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });

  /* Consignados na rua: filtro + ordenação + KPIs */
  const dadosNaRua = useMemo(() => {
    let r = naRua;
    if (filtroCliente !== "todos") r = r.filter((c) => c.clienteNome === filtroCliente);
    if (busca.trim()) {
      const q = busca.toLowerCase();
      r = r.filter((c) => c.clienteNome.toLowerCase().includes(q));
    }
    const key = sortNaRua.key === "mes" ? "dataSaida" : sortNaRua.key;
    return ordenar(r, { ...sortNaRua, key });
  }, [naRua, filtroCliente, busca, sortNaRua]);

  const kpisNaRua = useMemo(() => ({
    valorNaRua: dadosNaRua.reduce((s, c) => s + c.valorKit, 0),
    kits: dadosNaRua.length,
    atrasados: dadosNaRua.filter((c) => c.atrasado).length,
    valorAtrasado: dadosNaRua.filter((c) => c.atrasado).reduce((s, c) => s + c.valorKit, 0),
  }), [dadosNaRua]);

  /* Estoque: filtro + ordenação + KPIs */
  const dadosEstoque = useMemo(() => {
    let r = estoque;
    if (busca.trim()) {
      const q = busca.toLowerCase();
      r = r.filter(
        (p) =>
          p.produtoNome.toLowerCase().includes(q) ||
          p.categoria.toLowerCase().includes(q) ||
          String(p.sku).includes(q)
      );
    }
    return ordenar(r, sortEstoque);
  }, [estoque, busca, sortEstoque]);

  const kpisEstoque = useMemo(() => ({
    produtos: dadosEstoque.length,
    unidades: dadosEstoque.reduce((s, p) => s + p.quantidade, 0),
    valorEstoque: dadosEstoque.reduce((s, p) => s + p.valorEstoque, 0),
    valorPotencial: dadosEstoque.reduce((s, p) => s + p.valorPotencial, 0),
  }), [dadosEstoque]);

  /* Financeiro mensal: ordenação + KPIs */
  const dadosFinanceiro = useMemo(() => {
    let r = financeiro;
    if (busca.trim()) {
      const q = busca.toLowerCase();
      r = r.filter((m) => m.mes.toLowerCase().includes(q));
    }
    const key = sortFinanceiro.key === "mes" ? "mesKey" : sortFinanceiro.key;
    return ordenar(r, { ...sortFinanceiro, key });
  }, [financeiro, busca, sortFinanceiro]);

  const kpisFinanceiro = useMemo(() => {
    const receita = dadosFinanceiro.reduce((s, m) => s + m.receita, 0);
    const lucro = dadosFinanceiro.reduce((s, m) => s + m.lucroBruto, 0);
    const despesas = dadosFinanceiro.reduce((s, m) => s + m.despesasPagas, 0);
    return {
      receita,
      lucro,
      margem: receita > 0 ? (lucro / receita) * 100 : 0,
      resultado: lucro - despesas,
    };
  }, [dadosFinanceiro]);

  /* KPIs */
  const kpis = useMemo(() => ({
    clientes: resumoClientes.length,
    produtos: new Set(dadosFiltrados.map((d) => d.produtoSku)).size,
    itens: dadosFiltrados.reduce((s, d) => s + d.quantidadeTotal, 0),
    receita: dadosFiltrados.reduce((s, d) => s + d.receitaTotal, 0),
  }), [dadosFiltrados, resumoClientes]);

  /* Interactions */
  const toggleExpand = (id: number) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const handleSortCliente = (key: ClienteSortKey) =>
    setSortCliente((p) => p.key === key ? { key, asc: !p.asc } : { key, asc: false });

  const handleSortProduto = (key: ProdutoSortKey) =>
    setSortProduto((p) => p.key === key ? { key, asc: !p.asc } : { key, asc: false });

  const handleSortConsignado = (key: ConsignadoSortKey) =>
    setSortConsignado((p) => p.key === key ? { key, asc: !p.asc } : { key, asc: false });

  const toggleColCliente = (key: string) =>
    setVisColsCliente((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const toggleColProduto = (key: string) =>
    setVisColsProduto((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const toggleColConsignado = (key: string) =>
    setVisColsConsignado((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const handleSortNaRua = (key: string) =>
    setSortNaRua((p) => p.key === key ? { key, asc: !p.asc } : { key, asc: false });
  const handleSortEstoque = (key: string) =>
    setSortEstoque((p) => p.key === key ? { key, asc: !p.asc } : { key, asc: false });
  const handleSortFinanceiro = (key: string) =>
    setSortFinanceiro((p) => p.key === key ? { key, asc: !p.asc } : { key, asc: false });

  const toggleColNaRua = (key: string) =>
    setVisColsNaRua((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  const toggleColEstoque = (key: string) =>
    setVisColsEstoque((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  const toggleColFinanceiro = (key: string) =>
    setVisColsFinanceiro((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  /* Export CSV */
  const exportarCSV = () => {
    let header: string[];
    let linhas: (string | number)[][];

    if (viewMode === "cliente") {
      header = ["Cliente", "Itens", "Pedidos", "Valor Total (R$)", "Ticket Médio (R$)"];
      linhas = resumoClientes.map((c) => [
        c.clienteNome,
        c.totalItens,
        c.totalPedidos,
        c.totalReceita.toFixed(2).replace(".", ","),
        c.ticketMedio.toFixed(2).replace(".", ","),
      ]);
    } else if (viewMode === "consignado") {
      header = [
        "Mês", "Cliente", "Valor do Kit (R$)", "Valor das Vendas (R$)", "% de Vendas",
        "Comissão Paga (R$)", "% Comissão", "Líquido Recebido (R$)", "Data do Aceite",
      ];
      linhas = dadosConsignado.map((c) => [
        c.mes,
        c.clienteNome,
        c.valorKit.toFixed(2).replace(".", ","),
        c.valorVendas.toFixed(2).replace(".", ","),
        c.percentualVendas.toFixed(1).replace(".", ","),
        c.comissaoValor.toFixed(2).replace(".", ","),
        c.comissaoPercent.toFixed(1).replace(".", ","),
        c.liquidoRecebido.toFixed(2).replace(".", ","),
        c.dataAceite ? formatarData(c.dataAceite) : "—",
      ]);
    } else if (viewMode === "narua") {
      header = ["Cliente", "Saída do Kit", "Acerto Previsto", "Itens", "Valor na Rua (R$)", "Dias na Rua", "Dias de Atraso"];
      linhas = dadosNaRua.map((c) => [
        c.clienteNome,
        formatarData(c.dataSaida),
        c.dataPrevista ? formatarData(c.dataPrevista) : "—",
        c.qtdItens,
        c.valorKit.toFixed(2).replace(".", ","),
        c.diasNaRua,
        c.diasAtraso,
      ]);
    } else if (viewMode === "estoque") {
      header = ["Produto", "SKU", "Categoria", "Qtd.", "Custo Un. (R$)", "Preço de Venda (R$)", "Valor em Estoque (R$)", "Venda Potencial (R$)", "Margem %"];
      linhas = dadosEstoque.map((p) => [
        p.produtoNome,
        p.sku,
        p.categoria,
        p.quantidade,
        p.custoUnit.toFixed(2).replace(".", ","),
        p.precoVenda.toFixed(2).replace(".", ","),
        p.valorEstoque.toFixed(2).replace(".", ","),
        p.valorPotencial.toFixed(2).replace(".", ","),
        p.margem.toFixed(1).replace(".", ","),
      ]);
    } else if (viewMode === "financeiro") {
      header = ["Mês", "Vendas", "Receita (R$)", "Custo (R$)", "Lucro Bruto (R$)", "Margem %", "% do Período", "Despesas Pagas (R$)", "Resultado (R$)"];
      linhas = dadosFinanceiro.map((m) => [
        m.mes,
        m.numVendas,
        m.receita.toFixed(2).replace(".", ","),
        m.custo.toFixed(2).replace(".", ","),
        m.lucroBruto.toFixed(2).replace(".", ","),
        m.margem.toFixed(1).replace(".", ","),
        m.pctPeriodo.toFixed(1).replace(".", ","),
        m.despesasPagas.toFixed(2).replace(".", ","),
        m.resultado.toFixed(2).replace(".", ","),
      ]);
    } else {
      header = ["Cliente", "Produto", "SKU", "Qtd.", "Pedidos", "Receita (R$)"];
      linhas = dadosProduto.map((d) => [
        d.clienteNome,
        d.produtoNome,
        d.produtoSku,
        d.quantidadeTotal,
        d.numeroPedidos,
        d.receitaTotal.toFixed(2).replace(".", ","),
      ]);
    }

    const csv = [header, ...linhas]
      .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";"))
      .join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio_vendas_${viewMode}_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const activeCols: ColDef[] = {
    cliente: COLUNAS_CLIENTE,
    produto: COLUNAS_PRODUTO,
    consignado: COLUNAS_CONSIGNADO,
    narua: COLUNAS_NARUA,
    estoque: COLUNAS_ESTOQUE,
    financeiro: COLUNAS_FINANCEIRO,
  }[viewMode];
  const visActive: Set<string> = {
    cliente: visColsCliente,
    produto: visColsProduto,
    consignado: visColsConsignado,
    narua: visColsNaRua,
    estoque: visColsEstoque,
    financeiro: visColsFinanceiro,
  }[viewMode];
  const toggleActive: (key: string) => void = {
    cliente: toggleColCliente,
    produto: toggleColProduto,
    consignado: toggleColConsignado,
    narua: toggleColNaRua,
    estoque: toggleColEstoque,
    financeiro: toggleColFinanceiro,
  }[viewMode];

  /* dados visíveis (para empty-state / footer / export) conforme o modo */
  const temDados = {
    cliente: dadosFiltrados.length > 0,
    produto: dadosFiltrados.length > 0,
    consignado: dadosConsignado.length > 0,
    narua: dadosNaRua.length > 0,
    estoque: dadosEstoque.length > 0,
    financeiro: dadosFinanceiro.length > 0,
  }[viewMode];

  /* ─── Render ── */
  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-zinc-900 tracking-tight flex items-center gap-2">
            <BarChart2 size={22} className="text-indigo-600" />
            {{
              cliente: "Relatório de Vendas por Cliente",
              produto: "Relatório de Vendas por Cliente",
              consignado: "Relatório de Consignados",
              narua: "Consignados na Rua",
              estoque: "Relatório de Estoque",
              financeiro: "Relatório Financeiro",
            }[viewMode]}
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {{
              cliente: "Tabela dinâmica — personalize a visualização conforme sua necessidade",
              produto: "Tabela dinâmica — personalize a visualização conforme sua necessidade",
              consignado: "Acertos de consignado fechados — kit, vendas, comissão e líquido recebido",
              narua: "Kits pendentes de acerto — quanto está na rua aguardando retorno",
              estoque: "Posição atual valorizada — custo, venda potencial e margem",
              financeiro: "Resumo mensal — receita, custo, lucro bruto e despesas",
            }[viewMode]}
          </p>
        </div>
        <button
          onClick={exportarCSV}
          disabled={!temDados}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-zinc-200 disabled:text-zinc-400 text-white text-sm font-bold rounded-lg transition-colors"
        >
          <Download size={15} />
          Exportar CSV
        </button>
      </div>

      {/* ── Controles ── */}
      <div className="bg-white rounded-xl border border-zinc-200 p-4 space-y-3">
        {/* Linha 1: Período + Cliente + Busca */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex gap-1.5">
            {PERIODOS.map((p) => (
              <button
                key={p.days}
                onClick={() => setPeriodoDays(p.days)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  periodoDays === p.days
                    ? "bg-indigo-600 text-white"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="h-7 w-px bg-zinc-200 self-center hidden sm:block" />

          <select
            value={filtroCliente}
            onChange={(e) => setFiltroCliente(e.target.value)}
            className="h-8 px-3 text-xs border border-zinc-200 rounded-lg bg-white text-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-400/20 focus:border-indigo-400"
          >
            <option value="todos">Todos os clientes</option>
            {clientes.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <div className="relative ml-auto">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Buscar cliente ou produto..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="h-8 pl-8 pr-8 text-xs border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400/20 focus:border-indigo-400 w-56"
            />
            {busca && (
              <button onClick={() => setBusca("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Linha 2: Modo de visualização + Colunas */}
        <div className="flex flex-wrap gap-3 items-center border-t border-zinc-100 pt-3">
          {/* Toggle de modo */}
          <div className="flex items-center gap-1 bg-zinc-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode("cliente")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${
                viewMode === "cliente"
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              <User size={12} />
              Por Cliente
            </button>
            <button
              onClick={() => setViewMode("produto")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${
                viewMode === "produto"
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              <Package size={12} />
              Detalhe por Produto
            </button>
            <button
              onClick={() => setViewMode("consignado")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${
                viewMode === "consignado"
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              <Receipt size={12} />
              Consignados
            </button>
            <button
              onClick={() => setViewMode("narua")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${
                viewMode === "narua"
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              <Truck size={12} />
              Na Rua
            </button>
            <button
              onClick={() => setViewMode("estoque")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${
                viewMode === "estoque"
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              <Warehouse size={12} />
              Estoque
            </button>
            <button
              onClick={() => setViewMode("financeiro")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${
                viewMode === "financeiro"
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              <Wallet size={12} />
              Financeiro
            </button>
          </div>

          {/* Column picker */}
          <div className="relative" ref={colPickerRef}>
            <button
              onClick={() => setColPickerOpen((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors ${
                colPickerOpen
                  ? "bg-indigo-50 border-indigo-300 text-indigo-700"
                  : "bg-white border-zinc-200 text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50"
              }`}
            >
              <Settings2 size={13} />
              Colunas
              <span className="ml-0.5 inline-flex items-center justify-center w-4 h-4 bg-indigo-100 text-indigo-700 rounded-full text-[10px] font-black">
                {visActive.size}
              </span>
            </button>

            {colPickerOpen && (
              <div className="absolute top-full left-0 mt-1.5 bg-white border border-zinc-200 rounded-xl shadow-xl p-3 z-20 min-w-[190px]">
                <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2 px-1">
                  {viewMode === "cliente" ? "Métricas visíveis" : "Colunas visíveis"}
                </p>
                {activeCols.map((col) => (
                  <label
                    key={col.key}
                    className="flex items-center gap-2.5 px-1 py-1.5 rounded-lg hover:bg-zinc-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={visActive.has(col.key)}
                      onChange={() => toggleActive(col.key)}
                      className="w-3.5 h-3.5 rounded accent-indigo-600"
                    />
                    <span className="text-xs font-medium text-zinc-700">{col.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {viewMode === "cliente" && (
            <button
              onClick={() =>
                setExpanded(
                  expanded.size === resumoClientes.length
                    ? new Set()
                    : new Set(resumoClientes.map((c) => c.clienteId))
                )
              }
              className="ml-auto text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
            >
              {expanded.size === resumoClientes.length ? "Recolher todos" : "Expandir todos"}
            </button>
          )}
        </div>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {({
          consignado: [
            { label: "Valor dos kits",   value: money(kpisConsignado.valorKit),    icon: Package,    color: "text-indigo-600",  bg: "bg-indigo-50"  },
            { label: "Valor vendido",    value: money(kpisConsignado.valorVendas), icon: ShoppingCart, color: "text-violet-600",  bg: "bg-violet-50"  },
            { label: "Comissão paga",    value: money(kpisConsignado.comissao),    icon: HandCoins,  color: "text-rose-600",    bg: "bg-rose-50"    },
            { label: "Líquido recebido", value: money(kpisConsignado.liquido),     icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
          ],
          narua: [
            { label: "Valor na rua",      value: money(kpisNaRua.valorNaRua),      icon: Truck,         color: "text-indigo-600",  bg: "bg-indigo-50"  },
            { label: "Kits na rua",       value: kpisNaRua.kits,                   icon: Package,       color: "text-violet-600",  bg: "bg-violet-50"  },
            { label: "Acertos atrasados", value: kpisNaRua.atrasados,              icon: AlertTriangle, color: "text-rose-600",    bg: "bg-rose-50"    },
            { label: "Valor atrasado",    value: money(kpisNaRua.valorAtrasado),   icon: HandCoins,     color: "text-amber-600",   bg: "bg-amber-50"   },
          ],
          estoque: [
            { label: "Produtos c/ estoque", value: kpisEstoque.produtos,                          icon: Package,   color: "text-indigo-600",  bg: "bg-indigo-50"  },
            { label: "Unidades",            value: kpisEstoque.unidades.toLocaleString("pt-BR"),  icon: Warehouse, color: "text-violet-600",  bg: "bg-violet-50"  },
            { label: "Valor em estoque",    value: money(kpisEstoque.valorEstoque),               icon: Wallet,    color: "text-amber-600",   bg: "bg-amber-50"   },
            { label: "Venda potencial",     value: money(kpisEstoque.valorPotencial),             icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
          ],
          financeiro: [
            { label: "Receita",     value: money(kpisFinanceiro.receita),   icon: ShoppingCart, color: "text-indigo-600",  bg: "bg-indigo-50"  },
            { label: "Lucro bruto", value: money(kpisFinanceiro.lucro),     icon: TrendingUp,   color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "Margem",      value: pct(kpisFinanceiro.margem),      icon: BarChart2,    color: "text-violet-600",  bg: "bg-violet-50"  },
            { label: "Resultado (após despesas)", value: money(kpisFinanceiro.resultado), icon: Wallet, color: kpisFinanceiro.resultado >= 0 ? "text-emerald-600" : "text-rose-600", bg: kpisFinanceiro.resultado >= 0 ? "bg-emerald-50" : "bg-rose-50" },
          ],
          cliente: [
            { label: "Clientes",           value: kpis.clientes,                       icon: Users,        color: "text-indigo-600",  bg: "bg-indigo-50"  },
            { label: "Produtos distintos", value: kpis.produtos,                       icon: Package,      color: "text-violet-600",  bg: "bg-violet-50"  },
            { label: "Itens vendidos",     value: kpis.itens.toLocaleString("pt-BR"),  icon: ShoppingCart, color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "Receita total",      value: money(kpis.receita),                 icon: TrendingUp,   color: "text-amber-600",   bg: "bg-amber-50"   },
          ],
          produto: [
            { label: "Clientes",           value: kpis.clientes,                       icon: Users,        color: "text-indigo-600",  bg: "bg-indigo-50"  },
            { label: "Produtos distintos", value: kpis.produtos,                       icon: Package,      color: "text-violet-600",  bg: "bg-violet-50"  },
            { label: "Itens vendidos",     value: kpis.itens.toLocaleString("pt-BR"),  icon: ShoppingCart, color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "Receita total",      value: money(kpis.receita),                 icon: TrendingUp,   color: "text-amber-600",   bg: "bg-amber-50"   },
          ],
        }[viewMode] as { label: string; value: string | number; icon: typeof Users; color: string; bg: string }[]).map((k) => (
          <div key={k.label} className="bg-white rounded-xl border border-zinc-200 p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${k.bg} flex items-center justify-center shrink-0`}>
              <k.icon size={18} className={k.color} />
            </div>
            <div>
              <p className="text-[11px] text-zinc-500 font-medium">{k.label}</p>
              <p className="text-lg font-black text-zinc-900 leading-tight">{k.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Tabela ── */}
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        <div className="overflow-x-auto">
          {carregando ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={24} className="animate-spin text-indigo-400" />
            </div>
          ) : !temDados ? (
            <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
              <BarChart2 size={32} className="mb-2 opacity-40" />
              <p className="text-sm font-medium">Nenhum dado encontrado</p>
              <p className="text-xs mt-1">
                {viewMode === "consignado"
                  ? "Nenhum consignado fechado no período — tente ampliar o período ou remover filtros"
                  : "Tente ampliar o período ou remover filtros"}
              </p>
            </div>
          ) : viewMode === "cliente" ? (
            /* ─── Tabela Por Cliente (expansível) ─── */
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 border-b border-zinc-200">
                <tr>
                  <th className="w-8 px-3 py-3" />
                  <th
                    onClick={() => handleSortCliente("clienteNome")}
                    className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-500 cursor-pointer hover:text-zinc-800 select-none"
                  >
                    <span className="inline-flex items-center gap-1">
                      Cliente
                      <SortIcon active={sortCliente.key === "clienteNome"} asc={sortCliente.asc} />
                    </span>
                  </th>
                  {visColsCliente.has("totalItens") && (
                    <th onClick={() => handleSortCliente("totalItens")} className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-zinc-500 cursor-pointer hover:text-zinc-800 select-none whitespace-nowrap">
                      <span className="inline-flex items-center justify-end gap-1">Itens <SortIcon active={sortCliente.key === "totalItens"} asc={sortCliente.asc} /></span>
                    </th>
                  )}
                  {visColsCliente.has("totalPedidos") && (
                    <th onClick={() => handleSortCliente("totalPedidos")} className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-zinc-500 cursor-pointer hover:text-zinc-800 select-none whitespace-nowrap">
                      <span className="inline-flex items-center justify-end gap-1">Pedidos <SortIcon active={sortCliente.key === "totalPedidos"} asc={sortCliente.asc} /></span>
                    </th>
                  )}
                  {visColsCliente.has("totalReceita") && (
                    <th onClick={() => handleSortCliente("totalReceita")} className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-zinc-500 cursor-pointer hover:text-zinc-800 select-none whitespace-nowrap">
                      <span className="inline-flex items-center justify-end gap-1">Valor Total <SortIcon active={sortCliente.key === "totalReceita"} asc={sortCliente.asc} /></span>
                    </th>
                  )}
                  {visColsCliente.has("ticketMedio") && (
                    <th onClick={() => handleSortCliente("ticketMedio")} className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-zinc-500 cursor-pointer hover:text-zinc-800 select-none whitespace-nowrap">
                      <span className="inline-flex items-center justify-end gap-1">Ticket Médio <SortIcon active={sortCliente.key === "ticketMedio"} asc={sortCliente.asc} /></span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {resumoClientes.map((cliente, idx) => {
                  const isOpen = expanded.has(cliente.clienteId);
                  const produtosOrdenados = [...cliente.produtos].sort(
                    (a, b) => b.receitaTotal - a.receitaTotal
                  );
                  return (
                    <Fragment key={`grupo_${cliente.clienteId}`}>
                      {/* Linha do cliente */}
                      <tr
                        onClick={() => toggleExpand(cliente.clienteId)}
                        className={`cursor-pointer transition-colors border-t border-zinc-100 ${
                          isOpen ? "bg-indigo-50/60" : idx % 2 === 0 ? "bg-white hover:bg-zinc-50" : "bg-zinc-50/40 hover:bg-zinc-100/60"
                        }`}
                      >
                        <td className="px-3 py-3 text-zinc-400">
                          <ChevronRight
                            size={15}
                            className={`transition-transform duration-200 ${isOpen ? "rotate-90 text-indigo-500" : ""}`}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-black shrink-0">
                              {cliente.clienteNome.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-zinc-800 text-sm leading-tight">{cliente.clienteNome}</p>
                              <p className="text-[10px] text-zinc-400">{cliente.produtos.length} produto{cliente.produtos.length !== 1 ? "s" : ""} distintos</p>
                            </div>
                          </div>
                        </td>
                        {visColsCliente.has("totalItens") && (
                          <td className="px-4 py-3 text-right">
                            <span className="inline-flex items-center justify-center min-w-[32px] px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full">
                              {cliente.totalItens}
                            </span>
                          </td>
                        )}
                        {visColsCliente.has("totalPedidos") && (
                          <td className="px-4 py-3 text-right text-xs text-zinc-500">
                            {cliente.totalPedidos}
                          </td>
                        )}
                        {visColsCliente.has("totalReceita") && (
                          <td className="px-4 py-3 text-right font-black text-zinc-900">
                            {money(cliente.totalReceita)}
                          </td>
                        )}
                        {visColsCliente.has("ticketMedio") && (
                          <td className="px-4 py-3 text-right text-zinc-600 font-medium">
                            {money(cliente.ticketMedio)}
                          </td>
                        )}
                      </tr>

                      {/* Linhas de produto (expansível) */}
                      {isOpen && produtosOrdenados.map((prod) => (
                        <tr
                          key={`p_${cliente.clienteId}_${prod.produtoSku}_d`}
                          className="bg-indigo-50/30 border-t border-indigo-100/50"
                        >
                          <td className="px-3 py-2.5">
                            <div className="w-4 border-l-2 border-b-2 border-indigo-200 h-3 ml-1 rounded-bl" />
                          </td>
                          <td className="px-4 py-2.5 pl-8">
                            <div>
                              <p className="text-xs font-medium text-zinc-700">{prod.produtoNome}</p>
                              <p className="text-[10px] text-zinc-400 font-mono">{prod.produtoSku}</p>
                            </div>
                          </td>
                          {visColsCliente.has("totalItens") && (
                            <td className="px-4 py-2.5 text-right">
                              <span className="text-xs text-zinc-500">{prod.quantidadeTotal} un.</span>
                            </td>
                          )}
                          {visColsCliente.has("totalPedidos") && (
                            <td className="px-4 py-2.5 text-right text-xs text-zinc-400">
                              {prod.numeroPedidos}
                            </td>
                          )}
                          {visColsCliente.has("totalReceita") && (
                            <td className="px-4 py-2.5 text-right text-xs font-semibold text-zinc-700">
                              {money(prod.receitaTotal)}
                            </td>
                          )}
                          {visColsCliente.has("ticketMedio") && (
                            <td className="px-4 py-2.5 text-right text-xs text-zinc-400">
                              {prod.numeroPedidos > 0 ? money(prod.receitaTotal / prod.numeroPedidos) : "—"}
                            </td>
                          )}
                        </tr>
                      ))}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          ) : viewMode === "consignado" ? (
            /* ─── Tabela Consignados ─── */
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 border-b border-zinc-200">
                <tr>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-500 w-6">#</th>
                  {visColsConsignado.has("mes") && (
                    <th onClick={() => handleSortConsignado("mes")} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-500 cursor-pointer hover:text-zinc-800 select-none whitespace-nowrap">
                      <span className="inline-flex items-center gap-1">Mês <SortIcon active={sortConsignado.key === "mes"} asc={sortConsignado.asc} /></span>
                    </th>
                  )}
                  {visColsConsignado.has("clienteNome") && (
                    <th onClick={() => handleSortConsignado("clienteNome")} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-500 cursor-pointer hover:text-zinc-800 select-none whitespace-nowrap">
                      <span className="inline-flex items-center gap-1">Cliente <SortIcon active={sortConsignado.key === "clienteNome"} asc={sortConsignado.asc} /></span>
                    </th>
                  )}
                  {visColsConsignado.has("valorKit") && (
                    <th onClick={() => handleSortConsignado("valorKit")} className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-zinc-500 cursor-pointer hover:text-zinc-800 select-none whitespace-nowrap">
                      <span className="inline-flex items-center justify-end gap-1">Valor do Kit <SortIcon active={sortConsignado.key === "valorKit"} asc={sortConsignado.asc} /></span>
                    </th>
                  )}
                  {visColsConsignado.has("valorVendas") && (
                    <th onClick={() => handleSortConsignado("valorVendas")} className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-zinc-500 cursor-pointer hover:text-zinc-800 select-none whitespace-nowrap">
                      <span className="inline-flex items-center justify-end gap-1">Valor das Vendas <SortIcon active={sortConsignado.key === "valorVendas"} asc={sortConsignado.asc} /></span>
                    </th>
                  )}
                  {visColsConsignado.has("percentualVendas") && (
                    <th onClick={() => handleSortConsignado("percentualVendas")} className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-zinc-500 cursor-pointer hover:text-zinc-800 select-none whitespace-nowrap">
                      <span className="inline-flex items-center justify-end gap-1">% de Vendas <SortIcon active={sortConsignado.key === "percentualVendas"} asc={sortConsignado.asc} /></span>
                    </th>
                  )}
                  {visColsConsignado.has("comissaoValor") && (
                    <th onClick={() => handleSortConsignado("comissaoValor")} className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-zinc-500 cursor-pointer hover:text-zinc-800 select-none whitespace-nowrap">
                      <span className="inline-flex items-center justify-end gap-1">Comissão Paga <SortIcon active={sortConsignado.key === "comissaoValor"} asc={sortConsignado.asc} /></span>
                    </th>
                  )}
                  {visColsConsignado.has("comissaoPercent") && (
                    <th onClick={() => handleSortConsignado("comissaoPercent")} className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-zinc-500 cursor-pointer hover:text-zinc-800 select-none whitespace-nowrap">
                      <span className="inline-flex items-center justify-end gap-1">% Comissão <SortIcon active={sortConsignado.key === "comissaoPercent"} asc={sortConsignado.asc} /></span>
                    </th>
                  )}
                  {visColsConsignado.has("liquidoRecebido") && (
                    <th onClick={() => handleSortConsignado("liquidoRecebido")} className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-zinc-500 cursor-pointer hover:text-zinc-800 select-none whitespace-nowrap">
                      <span className="inline-flex items-center justify-end gap-1">Líquido Recebido <SortIcon active={sortConsignado.key === "liquidoRecebido"} asc={sortConsignado.asc} /></span>
                    </th>
                  )}
                  {visColsConsignado.has("dataAceite") && (
                    <th onClick={() => handleSortConsignado("dataAceite")} className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-zinc-500 cursor-pointer hover:text-zinc-800 select-none whitespace-nowrap">
                      <span className="inline-flex items-center justify-end gap-1">Data do Aceite <SortIcon active={sortConsignado.key === "dataAceite"} asc={sortConsignado.asc} /></span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {dadosConsignado.map((row, idx) => (
                  <tr key={`cons_${row.vendaId}`} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-4 py-3 text-xs text-zinc-400 font-mono">{idx + 1}</td>
                    {visColsConsignado.has("mes") && (
                      <td className="px-4 py-3 text-zinc-700 capitalize whitespace-nowrap">{row.mes}</td>
                    )}
                    {visColsConsignado.has("clienteNome") && (
                      <td className="px-4 py-3">
                        <span className="font-semibold text-zinc-800">{row.clienteNome}</span>
                      </td>
                    )}
                    {visColsConsignado.has("valorKit") && (
                      <td className="px-4 py-3 text-right text-zinc-600 font-medium whitespace-nowrap">{money(row.valorKit)}</td>
                    )}
                    {visColsConsignado.has("valorVendas") && (
                      <td className="px-4 py-3 text-right font-semibold text-zinc-800 whitespace-nowrap">{money(row.valorVendas)}</td>
                    )}
                    {visColsConsignado.has("percentualVendas") && (
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <span className="inline-flex items-center justify-center px-2 py-0.5 bg-violet-50 text-violet-700 text-xs font-bold rounded-full">
                          {pct(row.percentualVendas)}
                        </span>
                      </td>
                    )}
                    {visColsConsignado.has("comissaoValor") && (
                      <td className="px-4 py-3 text-right text-rose-600 font-medium whitespace-nowrap">{money(row.comissaoValor)}</td>
                    )}
                    {visColsConsignado.has("comissaoPercent") && (
                      <td className="px-4 py-3 text-right text-xs text-zinc-500 whitespace-nowrap">{pct(row.comissaoPercent)}</td>
                    )}
                    {visColsConsignado.has("liquidoRecebido") && (
                      <td className="px-4 py-3 text-right font-black text-emerald-700 whitespace-nowrap">{money(row.liquidoRecebido)}</td>
                    )}
                    {visColsConsignado.has("dataAceite") && (
                      <td className="px-4 py-3 text-right text-xs text-zinc-500 whitespace-nowrap">{formatarData(row.dataAceite)}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : viewMode === "narua" ? (
            /* ─── Tabela Consignados na Rua ─── */
            <TabelaRelatorio
              vis={visColsNaRua}
              sort={sortNaRua}
              onSort={handleSortNaRua}
              rows={dadosNaRua}
              rowKey={(r) => `rua_${r.vendaId}`}
              cols={[
                { key: "clienteNome", label: "Cliente", render: (r) => <span className="font-semibold text-zinc-800">{r.clienteNome}</span> },
                { key: "dataSaida", label: "Saída do Kit", align: "right", render: (r) => <span className="text-xs text-zinc-500">{formatarData(r.dataSaida)}</span> },
                { key: "dataPrevista", label: "Acerto Previsto", align: "right", render: (r) => <span className="text-xs text-zinc-500">{r.dataPrevista ? formatarData(r.dataPrevista) : "—"}</span> },
                { key: "qtdItens", label: "Itens", align: "right", render: (r) => <span className="text-zinc-600">{r.qtdItens}</span> },
                { key: "valorKit", label: "Valor na Rua", align: "right", render: (r) => <span className="font-semibold text-zinc-800">{money(r.valorKit)}</span> },
                { key: "diasNaRua", label: "Dias na Rua", align: "right", render: (r) => <span className="text-zinc-600">{r.diasNaRua}</span> },
                {
                  key: "diasAtraso", label: "Situação", align: "right",
                  render: (r) => r.atrasado
                    ? <span className="inline-flex items-center px-2 py-0.5 bg-red-50 text-red-600 text-xs font-bold rounded-full">Atrasado {r.diasAtraso}d</span>
                    : <span className="inline-flex items-center px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full">Em dia</span>,
                },
              ]}
            />
          ) : viewMode === "estoque" ? (
            /* ─── Tabela Estoque ─── */
            <TabelaRelatorio
              vis={visColsEstoque}
              sort={sortEstoque}
              onSort={handleSortEstoque}
              rows={dadosEstoque}
              rowKey={(r) => `est_${r.sku}`}
              cols={[
                { key: "produtoNome", label: "Produto", render: (r) => <span className="font-semibold text-zinc-800">{r.produtoNome}</span> },
                { key: "sku", label: "SKU", render: (r) => <span className="text-xs text-zinc-400 font-mono">SKU-{r.sku}</span> },
                { key: "categoria", label: "Categoria", render: (r) => <span className="text-zinc-600">{r.categoria}</span> },
                { key: "quantidade", label: "Qtd.", align: "right", render: (r) => <span className="text-zinc-600">{r.quantidade.toLocaleString("pt-BR")}</span> },
                { key: "custoUnit", label: "Custo Un.", align: "right", render: (r) => <span className="text-zinc-600">{money(r.custoUnit)}</span> },
                { key: "precoVenda", label: "Preço de Venda", align: "right", render: (r) => <span className="text-zinc-600">{money(r.precoVenda)}</span> },
                { key: "valorEstoque", label: "Valor em Estoque", align: "right", render: (r) => <span className="font-semibold text-zinc-800">{money(r.valorEstoque)}</span> },
                { key: "valorPotencial", label: "Venda Potencial", align: "right", render: (r) => <span className="font-black text-emerald-700">{money(r.valorPotencial)}</span> },
                {
                  key: "margem", label: "Margem %", align: "right",
                  render: (r) => (
                    <span className="inline-flex items-center px-2 py-0.5 bg-violet-50 text-violet-700 text-xs font-bold rounded-full">
                      {pct(r.margem)}
                    </span>
                  ),
                },
              ]}
            />
          ) : viewMode === "financeiro" ? (
            /* ─── Tabela Financeiro Mensal ─── */
            <TabelaRelatorio
              vis={visColsFinanceiro}
              sort={sortFinanceiro}
              onSort={handleSortFinanceiro}
              rows={dadosFinanceiro}
              rowKey={(r) => `fin_${r.mesKey}`}
              cols={[
                { key: "mes", label: "Mês", render: (r) => <span className="font-semibold text-zinc-800 capitalize">{r.mes}</span> },
                { key: "numVendas", label: "Vendas", align: "right", render: (r) => <span className="text-zinc-600">{r.numVendas.toLocaleString("pt-BR")}</span> },
                { key: "receita", label: "Receita", align: "right", render: (r) => <span className="font-semibold text-zinc-800">{money(r.receita)}</span> },
                { key: "custo", label: "Custo", align: "right", render: (r) => <span className="text-zinc-600">{money(r.custo)}</span> },
                { key: "lucroBruto", label: "Lucro Bruto", align: "right", render: (r) => <span className="font-semibold text-emerald-700">{money(r.lucroBruto)}</span> },
                {
                  key: "margem", label: "Margem %", align: "right",
                  render: (r) => (
                    <span className="inline-flex items-center px-2 py-0.5 bg-violet-50 text-violet-700 text-xs font-bold rounded-full">
                      {pct(r.margem)}
                    </span>
                  ),
                },
                { key: "pctPeriodo", label: "% do Período", align: "right", render: (r) => <span className="text-xs text-zinc-500">{pct(r.pctPeriodo)}</span> },
                { key: "despesasPagas", label: "Despesas Pagas", align: "right", render: (r) => <span className="text-rose-600">{money(r.despesasPagas)}</span> },
                {
                  key: "resultado", label: "Resultado", align: "right",
                  render: (r) => (
                    <span className={`font-black ${r.resultado >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                      {money(r.resultado)}
                    </span>
                  ),
                },
              ]}
            />
          ) : (
            /* ─── Tabela Detalhe por Produto ─── */
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 border-b border-zinc-200">
                <tr>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-500 w-6">#</th>
                  {visColsProduto.has("clienteNome") && (
                    <th onClick={() => handleSortProduto("clienteNome")} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-500 cursor-pointer hover:text-zinc-800 select-none whitespace-nowrap">
                      <span className="inline-flex items-center gap-1">Cliente <SortIcon active={sortProduto.key === "clienteNome"} asc={sortProduto.asc} /></span>
                    </th>
                  )}
                  {visColsProduto.has("produtoNome") && (
                    <th onClick={() => handleSortProduto("produtoNome")} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-500 cursor-pointer hover:text-zinc-800 select-none whitespace-nowrap">
                      <span className="inline-flex items-center gap-1">Produto <SortIcon active={sortProduto.key === "produtoNome"} asc={sortProduto.asc} /></span>
                    </th>
                  )}
                  {visColsProduto.has("produtoSku") && (
                    <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-500 whitespace-nowrap">SKU</th>
                  )}
                  {visColsProduto.has("quantidadeTotal") && (
                    <th onClick={() => handleSortProduto("quantidadeTotal")} className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-zinc-500 cursor-pointer hover:text-zinc-800 select-none whitespace-nowrap">
                      <span className="inline-flex items-center justify-end gap-1">Qtd. <SortIcon active={sortProduto.key === "quantidadeTotal"} asc={sortProduto.asc} /></span>
                    </th>
                  )}
                  {visColsProduto.has("numeroPedidos") && (
                    <th onClick={() => handleSortProduto("numeroPedidos")} className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-zinc-500 cursor-pointer hover:text-zinc-800 select-none whitespace-nowrap">
                      <span className="inline-flex items-center justify-end gap-1">Pedidos <SortIcon active={sortProduto.key === "numeroPedidos"} asc={sortProduto.asc} /></span>
                    </th>
                  )}
                  {visColsProduto.has("receitaTotal") && (
                    <th onClick={() => handleSortProduto("receitaTotal")} className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-zinc-500 cursor-pointer hover:text-zinc-800 select-none whitespace-nowrap">
                      <span className="inline-flex items-center justify-end gap-1">Receita <SortIcon active={sortProduto.key === "receitaTotal"} asc={sortProduto.asc} /></span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {dadosProduto.map((row, idx) => (
                  <tr key={`${row.clienteId}_${row.produtoSku}`} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-4 py-3 text-xs text-zinc-400 font-mono">{idx + 1}</td>
                    {visColsProduto.has("clienteNome") && (
                      <td className="px-4 py-3">
                        <span className="font-semibold text-zinc-800">{row.clienteNome}</span>
                      </td>
                    )}
                    {visColsProduto.has("produtoNome") && (
                      <td className="px-4 py-3 text-zinc-700 max-w-[220px] truncate">{row.produtoNome}</td>
                    )}
                    {visColsProduto.has("produtoSku") && (
                      <td className="px-4 py-3 font-mono text-xs text-zinc-500">{row.produtoSku}</td>
                    )}
                    {visColsProduto.has("quantidadeTotal") && (
                      <td className="px-4 py-3 text-right">
                        <span className="inline-flex items-center justify-center min-w-[32px] px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full">
                          {row.quantidadeTotal}
                        </span>
                      </td>
                    )}
                    {visColsProduto.has("numeroPedidos") && (
                      <td className="px-4 py-3 text-right text-zinc-500 text-xs">
                        {row.numeroPedidos}
                      </td>
                    )}
                    {visColsProduto.has("receitaTotal") && (
                      <td className="px-4 py-3 text-right font-bold text-zinc-900">
                        {money(row.receitaTotal)}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer da tabela */}
        {temDados && (
          <div className="px-4 py-3 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-400">
            <span>
              {viewMode === "cliente"
                ? `${resumoClientes.length} cliente${resumoClientes.length !== 1 ? "s" : ""} · ${dadosFiltrados.length} combinações produto×cliente`
                : viewMode === "consignado"
                ? `${dadosConsignado.length} acerto${dadosConsignado.length !== 1 ? "s" : ""} de consignado`
                : `${dadosProduto.length} linha${dadosProduto.length !== 1 ? "s" : ""}`}
            </span>
            <span>Clique nos cabeçalhos para ordenar · Use "Colunas" para personalizar</span>
          </div>
        )}
      </div>
    </div>
  );
}

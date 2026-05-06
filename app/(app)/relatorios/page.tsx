"use client";

import { useState, useEffect, useMemo } from "react";
import {
  getTopProductsByCustomer,
  ProdutoPorRevendedor,
} from "@/src/services/sales.service";
import {
  BarChart2,
  Download,
  Search,
  ChevronUp,
  ChevronDown,
  Loader2,
  Users,
  Package,
  ShoppingCart,
  TrendingUp,
} from "lucide-react";

type SortKey = keyof Pick<
  ProdutoPorRevendedor,
  "clienteNome" | "produtoNome" | "quantidadeTotal" | "receitaTotal" | "numeroPedidos"
>;

const PERIODOS = [
  { label: "Últimos 30 dias", days: 30 },
  { label: "Últimos 60 dias", days: 60 },
  { label: "Últimos 90 dias", days: 90 },
  { label: "Este ano", days: 365 },
];

function buildPeriodo(days: number) {
  const fim = new Date();
  const inicio = new Date();
  inicio.setDate(inicio.getDate() - days);
  return {
    inicio: inicio.toISOString(),
    fim: fim.toISOString(),
  };
}

const money = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function RelatoriosPage() {
  const [dados, setDados] = useState<ProdutoPorRevendedor[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [periodoDays, setPeriodoDays] = useState(30);
  const [busca, setBusca] = useState("");
  const [filtroCliente, setFiltroCliente] = useState("todos");
  const [sortKey, setSortKey] = useState<SortKey>("receitaTotal");
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    setCarregando(true);
    getTopProductsByCustomer(buildPeriodo(periodoDays))
      .then(setDados)
      .catch(console.error)
      .finally(() => setCarregando(false));
  }, [periodoDays]);

  const clientes = useMemo(() => {
    const nomes = [...new Set(dados.map((d) => d.clienteNome))].sort();
    return nomes;
  }, [dados]);

  const dadosFiltrados = useMemo(() => {
    let result = dados;

    if (filtroCliente !== "todos") {
      result = result.filter((d) => d.clienteNome === filtroCliente);
    }

    if (busca.trim()) {
      const q = busca.toLowerCase();
      result = result.filter(
        (d) =>
          d.clienteNome.toLowerCase().includes(q) ||
          d.produtoNome.toLowerCase().includes(q) ||
          d.produtoSku.toLowerCase().includes(q)
      );
    }

    return [...result].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "string" && typeof bv === "string") {
        return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sortAsc ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
  }, [dados, filtroCliente, busca, sortKey, sortAsc]);

  // KPIs derivados
  const totalRevendedores = useMemo(
    () => new Set(dadosFiltrados.map((d) => d.clienteId)).size,
    [dadosFiltrados]
  );
  const totalProdutos = useMemo(
    () => new Set(dadosFiltrados.map((d) => d.produtoSku)).size,
    [dadosFiltrados]
  );
  const totalReceita = useMemo(
    () => dadosFiltrados.reduce((s, d) => s + d.receitaTotal, 0),
    [dadosFiltrados]
  );
  const totalItens = useMemo(
    () => dadosFiltrados.reduce((s, d) => s + d.quantidadeTotal, 0),
    [dadosFiltrados]
  );

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc((v) => !v);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  const exportarCSV = () => {
    const header = [
      "Revendedor",
      "Produto",
      "SKU",
      "Qtd. Vendida",
      "Receita Total",
      "Nº Pedidos",
    ];
    const linhas = dadosFiltrados.map((d) => [
      d.clienteNome,
      d.produtoNome,
      d.produtoSku,
      d.quantidadeTotal,
      d.receitaTotal.toFixed(2).replace(".", ","),
      d.numeroPedidos,
    ]);
    const csv = [header, ...linhas]
      .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";"))
      .join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `produtos_por_revendedor_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ChevronUp size={12} className="text-zinc-300" />;
    return sortAsc ? (
      <ChevronUp size={12} className="text-indigo-500" />
    ) : (
      <ChevronDown size={12} className="text-indigo-500" />
    );
  };

  const ThSortable = ({
    col,
    children,
    align = "left",
  }: {
    col: SortKey;
    children: React.ReactNode;
    align?: "left" | "right";
  }) => (
    <th
      onClick={() => handleSort(col)}
      className={`px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-zinc-500 cursor-pointer hover:text-zinc-800 select-none whitespace-nowrap ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        <SortIcon col={col} />
      </span>
    </th>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-zinc-900 tracking-tight flex items-center gap-2">
            <BarChart2 size={22} className="text-indigo-600" />
            Relatório de Revendedores
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Produtos mais comprados por cada revendedor
          </p>
        </div>
        <button
          onClick={exportarCSV}
          disabled={dadosFiltrados.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-zinc-200 disabled:text-zinc-400 text-white text-sm font-bold rounded-lg transition-colors"
        >
          <Download size={15} />
          Exportar CSV
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-zinc-200 p-4 flex flex-wrap gap-3">
        {/* Período */}
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

        <div className="h-8 w-px bg-zinc-200 self-center" />

        {/* Filtro por revendedor */}
        <select
          value={filtroCliente}
          onChange={(e) => setFiltroCliente(e.target.value)}
          className="h-8 px-3 text-xs border border-zinc-200 rounded-lg bg-white text-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-400/20 focus:border-indigo-400"
        >
          <option value="todos">Todos os revendedores</option>
          {clientes.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        {/* Busca livre */}
        <div className="relative ml-auto">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Buscar produto ou revendedor..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="h-8 pl-8 pr-3 text-xs border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400/20 focus:border-indigo-400 w-60"
          />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Revendedores", value: totalRevendedores, icon: Users, color: "text-indigo-600", bg: "bg-indigo-50" },
          { label: "Produtos distintos", value: totalProdutos, icon: Package, color: "text-violet-600", bg: "bg-violet-50" },
          { label: "Itens vendidos", value: totalItens.toLocaleString("pt-BR"), icon: ShoppingCart, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Receita total", value: money(totalReceita), icon: TrendingUp, color: "text-amber-600", bg: "bg-amber-50" },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-xl border border-zinc-200 p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${kpi.bg} flex items-center justify-center shrink-0`}>
              <kpi.icon size={18} className={kpi.color} />
            </div>
            <div>
              <p className="text-[11px] text-zinc-500 font-medium">{kpi.label}</p>
              <p className="text-lg font-black text-zinc-900 leading-tight">{kpi.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        <div className="overflow-x-auto">
          {carregando ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={24} className="animate-spin text-indigo-400" />
            </div>
          ) : dadosFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
              <BarChart2 size={32} className="mb-2 opacity-40" />
              <p className="text-sm font-medium">Nenhum dado encontrado</p>
              <p className="text-xs mt-1">Tente ampliar o período ou remover filtros</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 border-b border-zinc-200">
                <tr>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-zinc-500 text-left w-6">
                    #
                  </th>
                  <ThSortable col="clienteNome">Revendedor</ThSortable>
                  <ThSortable col="produtoNome">Produto</ThSortable>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-zinc-500 text-left">
                    SKU
                  </th>
                  <ThSortable col="quantidadeTotal" align="right">
                    Qtd. Vendida
                  </ThSortable>
                  <ThSortable col="receitaTotal" align="right">
                    Receita
                  </ThSortable>
                  <ThSortable col="numeroPedidos" align="right">
                    Pedidos
                  </ThSortable>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {dadosFiltrados.map((row, idx) => (
                  <tr key={`${row.clienteId}_${row.produtoSku}`} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-4 py-3 text-xs text-zinc-400 font-mono">{idx + 1}</td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-zinc-800">{row.clienteNome}</span>
                    </td>
                    <td className="px-4 py-3 text-zinc-700 max-w-[220px] truncate">
                      {row.produtoNome}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-zinc-500">{row.produtoSku}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="inline-flex items-center justify-center min-w-[32px] px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full">
                        {row.quantidadeTotal}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-zinc-900">
                      {money(row.receitaTotal)}
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-500 text-xs">
                      {row.numeroPedidos} {row.numeroPedidos === 1 ? "pedido" : "pedidos"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {dadosFiltrados.length > 0 && (
          <div className="px-4 py-3 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-400">
            <span>{dadosFiltrados.length} combinação{dadosFiltrados.length !== 1 ? "ões" : ""} revendedor × produto</span>
            <span>Clique nos cabeçalhos para ordenar</span>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingBag,
  Users,
  Package,
  ArrowRight,
  MoreHorizontal,
  Calendar,
  LayoutDashboard,
  Clock,
  PieChart as PieIcon,
  AlertTriangle,
  Wallet,
  Loader2,
  UserCog
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
  Legend
} from "recharts";
import {
  getDashboardKPIs,
  getFinancialPerformance,
  getSalesByCategory,
  getTopPerformingProducts,
  getSalesByHour,
  getStockRuptureKPI,
  getSalesByOperator,
  getTopCustomers
} from "@/src/services/sales.service";

// --- TIPOS DE DADOS ---
interface KpiData {
  faturamentoBruto: number;
  totalVendas: number;
  ticketMedio: number;
}
interface FinancialData {
  dia: string;
  receita: number;
  custo: number;
}
interface CategoryData {
  name: string;
  value: number;
  color: string;
}
interface TopProductData {
  nome: string;
  vendas: number;
  receita: number;
  margem: number;
  status: string;
}
interface SalesByHourData {
  hora: string;
  vendas: number;
}
interface StockRuptureData {
  rupturas: number;
  criticos: number;
}
interface OperatorData {
  id: string;
  nome: string;
  cargo: string;
  vendas: number;
  faturamento: number;
  ticketMedio: number;
}
interface TopCustomerData {
  id: number;
  nome: string;
  vendas: number;
  faturamento: number;
}

export default function DashboardExecutive() {
  
  // --- ESTADOS DO COMPONENTE ---
  const [kpiData, setKpiData] = useState<KpiData | null>(null);
  const [financialData, setFinancialData] = useState<FinancialData[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [topProducts, setTopProducts] = useState<TopProductData[]>([]);
  const [salesByHour, setSalesByHour] = useState<SalesByHourData[]>([]);
  const [stockRupture, setStockRupture] = useState<StockRuptureData | null>(null);
  const [operatorData, setOperatorData] = useState<OperatorData[]>([]);
  const [topCustomers, setTopCustomers] = useState<TopCustomerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- FUNÇÃO PARA FORMATAR MOEDA ---
  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // --- BUSCA OS DADOS AO MONTAR O COMPONENTE ---
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - 30);
        const periodo = {
          inicio: startDate.toISOString(),
          fim: endDate.toISOString(),
        };

        const [
          kpiResult,
          financialResult,
          categoryResult,
          topProductsResult,
          salesByHourResult,
          stockRuptureResult,
          operatorResult,
          topCustomersResult
        ] = await Promise.all([
          getDashboardKPIs(periodo),
          getFinancialPerformance(periodo),
          getSalesByCategory(periodo),
          getTopPerformingProducts(periodo),
          getSalesByHour(periodo),
          getStockRuptureKPI(),
          getSalesByOperator(periodo),
          getTopCustomers(periodo)
        ]);

        setKpiData(kpiResult);
        setFinancialData(financialResult);
        setCategoryData(categoryResult);
        setTopProducts(topProductsResult);
        setSalesByHour(salesByHourResult);
        setStockRupture(stockRuptureResult);
        setOperatorData(operatorResult);
        setTopCustomers(topCustomersResult);

      } catch (err: any) {
        setError(err.message || "Erro ao buscar dados do dashboard.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Componente de Card KPI (Refinado)
  const KpiCard = ({ title, value, subtext, icon: Icon, trend, trendValue, colorClass, isLoading }: any) => (
    <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm flex flex-col justify-between hover:border-indigo-300 transition-colors group">
      <div className="flex justify-between items-start mb-2">
        <div className={`p-2 rounded-lg border ${colorClass} bg-opacity-10 group-hover:scale-110 transition-transform`}>
          <Icon size={20} className={colorClass.replace("bg-", "text-").replace("/10", "")} />
        </div>
        {trend && !isLoading && (
          <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full ${trend === 'up' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
            {trend === 'up' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            <span>{trendValue}%</span>
          </div>
        )}
      </div>
      <div>
        <h3 className="text-zinc-500 text-[11px] font-bold uppercase tracking-widest">{title}</h3>
        {isLoading ? (
          <div className="mt-2 h-8 w-3/4 bg-zinc-200 rounded animate-pulse"></div>
        ) : (
          <p className="text-2xl font-black text-zinc-900 mt-1 tracking-tight">{value}</p>
        )}
        {!isLoading && subtext && <p className="text-xs text-zinc-400 mt-1">{subtext}</p>}
      </div>
    </div>
  );
  
  // Exibição de Erro
  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-zinc-50">
        <div className="text-center p-8">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-400" />
          <h3 className="mt-2 text-sm font-medium text-red-800">Erro ao carregar dashboard</h3>
          <p className="mt-1 text-sm text-zinc-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-h-screen bg-zinc-50 text-zinc-900 font-sans overflow-hidden selection:bg-indigo-100 border border-zinc-300 rounded-lg shadow-2xl mx-auto">
      
      {/* HEADER EXECUTIVO */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-zinc-200 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <LayoutDashboard size={20} className="text-indigo-600" strokeWidth={2.5} />
            <h1 className="text-lg font-extrabold text-zinc-900 tracking-tight">Visão Geral da Loja</h1>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            {loading ? "Carregando..." : `Última atualização: Hoje, ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-md text-xs font-medium text-zinc-600">
            <Calendar size={14} className="text-zinc-400" />
            <span>Este Mês</span>
          </div>
          <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wide shadow-sm shadow-indigo-200 transition-all active:scale-95">
            Exportar Relatório
          </button>
        </div>
      </div>

      {/* CONTEÚDO SCROLLÁVEL */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 min-h-0">
        
        {/* 1. KPIs FINANCEIROS (O CORAÇÃO DO NEGÓCIO) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard 
            title="Faturamento Bruto" 
            value={kpiData ? formatCurrency(kpiData.faturamentoBruto) : "..."}
            subtext="Nos últimos 30 dias"
            icon={DollarSign} 
            // trend="up" (lógica de tendência a ser implementada)
            // trendValue="12.5"
            colorClass="bg-indigo-100 text-indigo-700"
            isLoading={loading}
          />
          <KpiCard 
            title="Total de Vendas" 
            value={kpiData ? kpiData.totalVendas.toString() : "..."}
            subtext="Vendas pagas nos últimos 30 dias"
            icon={ShoppingBag} 
            // trend="up"
            // trendValue="8.2"
            colorClass="bg-emerald-100 text-emerald-700"
            isLoading={loading}
          />
          <KpiCard 
            title="Ticket Médio" 
            value={kpiData ? formatCurrency(kpiData.ticketMedio) : "..."}
            subtext="Valor médio por venda"
            icon={Wallet} 
            // trend="down"
            // trendValue="2.1"
            colorClass="bg-amber-100 text-amber-700"
            isLoading={loading}
          />
          <KpiCard
            title="Ruptura de Estoque"
            value={stockRupture ? stockRupture.rupturas.toString() : "0"}
            subtext={stockRupture && stockRupture.criticos > 0
              ? `+${stockRupture.criticos} produto${stockRupture.criticos > 1 ? 's' : ''} em estoque crítico`
              : "Nenhum produto em estoque crítico"}
            icon={AlertTriangle}
            colorClass={stockRupture && stockRupture.rupturas > 0
              ? "bg-rose-100 text-rose-700"
              : "bg-emerald-100 text-emerald-700"}
            isLoading={loading}
          />
        </div>

        {/* 2. GRÁFICOS DE GESTÃO (ROW 1) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* GRÁFICO PRINCIPAL: RECEITA vs CUSTO (LUCRATIVIDADE) */}
          <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-zinc-200 shadow-sm flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-wide">Performance Financeira</h3>
                <p className="text-xs text-zinc-500">Receita vs Custo nos últimos 30 dias</p>
              </div>
              <div className="flex gap-2">
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="w-2 h-2 rounded-full bg-indigo-600"></span> Receita
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="w-2 h-2 rounded-full bg-zinc-300"></span> Custo
                </div>
              </div>
            </div>
            <div className="h-[280px] w-full">
              {loading ? (
                <div className="h-full w-full bg-zinc-200 rounded animate-pulse"></div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={financialData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f4f4f5" />
                    <XAxis dataKey="dia" axisLine={false} tickLine={false} tick={{ fill: '#a1a1aa', fontSize: 11 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#a1a1aa', fontSize: 11 }} tickFormatter={(value) => `R$${(Number(value)/1000)}k`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#18181b', borderRadius: '8px', border: 'none', color: '#fff', fontSize: '12px' }}
                      itemStyle={{ color: '#e4e4e7' }}
                      formatter={(value) => formatCurrency(value as number)}                    />
                    <Area type="monotone" dataKey="receita" stroke="#4f46e5" strokeWidth={3} fill="url(#colorReceita)" name="Receita" />
                    <Area type="monotone" dataKey="custo" stroke="#d4d4d8" strokeWidth={2} fill="transparent" name="Custo" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* KPI SECUNDÁRIO: CATEGORIAS (MIX DE PRODUTOS) */}
          <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm flex flex-col">
            <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-wide mb-1">Mix de Vendas</h3>
            <p className="text-xs text-zinc-500 mb-6">Participação por categoria</p>
            
            <div className="h-[200px] w-full relative">
              {loading ? (
                <div className="h-full w-full bg-zinc-200 rounded-full animate-pulse"></div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e4e4e7', fontSize: '12px', color: '#18181b' }}
                        formatter={(value) => `${Number(value)}%`}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-bold text-zinc-900">{kpiData?.totalVendas || 0}</span>
                    <span className="text-[10px] text-zinc-400 uppercase">Vendas</span>
                  </div>
                </>
              )}
            </div>

            <div className="mt-4 space-y-2">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-4 w-full bg-zinc-200 rounded animate-pulse"></div>
                ))
              ) : (
                categoryData.map((cat) => (
                  <div key={cat.name} className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }}></div>
                      <span className="text-zinc-600 font-medium">{cat.name}</span>
                    </div>
                    <span className="font-bold text-zinc-900">{cat.value}%</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* 3. GRÁFICOS DE GESTÃO (ROW 2) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* TABELA INTELIGENTE: PRODUTOS COM INDICADORES */}
          <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-wide">Top Performance</h3>
              <button className="text-indigo-600 text-xs font-bold hover:underline">Ver Estoque Completo</button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider border-b border-zinc-100">
                  <tr>
                    <th className="pb-3 pl-2">Produto</th>
                    <th className="pb-3 text-right">Vendas</th>
                    <th className="pb-3 text-right">Receita</th>
                    <th className="pb-3 text-right">Margem</th>
                    <th className="pb-3 text-center">Status Estoque</th>
                  </tr>
                </thead>
                <tbody className="text-xs">
                  {loading ? (
                     Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i}>
                        <td colSpan={5} className="py-1"><div className="h-8 w-full bg-zinc-200 rounded animate-pulse"></div></td>
                      </tr>
                     ))
                  ) : (
                    topProducts.map((prod, i) => (
                      <tr key={i} className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50/80 transition-colors">
                        <td className="py-3 pl-2 font-medium text-zinc-700">{prod.nome}</td>
                        <td className="py-3 text-right text-zinc-600">{prod.vendas}</td>
                        <td className="py-3 text-right font-bold text-zinc-900">{formatCurrency(prod.receita)}</td>
                        <td className="py-3 text-right">
                          <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-bold">
                            {prod.margem}%
                          </span>
                        </td>
                        <td className="py-3 text-center">
                          <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase
                            ${prod.status === 'ok' ? 'bg-zinc-100 text-zinc-600' : 
                              prod.status === 'low' ? 'bg-amber-100 text-amber-700' : 
                              'bg-rose-100 text-rose-700 blink-animation'}`}>
                            {prod.status === 'ok' ? 'Normal' : prod.status === 'low' ? 'Baixo' : 'Crítico'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* HEARMAP DE HORÁRIOS (GESTÃO DE EQUIPE) */}
          <div className="bg-zinc-900 p-5 rounded-xl border border-zinc-800 shadow-sm text-white flex flex-col relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-1">
                <Clock size={16} className="text-indigo-400"/>
                <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wide">Picos de Venda</h3>
              </div>
              <p className="text-xs text-zinc-400 mb-6">Volume de vendas por hora</p>

              <div className="h-[180px] w-full">
                {loading ? (
                  <div className="h-full w-full bg-zinc-700 rounded animate-pulse"></div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={salesByHour}>
                      <Tooltip 
                        cursor={{fill: 'rgba(255,255,255,0.1)'}}
                        contentStyle={{ backgroundColor: '#000', border: 'none', color: '#fff', fontSize: '12px' }}
                      />
                      <Bar dataKey="vendas" radius={[4, 4, 0, 0]}>
                        {salesByHour.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.vendas > (kpiData ? kpiData.totalVendas / salesByHour.length : 5) ? '#6366f1' : '#3f3f46'} />
                        ))}
                      </Bar>
                      <XAxis dataKey="hora" axisLine={false} tickLine={false} tick={{fill: '#71717a', fontSize: 10}} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
              
              {!loading && (
                <div className="mt-4 p-3 bg-zinc-800/50 rounded-lg border border-zinc-700">
                  <p className="text-[10px] text-zinc-400 uppercase font-bold mb-1">Insight do Sistema</p>
                  <p className="text-xs text-zinc-200 leading-relaxed">
                    Seu horário de maior movimento é por volta das 
                    <span className="text-indigo-400 font-bold"> {
                      salesByHour.reduce((prev, current) => (prev.vendas > current.vendas) ? prev : current).hora
                    }</span>.
                  </p>
                </div>
              )}
            </div>
            {/* Background Effect */}
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-indigo-600 rounded-full blur-[80px] opacity-20"></div>
          </div>

        </div>

        {/* 4. TOP CLIENTES DO MÊS */}
        <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm">
          <div className="flex justify-between items-center mb-5">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-emerald-50">
                <Users size={18} className="text-emerald-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-wide">Top Clientes do Mês</h3>
                <p className="text-xs text-zinc-500">Maiores compradores nos últimos 30 dias</p>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 w-full bg-zinc-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : topCustomers.length === 0 ? (
            <div className="py-10 text-center">
              <Users className="mx-auto mb-3 text-zinc-200" size={36} />
              <p className="text-sm text-zinc-400 font-medium">Nenhuma venda com cliente identificado no período</p>
            </div>
          ) : (
            <>
              <div className="h-[220px] w-full mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topCustomers} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#f4f4f5" />
                    <XAxis
                      type="number"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#a1a1aa', fontSize: 11 }}
                      tickFormatter={(v) => `R$${(v / 1000).toFixed(1)}k`}
                    />
                    <YAxis
                      type="category"
                      dataKey="nome"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#52525b', fontSize: 12, fontWeight: 600 }}
                      width={110}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#18181b', borderRadius: '8px', border: 'none', color: '#fff', fontSize: '12px' }}
                      formatter={(value) => [formatCurrency(value as number), 'Faturamento']}
                    />
                    <Bar dataKey="faturamento" radius={[0, 6, 6, 0]}>
                      {topCustomers.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={index === 0 ? '#10b981' : index === 1 ? '#34d399' : index === 2 ? '#6ee7b7' : '#a7f3d0'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-2 border-t border-zinc-100 pt-4">
                {topCustomers.map((c, index) => (
                  <div key={c.id} className="flex items-center justify-between text-xs px-1">
                    <div className="flex items-center gap-2">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                        index === 0 ? 'bg-amber-100 text-amber-700' :
                        index === 1 ? 'bg-zinc-200 text-zinc-600' :
                        index === 2 ? 'bg-orange-100 text-orange-700' :
                        'bg-zinc-100 text-zinc-500'
                      }`}>{index + 1}</div>
                      <span className="font-medium text-zinc-700 truncate max-w-[140px]">{c.nome}</span>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <span className="text-zinc-400">{c.vendas} venda{c.vendas !== 1 ? 's' : ''}</span>
                      <span className="font-bold text-zinc-900 tabular-nums">{formatCurrency(c.faturamento)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* 6. DESEMPENHO POR OPERADOR */}
        <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm">
          <div className="flex justify-between items-center mb-5">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-indigo-50">
                <UserCog size={18} className="text-indigo-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-wide">Desempenho por Operador</h3>
                <p className="text-xs text-zinc-500">Vendas atribuídas nos últimos 30 dias</p>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-12 w-full bg-zinc-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : operatorData.length === 0 ? (
            <div className="py-10 text-center">
              <UserCog className="mx-auto mb-3 text-zinc-200" size={36} />
              <p className="text-sm text-zinc-400 font-medium">Nenhuma venda com operador atribuído no período</p>
              <p className="text-xs text-zinc-300 mt-1">Selecione um operador no caixa ao realizar vendas</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(() => {
                const maxFaturamento = operatorData[0]?.faturamento || 1;
                const roleLabel: Record<string, string> = { operator: 'Operador', supervisor: 'Supervisor', manager: 'Gerente' };
                const roleColor: Record<string, string> = { operator: 'bg-zinc-100 text-zinc-600', supervisor: 'bg-blue-50 text-blue-700', manager: 'bg-purple-50 text-purple-700' };
                return operatorData.map((op, index) => (
                  <div key={op.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-zinc-50 transition-colors">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                      index === 0 ? 'bg-amber-100 text-amber-700' :
                      index === 1 ? 'bg-zinc-200 text-zinc-600' :
                      index === 2 ? 'bg-orange-100 text-orange-700' :
                      'bg-zinc-100 text-zinc-500'
                    }`}>
                      {index + 1}
                    </div>

                    <div className="w-32 shrink-0">
                      <p className="text-sm font-bold text-zinc-800 truncate">{op.nome}</p>
                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${roleColor[op.cargo] ?? 'bg-zinc-100 text-zinc-500'}`}>
                        {roleLabel[op.cargo] ?? op.cargo}
                      </span>
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="flex-1 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-500 rounded-full transition-all duration-700"
                            style={{ width: `${(op.faturamento / maxFaturamento) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-zinc-900 tabular-nums w-24 text-right shrink-0">
                          {formatCurrency(op.faturamento)}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-4 shrink-0 text-right">
                      <div>
                        <p className="text-[10px] text-zinc-400 uppercase font-bold">Vendas</p>
                        <p className="text-sm font-black text-zinc-800">{op.vendas}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-zinc-400 uppercase font-bold">Ticket</p>
                        <p className="text-sm font-black text-zinc-800">{formatCurrency(op.ticketMedio)}</p>
                      </div>
                    </div>
                  </div>
                ));
              })()}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
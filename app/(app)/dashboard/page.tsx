"use client";

import React from "react";
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
  Wallet
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

// --- DADOS MOCKADOS ESTRATÉGICOS ---

// 1. Receita vs Lucro (Otimizado para gestão)
const dataFinanceira = [
  { dia: "01", receita: 4000, custo: 2400, lucro: 1600 },
  { dia: "05", receita: 3000, custo: 1800, lucro: 1200 },
  { dia: "10", receita: 5000, custo: 2800, lucro: 2200 },
  { dia: "15", receita: 2780, custo: 1500, lucro: 1280 },
  { dia: "20", receita: 6890, custo: 3800, lucro: 3090 },
  { dia: "25", receita: 4390, custo: 2100, lucro: 2290 },
  { dia: "30", receita: 7490, custo: 4300, lucro: 3190 },
];

// 2. Vendas por Horário (Para escala de funcionários)
const vendasPorHora = [
  { hora: "08h", vendas: 12 },
  { hora: "10h", vendas: 45 },
  { hora: "12h", vendas: 89 }, // Pico
  { hora: "14h", vendas: 56 },
  { hora: "16h", vendas: 34 },
  { hora: "18h", vendas: 78 }, // Pico
  { hora: "20h", vendas: 22 },
];

// 3. Distribuição por Categoria (Donut Chart)
const categoriasData = [
  { name: "Roupas", value: 45, color: "#4f46e5" }, // Indigo
  { name: "Calçados", value: 30, color: "#06b6d4" }, // Cyan
  { name: "Acessórios", value: 15, color: "#8b5cf6" }, // Violet
  { name: "Outros", value: 10, color: "#71717a" }, // Zinc
];

// 4. Produtos com Margem e Estoque (Tabela Avançada)
const produtosGestao = [
  { nome: "Tênis Runner Pro", vendas: 120, receita: 24000, margem: 60, estoque: 45, status: "ok" },
  { nome: "Camiseta Basic", vendas: 98, receita: 4900, margem: 45, estoque: 12, status: "low" },
  { nome: "Boné Snapback", vendas: 86, receita: 3440, margem: 70, estoque: 8, status: "critical" },
  { nome: "Meia Sport", vendas: 54, receita: 1080, margem: 85, estoque: 150, status: "ok" },
];

export default function DashboardExecutive() {

  // Componente de Card KPI (Refinado)
  const KpiCard = ({ title, value, subtext, icon: Icon, trend, trendValue, colorClass }: any) => (
    <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm flex flex-col justify-between hover:border-indigo-300 transition-colors group">
      <div className="flex justify-between items-start mb-2">
        <div className={`p-2 rounded-lg border ${colorClass} bg-opacity-10 group-hover:scale-110 transition-transform`}>
          <Icon size={20} className={colorClass.replace("bg-", "text-").replace("/10", "")} />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full ${trend === 'up' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
            {trend === 'up' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            <span>{trendValue}%</span>
          </div>
        )}
      </div>
      <div>
        <h3 className="text-zinc-500 text-[11px] font-bold uppercase tracking-widest">{title}</h3>
        <p className="text-2xl font-black text-zinc-900 mt-1 tracking-tight">{value}</p>
        {subtext && <p className="text-xs text-zinc-400 mt-1">{subtext}</p>}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full max-h-screen bg-zinc-50 text-zinc-900 font-sans overflow-hidden selection:bg-indigo-100 border border-zinc-300 rounded-lg shadow-2xl mx-auto">
      
      {/* HEADER EXECUTIVO */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-zinc-200 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <LayoutDashboard size={20} className="text-indigo-600" strokeWidth={2.5} />
            <h1 className="text-lg font-extrabold text-zinc-900 tracking-tight">Visão Geral da Loja</h1>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">Última atualização: Hoje, 14:30</p>
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
            value="R$ 45.231,90" 
            subtext="+ R$ 2.400 que mês passado"
            icon={DollarSign} 
            trend="up" 
            trendValue="12.5"
            colorClass="bg-indigo-100 text-indigo-700"
          />
          <KpiCard 
            title="Lucro Líquido" 
            value="R$ 18.450,00" 
            subtext="Margem atual de 40.8%"
            icon={Wallet} 
            trend="up" 
            trendValue="8.2"
            colorClass="bg-emerald-100 text-emerald-700"
          />
          <KpiCard 
            title="Ticket Médio" 
            value="R$ 156,25" 
            subtext="8 vendas realizadas hoje"
            icon={ShoppingBag} 
            trend="down" 
            trendValue="2.1"
            colorClass="bg-amber-100 text-amber-700"
          />
          <KpiCard 
            title="Ruptura de Estoque" 
            value="3 Itens" 
            subtext="Produtos com estoque crítico"
            icon={AlertTriangle} 
            colorClass="bg-rose-100 text-rose-700"
          />
        </div>

        {/* 2. GRÁFICOS DE GESTÃO (ROW 1) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* GRÁFICO PRINCIPAL: RECEITA vs CUSTO (LUCRATIVIDADE) */}
          <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-zinc-200 shadow-sm flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-wide">Performance Financeira</h3>
                <p className="text-xs text-zinc-500">Comparativo Receita x Custo Operacional</p>
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
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dataFinanceira} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f4f4f5" />
                  <XAxis dataKey="dia" axisLine={false} tickLine={false} tick={{ fill: '#a1a1aa', fontSize: 11 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#a1a1aa', fontSize: 11 }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#18181b', borderRadius: '8px', border: 'none', color: '#fff', fontSize: '12px' }}
                    itemStyle={{ color: '#e4e4e7' }}
                  />
                  <Area type="monotone" dataKey="receita" stroke="#4f46e5" strokeWidth={3} fill="url(#colorReceita)" name="Receita" />
                  <Area type="monotone" dataKey="custo" stroke="#d4d4d8" strokeWidth={2} fill="transparent" name="Custo" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* KPI SECUNDÁRIO: CATEGORIAS (MIX DE PRODUTOS) */}
          <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm flex flex-col">
            <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-wide mb-1">Mix de Vendas</h3>
            <p className="text-xs text-zinc-500 mb-6">Participação por categoria</p>
            
            <div className="h-[200px] w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoriasData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoriasData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e4e4e7', fontSize: '12px', color: '#18181b' }} />
                </PieChart>
              </ResponsiveContainer>
              {/* Centro do Donut */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-bold text-zinc-900">1.3k</span>
                <span className="text-[10px] text-zinc-400 uppercase">Vendas</span>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {categoriasData.map((cat) => (
                <div key={cat.name} className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }}></div>
                    <span className="text-zinc-600 font-medium">{cat.name}</span>
                  </div>
                  <span className="font-bold text-zinc-900">{cat.value}%</span>
                </div>
              ))}
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
                  {produtosGestao.map((prod, i) => (
                    <tr key={i} className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50/80 transition-colors">
                      <td className="py-3 pl-2 font-medium text-zinc-700">{prod.nome}</td>
                      <td className="py-3 text-right text-zinc-600">{prod.vendas}</td>
                      <td className="py-3 text-right font-bold text-zinc-900">R$ {prod.receita.toLocaleString()}</td>
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
                  ))}
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
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={vendasPorHora}>
                    <Tooltip 
                      cursor={{fill: 'rgba(255,255,255,0.1)'}}
                      contentStyle={{ backgroundColor: '#000', border: 'none', color: '#fff', fontSize: '12px' }}
                    />
                    <Bar dataKey="vendas" radius={[4, 4, 0, 0]}>
                      {vendasPorHora.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.vendas > 60 ? '#6366f1' : '#3f3f46'} />
                      ))}
                    </Bar>
                    <XAxis dataKey="hora" axisLine={false} tickLine={false} tick={{fill: '#71717a', fontSize: 10}} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-4 p-3 bg-zinc-800/50 rounded-lg border border-zinc-700">
                <p className="text-[10px] text-zinc-400 uppercase font-bold mb-1">Insight do Sistema</p>
                <p className="text-xs text-zinc-200 leading-relaxed">
                  Seu horário de maior movimento é às <span className="text-indigo-400 font-bold">12h</span> e <span className="text-indigo-400 font-bold">18h</span>. Considere aumentar a equipe nestes turnos.
                </p>
              </div>
            </div>
            {/* Background Effect */}
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-indigo-600 rounded-full blur-[80px] opacity-20"></div>
          </div>

        </div>

      </div>
    </div>
  );
}
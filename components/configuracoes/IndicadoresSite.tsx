'use client';

import { useEffect, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  Users,
  Eye,
  Repeat,
  Smartphone,
  MapPin,
  Globe,
  ExternalLink,
  FileText,
  Loader2,
  BarChart3,
} from 'lucide-react';
import { getSiteAnalytics, SiteAnalytics, ContagemSimples } from '@/src/services/analytics.service';

const PERIODOS = [
  { label: '7 dias', dias: 7 },
  { label: '30 dias', dias: 30 },
  { label: '90 dias', dias: 90 },
];

function KpiCard({
  icon: Icon,
  label,
  valor,
  cor,
}: {
  icon: React.ElementType;
  label: string;
  valor: string;
  cor: string;
}) {
  return (
    <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <div className={`p-2 rounded-xl ${cor}`}>
          <Icon size={16} />
        </div>
        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{label}</span>
      </div>
      <p className="text-3xl font-extrabold text-zinc-900 tracking-tight tabular-nums">{valor}</p>
    </div>
  );
}

function Ranking({
  titulo,
  icon: Icon,
  dados,
  corBarra = 'bg-indigo-500',
}: {
  titulo: string;
  icon: React.ElementType;
  dados: ContagemSimples[];
  corBarra?: string;
}) {
  const max = dados.length > 0 ? Math.max(...dados.map((d) => d.visitas)) : 0;
  return (
    <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Icon size={16} className="text-zinc-400" />
        <h3 className="text-xs font-black text-zinc-700 uppercase tracking-wide">{titulo}</h3>
      </div>
      {dados.length === 0 ? (
        <p className="text-xs text-zinc-400 py-4 text-center">Sem dados no período</p>
      ) : (
        <div className="space-y-2.5">
          {dados.map((d) => (
            <div key={d.name}>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-zinc-700 truncate pr-2">{d.name}</span>
                <span className="font-mono font-bold text-zinc-500 shrink-0">{d.visitas}</span>
              </div>
              <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                <div
                  className={`h-full ${corBarra} rounded-full transition-all`}
                  style={{ width: `${max > 0 ? (d.visitas / max) * 100 : 0}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function IndicadoresSite() {
  const [dias, setDias] = useState(30);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [dados, setDados] = useState<SiteAnalytics | null>(null);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      setLoading(true);
      setErro(null);
      try {
        const fim = new Date();
        const inicio = new Date();
        inicio.setDate(inicio.getDate() - dias);
        const res = await getSiteAnalytics({
          inicio: inicio.toISOString(),
          fim: fim.toISOString(),
        });
        if (!cancelado) setDados(res);
      } catch (e: any) {
        if (!cancelado) setErro(e.message || 'Erro ao carregar indicadores');
      } finally {
        if (!cancelado) setLoading(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [dias]);

  const mediaPaginas =
    dados && dados.visitantesUnicos > 0
      ? (dados.totalVisitas / dados.visitantesUnicos).toFixed(1)
      : '0';

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-400">
      {/* Cabeçalho + seletor de período */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 size={20} className="text-indigo-600" strokeWidth={2.5} />
            <h2 className="text-lg font-extrabold text-zinc-900 tracking-tight">Indicadores do Site</h2>
          </div>
          <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider ml-7">
            Acessos da loja online — rastreamento anônimo
          </p>
        </div>
        <div className="flex gap-1 bg-white border border-zinc-200 rounded-xl p-1 shadow-sm">
          {PERIODOS.map((p) => (
            <button
              key={p.dias}
              onClick={() => setDias(p.dias)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                dias === p.dias ? 'bg-indigo-600 text-white shadow' : 'text-zinc-500 hover:bg-zinc-100'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
          <Loader2 size={28} className="animate-spin mb-3" />
          <p className="text-sm">Carregando indicadores...</p>
        </div>
      ) : erro ? (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
          <p className="text-sm text-red-600 font-medium">{erro}</p>
          <p className="text-xs text-red-500 mt-1">
            Verifique se a tabela <code>store_visits</code> foi criada no Supabase.
          </p>
        </div>
      ) : !dados || dados.totalVisitas === 0 ? (
        <div className="bg-white border border-zinc-200 rounded-2xl p-10 text-center shadow-sm">
          <Globe size={40} className="text-zinc-300 mx-auto mb-4" />
          <h3 className="text-base font-bold text-zinc-800">Ainda sem acessos registrados</h3>
          <p className="text-sm text-zinc-500 mt-2 max-w-md mx-auto">
            Os indicadores começam a aparecer assim que a loja online receber visitas (após publicar as
            alterações). O rastreamento é anônimo e não usa cookies.
          </p>
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <KpiCard
              icon={Eye}
              label="Total de Visitas"
              valor={dados.totalVisitas.toLocaleString('pt-BR')}
              cor="bg-indigo-100 text-indigo-600"
            />
            <KpiCard
              icon={Users}
              label="Visitantes Únicos"
              valor={dados.visitantesUnicos.toLocaleString('pt-BR')}
              cor="bg-emerald-100 text-emerald-600"
            />
            <KpiCard
              icon={Repeat}
              label="Páginas / Visitante"
              valor={mediaPaginas}
              cor="bg-amber-100 text-amber-600"
            />
          </div>

          {/* Visitas ao longo do tempo + dispositivos */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm">
              <h3 className="text-xs font-black text-zinc-700 uppercase tracking-wide mb-4">
                Visitas ao longo do tempo
              </h3>
              <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dados.porDia} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorVisitas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorVisitantes" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f4" vertical={false} />
                    <XAxis dataKey="dia" tick={{ fontSize: 11, fill: '#a1a1aa' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#a1a1aa' }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 12,
                        border: '1px solid #e4e4e7',
                        fontSize: 12,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Area
                      type="monotone"
                      dataKey="visitas"
                      name="Visitas"
                      stroke="#4f46e5"
                      strokeWidth={2}
                      fill="url(#colorVisitas)"
                    />
                    <Area
                      type="monotone"
                      dataKey="visitantes"
                      name="Visitantes"
                      stroke="#10b981"
                      strokeWidth={2}
                      fill="url(#colorVisitantes)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Smartphone size={16} className="text-zinc-400" />
                <h3 className="text-xs font-black text-zinc-700 uppercase tracking-wide">Dispositivos</h3>
              </div>
              <div style={{ width: '100%', height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dados.porDispositivo}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                    >
                      {dados.porDispositivo.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e4e4e7', fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1.5 mt-2">
                {dados.porDispositivo.map((d) => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 text-zinc-600">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                      {d.name}
                    </span>
                    <span className="font-mono font-bold text-zinc-500">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Rankings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Ranking titulo="Cidades" icon={MapPin} dados={dados.porCidade} corBarra="bg-indigo-500" />
            <Ranking titulo="Estados / País" icon={Globe} dados={dados.porPais} corBarra="bg-cyan-500" />
            <Ranking titulo="Origem do tráfego" icon={ExternalLink} dados={dados.porOrigem} corBarra="bg-violet-500" />
            <Ranking titulo="Páginas mais vistas" icon={FileText} dados={dados.porPagina} corBarra="bg-emerald-500" />
          </div>
        </>
      )}
    </div>
  );
}

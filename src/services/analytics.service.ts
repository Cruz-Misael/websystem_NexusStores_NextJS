// src/services/analytics.service.ts
import { supabase } from '@/src/lib/supabase/client';

export interface AnalyticsPeriodo {
  inicio: string; // ISO
  fim: string; // ISO
}

interface VisitRow {
  created_at: string;
  path: string | null;
  referrer_host: string | null;
  device: string | null;
  browser: string | null;
  os: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  visitor_hash: string | null;
}

export interface ContagemSimples {
  name: string;
  visitas: number;
}

export interface SiteAnalytics {
  totalVisitas: number;
  visitantesUnicos: number;
  porDia: { dia: string; visitas: number; visitantes: number }[];
  porDispositivo: { name: string; value: number; color: string }[];
  porNavegador: ContagemSimples[];
  porPais: ContagemSimples[];
  porCidade: ContagemSimples[];
  porOrigem: ContagemSimples[];
  porPagina: ContagemSimples[];
}

const DEVICE_LABELS: Record<string, string> = {
  mobile: 'Celular',
  desktop: 'Computador',
  tablet: 'Tablet',
};
const DEVICE_COLORS: Record<string, string> = {
  mobile: '#4f46e5',
  desktop: '#06b6d4',
  tablet: '#f59e0b',
  Outro: '#71717a',
};

function topN(map: Map<string, number>, n: number): ContagemSimples[] {
  return [...map.entries()]
    .map(([name, visitas]) => ({ name, visitas }))
    .sort((a, b) => b.visitas - a.visitas)
    .slice(0, n);
}

/** Lê as visitas do período e devolve todos os agregados prontos para a tela. */
export async function getSiteAnalytics(periodo: AnalyticsPeriodo): Promise<SiteAnalytics> {
  const { data, error } = await supabase
    .from('store_visits')
    .select('created_at, path, referrer_host, device, browser, os, country, region, city, visitor_hash')
    .gte('created_at', periodo.inicio)
    .lte('created_at', periodo.fim)
    .order('created_at', { ascending: true })
    .limit(100000);

  if (error) {
    console.error('Erro ao carregar analytics do site:', error);
    throw new Error(`Erro ao carregar indicadores: ${error.message}`);
  }

  const rows = (data || []) as VisitRow[];

  const totalVisitas = rows.length;
  const unicosGlobal = new Set<string>();

  const porDiaMap = new Map<string, { visitas: number; visitantes: Set<string> }>();
  const dispositivoMap = new Map<string, number>();
  const navegadorMap = new Map<string, number>();
  const paisMap = new Map<string, number>();
  const cidadeMap = new Map<string, number>();
  const origemMap = new Map<string, number>();
  const paginaMap = new Map<string, number>();

  for (const r of rows) {
    if (r.visitor_hash) unicosGlobal.add(r.visitor_hash);

    // Por dia (YYYY-MM-DD)
    const dia = r.created_at.slice(0, 10);
    if (!porDiaMap.has(dia)) porDiaMap.set(dia, { visitas: 0, visitantes: new Set() });
    const d = porDiaMap.get(dia)!;
    d.visitas += 1;
    if (r.visitor_hash) d.visitantes.add(r.visitor_hash);

    // Dispositivo
    const dev = r.device || 'Outro';
    dispositivoMap.set(dev, (dispositivoMap.get(dev) || 0) + 1);

    // Navegador
    const nav = r.browser || 'Outro';
    navegadorMap.set(nav, (navegadorMap.get(nav) || 0) + 1);

    // País
    if (r.country) paisMap.set(r.country, (paisMap.get(r.country) || 0) + 1);

    // Cidade (com UF quando houver)
    if (r.city) {
      const rotulo = r.region ? `${r.city} - ${r.region}` : r.city;
      cidadeMap.set(rotulo, (cidadeMap.get(rotulo) || 0) + 1);
    }

    // Origem (referrer). Sem referrer = acesso direto.
    const origem = r.referrer_host || 'Direto';
    origemMap.set(origem, (origemMap.get(origem) || 0) + 1);

    // Página
    if (r.path) paginaMap.set(r.path, (paginaMap.get(r.path) || 0) + 1);
  }

  const porDia = [...porDiaMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([diaISO, v]) => {
      const [, mes, d] = diaISO.split('-');
      return { dia: `${d}/${mes}`, visitas: v.visitas, visitantes: v.visitantes.size };
    });

  const porDispositivo = [...dispositivoMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([key, value]) => ({
      name: DEVICE_LABELS[key] || key,
      value,
      color: DEVICE_COLORS[key] || DEVICE_COLORS.Outro,
    }));

  return {
    totalVisitas,
    visitantesUnicos: unicosGlobal.size,
    porDia,
    porDispositivo,
    porNavegador: topN(navegadorMap, 6),
    porPais: topN(paisMap, 8),
    porCidade: topN(cidadeMap, 8),
    porOrigem: topN(origemMap, 8),
    porPagina: topN(paginaMap, 8),
  };
}

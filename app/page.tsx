'use client';

import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, useInView, useScroll, useTransform } from 'framer-motion';
import {
  ShoppingBag, BarChart3, Users, Package,
  Shield, CreditCard, Bot, ArrowRight,
  Building2, Layers, ShoppingCart, Star,
  Check, TrendingUp, ChevronDown, Zap,
} from 'lucide-react';

/* ═══════════════════════════════════════════════
   DATA
═══════════════════════════════════════════════ */

const sectors = [
  {
    icon: ShoppingBag,
    name: 'Moda Íntima',
    desc: 'Lingeries, pijamas, moda praia e acessórios femininos com controle total de grade e cores.',
    gradient: 'from-pink-500/20 to-rose-600/10',
    border: 'hover:border-pink-500/40',
    iconBg: 'bg-pink-500/15',
    iconColor: 'text-pink-400',
  },
  {
    icon: Building2,
    name: 'Sex Shop',
    desc: 'Gestão completa para lojas adultas com total privacidade nos dados e relatórios discretos.',
    gradient: 'from-violet-500/20 to-purple-600/10',
    border: 'hover:border-violet-500/40',
    iconBg: 'bg-violet-500/15',
    iconColor: 'text-violet-400',
  },
  {
    icon: ShoppingCart,
    name: 'Boutique',
    desc: 'Controle fino de estoque, PDV e CRM para boutiques de moda com atendimento personalizado.',
    gradient: 'from-indigo-500/20 to-blue-600/10',
    border: 'hover:border-indigo-500/40',
    iconBg: 'bg-indigo-500/15',
    iconColor: 'text-indigo-400',
  },
  {
    icon: Layers,
    name: 'Multi-lojas',
    desc: 'Gerencie várias unidades em um único painel centralizado, com relatórios consolidados.',
    gradient: 'from-emerald-500/20 to-teal-600/10',
    border: 'hover:border-emerald-500/40',
    iconBg: 'bg-emerald-500/15',
    iconColor: 'text-emerald-400',
  },
];

const features = [
  {
    icon: CreditCard,
    title: 'PDV Completo',
    desc: 'Frente de caixa rápida com múltiplas formas de pagamento, parcelamento, sangria e fechamento de caixa com totais automáticos.',
    span: 'lg:col-span-2',
    accent: 'indigo',
  },
  {
    icon: Package,
    title: 'Gestão de Estoque',
    desc: 'Controle de entradas e saídas, alertas de ruptura, código de barras e inventário em tempo real.',
    span: '',
    accent: 'violet',
  },
  {
    icon: Users,
    title: 'Clientes & CRM',
    desc: 'Histórico completo, perfil detalhado, trocas e fidelização dos seus melhores clientes.',
    span: '',
    accent: 'blue',
  },
  {
    icon: BarChart3,
    title: 'Relatórios em Tempo Real',
    desc: 'Faturamento, ticket médio, produtos mais vendidos e performance por operador — tudo numa tela só.',
    span: 'lg:col-span-2',
    accent: 'emerald',
  },
  {
    icon: Bot,
    title: 'NexusIA',
    desc: 'Assistente de inteligência artificial para insights de vendas, alertas estratégicos e análise preditiva do seu negócio.',
    span: '',
    accent: 'purple',
  },
  {
    icon: Shield,
    title: 'Seguro e Confiável',
    desc: 'Dados na nuvem com backups automáticos, auditoria de ações e controle de acesso por perfil.',
    span: '',
    accent: 'amber',
  },
];

const steps = [
  { num: '01', title: 'Configure sua loja', desc: 'Cadastre seus produtos, operadores e formas de pagamento em minutos.' },
  { num: '02', title: 'Comece a vender', desc: 'PDV intuitivo, funciona no computador ou tablet, sem instalação.' },
  { num: '03', title: 'Acompanhe os resultados', desc: 'Relatórios em tempo real, IA com insights e controle total.' },
];

const testimonials = [
  {
    quote: 'Antes usávamos planilha. Hoje tenho tudo no Nexus — estoque, caixa, clientes. Reduziu nosso tempo de fechamento de 1 hora para 5 minutos.',
    author: 'Ana Paula M.',
    role: 'Proprietária · Boutique Flor de Lótus',
    rating: 5,
  },
  {
    quote: 'A privacidade no relatório de vendas foi um diferencial enorme pra gente. O sistema entende as necessidades do nosso segmento.',
    author: 'Carlos Roberto S.',
    role: 'Sócio · Sexy Shop Brasil',
    rating: 5,
  },
  {
    quote: 'Gerencio 3 lojas de um só painel. Consigo ver o estoque de cada unidade em tempo real e tomar decisões muito mais rápido.',
    author: 'Mariana Silva',
    role: 'Diretora · Rede Íntimo & Chique',
    rating: 5,
  },
];

const stats = [
  { to: 200, suffix: '+', label: 'Lojas ativas' },
  { to: 50, suffix: 'k+', label: 'Produtos gerenciados' },
  { to: 98, suffix: '%', label: 'Satisfação' },
  { to: 24, suffix: '/7', label: 'Disponibilidade' },
];

/* ═══════════════════════════════════════════════
   UTILITY COMPONENTS
═══════════════════════════════════════════════ */

function Reveal({
  children,
  delay = 0,
  className = '',
  once = true,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  once?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once, margin: '-60px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function Counter({ to, suffix = '' }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const [v, setV] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    const start = performance.now();
    const dur = 1800;
    const tick = (now: number) => {
      const p = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 4);
      setV(Math.round(eased * to));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [isInView, to]);

  return <span ref={ref}>{v}{suffix}</span>;
}

function DashboardMockup() {
  const bars = [42, 68, 52, 84, 61, 90, 74, 86, 63, 77, 55, 95];
  return (
    <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-[0_32px_80px_-12px_rgba(0,0,0,0.8)] bg-zinc-900">
      {/* Browser chrome */}
      <div className="h-9 bg-zinc-800/90 border-b border-zinc-700/50 flex items-center px-4 gap-3">
        <div className="flex gap-1.5 shrink-0">
          <div className="w-3 h-3 rounded-full bg-red-500/70" />
          <div className="w-3 h-3 rounded-full bg-amber-500/70" />
          <div className="w-3 h-3 rounded-full bg-green-500/70" />
        </div>
        <div className="flex-1 flex justify-center">
          <div className="flex items-center gap-1.5 bg-zinc-700/50 rounded-md px-3 py-1 text-[10px] text-zinc-500 max-w-[200px] w-full justify-center">
            <div className="w-2 h-2 rounded-full bg-emerald-400/60" />
            nexusstore.app/dashboard
          </div>
        </div>
      </div>

      <div className="flex h-[280px]">
        {/* Sidebar */}
        <div className="w-[52px] bg-zinc-900 border-r border-zinc-800/60 flex flex-col gap-2.5 items-center pt-4 pb-4">
          {[true, false, false, false, false, false].map((active, i) => (
            <div
              key={i}
              className={`w-8 h-8 rounded-xl transition-all ${
                active ? 'bg-indigo-600 shadow-lg shadow-indigo-900/50' : 'bg-zinc-800/80'
              }`}
            />
          ))}
        </div>

        {/* Main content */}
        <div className="flex-1 p-3 bg-zinc-950/80 overflow-hidden">
          {/* KPI row */}
          <div className="grid grid-cols-4 gap-1.5 mb-2.5">
            {[
              { c: 'from-indigo-500/25 to-indigo-700/10', v: 'R$ 18k', label: 'Faturamento' },
              { c: 'from-violet-500/25 to-violet-700/10', v: '243',    label: 'Vendas' },
              { c: 'from-emerald-500/25 to-emerald-700/10', v: '98%',  label: 'Satisfação' },
              { c: 'from-amber-500/25 to-amber-700/10', v: 'R$ 74',    label: 'Ticket' },
            ].map((k, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.88 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 + i * 0.09, duration: 0.5 }}
                className={`bg-gradient-to-br ${k.c} rounded-lg p-2.5 border border-white/5`}
              >
                <p className="text-[9px] text-zinc-500 mb-1 font-medium">{k.label}</p>
                <p className="text-white/80 text-xs font-black">{k.v}</p>
              </motion.div>
            ))}
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-3 gap-1.5 h-[165px]">
            {/* Bar chart */}
            <div className="col-span-2 bg-zinc-800/50 rounded-xl border border-zinc-700/20 p-2.5 flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <div className="w-14 h-1.5 bg-zinc-600/60 rounded" />
                <div className="flex gap-1">
                  {['Sem', 'Mês', 'Ano'].map((t, i) => (
                    <div key={t} className={`text-[8px] px-1.5 py-0.5 rounded ${i === 1 ? 'bg-indigo-600/50 text-indigo-300' : 'text-zinc-600'}`}>{t}</div>
                  ))}
                </div>
              </div>
              <div className="flex items-end gap-[3px] flex-1">
                {bars.map((h, i) => (
                  <motion.div
                    key={i}
                    className="flex-1 rounded-t"
                    style={{
                      background: `linear-gradient(to top, hsl(${235 + i * 3}, 70%, 45%), hsl(${245 + i * 3}, 80%, 65%))`,
                    }}
                    initial={{ scaleY: 0, originY: 1 }}
                    animate={{ scaleY: 1 }}
                    transition={{ duration: 0.5, delay: 0.7 + i * 0.04, ease: 'easeOut' }}
                    // scaleY needs transform-origin from bottom
                    whileHover={{ scaleY: 1.05 }}
                  >
                    <div style={{ height: `${h}%` }} className="w-full rounded-t" />
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Donut + list */}
            <div className="bg-zinc-800/50 rounded-xl border border-zinc-700/20 p-2.5 flex flex-col items-center justify-center">
              <div className="relative w-16 h-16 mb-2">
                <svg viewBox="0 0 40 40" className="w-full h-full -rotate-90">
                  <circle cx="20" cy="20" r="15" fill="none" stroke="#1e1b4b" strokeWidth="5" />
                  <motion.circle
                    cx="20" cy="20" r="15" fill="none"
                    stroke="url(#grad1)" strokeWidth="5"
                    strokeDasharray="94.2"
                    initial={{ strokeDashoffset: 94.2 }}
                    animate={{ strokeDashoffset: 22 }}
                    transition={{ duration: 1.2, delay: 0.9, ease: 'easeOut' }}
                    strokeLinecap="round"
                  />
                  <defs>
                    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#6366f1" />
                      <stop offset="100%" stopColor="#a855f7" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-[11px] font-black text-white/90">
                  77%
                </div>
              </div>
              <div className="space-y-1 w-full">
                {[['Íntimo', '#6366f1', '77%'], ['Acess.', '#a855f7', '15%'], ['Outros', '#3f3f46', '8%']].map(([l, c, v]) => (
                  <div key={l} className="flex items-center gap-1.5 text-[9px]">
                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: c }} />
                    <span className="text-zinc-500 flex-1">{l}</span>
                    <span className="text-zinc-400 font-bold">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const accentMap: Record<string, { bg: string; icon: string; border: string; glow: string }> = {
  indigo:  { bg: 'bg-indigo-500/10',  icon: 'text-indigo-400',  border: 'hover:border-indigo-500/40',  glow: 'hover:shadow-indigo-900/30' },
  violet:  { bg: 'bg-violet-500/10',  icon: 'text-violet-400',  border: 'hover:border-violet-500/40',  glow: 'hover:shadow-violet-900/30' },
  blue:    { bg: 'bg-blue-500/10',    icon: 'text-blue-400',    border: 'hover:border-blue-500/40',    glow: 'hover:shadow-blue-900/30'   },
  emerald: { bg: 'bg-emerald-500/10', icon: 'text-emerald-400', border: 'hover:border-emerald-500/40', glow: 'hover:shadow-emerald-900/30'},
  purple:  { bg: 'bg-purple-500/10',  icon: 'text-purple-400',  border: 'hover:border-purple-500/40',  glow: 'hover:shadow-purple-900/30' },
  amber:   { bg: 'bg-amber-500/10',   icon: 'text-amber-400',   border: 'hover:border-amber-500/40',   glow: 'hover:shadow-amber-900/30'  },
};

/* ═══════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════ */

export default function HomePage() {
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroY = useTransform(scrollYProgress, [0, 1], ['0%', '25%']);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.75], [1, 0]);

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">

      {/* ── Header ───────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/80">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/login" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center shadow-md shadow-indigo-900/20 group-hover:scale-105 transition-transform">
              <ShoppingBag className="w-4 h-4 text-white" />
            </div>
            <span className="font-black text-slate-900 tracking-tight">Nexus Store</span>
          </Link>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-500">
            <a href="#como-funciona" className="hover:text-slate-900 transition-colors">Como funciona</a>
            <a href="#funcionalidades" className="hover:text-slate-900 transition-colors">Funcionalidades</a>
            <a href="#segmentos" className="hover:text-slate-900 transition-colors">Segmentos</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden sm:block text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors">
              Entrar
            </Link>
            <Link
              href="/login"
              className="group flex items-center gap-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-black uppercase tracking-[1.5px] px-4 py-2.5 rounded-xl shadow-md shadow-indigo-900/20 transition-all hover:-translate-y-0.5"
            >
              Acessar sistema
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────────── */}
      <section ref={heroRef} className="relative min-h-[100svh] flex flex-col justify-center overflow-hidden bg-zinc-950">
        {/* Animated blobs */}
        <motion.div
          animate={{ x: [0, 40, -30, 0], y: [0, -60, 30, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-0 left-0 w-[700px] h-[700px] rounded-full opacity-[0.18] blur-3xl -translate-x-1/2 -translate-y-1/2"
          style={{ background: 'radial-gradient(circle, #4338ca, #6d28d9)' }}
        />
        <motion.div
          animate={{ x: [0, -40, 30, 0], y: [0, 60, -30, 0] }}
          transition={{ duration: 13, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
          className="absolute bottom-0 right-0 w-[800px] h-[600px] rounded-full opacity-[0.14] blur-3xl translate-x-1/3 translate-y-1/3"
          style={{ background: 'radial-gradient(circle, #7c3aed, #db2777)' }}
        />
        <motion.div
          animate={{ scale: [1, 1.25, 0.85, 1] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
          className="absolute top-1/2 left-1/2 w-[400px] h-[400px] rounded-full opacity-10 blur-3xl -translate-x-1/2 -translate-y-1/2"
          style={{ background: 'radial-gradient(circle, #6366f1, transparent)' }}
        />

        {/* Dot grid overlay */}
        <div className="absolute inset-0 bg-grid-pattern opacity-30 pointer-events-none" />

        <motion.div
          style={{ y: heroY, opacity: heroOpacity }}
          className="relative z-10 max-w-6xl mx-auto px-4 pt-16 pb-12 w-full"
        >
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: copy */}
            <div>
              <motion.div
                initial={{ opacity: 0, y: -16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/25 text-indigo-300 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-widest mb-7"
              >
                <motion.div
                  animate={{ scale: [1, 1.4, 1], opacity: [1, 0.6, 1] }}
                  transition={{ duration: 1.8, repeat: Infinity }}
                  className="w-1.5 h-1.5 rounded-full bg-indigo-400"
                />
                Sistema de gestão para varejo
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.1 }}
                className="text-5xl md:text-6xl xl:text-7xl font-black text-white tracking-tighter leading-[1.02] mb-5"
              >
                Venda mais.<br />
                <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
                  Gerencie menos.
                </span><br />
                Cresça sempre.
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.25 }}
                className="text-base md:text-lg text-zinc-400 max-w-lg mb-9 leading-relaxed"
              >
                PDV inteligente, controle de estoque, gestão de clientes e relatórios em tempo real —
                tudo que sua loja precisa em um só lugar.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.38 }}
                className="flex flex-col sm:flex-row gap-3 mb-10"
              >
                <Link
                  href="/login"
                  className="group flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-black text-xs uppercase tracking-[1.8px] px-8 py-4 rounded-2xl shadow-2xl shadow-indigo-900/40 transition-all hover:-translate-y-1"
                >
                  Acessar minha loja
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
                <a
                  href="#funcionalidades"
                  className="flex items-center justify-center gap-2 bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.12] text-white font-semibold text-sm px-8 py-4 rounded-2xl transition-all hover:-translate-y-0.5 backdrop-blur-sm"
                >
                  Ver funcionalidades
                </a>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="flex flex-wrap items-center gap-4 text-xs text-zinc-500"
              >
                {['Sem taxa de instalação', 'Suporte em português', 'Dados 100% seguros'].map((t) => (
                  <span key={t} className="flex items-center gap-1.5">
                    <Check className="w-3 h-3 text-indigo-400" />
                    {t}
                  </span>
                ))}
              </motion.div>
            </div>

            {/* Right: dashboard mockup */}
            <motion.div
              initial={{ opacity: 0, x: 40, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ duration: 0.9, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="hidden lg:block"
            >
              {/* Glow ring */}
              <div className="relative">
                <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-indigo-600/20 to-violet-600/20 blur-2xl" />
                <div className="animate-float-slow">
                  <DashboardMockup />
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.8 }}
          className="absolute bottom-7 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1"
        >
          <span className="text-[10px] text-zinc-600 uppercase tracking-widest font-semibold">Role</span>
          <motion.div animate={{ y: [0, 5, 0] }} transition={{ duration: 1.4, repeat: Infinity }}>
            <ChevronDown className="w-4 h-4 text-zinc-600" />
          </motion.div>
        </motion.div>
      </section>

      {/* ── Stats ─────────────────────────────────────── */}
      <section className="relative bg-zinc-950 border-t border-zinc-800/60">
        <div className="max-w-4xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-zinc-800/60">
            {stats.map(({ to, suffix, label }, i) => (
              <Reveal key={label} delay={i * 0.1} className="px-6 py-10 text-center">
                <p className="text-4xl font-black text-white tracking-tight mb-1">
                  <Counter to={to} suffix={suffix} />
                </p>
                <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">{label}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Como Funciona ─────────────────────────────── */}
      <section id="como-funciona" className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <Reveal className="text-center mb-14">
            <p className="text-xs font-black uppercase tracking-widest text-indigo-600 mb-3">Como funciona</p>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight mb-3">
              Do zero ao controle total<br />
              <span className="text-slate-400 font-semibold">em 3 passos simples</span>
            </h2>
          </Reveal>

          <div className="relative grid md:grid-cols-3 gap-8">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-10 left-[20%] right-[20%] h-px bg-gradient-to-r from-transparent via-indigo-300/50 to-transparent" />

            {steps.map(({ num, title, desc }, i) => (
              <Reveal key={num} delay={i * 0.15} className="relative text-center">
                <div className="relative inline-flex mb-5">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100 flex items-center justify-center mx-auto shadow-sm">
                    <span className="text-2xl font-black text-indigo-600">{num}</span>
                  </div>
                </div>
                <h3 className="font-black text-slate-900 text-lg mb-2">{title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features (Bento Grid) ─────────────────────── */}
      <section id="funcionalidades" className="py-24 bg-zinc-950 relative overflow-hidden">
        {/* Background accent */}
        <div className="absolute inset-0 bg-grid-pattern opacity-20 pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-900/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-5xl mx-auto px-4">
          <Reveal className="text-center mb-14">
            <p className="text-xs font-black uppercase tracking-widest text-indigo-400 mb-3">Funcionalidades</p>
            <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-3">
              Tudo que sua loja precisa
            </h2>
            <p className="text-zinc-500 text-sm">Do caixa ao relatório — sem precisar de outro sistema</p>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-4">
            {features.map(({ icon: Icon, title, desc, span, accent }, i) => {
              const a = accentMap[accent];
              return (
                <Reveal key={title} delay={i * 0.08} className={span}>
                  <div className={`h-full p-6 rounded-2xl bg-white/[0.03] border border-white/[0.07] ${a.border} ${a.glow} hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group backdrop-blur-sm`}>
                    <div className={`w-11 h-11 ${a.bg} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                      <Icon className={`w-5 h-5 ${a.icon}`} />
                    </div>
                    <h3 className="font-black text-white mb-2">{title}</h3>
                    <p className="text-sm text-zinc-500 leading-relaxed">{desc}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Sectors ───────────────────────────────────── */}
      <section id="segmentos" className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <Reveal className="text-center mb-14">
            <p className="text-xs font-black uppercase tracking-widest text-indigo-600 mb-3">Segmentos</p>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight mb-3">
              Feito para o seu negócio
            </h2>
            <p className="text-slate-400 text-sm max-w-md mx-auto">
              Personalizado para lojas de moda íntima, sex shops, boutiques e redes varejistas
            </p>
          </Reveal>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {sectors.map(({ icon: Icon, name, desc, gradient, border, iconBg, iconColor }, i) => (
              <Reveal key={name} delay={i * 0.1}>
                <div className={`relative h-full p-6 rounded-2xl bg-gradient-to-br ${gradient} border border-white/60 ${border} hover:shadow-lg hover:-translate-y-1.5 transition-all duration-300 group overflow-hidden`}>
                  <div className={`w-11 h-11 ${iconBg} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <Icon className={`w-5 h-5 ${iconColor}`} />
                  </div>
                  <h3 className="font-black text-slate-900 mb-2">{name}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ──────────────────────────────── */}
      <section className="py-24 bg-slate-50 border-t border-slate-100">
        <div className="max-w-5xl mx-auto px-4">
          <Reveal className="text-center mb-14">
            <p className="text-xs font-black uppercase tracking-widest text-indigo-600 mb-3">Depoimentos</p>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
              Quem já usa, recomenda
            </h2>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map(({ quote, author, role, rating }, i) => (
              <Reveal key={author} delay={i * 0.12}>
                <div className="h-full p-6 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300">
                  {/* Stars */}
                  <div className="flex gap-0.5 mb-4">
                    {Array.from({ length: rating }).map((_, j) => (
                      <Star key={j} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed mb-5 italic">
                    &ldquo;{quote}&rdquo;
                  </p>
                  <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-sm font-black shrink-0">
                      {author.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 leading-tight">{author}</p>
                      <p className="text-[11px] text-slate-400">{role}</p>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────── */}
      <section className="relative py-28 overflow-hidden bg-zinc-950">
        {/* Blobs */}
        <motion.div
          animate={{ x: [0, 30, -20, 0], y: [0, -40, 20, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-1/4 left-1/4 w-[400px] h-[400px] rounded-full opacity-25 blur-3xl"
          style={{ background: 'radial-gradient(circle, #4338ca, transparent)' }}
        />
        <motion.div
          animate={{ x: [0, -30, 20, 0], y: [0, 40, -20, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] rounded-full opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(circle, #7c3aed, transparent)' }}
        />
        <div className="absolute inset-0 bg-grid-pattern opacity-25 pointer-events-none" />

        <div className="relative z-10 max-w-2xl mx-auto px-4 text-center">
          <Reveal>
            <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/25 text-amber-400 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-widest mb-7">
              <Zap className="w-3 h-3" />
              Comece agora mesmo
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-5 leading-tight">
              Pronto para transformar<br />
              <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
                sua loja?
              </span>
            </h2>
            <p className="text-zinc-400 text-base mb-10 leading-relaxed">
              Acesse o sistema agora e comece a gerenciar suas vendas com inteligência.
              Sem contratos longos, sem complicação.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Link
                href="/login"
                className="group flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-black text-xs uppercase tracking-[2px] px-10 py-4 rounded-2xl shadow-2xl shadow-indigo-900/50 transition-all hover:-translate-y-1"
              >
                Entrar no sistema
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            <p className="text-zinc-600 text-xs flex items-center justify-center gap-4 flex-wrap">
              {['Acesso imediato', 'Sem taxa de setup', 'Suporte incluso'].map((t) => (
                <span key={t} className="flex items-center gap-1.5">
                  <Check className="w-3 h-3 text-indigo-500" />
                  {t}
                </span>
              ))}
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────── */}
      <footer className="bg-zinc-950 border-t border-zinc-800/60 py-12">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-8 mb-10">
            {/* Brand */}
            <div>
              <Link href="/login" className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center shadow-md shadow-indigo-900/30">
                  <ShoppingBag className="w-4 h-4 text-white" />
                </div>
                <span className="font-black text-white tracking-tight">Nexus Store</span>
              </Link>
              <p className="text-xs text-zinc-500 max-w-[200px] leading-relaxed">
                Sistema de gestão completo para o varejo moderno.
              </p>
            </div>

            {/* Links */}
            <div className="flex gap-12 text-sm">
              <div className="space-y-3">
                <p className="text-[11px] text-zinc-600 font-black uppercase tracking-widest">Sistema</p>
                <div className="space-y-2">
                  <a href="#funcionalidades" className="block text-zinc-400 hover:text-white transition-colors text-xs">Funcionalidades</a>
                  <a href="#segmentos" className="block text-zinc-400 hover:text-white transition-colors text-xs">Segmentos</a>
                  <a href="#como-funciona" className="block text-zinc-400 hover:text-white transition-colors text-xs">Como funciona</a>
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-[11px] text-zinc-600 font-black uppercase tracking-widest">Acesso</p>
                <div className="space-y-2">
                  <Link href="/login" className="block text-zinc-400 hover:text-white transition-colors text-xs">Entrar</Link>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-zinc-800/60 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-600">
            <p>© {new Date().getFullYear()} Nexus Store. Todos os direitos reservados.</p>
            <div className="flex items-center gap-1.5 text-zinc-700">
              <TrendingUp className="w-3 h-3" />
              <span>Feito para varejo brasileiro</span>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}

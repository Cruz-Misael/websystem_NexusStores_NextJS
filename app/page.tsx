'use client';

import Link from 'next/link';
import {
  ShoppingBag, BarChart3, Users, Package,
  Shield, CreditCard, Bot, ArrowRight,
  Building2, Layers, ShoppingCart,
} from 'lucide-react';

const sectors = [
  { icon: ShoppingBag, name: 'Moda Íntima',   desc: 'Lingeries, pijamas, moda praia e acessórios femininos.' },
  { icon: Building2,   name: 'Sex Shop',       desc: 'Gestão completa para lojas adultas com total privacidade.' },
  { icon: ShoppingCart,name: 'Boutique',       desc: 'Controle de estoque e PDV para boutiques de moda.' },
  { icon: Layers,      name: 'Multi-lojas',    desc: 'Gerencie várias unidades em um único painel centralizado.' },
];

const features = [
  {
    icon: CreditCard,
    title: 'PDV Completo',
    desc: 'Frente de caixa rápida com múltiplas formas de pagamento, parcelamento, sangria e fechamento de caixa.',
  },
  {
    icon: Package,
    title: 'Gestão de Estoque',
    desc: 'Controle de entradas e saídas, alertas de ruptura, código de barras e inventário em tempo real.',
  },
  {
    icon: Users,
    title: 'Clientes & CRM',
    desc: 'Histórico de compras, perfil completo, trocas e fidelização dos seus melhores clientes.',
  },
  {
    icon: BarChart3,
    title: 'Relatórios em Tempo Real',
    desc: 'Faturamento, ticket médio, produtos mais vendidos e performance por operador — tudo numa tela só.',
  },
  {
    icon: Bot,
    title: 'NexusIA',
    desc: 'Assistente de inteligência artificial para insights de vendas, alertas estratégicos e análise preditiva.',
  },
  {
    icon: Shield,
    title: 'Seguro e Confiável',
    desc: 'Dados na nuvem com backups automáticos e controle de acesso por perfil de usuário.',
  },
];

const stats = [
  { value: '200+', label: 'Lojas ativas' },
  { value: '50k+', label: 'Produtos gerenciados' },
  { value: '98%',  label: 'Taxa de satisfação' },
  { value: '24/7', label: 'Disponível' },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">

      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/login" className="flex items-center gap-3">
            <div className="w-8 h-8 bg-zinc-900 rounded-xl flex items-center justify-center shadow-sm">
              <ShoppingBag className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-900 tracking-tight">Nexus Store</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-500">
            <a href="#funcionalidades" className="hover:text-slate-900 transition-colors">Funcionalidades</a>
            <a href="#segmentos" className="hover:text-slate-900 transition-colors">Segmentos</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors hidden sm:block"
            >
              Entrar
            </Link>
            <Link
              href="/login"
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-[1.5px] px-4 py-2.5 rounded-xl shadow-md transition-colors"
            >
              Acessar sistema <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-zinc-950 py-24 md:py-32">
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-indigo-900 rounded-full opacity-20 blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[400px] bg-purple-900 rounded-full opacity-15 blur-3xl translate-x-1/3 translate-y-1/3" />
        <div className="absolute top-1/2 left-1/2 w-[300px] h-[300px] bg-indigo-800 rounded-full opacity-10 blur-2xl -translate-x-1/2 -translate-y-1/2" />

        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 bg-indigo-900/50 border border-indigo-800/60 text-indigo-300 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-widest mb-8">
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            Sistema de gestão para varejo
          </div>

          <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-white tracking-tighter leading-[1.05] mb-6">
            Venda mais.<br />
            <span className="text-indigo-400">Gerencie menos.</span><br />
            Cresça sempre.
          </h1>

          <p className="text-lg text-zinc-400 max-w-xl mx-auto mb-10 leading-relaxed">
            PDV inteligente, controle de estoque, gestão de clientes e relatórios em tempo real —
            tudo que sua loja precisa em um só lugar.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/login"
              className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-[1.5px] px-8 py-4 rounded-xl shadow-xl shadow-indigo-900/40 transition-all hover:-translate-y-0.5"
            >
              Acessar minha loja <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#funcionalidades"
              className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 border border-white/20 text-white font-bold text-sm px-8 py-4 rounded-xl transition-colors"
            >
              Ver funcionalidades
            </a>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b border-slate-200 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 py-10 grid grid-cols-2 md:grid-cols-4 divide-x divide-slate-200 text-center">
          {stats.map(({ value, label }) => (
            <div key={label} className="px-6 py-4">
              <p className="text-3xl font-black text-slate-900 tracking-tight">{value}</p>
              <p className="text-xs text-slate-500 uppercase tracking-wider mt-1 font-semibold">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Sectors */}
      <section id="segmentos" className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-12">
            <p className="text-xs font-black uppercase tracking-widest text-indigo-600 mb-3">Segmentos</p>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-3">Para o seu tipo de negócio</h2>
            <p className="text-slate-500 text-sm max-w-md mx-auto">
              Feito para lojas de moda íntima, sex shops, boutiques e redes varejistas
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {sectors.map(({ icon: Icon, name, desc }) => (
              <div
                key={name}
                className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all group"
              >
                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-indigo-100 transition-colors">
                  <Icon className="w-5 h-5 text-indigo-600" />
                </div>
                <h3 className="font-bold text-slate-900 mb-1">{name}</h3>
                <p className="text-sm text-slate-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="funcionalidades" className="py-20 bg-slate-50 border-t border-slate-100">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-12">
            <p className="text-xs font-black uppercase tracking-widest text-indigo-600 mb-3">Funcionalidades</p>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-3">Tudo que sua loja precisa</h2>
            <p className="text-slate-500 text-sm">Do caixa ao relatório — sem precisar de outro sistema</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="flex gap-4 p-5 bg-white rounded-xl border border-slate-200 shadow-sm hover:border-indigo-200 hover:shadow-md transition-all"
              >
                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 mb-1 text-sm">{title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-zinc-950 py-20">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-indigo-900 rounded-full opacity-20 blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-[300px] h-[300px] bg-purple-900 rounded-full opacity-15 blur-3xl" />
        </div>
        <div className="relative z-10 max-w-2xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-black text-white tracking-tight mb-4">
            Pronto para transformar sua loja?
          </h2>
          <p className="text-zinc-400 text-sm mb-8 leading-relaxed">
            Acesse o sistema agora e comece a gerenciar suas vendas com inteligência.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-[1.5px] px-8 py-4 rounded-xl shadow-xl shadow-indigo-900/50 transition-all hover:-translate-y-0.5"
          >
            Entrar no sistema <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-zinc-950 border-t border-zinc-800 text-zinc-500 py-10">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-zinc-800 rounded-lg flex items-center justify-center border border-zinc-700">
              <ShoppingBag className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <span className="text-white font-bold tracking-tight">Nexus Store</span>
          </div>
          <p className="text-zinc-600 text-xs">© {new Date().getFullYear()} Nexus Store. Todos os direitos reservados.</p>
          <div className="flex items-center gap-4 text-xs">
            <Link href="/login" className="hover:text-zinc-300 transition-colors">Entrar</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}

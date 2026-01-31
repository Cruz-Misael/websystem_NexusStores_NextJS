"use client";

import { 
  Bell, 
  Search, 
  HelpCircle, 
  Settings, 
  ChevronDown, 
  Command,
  Slash,
  Menu,
  Sparkles // 1. Importei um ícone de "brilho" para o upgrade
} from "lucide-react";

interface TopbarProps {
  onOpenPlans: () => void;
}

export default function TopbarCompacta({ onOpenPlans }: TopbarProps) {
  return (
    <header className="h-14 bg-white/80 backdrop-blur-md border-b border-zinc-200 sticky top-0 z-50 flex items-center justify-between px-4">
      
      {/* LADO ESQUERDO: Contexto e Navegação */}
      <div className="flex items-center gap-4">
        <button className="p-1 -ml-1 text-zinc-500 hover:text-zinc-800 md:hidden">
          <Menu size={20} />
        </button>

        <nav className="hidden md:flex items-center gap-2 text-sm text-zinc-500">
          <span className="hover:text-zinc-900 cursor-pointer transition-colors">
            Minha Loja
          </span>
          <Slash size={12} className="text-zinc-300" />
          <span className="font-medium text-zinc-900 bg-zinc-100 px-2 py-0.5 rounded-md">
            Dashboard
          </span>
        </nav>
      </div>

      {/* CENTRO: Busca */}
      <div className="flex-1 max-w-md mx-4 hidden md:block">
        <div className="relative group">
          <Search
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-indigo-500 transition-colors"
            size={14}
          />
          <input
            type="text"
            placeholder="Buscar..."
            className="w-full bg-zinc-50 border border-zinc-200 text-zinc-800 text-sm rounded-lg pl-9 pr-12 py-1.5 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-zinc-400"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 pointer-events-none">
            <kbd className="bg-white border border-zinc-200 rounded px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 flex items-center gap-0.5 shadow-sm">
              <Command size={10} /> K
            </kbd>
          </div>
        </div>
      </div>

      {/* LADO DIREITO */}
      <div className="flex items-center gap-3">
        
        {/* 2. NOVO BOTÃO DE UPGRADE (Destaque visual) */}
        <button
          onClick={onOpenPlans}
          className="hidden sm:flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-full text-xs font-medium transition-all shadow-sm shadow-indigo-200 hover:shadow-md hover:-translate-y-0.5"
        >
          <Sparkles size={12} fill="currentColor" className="opacity-90" />
          <span>Upgrade</span>
        </button>

        {/* Divisor Vertical */}
        <div className="h-6 w-px bg-zinc-200 hidden sm:block mx-1"></div>

        <div className="flex items-center gap-1">
          <button className="p-2 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-md transition-colors relative">
            <Bell size={18} />
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
          </button>

          <button className="p-2 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-md transition-colors hidden sm:block">
            <HelpCircle size={18} />
          </button>

          <button className="p-2 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-md transition-colors hidden sm:block">
            <Settings size={18} />
          </button>
        </div>

        {/* PERFIL */}
        <div className="pl-2 border-l border-zinc-200 ml-1">
          <button className="flex items-center gap-2 p-1 hover:bg-zinc-50 rounded-lg transition-colors border border-transparent hover:border-zinc-200 group">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-md flex items-center justify-center text-white font-bold text-xs shadow-sm group-hover:shadow-md transition-all">
              MC
            </div>
            <div className="text-left hidden lg:block">
              <p className="text-xs font-semibold text-zinc-800 leading-none">
                Misael Cruz
              </p>
              <p className="text-[10px] text-zinc-500 leading-none mt-1">
                Admin
              </p>
            </div>
            <ChevronDown size={14} className="text-zinc-400 hidden lg:block" />
          </button>
        </div>
      </div>
    </header>
  );
}
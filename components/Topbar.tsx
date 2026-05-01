"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import {
  Bell, Search, HelpCircle, Settings, ChevronDown,
  Command, Slash, Menu, Sparkles, LogOut,
} from "lucide-react";

const PAGE_NAMES: Record<string, string> = {
  "/dashboard":    "Dashboard",
  "/caixa":        "Caixa / PDV",
  "/vendas":       "Vendas",
  "/produtos":     "Estoque",
  "/clientes":     "Clientes",
  "/configuracoes": "Configurações",
};

const ROLE_LABELS: Record<string, string> = {
  admin:       "Administrador",
  gerente:     "Gerente",
  colaborador: "Colaborador",
};

const WA_SUPPORT =
  "https://wa.me/5551982049463?text=" +
  encodeURIComponent(
    "Olá! Estou usando o Nexus Store e preciso de ajuda. Pode me auxiliar?"
  );

interface TopbarProps {
  onOpenPlans: () => void;
}

interface CurrentUser {
  name:     string;
  email:    string;
  role:     string;
  initials: string;
}

export default function TopbarCompacta({ onOpenPlans }: TopbarProps) {
  const pathname = usePathname();
  const router   = useRouter();

  const [user, setUser]               = useState<CurrentUser | null>(null);
  const [dropdownOpen, setDropdown]   = useState(false);
  const dropdownRef                   = useRef<HTMLDivElement>(null);

  // Carrega dados do usuário logado
  useEffect(() => {
    async function loadUser() {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const { data: profile } = await supabase
        .from("authorized_users")
        .select("full_name, role")
        .eq("user_id", authUser.id)
        .single();

      const name = profile?.full_name || authUser.email?.split("@")[0] || "Usuário";
      const initials = name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((n: string) => n[0])
        .join("")
        .toUpperCase();

      setUser({ name, email: authUser.email ?? "", role: profile?.role ?? "colaborador", initials });
    }
    loadUser();
  }, []);

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdown(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const currentPage = PAGE_NAMES[pathname] ?? "Dashboard";
  const isOnSettings = pathname === "/configuracoes";

  return (
    <header className="h-14 bg-white/80 backdrop-blur-md border-b border-zinc-200 sticky top-0 z-50 flex items-center justify-between px-4">

      {/* ESQUERDA: Breadcrumb dinâmico */}
      <div className="flex items-center gap-4">
        <button className="p-1 -ml-1 text-zinc-500 hover:text-zinc-800 md:hidden">
          <Menu size={20} />
        </button>
        <nav className="hidden md:flex items-center gap-2 text-sm text-zinc-500">
          <span className="hover:text-zinc-900 cursor-pointer transition-colors">Minha Loja</span>
          <Slash size={12} className="text-zinc-300" />
          <span className="font-medium text-zinc-900 bg-zinc-100 px-2 py-0.5 rounded-md">
            {currentPage}
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
          <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
            <kbd className="bg-white border border-zinc-200 rounded px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 flex items-center gap-0.5 shadow-sm">
              <Command size={10} /> K
            </kbd>
          </div>
        </div>
      </div>

      {/* DIREITA */}
      <div className="flex items-center gap-3">

        {/* Upgrade */}
        <button
          onClick={onOpenPlans}
          className="hidden sm:flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-full text-xs font-medium transition-all shadow-sm shadow-indigo-200 hover:shadow-md hover:-translate-y-0.5"
        >
          <Sparkles size={12} fill="currentColor" className="opacity-90" />
          <span>Upgrade</span>
        </button>

        <div className="h-6 w-px bg-zinc-200 hidden sm:block mx-1" />

        {/* Ícones de ação */}
        <div className="flex items-center gap-1">
          {/* Notificações */}
          <button className="p-2 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-md transition-colors relative">
            <Bell size={18} />
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
          </button>

          {/* Ajuda → WhatsApp */}
          <a
            href={WA_SUPPORT}
            target="_blank"
            rel="noopener noreferrer"
            title="Falar com suporte no WhatsApp"
            className="p-2 text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors hidden sm:flex items-center"
          >
            <HelpCircle size={18} />
          </a>

          {/* Configurações */}
          <button
            onClick={() => router.push("/configuracoes")}
            title="Configurações"
            className={`p-2 rounded-md transition-colors hidden sm:block ${
              isOnSettings
                ? "text-indigo-600 bg-indigo-50"
                : "text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"
            }`}
          >
            <Settings size={18} />
          </button>
        </div>

        {/* PERFIL com dropdown */}
        <div className="pl-2 border-l border-zinc-200 ml-1 relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdown(!dropdownOpen)}
            className="flex items-center gap-2 p-1 hover:bg-zinc-50 rounded-lg transition-colors border border-transparent hover:border-zinc-200 group"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-md flex items-center justify-center text-white font-bold text-xs shadow-sm group-hover:shadow-md transition-all">
              {user?.initials ?? ".."}
            </div>
            <div className="text-left hidden lg:block">
              <p className="text-xs font-semibold text-zinc-800 leading-none">
                {user?.name ?? "Carregando..."}
              </p>
              <p className="text-[10px] text-zinc-500 leading-none mt-1">
                {ROLE_LABELS[user?.role ?? ""] ?? ""}
              </p>
            </div>
            <ChevronDown
              size={14}
              className={`text-zinc-400 hidden lg:block transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`}
            />
          </button>

          {/* Dropdown */}
          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl border border-zinc-200 shadow-lg overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-4 py-3 border-b border-zinc-100">
                <p className="text-xs font-semibold text-zinc-900 truncate">{user?.name}</p>
                <p className="text-[11px] text-zinc-400 truncate mt-0.5">{user?.email}</p>
                <span className="inline-block mt-1.5 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full">
                  {ROLE_LABELS[user?.role ?? ""] ?? user?.role}
                </span>
              </div>
              <div className="py-1">
                <button
                  onClick={() => { router.push("/configuracoes"); setDropdown(false); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-zinc-700 hover:bg-zinc-50 transition-colors"
                >
                  <Settings size={14} className="text-zinc-400" />
                  Configurações
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-red-500 hover:bg-red-50 transition-colors"
                >
                  <LogOut size={14} />
                  Sair da conta
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

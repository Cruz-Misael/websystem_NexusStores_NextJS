"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useSidebar } from "@/src/contexts/SidebarContext";
import { useNotifications } from "@/src/hooks/useNotifications";
import {
  Bell, Search, HelpCircle, Settings, ChevronDown,
  Command, Slash, Menu, Sparkles, LogOut,
  Package, Clock, Check, Trash2, X, Keyboard,
  RefreshCw, CheckCheck,
} from "lucide-react";

const PAGE_NAMES: Record<string, string> = {
  "/dashboard":     "Dashboard",
  "/caixa":         "Caixa / PDV",
  "/vendas":        "Vendas",
  "/produtos":      "Estoque",
  "/clientes":      "Clientes",
  "/configuracoes": "Configurações",
};

const ROLE_LABELS: Record<string, string> = {
  admin:       "Administrador",
  gerente:     "Gerente",
  colaborador: "Colaborador",
};

const WA_SUPPORT =
  "https://wa.me/5551982049463?text=" +
  encodeURIComponent("Olá! Estou usando o Nexus Store e preciso de ajuda. Pode me auxiliar?");

const SHORTCUTS = [
  { keys: ["Ctrl", "K"],  desc: "Focar na busca" },
  { keys: ["/"],          desc: "Focar na busca" },
  { keys: ["Esc"],        desc: "Fechar painel / dropdown" },
  { keys: ["Enter"],      desc: "Confirmar seleção" },
  { keys: ["F2"],         desc: "Focar busca no Caixa" },
  { keys: ["↑", "↓"],    desc: "Navegar listas" },
  { keys: ["?"],          desc: "Mostrar atalhos" },
];

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "agora";
  if (diff < 3600) return `${Math.floor(diff / 60)}min atrás`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`;
  return `${Math.floor(diff / 86400)}d atrás`;
}

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
  const { toggleMobile } = useSidebar();
  const { notifications, syncing, unreadCount, sync, markRead, markAllRead, remove } = useNotifications();

  const [user, setUser]               = useState<CurrentUser | null>(null);
  const [dropdownOpen, setDropdown]   = useState(false);
  const [notifOpen, setNotifOpen]     = useState(false);
  const [shortcutsOpen, setShortcuts] = useState(false);

  const dropdownRef  = useRef<HTMLDivElement>(null);
  const notifRef     = useRef<HTMLDivElement>(null);
  const searchRef    = useRef<HTMLInputElement>(null);

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

  // Fecha dropdowns ao clicar fora
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdown(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  // Atalhos de teclado globais
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      const isEditing = tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement).isContentEditable;

      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }
      if (e.key === "/" && !isEditing) {
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }
      if (e.key === "?" && !isEditing) {
        setShortcuts((v) => !v);
        return;
      }
      if (e.key === "Escape") {
        setDropdown(false);
        setNotifOpen(false);
        setShortcuts(false);
        searchRef.current?.blur();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const currentPage = PAGE_NAMES[pathname] ?? "Dashboard";
  const isOnSettings = pathname === "/configuracoes";

  return (
    <>
      <header className="h-14 bg-white/80 backdrop-blur-md border-b border-zinc-200 sticky top-0 z-40 flex items-center justify-between px-4">

        {/* ESQUERDA */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleMobile}
            className="p-1.5 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 rounded-md transition-colors md:hidden"
            aria-label="Abrir menu"
          >
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
              ref={searchRef}
              type="text"
              placeholder="Buscar... (/ ou Ctrl+K)"
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
        <div className="flex items-center gap-2">

          {/* Upgrade */}
          <button
            onClick={onOpenPlans}
            className="hidden sm:flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-full text-xs font-medium transition-all shadow-sm shadow-indigo-200 hover:shadow-md hover:-translate-y-0.5"
          >
            <Sparkles size={12} fill="currentColor" className="opacity-90" />
            <span>Upgrade</span>
          </button>

          <div className="h-6 w-px bg-zinc-200 hidden sm:block" />

          <div className="flex items-center gap-1">

            {/* Atalhos */}
            <button
              onClick={() => setShortcuts((v) => !v)}
              title="Atalhos de teclado (?)"
              className="p-2 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-md transition-colors hidden sm:flex items-center"
            >
              <Keyboard size={16} />
            </button>

            {/* ── NOTIFICAÇÕES ── */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => {
                  setNotifOpen((v) => !v);
                  setDropdown(false);
                  if (!notifOpen) sync();
                }}
                className="p-2 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-md transition-colors relative"
                aria-label="Notificações"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 border-2 border-white">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl border border-zinc-200 shadow-xl overflow-hidden z-50">

                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-zinc-900">Notificações</p>
                      {unreadCount > 0 && (
                        <span className="bg-red-100 text-red-600 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                          {unreadCount} nova{unreadCount > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {unreadCount > 0 && (
                        <button
                          onClick={() => markAllRead(notifications)}
                          title="Marcar todas como lidas"
                          className="p-1 text-zinc-400 hover:text-indigo-600 rounded transition-colors"
                        >
                          <CheckCheck size={14} />
                        </button>
                      )}
                      <button
                        onClick={sync}
                        title="Sincronizar"
                        className={`p-1 text-zinc-400 hover:text-zinc-700 rounded transition-colors ${syncing ? "animate-spin" : ""}`}
                      >
                        <RefreshCw size={13} />
                      </button>
                      <button
                        onClick={() => setNotifOpen(false)}
                        className="p-1 text-zinc-400 hover:text-zinc-700 rounded transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Lista */}
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-8 text-center">
                        <Bell size={24} className="text-zinc-200 mx-auto mb-2" />
                        <p className="text-xs text-zinc-400">Nenhuma notificação</p>
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          className={`group flex items-start gap-3 px-4 py-3 border-b border-zinc-50 transition-colors ${
                            n.read_at ? "bg-white" : "bg-indigo-50/40"
                          } hover:bg-zinc-50`}
                        >
                          {/* Ícone */}
                          <div className={`mt-0.5 shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${
                            n.type === "stock_critical"
                              ? "bg-red-100"
                              : "bg-amber-100"
                          }`}>
                            {n.type === "stock_critical"
                              ? <Package size={13} className="text-red-500" />
                              : <Clock size={13} className="text-amber-500" />
                            }
                          </div>

                          {/* Conteúdo */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className={`text-[11px] font-semibold ${n.read_at ? "text-zinc-500" : "text-zinc-800"}`}>
                                {n.title}
                              </p>
                              <span className="text-[9px] text-zinc-400 shrink-0">
                                {timeAgo(n.created_at)}
                              </span>
                            </div>
                            <p className={`text-[11px] leading-snug mt-0.5 ${n.read_at ? "text-zinc-400" : "text-zinc-600"}`}>
                              {n.message}
                            </p>
                          </div>

                          {/* Ações (visíveis no hover) */}
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5">
                            {!n.read_at && (
                              <button
                                onClick={() => markRead(n.id)}
                                title="Marcar como lida"
                                className="p-1 text-zinc-400 hover:text-indigo-600 rounded transition-colors"
                              >
                                <Check size={13} />
                              </button>
                            )}
                            <button
                              onClick={() => remove(n.id)}
                              title="Excluir"
                              className="p-1 text-zinc-400 hover:text-red-500 rounded transition-colors"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Footer */}
                  {notifications.length > 0 && (
                    <div className="px-4 py-2.5 border-t border-zinc-100 flex items-center justify-between">
                      <span className="text-[10px] text-zinc-400">
                        {notifications.length} notificação{notifications.length > 1 ? "ões" : ""}
                      </span>
                      <button
                        onClick={() => {
                          Promise.all(notifications.map((n) => remove(n.id)));
                        }}
                        className="text-[10px] text-zinc-400 hover:text-red-500 transition-colors"
                      >
                        Limpar tudo
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

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

          {/* PERFIL */}
          <div className="pl-2 border-l border-zinc-200 ml-1 relative" ref={dropdownRef}>
            <button
              onClick={() => { setDropdown(!dropdownOpen); setNotifOpen(false); }}
              className="flex items-center gap-2 p-1 hover:bg-zinc-50 rounded-lg transition-colors border border-transparent hover:border-zinc-200 group"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-md flex items-center justify-center text-white font-bold text-xs shadow-sm group-hover:shadow-md transition-all">
                {user?.initials ?? ".."}
              </div>
              <div className="text-left hidden lg:block">
                <p className="text-xs font-semibold text-zinc-800 leading-none">{user?.name ?? "Carregando..."}</p>
                <p className="text-[10px] text-zinc-500 leading-none mt-1">{ROLE_LABELS[user?.role ?? ""] ?? ""}</p>
              </div>
              <ChevronDown
                size={14}
                className={`text-zinc-400 hidden lg:block transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`}
              />
            </button>

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

      {/* Modal de Atalhos */}
      {shortcutsOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => setShortcuts(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <Keyboard size={16} className="text-indigo-600" />
                <p className="text-sm font-bold text-zinc-900">Atalhos de Teclado</p>
              </div>
              <button onClick={() => setShortcuts(false)} className="text-zinc-400 hover:text-zinc-700">
                <X size={16} />
              </button>
            </div>
            <div className="p-4 space-y-2">
              {SHORTCUTS.map(({ keys, desc }) => (
                <div key={desc} className="flex items-center justify-between py-1.5">
                  <span className="text-xs text-zinc-600">{desc}</span>
                  <div className="flex items-center gap-1">
                    {keys.map((k) => (
                      <kbd
                        key={k}
                        className="bg-zinc-100 border border-zinc-200 rounded px-2 py-0.5 text-[11px] font-mono font-medium text-zinc-700 shadow-sm"
                      >
                        {k}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="px-5 py-3 bg-zinc-50 border-t border-zinc-100">
              <p className="text-[10px] text-zinc-400 text-center">
                Pressione <kbd className="bg-white border border-zinc-200 rounded px-1 text-[10px]">?</kbd> a qualquer momento para ver esta lista
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

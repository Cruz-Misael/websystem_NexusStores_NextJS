"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { useSidebar } from "@/src/contexts/SidebarContext";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  CreditCard,
  Settings,
  LogOut,
  Store,
  AlertTriangle,
  XCircle,
  ChevronDown,
  ChevronUp,
  BarChart2,
  ShoppingBag,
  Globe,
  ChevronsLeft,
  ChevronsRight,
  X,
} from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  admin:       "Administrador",
  gerente:     "Gerente",
  colaborador: "Colaborador",
};

interface CurrentUser {
  name:     string;
  email:    string;
  role:     string;
  initials: string;
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const { collapsed, toggleCollapsed, mobileOpen, closeMobile } = useSidebar();

  const { alerts, criticalCount, totalCount } = useSidebar();

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

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) router.push("/login");
  };

  const menuItems = [
    { name: "Dashboard",      icon: LayoutDashboard, href: "/dashboard",   onlineStore: false, adminOnly: false },
    { name: "Caixa / PDV",   icon: CreditCard,       href: "/caixa",       onlineStore: false, adminOnly: false },
    { name: "Vendas",         icon: ShoppingCart,     href: "/vendas",      onlineStore: false, adminOnly: false },
    { name: "Estoque",        icon: Package,          href: "/produtos",    onlineStore: false, adminOnly: false },
    { name: "Clientes",       icon: Users,            href: "/clientes",    onlineStore: false, adminOnly: false },
    { name: "Pedidos Online", icon: ShoppingBag,      href: "/pedidos",     onlineStore: true,  adminOnly: true  },
    { name: "Relatórios",    icon: BarChart2,         href: "/relatorios",  onlineStore: false, adminOnly: false },
  ];

  return (
    <>
      {/* Overlay mobile */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={closeMobile}
        />
      )}

      <aside className={`
        fixed top-0 left-0 h-screen
        bg-zinc-950 text-zinc-400
        border-r border-zinc-800
        flex flex-col z-50
        transition-all duration-300
        ${collapsed ? "w-16" : "w-64"}
        ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
      `}>

        {/* Header */}
        <div className={`p-4 flex items-center gap-3 text-white min-h-[64px] ${collapsed ? "justify-center" : ""}`}>
          <div className="bg-indigo-600 p-2 rounded-lg shadow-lg shadow-indigo-500/20 shrink-0">
            <Store size={20} className="text-white" />
          </div>
          {!collapsed && (
            <>
              <span className="text-lg font-bold tracking-tight whitespace-nowrap">Nexus Store</span>
              <button
                onClick={closeMobile}
                className="ml-auto text-zinc-400 hover:text-white md:hidden"
                aria-label="Fechar menu"
              >
                <X size={18} />
              </button>
            </>
          )}
        </div>

        {/* Navegação Principal */}
        <nav className="flex-1 px-2 py-3 space-y-1 overflow-y-auto">
          {!collapsed && (
            <p className="px-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">
              Principal
            </p>
          )}

          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            const isEstoque = item.href === "/produtos";
            const isDisabled = item.adminOnly && user !== null && user.role !== "admin";

            if (isDisabled) {
              return (
                <div
                  key={item.href}
                  title={item.name}
                  className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium opacity-40 cursor-not-allowed text-zinc-400 ${collapsed ? "justify-center" : ""}`}
                >
                  <item.icon size={18} />
                  {!collapsed && <span className="flex-1">{item.name}</span>}
                </div>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMobile}
                title={collapsed ? item.name : undefined}
                className={`
                  relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                  ${collapsed ? "justify-center" : ""}
                  ${isActive
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-900/20"
                    : "hover:bg-zinc-900 hover:text-white"
                  }
                `}
              >
                <item.icon size={18} className={isActive ? "text-white" : "text-zinc-400"} />

                {!collapsed && (
                  <>
                    <span className="flex-1">{item.name}</span>
                    {isEstoque && totalCount > 0 && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center leading-none ${criticalCount > 0 ? "bg-red-500 text-white" : "bg-amber-500 text-white"}`}>
                        {totalCount}
                      </span>
                    )}
                    {item.onlineStore && (
                      <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-violet-900/40 text-violet-300 border border-violet-700/50 flex items-center gap-0.5 shrink-0">
                        <Globe size={7} />
                        Online
                      </span>
                    )}
                  </>
                )}

                {/* Badge compacto quando colapsado */}
                {collapsed && isEstoque && totalCount > 0 && (
                  <span className={`absolute top-1 right-1 w-2 h-2 rounded-full ${criticalCount > 0 ? "bg-red-500" : "bg-amber-500"}`} />
                )}
              </Link>
            );
          })}

          {/* Painel de alertas (apenas quando expandido) */}
          {!collapsed && totalCount > 0 && (
            <div className="mt-3">
              <button
                onClick={() => setAlertsOpen((v) => !v)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-colors hover:bg-zinc-900 text-amber-400 hover:text-amber-300"
              >
                <AlertTriangle size={13} className="shrink-0" />
                <span className="flex-1 text-left">Alertas de estoque</span>
                <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full">
                  {totalCount}
                </span>
                {alertsOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>

              {alertsOpen && (
                <div className="mx-2 mt-1 rounded-lg bg-zinc-900 border border-zinc-800 overflow-hidden">
                  <div className="max-h-52 overflow-y-auto">
                    {alerts.map((alert) => (
                      <div
                        key={alert.sku}
                        className="flex items-start gap-2 px-3 py-2 border-b border-zinc-800 last:border-0"
                      >
                        {alert.level === "critical" ? (
                          <XCircle size={13} className="text-red-400 mt-0.5 shrink-0" />
                        ) : (
                          <AlertTriangle size={13} className="text-amber-400 mt-0.5 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="text-[11px] font-medium text-zinc-200 truncate leading-tight">
                            {alert.name}
                          </p>
                          <p className={`text-[10px] leading-tight ${alert.level === "critical" ? "text-red-400" : "text-amber-400"}`}>
                            {alert.level === "critical"
                              ? "Sem estoque"
                              : `${alert.stock_quantity} un (mín: ${alert.minimum_stock})`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Link
                    href="/produtos"
                    className="block text-center text-[11px] text-indigo-400 hover:text-indigo-300 py-2 border-t border-zinc-800 transition-colors"
                  >
                    Ver estoque completo →
                  </Link>
                </div>
              )}
            </div>
          )}
        </nav>

        {/* Rodapé */}
        <div className="p-3 border-t border-zinc-800">
          {/* Botão de colapso (apenas desktop) */}
          <button
            onClick={toggleCollapsed}
            title={collapsed ? "Expandir menu" : "Recolher menu"}
            className={`hidden md:flex w-full items-center px-3 py-2 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 transition-colors mb-2 text-xs ${collapsed ? "justify-center" : "gap-2"}`}
          >
            {collapsed ? <ChevronsRight size={16} /> : <><ChevronsLeft size={16} /><span>Recolher menu</span></>}
          </button>

          <nav className="space-y-1">
            <Link
              href="/configuracoes"
              onClick={closeMobile}
              title={collapsed ? "Configurações" : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${collapsed ? "justify-center" : ""} ${
                pathname === "/configuracoes"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-900/20"
                  : "hover:bg-zinc-900 hover:text-white"
              }`}
            >
              <Settings size={18} className={pathname === "/configuracoes" ? "text-white" : "text-zinc-400"} />
              {!collapsed && "Configurações"}
            </Link>
            <button
              onClick={handleLogout}
              title={collapsed ? "Sair" : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-950/30 hover:text-red-300 transition-colors ${collapsed ? "justify-center" : ""}`}
            >
              <LogOut size={18} />
              {!collapsed && "Sair"}
            </button>
          </nav>

          {/* Mini Perfil */}
          {!collapsed ? (
            <div className="mt-3 flex items-center gap-3 px-2 py-2 rounded-lg bg-zinc-900/50">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs text-white font-bold shrink-0">
                {user?.initials ?? ".."}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-medium text-white truncate">{user?.name ?? "Carregando..."}</span>
                <span className="text-[10px] text-zinc-500 truncate">{ROLE_LABELS[user?.role ?? ""] ?? user?.role ?? ""}</span>
              </div>
            </div>
          ) : (
            <div className="mt-3 flex justify-center" title={user?.name ?? ""}>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs text-white font-bold">
                {user?.initials ?? ".."}
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

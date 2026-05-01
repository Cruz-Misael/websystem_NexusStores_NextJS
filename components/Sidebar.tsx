"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  CreditCard,
  Settings,
  LogOut,
  Store,
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
    if (!error) {
      // Redireciona para a página de login após o logout
      router.push('/login');
    } else {
      console.error('Erro ao fazer logout:', error);
    }
  };

  const menuItems = [
    { name: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
    { name: "Caixa / PDV", icon: CreditCard, href: "/caixa" },
    { name: "Vendas", icon: ShoppingCart, href: "/vendas" },
    { name: "Estoque", icon: Package, href: "/produtos" },
    { name: "Clientes", icon: Users, href: "/clientes" },
  ];

  return (
      <aside className="
        fixed top-0 left-0
        w-64 h-screen
        bg-zinc-950 text-zinc-400
        border-r border-zinc-800
        flex flex-col
        transition-all duration-300
      ">
      {/* --- Header da Sidebar (Logo) --- */}
      <div className="p-6 flex items-center gap-3 text-white">
        <div className="bg-indigo-600 p-2 rounded-lg shadow-lg shadow-indigo-500/20">
            <Store size={24} className="text-white" />
        </div>
        <span className="text-xl font-bold tracking-tight">Nexus Store</span>
      </div>

      {/* --- Navegação Principal --- */}
      <nav className="flex-1 px-4 py-4 space-y-2">
        <p className="px-2 text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-4">
          Principal
        </p>
        
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                ${isActive 
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-900/20" 
                  : "hover:bg-zinc-900 hover:text-white"
                }
              `}
            >
              <item.icon size={18} className={isActive ? "text-white" : "text-zinc-400"} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* --- Rodapé da Sidebar (Configurações / Perfil) --- */}
      <div className="p-4 border-t border-zinc-800">
        <nav className="space-y-1">
          <Link
            href="/configuracoes"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
              pathname === "/configuracoes"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-900/20"
                : "hover:bg-zinc-900 hover:text-white"
            }`}
          >
            <Settings size={18} className={pathname === "/configuracoes" ? "text-white" : "text-zinc-400"} />
            Configurações
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-950/30 hover:text-red-300 transition-colors"
          >
            <LogOut size={18} /> Sair
          </button>
        </nav>

        {/* Mini Perfil dinâmico */}
        <div className="mt-4 flex items-center gap-3 px-2 py-2 rounded-lg bg-zinc-900/50">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs text-white font-bold shrink-0">
            {user?.initials ?? ".."}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-medium text-white truncate">
              {user?.name ?? "Carregando..."}
            </span>
            <span className="text-[10px] text-zinc-500 truncate">
              {ROLE_LABELS[user?.role ?? ""] ?? user?.role ?? ""}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
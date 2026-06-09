// app/(app)/layout.tsx
"use client";

import { useState } from "react";
import { SidebarProvider, useSidebar } from "@/src/contexts/SidebarContext";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import PlansModal from "@/components/planos/ModalPlanoSaas";
import BillingGuard from "@/components/billing/BillingGuard";
import NexusIA from "@/components/ia/NexusIA";

function AppLayoutInner({ children }: { children: React.ReactNode }) {
  const [openPlans, setOpenPlans] = useState(false);
  const { collapsed } = useSidebar();

  return (
    <div className="h-screen overflow-hidden flex">
      <Sidebar />

      {openPlans && (
        <PlansModal planoAtual="starter" onClose={() => setOpenPlans(false)} />
      )}

      {/* ml-0 no mobile (sidebar sobrepõe), ml-16/ml-64 no desktop */}
      <div className={`h-screen flex flex-col flex-1 transition-all duration-300 ${collapsed ? "ml-0 md:ml-16" : "ml-0 md:ml-64"}`}>
        <Topbar onOpenPlans={() => setOpenPlans(true)} />
        <BillingGuard>
          <main className="flex-1 overflow-y-auto px-4 md:px-6 pb-6 pt-2 bg-slate-100">
            {children}
          </main>
        </BillingGuard>
      </div>
      <NexusIA />
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppLayoutInner>{children}</AppLayoutInner>
    </SidebarProvider>
  );
}

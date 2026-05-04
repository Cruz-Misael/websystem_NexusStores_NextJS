// app/(app)/layout.tsx - CORRETO
"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import PlansModal from "@/components/planos/ModalPlanoSaas";
import BillingGuard from "@/components/billing/BillingGuard";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [openPlans, setOpenPlans] = useState(false);

  return (
    // REMOVA <html> e <body> - apenas divs
    <div className="h-screen overflow-hidden flex">
      
      {/* Sidebar fixo */}
      <Sidebar />

      {/* Modal GLOBAL (fora do layout deslocado) */}
      {openPlans && (
        <PlansModal
          planoAtual="starter"
          onClose={() => setOpenPlans(false)}
        />
      )}

      {/* Área principal */}
      <div className="ml-64 h-screen flex flex-col flex-1">
        {/* Topbar dispara o modal */}
        <Topbar onOpenPlans={() => setOpenPlans(true)} />

        {/* BillingGuard: mostra banner de alerta (shrink-0) acima do main e overlay de bloqueio */}
        <BillingGuard>
          <main className="flex-1 overflow-y-auto px-6 pb-6 pt-2 bg-slate-100">
            {children}
          </main>
        </BillingGuard>
      </div>
    </div>
  );
}
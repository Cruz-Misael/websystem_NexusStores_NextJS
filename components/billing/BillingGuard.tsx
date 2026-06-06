"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { BillingService, BillingStatus } from "@/src/services/billing.service";
import BillingAlert from "./BillingAlert";
import BillingLock from "./BillingLock";
import BillingUpcomingAlert from "./BillingUpcomingAlert";

interface BillingState {
  status: BillingStatus;
  diasAtrasoNum: number;
  diasParaVencerNum: number;
  nextDueDate: string;
}

export default function BillingGuard({ children }: { children: React.ReactNode }) {
  const [billing, setBilling] = useState<BillingState | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    BillingService.getStatus()
      .then((result) => { if (result) setBilling(result); })
      .catch(() => {}); // Silently ignore if table not configured yet
  }, [pathname]);

  const isConfigPage = pathname?.startsWith('/configuracoes');

  // Bloqueado por mais de 10 dias → trava o app inteiro, exceto /configuracoes
  const showLock = billing?.status === 'locked' && !isConfigPage;

  // Atrasado (≤10 dias) → mostra banner de alerta vermelho/laranja
  const showAlert = billing && (billing.status === 'overdue' || billing.status === 'locked');

  // Ativo mas vencendo nos próximos 3 dias → mostra aviso antecipado azul
  const showUpcoming = billing?.status === 'active' && billing.diasParaVencerNum >= 0 && billing.diasParaVencerNum <= 3;

  return (
    <>
      {showLock && (
        <BillingLock
          diasAtraso={billing.diasAtrasoNum}
          nextDueDate={billing.nextDueDate}
        />
      )}
      {showAlert && !showLock && (
        <BillingAlert
          diasAtraso={billing.diasAtrasoNum}
          nextDueDate={billing.nextDueDate}
        />
      )}
      {showUpcoming && (
        <BillingUpcomingAlert
          diasParaVencer={billing.diasParaVencerNum}
          nextDueDate={billing.nextDueDate}
        />
      )}
      {children}
    </>
  );
}

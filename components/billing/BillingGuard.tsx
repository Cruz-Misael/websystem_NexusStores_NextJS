"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { BillingService, BillingStatus } from "@/src/services/billing.service";
import BillingAlert from "./BillingAlert";
import BillingLock from "./BillingLock";

interface BillingState {
  status: BillingStatus;
  diasAtrasoNum: number;
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

  // Atrasado (≤10 dias) → mostra banner de alerta
  const showAlert = billing && (billing.status === 'overdue' || billing.status === 'locked');

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
      {children}
    </>
  );
}

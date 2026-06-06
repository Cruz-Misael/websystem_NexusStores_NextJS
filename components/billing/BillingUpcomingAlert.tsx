"use client";

import { Bell, X, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface Props {
  diasParaVencer: number;
  nextDueDate: string;
}

export default function BillingUpcomingAlert({ diasParaVencer, nextDueDate }: Props) {
  const [dismissed, setDismissed] = useState(false);
  const router = useRouter();

  if (dismissed) return null;

  const vencimento = new Date(nextDueDate + 'T12:00:00').toLocaleDateString('pt-BR');

  const mensagem = diasParaVencer === 0
    ? `Seu plano vence hoje (${vencimento}).`
    : `Seu plano vence em ${diasParaVencer} dia${diasParaVencer > 1 ? 's' : ''} — ${vencimento}.`;

  return (
    <div className="shrink-0 bg-blue-50 border-b border-blue-200 px-6 py-3 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="p-1.5 bg-blue-100 rounded-lg">
          <Bell size={16} className="text-blue-600" />
        </div>
        <p className="text-sm font-semibold text-blue-800">
          {mensagem}
          {" "}
          <span className="font-normal text-blue-700">
            Realize o pagamento para evitar interrupções.
          </span>
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => router.push('/configuracoes?tab=pagamento')}
          className="flex items-center gap-1.5 text-xs font-bold text-blue-700 bg-blue-100 hover:bg-blue-200 px-3 py-1.5 rounded-lg transition-colors"
        >
          <Settings size={13} />
          Ver pagamento
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="text-blue-400 hover:text-blue-700 transition-colors p-1"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

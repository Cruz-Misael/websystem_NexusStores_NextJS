"use client";

import { AlertTriangle, X, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface Props {
  diasAtraso: number;
  nextDueDate: string;
}

export default function BillingAlert({ diasAtraso, nextDueDate }: Props) {
  const [dismissed, setDismissed] = useState(false);
  const router = useRouter();

  if (dismissed) return null;

  const vencimento = new Date(nextDueDate + 'T12:00:00').toLocaleDateString('pt-BR');

  return (
    <div className="shrink-0 bg-amber-50 border-b border-amber-200 px-6 py-3 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="p-1.5 bg-amber-100 rounded-lg">
          <AlertTriangle size={16} className="text-amber-600" />
        </div>
        <p className="text-sm font-semibold text-amber-800">
          {diasAtraso === 0
            ? `Seu pagamento vence hoje (${vencimento}).`
            : `Pagamento em atraso há ${diasAtraso} dia${diasAtraso > 1 ? 's' : ''} — venceu em ${vencimento}.`}
          {" "}
          <span className="font-normal text-amber-700">
            Regularize antes de {diasAtraso >= 9 ? "amanhã" : `${10 - diasAtraso} dia${10 - diasAtraso > 1 ? 's' : ''}`} para evitar o bloqueio do sistema.
          </span>
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => router.push('/configuracoes')}
          className="flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition-colors"
        >
          <Settings size={13} />
          Regularizar
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="text-amber-400 hover:text-amber-700 transition-colors p-1"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

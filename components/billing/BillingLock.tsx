"use client";

import { Lock, Settings, AlertOctagon } from "lucide-react";
import { useRouter } from "next/navigation";

interface Props {
  diasAtraso: number;
  nextDueDate: string;
}

export default function BillingLock({ diasAtraso, nextDueDate }: Props) {
  const router = useRouter();
  const vencimento = new Date(nextDueDate + 'T12:00:00').toLocaleDateString('pt-BR');

  return (
    <div className="fixed inset-0 z-[200] bg-zinc-950/95 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <Lock size={32} className="text-red-600" />
        </div>

        <div className="flex items-center justify-center gap-2 mb-2">
          <AlertOctagon size={16} className="text-red-500" />
          <span className="text-xs font-black uppercase tracking-widest text-red-500">Sistema Bloqueado</span>
        </div>

        <h2 className="text-2xl font-black text-zinc-900 mb-3">Acesso Suspenso</h2>

        <p className="text-sm text-zinc-500 leading-relaxed mb-2">
          O pagamento da assinatura está em atraso há{" "}
          <span className="font-bold text-red-600">{diasAtraso} dias</span>{" "}
          (venceu em {vencimento}).
        </p>
        <p className="text-sm text-zinc-400 leading-relaxed mb-8">
          Para restabelecer o acesso, registre o pagamento nas configurações do sistema.
        </p>

        <button
          onClick={() => router.push('/configuracoes')}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-colors shadow-lg shadow-indigo-200"
        >
          <Settings size={18} />
          Ir para Configurações
        </button>

        <p className="text-[11px] text-zinc-300 mt-5">
          Em caso de dúvidas, entre em contato com o suporte.
        </p>
      </div>
    </div>
  );
}

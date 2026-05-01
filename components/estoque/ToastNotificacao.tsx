// components/estoque/ToastNotificacao.tsx
import { CheckCircle, AlertTriangle, Info, X } from "lucide-react";
import { useEffect } from "react";

interface ToastNotificacaoProps {
  aberto: boolean;
  mensagem: string;
  tipo?: "sucesso" | "erro" | "info";
  onFechar: () => void;
  duracao?: number; // em ms
}

export default function ToastNotificacao({
  aberto,
  mensagem,
  tipo = "info",
  onFechar,
  duracao = 3000,
}: ToastNotificacaoProps) {
  
  useEffect(() => {
    if (aberto && duracao) {
      const timer = setTimeout(() => {
        onFechar();
      }, duracao);
      
      return () => clearTimeout(timer);
    }
  }, [aberto, duracao, onFechar]);

  if (!aberto) return null;

  const icones = {
    sucesso: <CheckCircle className="text-emerald-500" size={20} />,
    erro: <AlertTriangle className="text-red-500" size={20} />,
    info: <Info className="text-blue-500" size={20} />,
  };

  const cores = {
    sucesso: "bg-emerald-50 border-emerald-200 text-emerald-700",
    erro: "bg-red-50 border-red-200 text-red-700",
    info: "bg-blue-50 border-blue-200 text-blue-700",
  };

  return (
    <div className="fixed bottom-4 right-4 z-[70] animate-slide-up">
      <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg ${cores[tipo]}`}>
        {icones[tipo]}
        <p className="text-sm font-medium">{mensagem}</p>
        <button
          onClick={onFechar}
          className="p-1 hover:bg-black/5 rounded-full transition-colors"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
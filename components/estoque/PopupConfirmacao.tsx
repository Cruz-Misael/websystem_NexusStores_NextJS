// components/estoque/PopupConfirmacao.tsx
import { X, AlertTriangle, CheckCircle, Info, Loader2 } from "lucide-react";
import { useEffect } from "react";

interface PopupConfirmacaoProps {
  aberto: boolean;
  titulo: string;
  mensagem: string;
  tipo?: "sucesso" | "erro" | "aviso" | "info";
  onConfirmar?: () => void;
  onCancelar?: () => void;
  onFechar?: () => void;
  confirmando?: boolean;
  textoConfirmar?: string;
  textoCancelar?: string;
  tempoAutoFechar?: number; // em ms
}

export default function PopupConfirmacao({
  aberto,
  titulo,
  mensagem,
  tipo = "info",
  onConfirmar,
  onCancelar,
  onFechar,
  confirmando = false,
  textoConfirmar = "Confirmar",
  textoCancelar = "Cancelar",
  tempoAutoFechar,
}: PopupConfirmacaoProps) {
  
  // Fechar automaticamente após tempo determinado
  useEffect(() => {
    if (aberto && tempoAutoFechar && tipo === "sucesso") {
      const timer = setTimeout(() => {
        if (onFechar) onFechar();
      }, tempoAutoFechar);
      
      return () => clearTimeout(timer);
    }
  }, [aberto, tempoAutoFechar, tipo, onFechar]);

  if (!aberto) return null;

  const icones = {
    sucesso: <CheckCircle className="text-emerald-500" size={32} />,
    erro: <AlertTriangle className="text-red-500" size={32} />,
    aviso: <AlertTriangle className="text-amber-500" size={32} />,
    info: <Info className="text-blue-500" size={32} />,
  };

  const cores = {
    sucesso: "bg-emerald-50 border-emerald-200",
    erro: "bg-red-50 border-red-200",
    aviso: "bg-amber-50 border-amber-200",
    info: "bg-blue-50 border-blue-200",
  };

  const coresBotao = {
    sucesso: "bg-emerald-600 hover:bg-emerald-700",
    erro: "bg-red-600 hover:bg-red-700",
    aviso: "bg-amber-600 hover:bg-amber-700",
    info: "bg-blue-600 hover:bg-blue-700",
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div 
        className={`bg-white rounded-xl shadow-2xl max-w-md w-full border ${cores[tipo]} overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-zinc-200">
          <div className="flex items-center gap-3">
            {icones[tipo]}
            <h3 className="text-lg font-bold text-zinc-900">{titulo}</h3>
          </div>
          <button
            onClick={onFechar}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-6">
          <p className="text-zinc-600 text-sm leading-relaxed whitespace-pre-line">
            {mensagem}
          </p>
        </div>

        {/* Footer com ações */}
        {(onConfirmar || onCancelar) && (
          <div className="flex justify-end gap-3 p-4 bg-zinc-50 border-t border-zinc-200">
            {onCancelar && (
              <button
                onClick={onCancelar}
                disabled={confirmando}
                className="px-4 py-2 bg-white border border-zinc-300 text-zinc-700 rounded-lg text-sm font-medium hover:bg-zinc-50 transition-colors disabled:opacity-50"
              >
                {textoCancelar}
              </button>
            )}
            {onConfirmar && (
              <button
                onClick={onConfirmar}
                disabled={confirmando}
                className={`px-4 py-2 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2 ${coresBotao[tipo]}`}
              >
                {confirmando ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Processando...
                  </>
                ) : (
                  textoConfirmar
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
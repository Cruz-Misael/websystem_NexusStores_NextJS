// components/clientes/PopupConfirmacao.tsx
import { X, AlertTriangle, Loader2 } from "lucide-react";

interface PopupConfirmacaoProps {
  aberto: boolean;
  titulo: string;
  mensagem: string;
  tipo?: "aviso" | "erro" | "info";
  onConfirmar?: () => void;
  onCancelar?: () => void;
  onFechar?: () => void;
  confirmando?: boolean;
  textoConfirmar?: string;
  textoCancelar?: string;
}

export default function PopupConfirmacao({
  aberto,
  titulo,
  mensagem,
  tipo = "aviso",
  onConfirmar,
  onCancelar,
  onFechar,
  confirmando = false,
  textoConfirmar = "Confirmar",
  textoCancelar = "Cancelar",
}: PopupConfirmacaoProps) {

  if (!aberto) return null;

  const cores = {
    aviso: "bg-amber-50 border-amber-200",
    erro: "bg-red-50 border-red-200",
    info: "bg-blue-50 border-blue-200",
  };

  const coresBotao = {
    aviso: "bg-amber-600 hover:bg-amber-700",
    erro: "bg-red-600 hover:bg-red-700",
    info: "bg-blue-600 hover:bg-blue-700",
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[150] p-4">
      <div className={`bg-white rounded-xl shadow-2xl max-w-md w-full border ${cores[tipo]} overflow-hidden`}>
        <div className="flex justify-between items-center p-4 border-b border-zinc-200">
          <div className="flex items-center gap-3">
            <AlertTriangle size={24} className={
              tipo === "aviso" ? "text-amber-500" :
              tipo === "erro" ? "text-red-500" : "text-blue-500"
            } />
            <h3 className="text-lg font-bold text-zinc-900">{titulo}</h3>
          </div>
          <button onClick={onFechar} className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-lg">
            <X size={18} />
          </button>
        </div>

        <div className="p-6">
          <p className="text-zinc-600 text-sm whitespace-pre-line">{mensagem}</p>
        </div>

        {(onConfirmar || onCancelar) && (
          <div className="flex justify-end gap-3 p-4 bg-zinc-50 border-t border-zinc-200">
            {onCancelar && (
              <button
                onClick={onCancelar}
                disabled={confirmando}
                className="px-4 py-2 bg-white border border-zinc-300 text-zinc-700 rounded-lg text-sm font-medium hover:bg-zinc-50 disabled:opacity-50"
              >
                {textoCancelar}
              </button>
            )}
            {onConfirmar && (
              <button
                onClick={onConfirmar}
                disabled={confirmando}
                className={`px-4 py-2 text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2 ${coresBotao[tipo]}`}
              >
                {confirmando ? <Loader2 size={16} className="animate-spin" /> : null}
                {confirmando ? "Processando..." : textoConfirmar}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
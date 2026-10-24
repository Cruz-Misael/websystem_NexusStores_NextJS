"use client";

// components/ui/PinGerenteModal.tsx
// A conferência de gerente, uma só, para o caixa e para a troca.
//
// Existia só dentro do caixa. A troca precisava da mesma trava, e copiar o
// modal daria duas telas que pedem a mesma coisa e divergem na primeira
// correção. O PIN continua sendo conferido no servidor (validate_manager_pin):
// a lista de PINs nunca chega ao navegador.

import { ReactNode, useState } from "react";
import { AlertCircle, Loader2, Lock } from "lucide-react";
import { validarPinGerente } from "@/src/services/operator.service";
import { Estouro } from "@/src/lib/limite";

const money = (v: number) =>
  Number.isFinite(v)
    ? v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    : "—";

/**
 * A frase que explica o estouro, escrita uma vez só: o caixa e a troca pedem a
 * mesma autorização e precisam dizer a mesma coisa.
 */
export function ExplicacaoLimite({ estouro }: { estouro: Estouro }) {
  if (estouro.motivo === "desconhecido") {
    return (
      <p>
        Não foi possível conferir quanto este cliente já tem em aberto. Com o limite de{" "}
        <strong>{money(estouro.limite)}</strong> em jogo, a liberação precisa ser de um gerente.
      </p>
    );
  }

  if (estouro.motivo === "venda") {
    return (
      <p>
        Esta venda, de <strong>{money(estouro.exposicao)}</strong>, passa sozinha do limite de{" "}
        <strong>{money(estouro.limite)}</strong> deste cliente.
      </p>
    );
  }

  return (
    <p>
      O cliente ficaria com <strong>{money(estouro.exposicao)}</strong> em mercadoria em aberto
      {estouro.saldoAnterior > 0 && <> — {money(estouro.saldoAnterior)} já vêm de outras vendas</>}
      , acima do limite de <strong>{money(estouro.limite)}</strong>.
    </p>
  );
}

interface Props {
  /** Uma frase dizendo o que passou do permitido. */
  explicacao: ReactNode;
  /** Texto do botão: "Liberar venda", "Liberar troca"... */
  rotuloConfirmar: string;
  subtitulo: string;
  onAutorizado: () => void | Promise<void>;
  onCancelar: () => void;
}

export default function PinGerenteModal({
  explicacao,
  rotuloConfirmar,
  subtitulo,
  onAutorizado,
  onCancelar,
}: Props) {
  const [pin, setPin] = useState("");
  const [erro, setErro] = useState("");
  const [validando, setValidando] = useState(false);

  const confirmar = async () => {
    if (!pin.trim() || validando) return;
    setValidando(true);
    setErro("");
    try {
      if (await validarPinGerente(pin.trim())) {
        await onAutorizado();
      } else {
        setErro("PIN inválido ou operador não é gerente.");
      }
    } catch (e) {
      setErro(`Erro ao validar PIN: ${e instanceof Error ? e.message : e}`);
    } finally {
      setValidando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
      <div className="bg-white w-full max-w-sm rounded-xl shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-200 bg-red-50 flex items-center gap-3">
          <div className="w-9 h-9 bg-red-100 rounded-lg flex items-center justify-center">
            <Lock size={20} className="text-red-600" />
          </div>
          <div>
            <h2 className="text-base font-bold text-zinc-900">Autorização de Gerente</h2>
            <p className="text-xs text-zinc-500">{subtitulo}</p>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="text-sm text-zinc-600 space-y-1">
            {explicacao}
            <p>Digite o PIN de um operador com categoria <strong>Gerente</strong> para liberar.</p>
          </div>
          <div>
            <label className="text-xs font-bold text-zinc-500 uppercase mb-1 block">PIN do gerente</label>
            <input
              type="password"
              inputMode="numeric"
              placeholder="••••"
              value={pin}
              onChange={(e) => { setPin(e.target.value.replace(/\D/g, "").slice(0, 6)); setErro(""); }}
              onKeyDown={(e) => { if (e.key === "Enter") confirmar(); }}
              className="w-full h-11 px-3 text-center text-2xl tracking-[0.5em] font-bold border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              autoFocus
            />
            {erro && (
              <p className="mt-2 text-xs text-red-600 flex items-center gap-1">
                <AlertCircle size={12} /> {erro}
              </p>
            )}
          </div>
        </div>

        <div className="px-6 py-4 bg-zinc-50 border-t border-zinc-200 flex gap-3">
          <button
            onClick={onCancelar}
            className="flex-1 h-10 bg-white border border-zinc-300 text-zinc-700 rounded-lg text-sm font-medium hover:bg-zinc-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={confirmar}
            disabled={validando || !pin.trim()}
            className="flex-1 h-10 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {validando ? <Loader2 size={16} className="animate-spin" /> : null}
            {rotuloConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
}

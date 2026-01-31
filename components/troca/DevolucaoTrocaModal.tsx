"use client";

import { useEffect, useRef, useState } from "react";
import {
  Barcode,
  RotateCcw,
  Trash2,
  X,
  Info,
  CheckCircle2,
  ShoppingBag,
} from "lucide-react";

interface ItemVenda {
  id: number;
  nome: string;
  variante?: string;
  quantidade: number;
  precoUnitario: number;
  codigoBarras: string;
}

interface Venda {
  id: number;
  itens: ItemVenda[];
}

interface Props {
  venda: Venda;
  onClose: () => void;
  onConfirm: (payload: {
    vendaId: number;
    itens: {
      itemId: number;
      quantidade: number;
    }[];
  }) => void;
}

export default function DevolucaoTrocaModal({ venda, onClose, onConfirm }: Props) {
  const [barcode, setBarcode] = useState("");
  const [itensDevolvidos, setItensDevolvidos] = useState<Record<number, number>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleBarcode(code: string) {
    const item = venda.itens.find((i) => i.codigoBarras === code);
    if (!item) return;

    setItensDevolvidos((prev) => {
      const atual = prev[item.id] ?? 0;
      if (atual >= item.quantidade) return prev;
      return { ...prev, [item.id]: atual + 1 };
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && barcode.trim()) {
      handleBarcode(barcode.trim());
      setBarcode("");
    }
  }

  function removerItem(itemId: number) {
    setItensDevolvidos((prev) => {
      const novo = { ...prev };
      delete novo[itemId];
      return novo;
    });
  }

  /* =======================
     CÁLCULOS FINANCEIROS
     ======================= */
  const valorTotalCompra = venda.itens.reduce(
    (total, item) => total + item.quantidade * item.precoUnitario,
    0
  );

  const valorTotalRemovido = venda.itens.reduce((total, item) => {
    const qtd = itensDevolvidos[item.id] ?? 0;
    return total + qtd * item.precoUnitario;
  }, 0);

  const quantidadeRemovida = Object.values(itensDevolvidos).reduce(
    (total, qtd) => total + qtd,
    0
  );

  const valorBaseFinal = valorTotalCompra - valorTotalRemovido;
  const valorJuros = valorBaseFinal * 0.3;
  const valorFinalComJuros = valorBaseFinal + valorJuros;

  return (
    <div className="fixed inset-0 bg-zinc-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white w-full max-w-5xl h-[85vh] rounded-2xl shadow-2xl flex overflow-hidden border border-zinc-200">
        
        {/* COLUNA ESQUERDA: OPERAÇÃO */}
        <div className="flex-[2] flex flex-col min-w-0 bg-white border-r border-zinc-100">
          
          {/* Header Padronizado */}
          <div className="px-6 py-5 border-b border-zinc-100 flex justify-between items-center shrink-0">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <RotateCcw size={22} className="text-indigo-600" strokeWidth={2.5} />
                <h2 className="text-xl font-extrabold text-zinc-900 tracking-tight leading-none">
                  Devolução & Troca
                </h2>
              </div>
              <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider ml-7">
                Venda #{venda.id} • Ajuste de Acerto e Devolução
              </p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-full text-zinc-400 transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Campo Leitor Moderno */}
          <div className="p-6 shrink-0">
            <div className="relative group">
              <Barcode className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
              <input
                ref={inputRef}
                type="text"
                placeholder="Bipar código de barras ou SKU..."
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl pl-12 pr-4 py-4 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
              />
            </div>
          </div>

          {/* Lista de Itens */}
          <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-3 min-h-0">
            {venda.itens.map((item) => {
              const qtdDevolvida = itensDevolvidos[item.id] ?? 0;
              const isSelected = qtdDevolvida > 0;

              return (
                <div
                  key={item.id}
                  className={`relative border-2 rounded-xl p-4 flex justify-between items-center transition-all ${
                    isSelected 
                      ? "border-indigo-600 bg-indigo-50/30 shadow-sm" 
                      : "border-zinc-100 bg-white hover:border-zinc-200"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${isSelected ? 'bg-indigo-600 text-white' : 'bg-zinc-100 text-zinc-400'}`}>
                      <ShoppingBag size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-zinc-900 text-sm uppercase">{item.nome}</p>
                      <p className="text-[10px] font-bold text-zinc-400 tracking-widest">{item.codigoBarras}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-zinc-500">Qtd Original: <b>{item.quantidade}</b></span>
                        <span className="w-1 h-1 bg-zinc-300 rounded-full"></span>
                        <span className={`text-xs ${isSelected ? 'text-indigo-600 font-bold' : 'text-zinc-500'}`}>
                          Devolvendo: {qtdDevolvida}
                        </span>
                      </div>
                    </div>
                  </div>

                  {isSelected && (
                    <button
                      onClick={() => removerItem(item.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase text-red-500 hover:bg-red-50 rounded-md transition-colors"
                    >
                      <Trash2 size={14} /> Remover
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* COLUNA DIREITA: RESUMO FINANCEIRO */}
        <div className="w-[380px] bg-zinc-50 p-8 flex flex-col">
          <h3 className="text-[11px] font-black uppercase text-zinc-400 mb-6 tracking-widest">
            Resumo do Acerto
          </h3>

          <div className="flex-1 overflow-y-auto min-h-0 space-y-4">
            <div className="space-y-3 text-sm border-b border-zinc-200 pb-6">
              <div className="flex justify-between text-zinc-500">
                <span>Total da compra</span>
                <span className="font-mono">R$ {valorTotalCompra.toFixed(2)}</span>
              </div>

              <div className="flex justify-between text-red-600 font-medium">
                <span>Devolução ({quantidadeRemovida} un)</span>
                <span className="font-mono">- R$ {valorTotalRemovido.toFixed(2)}</span>
              </div>

              <div className="flex justify-between text-zinc-900 font-bold pt-2 border-t border-zinc-100">
                <span>Valor Base</span>
                <span className="font-mono text-lg">R$ {valorBaseFinal.toFixed(2)}</span>
              </div>

              <div className="flex justify-between text-orange-600 font-medium italic">
                <span>Ajuste de Prazo (30%)</span>
                <span className="font-mono">+ R$ {valorJuros.toFixed(2)}</span>
              </div>
            </div>

            <div className="pt-2">
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-wider mb-1">Total Final a Pagar</p>
              <div className="text-4xl font-black text-zinc-900 tracking-tighter font-mono">
                R$ {valorFinalComJuros.toFixed(2)}
              </div>
            </div>

            <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl flex gap-3 shadow-sm">
              <Info className="text-orange-600 shrink-0" size={18} />
              <p className="text-[11px] text-orange-800 leading-relaxed">
                Este valor inclui a <b>taxa de 30%</b> referente ao período de permanência dos produtos.
              </p>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-zinc-200 space-y-3">
            <button
              onClick={() =>
                onConfirm({
                  vendaId: venda.id,
                  itens: Object.entries(itensDevolvidos).map(([itemId, quantidade]) => ({
                    itemId: Number(itemId),
                    quantidade,
                  })),
                })
              }
              disabled={quantidadeRemovida === 0}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-zinc-300 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 uppercase tracking-widest text-xs transition-all shadow-lg shadow-indigo-100"
            >
              <CheckCircle2 size={18} /> Confirmar Acerto
            </button>

            <button
              onClick={onClose}
              className="w-full text-[10px] font-black uppercase text-zinc-400 hover:text-zinc-600 transition-colors tracking-widest"
            >
              Cancelar Operação
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
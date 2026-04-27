// DevolucaoTrocaModal.tsx
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
  PlusCircle,
  ArrowRight
} from "lucide-react";
import { buscarProdutoPorBarcodeOuSKU } from "@/src/services/product.service";

interface ItemVenda {
  id: number;
  nome: string;
  variante?: string;
  quantidade: number;
  precoUnitario: number;
  codigoBarras: string;
}

interface NovoItem {
  sku: number;
  nome: string;
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
    itensAdicionados?: {
      sku: number;
      quantidade: number;
    }[];
    motivo: string;
    tipo: 'devolucao' | 'troca';
    valorFinal?: number;
  }) => void;
  isConsignado?: boolean;
}

export default function DevolucaoTrocaModal({ venda, onClose, onConfirm, isConsignado = false }: Props) {
  const [itensDevolvidos, setItensDevolvidos] = useState<Record<number, number>>({});
  const [itensNovos, setItensNovos] = useState<NovoItem[]>([]);
  const [motivo, setMotivo] = useState("");
  const [barcodeDevolucao, setBarcodeDevolucao] = useState("");
  const [barcodeAdicao, setBarcodeAdicao] = useState("");
  const [mensagemErro, setMensagemErro] = useState("");
  const [mensagemSucesso, setMensagemSucesso] = useState("");
  const inputDevolucaoRef = useRef<HTMLInputElement>(null);
  const inputAdicaoRef = useRef<HTMLInputElement>(null);

  // Log para debug
  useEffect(() => {
    console.log("📦 Venda recebida no modal:", venda);
    console.log("📦 Itens da venda:", venda?.itens);
  }, [venda]);

  useEffect(() => {
    inputDevolucaoRef.current?.focus();
  }, []);

  // Limpar mensagens após 3 segundos
  useEffect(() => {
    if (mensagemErro) {
      const timer = setTimeout(() => setMensagemErro(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [mensagemErro]);

  useEffect(() => {
    if (mensagemSucesso) {
      const timer = setTimeout(() => setMensagemSucesso(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [mensagemSucesso]);

  async function handleBipDevolucao(code: string) {
    if (!venda || !venda.itens) return;
    const codigoLimpo = code.trim();
    if (!codigoLimpo) return;

    const itemExistente = venda.itens.find(i =>
      i.codigoBarras?.toString().toLowerCase() === codigoLimpo.toLowerCase()
    );

    if (itemExistente) {
      setItensDevolvidos((prev) => {
        const atual = prev[itemExistente.id] ?? 0;
        if (atual >= itemExistente.quantidade) {
          setMensagemErro(`Venda original só possui ${itemExistente.quantidade} un de ${itemExistente.nome}`);
          return prev;
        }
        setMensagemSucesso(`${itemExistente.nome} marcado para devolução`);
        setBarcodeDevolucao("");
        return { ...prev, [itemExistente.id]: atual + 1 };
      });
    } else {
      setMensagemErro("Só é permitido devolução de itens que constam nesta venda.");
      setBarcodeDevolucao("");
    }
  }

  async function handleBipAdicao(code: string) {
    const codigoLimpo = code.trim();
    if (!codigoLimpo) return;

    try {
      const produtoNoBanco = await buscarProdutoPorBarcodeOuSKU(codigoLimpo);

      if (produtoNoBanco) {
        setItensNovos(prev => {
          const index = prev.findIndex(p => p.sku === produtoNoBanco.sku);
          if (index >= 0) {
            const novos = [...prev];
            novos[index].quantidade += 1;
            return novos;
          }
          return [...prev, {
            sku: produtoNoBanco.sku,
            nome: produtoNoBanco.name,
            quantidade: 1,
            precoUnitario: produtoNoBanco.price,
            codigoBarras: produtoNoBanco.barcode || produtoNoBanco.sku.toString()
          }];
        });
        setMensagemSucesso(`${produtoNoBanco.name} adicionado à troca.`);
        setBarcodeAdicao("");
      } else {
        setMensagemErro("Produto não encontrado no cadastro.");
        setBarcodeAdicao("");
      }
    } catch (err) {
      setMensagemErro("Erro ao buscar produto.");
    }
  }

  function handleRemoverUnidade(itemId: number) {
    setItensDevolvidos((prev) => {
      const novo = { ...prev };
      if (novo[itemId] > 1) {
        novo[itemId] -= 1;
      } else {
        delete novo[itemId];
      }
      return novo;
    });
  }

  function removerItem(itemId: number) {
    setItensDevolvidos((prev) => {
      const novo = { ...prev };
      delete novo[itemId];

      // Encontrar o nome do item para mensagem
      const item = venda.itens?.find(i => i.id === itemId);
      if (item) {
        setMensagemSucesso(`${item.nome} removido da devolução`);
      }

      return novo;
    });
  }

  /* =======================
     CÁLCULOS FINANCEIROS
     ======================= */
  const valorTotalCompra = venda?.itens?.reduce(
    (total, item) => total + item.quantidade * item.precoUnitario,
    0
  ) || 0;

  const valorTotalRemovido = venda?.itens?.reduce((total, item) => {
    const qtd = itensDevolvidos[item.id] ?? 0;
    return total + qtd * item.precoUnitario;
  }, 0) || 0;

  const quantidadeRemovida = Object.values(itensDevolvidos).reduce(
    (total, qtd) => total + qtd,
    0
  );

  const valorAdicionado = itensNovos.reduce(
    (total, item) => total + item.quantidade * item.precoUnitario,
    0
  );

  const valorBaseFinal = valorTotalCompra - valorTotalRemovido + valorAdicionado;
  const valorJuros = isConsignado ? (valorBaseFinal * 0.3) : 0;
  const valorFinalComJuros = valorBaseFinal + valorJuros;

  const handleConfirm = () => {
    if (quantidadeRemovida === 0 && itensNovos.length === 0) {
      alert("Selecione pelo menos uma peça para devolver ou adicionar na troca");
      return;
    }

    onConfirm({
      vendaId: venda.id,
      itens: Object.entries(itensDevolvidos).map(([itemId, quantidade]) => ({
        itemId: Number(itemId),
        quantidade,
      })),
      itensAdicionados: itensNovos.map(i => ({
        sku: i.sku,
        quantidade: i.quantidade
      })),
      motivo: "Ajuste manual de troca/devolução",
      tipo: isConsignado ? 'devolucao' : (itensNovos.length > 0 ? 'troca' : 'devolucao'),
      valorFinal: isConsignado ? valorFinalComJuros : valorBaseFinal
    });
  };

  // Se não houver itens, mostrar mensagem de erro
  if (!venda || !venda.itens || venda.itens.length === 0) {
    return (
      <div className="fixed inset-0 bg-zinc-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
        <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6">
          <div className="text-center">
            <Info size={48} className="text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-zinc-900 mb-2">Erro ao carregar venda</h3>
            <p className="text-sm text-zinc-600 mb-4">
              Não foi possível carregar os itens desta venda.
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold"
            >
              FECHAR
            </button>
          </div>
        </div>
      </div>
    );
  }

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
                Venda #{venda.id} • {venda.itens.length} {venda.itens.length === 1 ? 'item' : 'itens'}
              </p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-full text-zinc-400 transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* SEÇÃO 1: DEVOLUÇÃO (O QUE VOLTA) */}
          <div className="p-6 bg-amber-50/20 border-b border-amber-100/50 shrink-0">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-md bg-amber-600 flex items-center justify-center text-white font-bold text-[10px]">1</div>
              <span className="text-[10px] font-black uppercase text-amber-700 tracking-widest">O que o cliente está DEVOLVENDO?</span>
            </div>
            <div className="relative group">
              <RotateCcw className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-600/50" size={18} />
              <input
                ref={inputDevolucaoRef}
                type="text"
                placeholder="Bipe aqui o código do produto que está VOLTANDO..."
                value={barcodeDevolucao}
                onChange={(e) => setBarcodeDevolucao(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleBipDevolucao(barcodeDevolucao)}
                className="w-full bg-white border border-amber-200 rounded-xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all font-mono"
              />
            </div>
          </div>

          {/* SEÇÃO 2: ACRÉSCIMO (O QUE O CLIENTE LEVA) */}
          {!isConsignado && (
            <div className="p-6 bg-emerald-50/20 border-b border-emerald-100/50 shrink-0">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-md bg-emerald-600 flex items-center justify-center text-white font-bold text-[10px]">2</div>
                <span className="text-[10px] font-black uppercase text-emerald-700 tracking-widest">O que o cliente está LEVANDO (Acrescentando)?</span>
              </div>
              <div className="relative group">
                <PlusCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600/50" size={18} />
                <input
                  ref={inputAdicaoRef}
                  type="text"
                  placeholder="Bipe aqui o código do NOVO produto..."
                  value={barcodeAdicao}
                  onChange={(e) => setBarcodeAdicao(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleBipAdicao(barcodeAdicao)}
                  className="w-full bg-white border border-emerald-200 rounded-xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-mono"
                />
              </div>
            </div>
          )}

          <div className="px-6 py-2 flex flex-col gap-1">
            {/* Mensagens de feedback compactas */}
            {mensagemErro && (
              <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-[10px] text-red-600 flex items-center gap-2">
                <X size={12} className="shrink-0" />
                {mensagemErro}
              </div>
            )}
            {mensagemSucesso && (
              <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-[10px] text-emerald-600 flex items-center gap-2">
                <CheckCircle2 size={12} className="shrink-0" />
                {mensagemSucesso}
              </div>
            )}
          </div>

          {/* Camada de Spacer */}
          <div className="h-4" />

          {/* LISTA DE ITENS DA VENDA (DEVOLUÇÃO) */}
          <div className="flex-1 overflow-y-auto px-6 pb-2 space-y-3 min-h-0">
            <div className="flex items-center gap-2 mb-2">
              <RotateCcw size={14} className="text-zinc-400" />
              <span className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Itens da Venda Original</span>
            </div>
            {venda.itens.filter(item => item.quantidade > 0).map((item) => {
              const qtdDevolvida = itensDevolvidos[item.id] ?? 0;
              const isSelected = qtdDevolvida > 0;

              return (
                <div
                  key={item.id}
                  className={`relative border-2 rounded-xl p-3 flex justify-between items-center transition-all ${isSelected
                    ? "border-amber-600 bg-amber-50/30"
                    : "border-zinc-100 bg-white hover:border-zinc-200"
                    }`}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isSelected ? 'bg-amber-600 text-white' : 'bg-zinc-100 text-zinc-400'}`}>
                      <ShoppingBag size={18} />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-zinc-900 text-[13px] uppercase">{item.nome}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-mono bg-zinc-100 px-1.5 py-0.5 rounded">
                          {item.codigoBarras}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-bold">
                          R$ {item.precoUnitario.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                  {isSelected && (
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[10px] font-black text-amber-600 uppercase">Devolvendo: {qtdDevolvida}</span>
                      <button onClick={() => removerItem(item.id)} className="text-[9px] text-red-500 font-bold hover:underline">Remover</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* LISTA DE NOVOS ITENS (PARA TROCA) */}
          {itensNovos.length > 0 && (
            <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-3 min-h-0 border-t border-zinc-100 pt-4 bg-emerald-50/10">
              <div className="flex items-center gap-2 mb-2">
                <PlusCircle size={14} className="text-emerald-500" />
                <span className="text-[10px] font-black uppercase text-emerald-600 tracking-widest">Novos Itens Adicionados</span>
              </div>
              {itensNovos.map((item) => (
                <div
                  key={item.sku}
                  className="relative border-2 border-emerald-500 bg-emerald-50/30 rounded-xl p-3 flex justify-between items-center transition-all"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                      <PlusCircle size={18} />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-emerald-900 text-[13px] uppercase">{item.nome}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-mono bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">
                          {item.codigoBarras}
                        </span>
                        <span className="text-[10px] text-emerald-700 font-bold">
                          R$ {item.precoUnitario.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[10px] font-black text-emerald-600 uppercase">Levando: {item.quantidade}</span>
                    <button onClick={() => removerItem(item.sku)} className="text-[9px] text-red-500 font-bold hover:underline">Remover</button>
                  </div>
                </div>
              ))}
            </div>
          )}
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
                <span>Devolução ({quantidadeRemovida} {quantidadeRemovida === 1 ? 'item' : 'itens'})</span>
                <span className="font-mono">- R$ {valorTotalRemovido.toFixed(2)}</span>
              </div>

              <div className="flex justify-between text-emerald-600 font-medium">
                <span>Novos itens</span>
                <span className="font-mono">+ R$ {valorAdicionado.toFixed(2)}</span>
              </div>

              <div className="flex justify-between text-zinc-900 font-bold pt-2 border-t border-zinc-100">
                <span>{isConsignado ? 'Subtotal (Produtos)' : 'Saldo da Troca'}</span>
                <span className="font-mono text-lg">R$ {valorBaseFinal.toFixed(2)}</span>
              </div>

              {isConsignado && (
                <div className="flex justify-between text-orange-600 font-medium italic">
                  <span>Ajuste de Prazo (30%)</span>
                  <span className="font-mono">+ R$ {valorJuros.toFixed(2)}</span>
                </div>
              )}
            </div>

            <div className="pt-2">
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-wider mb-1">Total Final a Pagar</p>
              <div className="text-4xl font-black text-zinc-900 tracking-tighter font-mono">
                R$ {valorFinalComJuros.toFixed(2)}
              </div>
            </div>

            {isConsignado && (
              <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl flex gap-3 shadow-sm">
                <Info className="text-orange-600 shrink-0" size={18} />
                <p className="text-[11px] text-orange-800 leading-relaxed">
                  Este valor inclui a <b>taxa de 30%</b> referente ao período de permanência dos produtos.
                </p>
              </div>
            )}
          </div>

          <div className="mt-6 pt-6 border-t border-zinc-200 space-y-3">
            <button
              onClick={handleConfirm}
              disabled={isConsignado ? false : (quantidadeRemovida === 0 && itensNovos.length === 0)}
              className={`w-full text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 uppercase tracking-widest text-xs transition-all shadow-lg shadow-indigo-100 disabled:cursor-not-allowed ${isConsignado ? 'bg-orange-600 hover:bg-orange-700' : 'bg-indigo-600 hover:bg-indigo-700 disabled:bg-zinc-300'
                }`}
            >
              <CheckCircle2 size={18} />
              {isConsignado ? 'Finalizar Acerto' : 'Confirmar Devolução / Troca'}
            </button>

            <button
              onClick={onClose}
              className="w-full text-[10px] font-black uppercase text-zinc-400 hover:text-zinc-600 transition-colors tracking-widest py-2"
            >
              Cancelar Operação
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
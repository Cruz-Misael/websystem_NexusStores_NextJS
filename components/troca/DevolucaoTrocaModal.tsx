// DevolucaoTrocaModal.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import {
  Barcode,
  RotateCcw,
  X,
  Info,
  ShoppingBag,
  PlusCircle,
  Plus,
  Minus,
  Briefcase,
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
  customer?: { id: number; name: string };
  itens: ItemVenda[];
}

interface Props {
  venda: Venda;
  onClose: () => void;
  onConfirm: (payload: {
    vendaId: number;
    itens: { itemId: number; quantidade: number; }[];
    itensAdicionados?: { sku: number; quantidade: number; }[];
    motivo: string;
    tipo: 'devolucao' | 'troca';
    valorFinal?: number;
    percentualLucro?: number;
    valorNetAnteComissao?: number;
  }) => void;
  isConsignado?: boolean;
}

export default function DevolucaoTrocaModal({ venda, onClose, onConfirm, isConsignado = false }: Props) {
  const [itensDevolvidos, setItensDevolvidos] = useState<Record<number, number>>({});
  const [itensNovos, setItensNovos] = useState<NovoItem[]>([]);
  const [motivo, setMotivo] = useState("");
  const [barcodeDevolucao, setBarcodeDevolucao] = useState("");
  const [barcodeAdicao, setBarcodeAdicao] = useState("");
  const [percentualLucro, setPercentualLucro] = useState<string>("30");
  const [mensagemErro, setMensagemErro] = useState("");
  const [mensagemSucesso, setMensagemSucesso] = useState("");
  const lockBip = useRef(false);
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
    if (!venda || !venda.itens || lockBip.current) return;
    const codigoLimpo = code.trim();
    if (!codigoLimpo) return;

    lockBip.current = true;
    setBarcodeDevolucao(""); 

    const itemExistente = venda.itens.find(i =>
      i.codigoBarras?.toString().toLowerCase() === codigoLimpo.toLowerCase()
    );

    if (itemExistente) {
      setItensDevolvidos((prev) => {
        const atual = prev[itemExistente.id] ?? 0;
        if (atual >= itemExistente.quantidade) {
          setMensagemErro(`Limite atingido (${itemExistente.quantidade} un)`);
          return prev;
        }
        setMensagemSucesso(`${itemExistente.nome} marcado`);
        return { ...prev, [itemExistente.id]: atual + 1 };
      });
    } else {
      setMensagemErro("Item não consta nesta venda.");
    }
    
    setTimeout(() => { lockBip.current = false; }, 400);
  }

  async function handleBipAdicao(code: string) {
    if (lockBip.current) return;
    const codigoLimpo = code.trim();
    if (!codigoLimpo) return;

    lockBip.current = true;
    setBarcodeAdicao("");

    try {
      const produtoNoBanco = await buscarProdutoPorBarcodeOuSKU(codigoLimpo);

      if (produtoNoBanco) {
        setItensNovos(prev => {
          const index = prev.findIndex(p => p.sku === produtoNoBanco.sku);
          if (index >= 0) {
            const novos = [...prev];
            novos[index] = { ...novos[index], quantidade: novos[index].quantidade + 1 };
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
        setMensagemSucesso(`${produtoNoBanco.name} adicionado.`);
      } else {
        setMensagemErro("Produto não encontrado.");
      }
    } catch (err) {
      setMensagemErro("Erro na busca.");
    } finally {
      setTimeout(() => { lockBip.current = false; }, 400);
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

  function handleAdicionarUnidade(itemId: number) {
    const item = venda.itens.find(i => i.id === itemId);
    if (!item) return;

    setItensDevolvidos((prev) => {
      const atual = prev[itemId] ?? 0;
      if (atual >= item.quantidade) {
        setMensagemErro(`Limite da venda atingido (${item.quantidade} un)`);
        return prev;
      }
      return { ...prev, [itemId]: atual + 1 };
    });
  }

  function handleRemoverNovoItem(sku: number) {
    setItensNovos(prev => {
      const index = prev.findIndex(p => p.sku === sku);
      if (index === -1) return prev;

      const novos = [...prev];
      if (novos[index].quantidade > 1) {
        novos[index] = { ...novos[index], quantidade: novos[index].quantidade - 1 };
        return novos;
      }
      return novos.filter(p => p.sku !== sku);
    });
  }

  function handleAdicionarNovoItem(sku: number) {
    setItensNovos(prev => {
      const index = prev.findIndex(p => p.sku === sku);
      if (index === -1) return prev;

      const novos = [...prev];
      novos[index] = { ...novos[index], quantidade: novos[index].quantidade + 1 };
      return novos;
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

  // Saldo que o cliente deve antes de aplicar o desconto de lucro
  const saldoDevedor = valorTotalCompra - valorTotalRemovido + valorAdicionado;

  const pctLucro = Math.min(100, Math.max(0, parseFloat(percentualLucro) || 0));
  const valorDescontoLucro = isConsignado ? saldoDevedor * (pctLucro / 100) : 0;
  const valorFinalConsignado = saldoDevedor - valorDescontoLucro;

  // Alias para manter compatibilidade com o restante do código (troca/devolução normal)
  const valorBaseFinal = saldoDevedor;

  const handleConfirm = () => {
    if (!isConsignado && quantidadeRemovida === 0 && itensNovos.length === 0) {
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
      valorFinal: isConsignado ? valorFinalConsignado : valorBaseFinal,
      percentualLucro: isConsignado ? pctLucro : undefined,
      valorNetAnteComissao: isConsignado ? saldoDevedor : undefined,
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
    <div className="fixed inset-0 bg-zinc-950/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-150">
      <div className={`bg-white w-full ${isConsignado ? 'max-w-4xl' : 'max-w-5xl'} h-[84vh] rounded-xl shadow-2xl flex overflow-hidden border border-zinc-200`}>

        {/* Painel esquerdo: itens */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-zinc-100">

          {/* Header */}
          <div className="px-5 py-4 flex items-center justify-between border-b border-zinc-100">
            <div className="flex items-center gap-2.5">
              {isConsignado
                ? <Briefcase size={16} className="text-zinc-500" />
                : <RotateCcw size={16} className="text-zinc-500" />}
              <div>
                <h2 className="text-sm font-bold text-zinc-900">
                  {isConsignado ? 'Fechamento de Consignado' : 'Troca / Devolução'}
                </h2>
                <p className="text-[11px] text-zinc-400">
                  Venda <span className="font-semibold text-indigo-600">#{venda.id}</span>
                  {venda.customer?.name ? ` · ${venda.customer.name}` : ''}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center hover:bg-zinc-100 rounded-lg transition-colors text-zinc-400">
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 flex overflow-hidden">

            {/* Coluna: devolução */}
            <div className="flex-1 flex flex-col">
              <div className="px-4 pt-4 pb-2">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest">
                    {isConsignado ? 'Peças devolvidas' : 'Entrada no estoque'}
                  </span>
                  {quantidadeRemovida > 0 && (
                    <span className="text-[11px] font-bold text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded">
                      {quantidadeRemovida} un.
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={15} />
                  <input
                    ref={inputDevolucaoRef}
                    type="text"
                    placeholder="Bipar código..."
                    value={barcodeDevolucao}
                    onChange={(e) => setBarcodeDevolucao(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); handleBipDevolucao(barcodeDevolucao); }
                    }}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 outline-none font-mono placeholder:text-zinc-400 transition-all"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-1.5 pt-1">
                {venda.itens.filter(i => i.quantidade > 0).map(item => {
                  const qtdDevolvida = itensDevolvidos[item.id] ?? 0;
                  const isSelected = qtdDevolvida > 0;
                  return (
                    <div
                      key={item.id}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all ${
                        isSelected
                          ? 'border-zinc-300 bg-zinc-50'
                          : 'border-zinc-100 opacity-50 hover:opacity-80'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-zinc-800 truncate">{item.nome}</p>
                        <p className="text-[10px] text-zinc-400 font-mono">
                          {item.codigoBarras || item.id} · {item.quantidade} unid. · R$ {item.precoUnitario.toFixed(2)}
                        </p>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button
                          onClick={() => handleRemoverUnidade(item.id)}
                          className="w-6 h-6 flex items-center justify-center hover:bg-zinc-200 text-zinc-500 rounded transition-colors"
                        >
                          <Minus size={12} />
                        </button>
                        <span className={`w-7 text-center text-sm font-bold ${isSelected ? 'text-zinc-900' : 'text-zinc-300'}`}>
                          {qtdDevolvida}
                        </span>
                        <button
                          onClick={() => handleAdicionarUnidade(item.id)}
                          className="w-6 h-6 flex items-center justify-center hover:bg-zinc-200 text-zinc-500 rounded transition-colors"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Coluna: novos itens (troca, não consignado) */}
            {!isConsignado && (
              <div className="flex-1 flex flex-col border-l border-zinc-100">
                <div className="px-4 pt-4 pb-2">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest">Saída da loja</span>
                    {itensNovos.length > 0 && (
                      <span className="text-[11px] font-bold text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded">
                        {itensNovos.length} item(ns)
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <PlusCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={15} />
                    <input
                      ref={inputAdicaoRef}
                      type="text"
                      placeholder="Bipar nova peça..."
                      value={barcodeAdicao}
                      onChange={(e) => setBarcodeAdicao(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); handleBipAdicao(barcodeAdicao); }
                      }}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 outline-none font-mono placeholder:text-zinc-400 transition-all"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-1.5 pt-1">
                  {itensNovos.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-300">
                      <ShoppingBag size={24} strokeWidth={1.5} className="mb-2" />
                      <p className="text-[11px] font-medium uppercase tracking-widest text-center">Bipe as peças<br/>para troca</p>
                    </div>
                  ) : (
                    itensNovos.map(item => (
                      <div key={item.sku} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-zinc-200 bg-zinc-50 transition-all">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-zinc-800 truncate">{item.nome}</p>
                          <p className="text-[10px] text-zinc-400 font-mono">SKU: {item.sku} · R$ {item.precoUnitario.toFixed(2)}</p>
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0">
                          <button onClick={() => handleRemoverNovoItem(item.sku)} className="w-6 h-6 flex items-center justify-center hover:bg-zinc-200 text-zinc-500 rounded transition-colors">
                            <Minus size={12} />
                          </button>
                          <span className="w-7 text-center text-sm font-bold text-zinc-900">{item.quantidade}</span>
                          <button onClick={() => handleAdicionarNovoItem(item.sku)} className="w-6 h-6 flex items-center justify-center hover:bg-zinc-200 text-zinc-500 rounded transition-colors">
                            <Plus size={12} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Alertas */}
          <div className="h-9 px-4 flex items-center gap-2 border-t border-zinc-50">
            {mensagemErro && <span className="text-[11px] text-red-500">{mensagemErro}</span>}
            {mensagemSucesso && <span className="text-[11px] text-emerald-600">{mensagemSucesso}</span>}
          </div>
        </div>

        {/* Painel direito: resumo */}
        <div className="w-64 flex flex-col bg-zinc-50 border-l border-zinc-100">
          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Resumo</p>

            {/* Tabela de peças — consignado */}
            {isConsignado && (
              <div className="rounded-lg border border-zinc-200 overflow-hidden bg-white">
                <div className="grid grid-cols-[1fr_28px_28px_28px] text-[10px] font-bold uppercase tracking-wider text-zinc-400 bg-zinc-50 px-3 py-2 gap-1 border-b border-zinc-100">
                  <span>Produto</span>
                  <span className="text-center">↑</span>
                  <span className="text-center">↩</span>
                  <span className="text-center">✓</span>
                </div>
                {venda.itens.filter(i => i.quantidade > 0).map(item => {
                  const dev = itensDevolvidos[item.id] ?? 0;
                  const fica = item.quantidade - dev;
                  return (
                    <div key={item.id} className="grid grid-cols-[1fr_28px_28px_28px] items-center px-3 py-2 gap-1 border-b border-zinc-50 last:border-0 text-xs">
                      <span className="text-zinc-700 truncate">{item.nome}</span>
                      <span className="text-center text-zinc-400">{item.quantidade}</span>
                      <span className={`text-center font-semibold ${dev > 0 ? 'text-zinc-700' : 'text-zinc-300'}`}>{dev}</span>
                      <span className={`text-center font-semibold ${fica > 0 ? 'text-indigo-600' : 'text-zinc-300'}`}>{fica}</span>
                    </div>
                  );
                })}
                <div className="grid grid-cols-[1fr_28px_28px_28px] items-center px-3 py-2 gap-1 bg-zinc-50 text-[11px] font-bold text-zinc-500 border-t border-zinc-100">
                  <span>Total</span>
                  <span className="text-center">{venda.itens.reduce((s, i) => s + i.quantidade, 0)}</span>
                  <span className="text-center text-zinc-700">{quantidadeRemovida}</span>
                  <span className="text-center text-indigo-600">
                    {venda.itens.reduce((s, i) => s + i.quantidade - (itensDevolvidos[i.id] ?? 0), 0)}
                  </span>
                </div>
              </div>
            )}

            {/* Breakdown financeiro */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-zinc-500">
                <span>Valor consignado</span>
                <span>R$ {valorTotalCompra.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs text-zinc-500">
                <span>(−) Devolvidos</span>
                <span>R$ {valorTotalRemovido.toFixed(2)}</span>
              </div>
              {!isConsignado && valorAdicionado > 0 && (
                <div className="flex justify-between text-xs text-zinc-500">
                  <span>(+) Acrescentados</span>
                  <span>R$ {valorAdicionado.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-xs font-semibold text-zinc-800 pt-2 border-t border-zinc-200">
                <span>Saldo</span>
                <span>R$ {saldoDevedor.toFixed(2)}</span>
              </div>

              {/* % desconto — consignado */}
              {isConsignado && (
                <>
                  <div className="pt-1">
                    <label className="text-[10px] text-zinc-400 font-semibold uppercase tracking-widest block mb-1.5">
                      Desconto de lucro
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={1}
                        value={percentualLucro}
                        onChange={(e) => setPercentualLucro(e.target.value)}
                        className="flex-1 bg-white border border-zinc-200 rounded-lg px-3 py-2 text-sm font-semibold text-zinc-800 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 outline-none transition-all text-center"
                        placeholder="0"
                      />
                      <span className="text-sm font-semibold text-zinc-400 shrink-0">%</span>
                    </div>
                  </div>
                  {pctLucro > 0 && (
                    <div className="flex justify-between text-xs text-zinc-500">
                      <span>(−) Desconto {pctLucro}%</span>
                      <span>R$ {valorDescontoLucro.toFixed(2)}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Total e ação */}
          <div className="px-5 pb-5 pt-3 border-t border-zinc-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Cobrado</span>
              <span className="text-xl font-black text-zinc-900">
                R$ {(isConsignado ? valorFinalConsignado : valorBaseFinal).toFixed(2)}
              </span>
            </div>

            <button
              onClick={handleConfirm}
              disabled={isConsignado ? false : (quantidadeRemovida === 0 && itensNovos.length === 0)}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold uppercase tracking-widest transition-colors disabled:bg-zinc-100 disabled:text-zinc-400 disabled:cursor-not-allowed"
            >
              {isConsignado ? 'Confirmar Fechamento' : 'Confirmar Operação'}
            </button>

            <button
              onClick={onClose}
              className="w-full text-[11px] text-zinc-400 hover:text-zinc-600 transition-colors font-medium text-center"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
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
  ArrowRight,
  Plus,
  Minus,
  Briefcase,
  Zap,
  AlertCircle
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
    <div className="fixed inset-0 bg-zinc-950/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 lg:p-8 animate-in fade-in duration-200">
      <div className="bg-zinc-50 w-full max-w-6xl h-[88vh] rounded-[2rem] shadow-2xl flex overflow-hidden border border-white/20 relative">

        {/* Lado Esquerdo: Centro de Operações */}
        <div className="flex-1 flex flex-col min-w-0 bg-white shadow-xl z-20">

          {/* Header Minimalista Nexus */}
          <div className="px-8 py-6 flex justify-between items-center bg-white border-b border-zinc-100">
            <div>
              <h2 className="text-xl font-bold text-zinc-900 tracking-tight flex items-center gap-3">
                <div className={`p-2 rounded-xl ${isConsignado ? 'bg-violet-50 text-violet-600' : 'bg-indigo-50 text-indigo-600'}`}>
                  {isConsignado ? <Briefcase size={20} strokeWidth={2.5} /> : <RotateCcw size={20} strokeWidth={2.5} />}
                </div>
                {isConsignado ? 'Fechamento de Consignado' : 'Gestão de Troca e Devolução'}
              </h2>
              <p className="text-xs text-zinc-500 font-medium mt-1 ml-12">
                Venda <span className="font-bold text-indigo-600">#{venda.id}</span> • {venda.customer?.name || 'Cliente Geral'}
              </p>
            </div>
            <button onClick={onClose} className="w-10 h-10 flex items-center justify-center hover:bg-zinc-100 rounded-full transition-all text-zinc-400">
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 flex overflow-hidden">

            {/* Coluna 1: Devolução (O que volta) */}
            <div className="flex-1 flex flex-col border-r border-zinc-100 bg-zinc-50/50">
              <div className="p-6 pb-2">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-5 bg-amber-500 rounded-full" />
                    <h3 className="font-bold text-zinc-800 text-sm">Entrada no Estoque</h3>
                  </div>
                  <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-full border border-amber-100 text-center uppercase tracking-widest">
                    {quantidadeRemovida} devoluções
                  </span>
                </div>
                <div className="relative group">
                  <Barcode className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-amber-500 transition-colors" size={18} strokeWidth={2} />
                  <input
                    ref={inputDevolucaoRef}
                    type="text"
                    placeholder="Bipar devolução..."
                    value={barcodeDevolucao}
                    onChange={(e) => setBarcodeDevolucao(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        e.stopPropagation();
                        handleBipDevolucao(barcodeDevolucao);
                      }
                    }}
                    className="w-full bg-white border-2 border-zinc-100 rounded-2xl pl-12 pr-4 py-3 text-sm focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all outline-none font-mono placeholder:text-zinc-400 shadow-sm"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-3 pt-2">
                {venda.itens.filter(i => i.quantidade > 0).map(item => {
                  const qtdDevolvida = itensDevolvidos[item.id] ?? 0;
                  const isSelected = qtdDevolvida > 0;
                  return (
                    <div key={item.id} className={`group relative p-4 rounded-2xl border bg-white transition-all ${isSelected ? 'border-amber-200 shadow-md ring-4 ring-amber-50' : 'border-zinc-100 shadow-sm opacity-60 hover:opacity-100'}`}>
                      <div className="flex justify-between items-center">
                        <div>
                          <p className={`font-bold text-sm ${isSelected ? 'text-zinc-900' : 'text-zinc-600'}`}>{item.nome}</p>
                          <p className="text-[10px] text-zinc-400 font-mono mt-0.5">{item.codigoBarras || item.id}</p>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-bold ${isSelected ? 'text-amber-600' : 'text-zinc-900'}`}>R$ {item.precoUnitario.toFixed(2)}</p>
                        </div>
                      </div>

                      {isSelected && (
                        <div className="mt-4 pt-4 border-t border-zinc-100 flex items-center justify-between">
                          <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest bg-amber-50 px-2 py-1 rounded">Devolvendo</span>
                          <div className="flex items-center gap-1 bg-zinc-50 border border-zinc-200 rounded-lg p-1 shadow-inner">
                            <button onClick={() => handleRemoverUnidade(item.id)} className="w-7 h-7 flex items-center justify-center hover:bg-white text-zinc-600 rounded-md transition-colors shadow-sm">
                              <Minus size={14} strokeWidth={2.5} />
                            </button>
                            <span className="w-8 text-center font-bold text-sm text-zinc-800">{qtdDevolvida}</span>
                            <button onClick={() => handleAdicionarUnidade(item.id)} className="w-7 h-7 flex items-center justify-center hover:bg-white text-zinc-600 rounded-md transition-colors shadow-sm">
                              <Plus size={14} strokeWidth={2.5} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Coluna 2: Troca (O que entra) */}
            {!isConsignado && (
              <div className="flex-1 flex flex-col bg-zinc-50/50">
                <div className="p-6 pb-2">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-5 bg-emerald-500 rounded-full" />
                      <h3 className="font-bold text-zinc-800 text-sm">Saída da Loja</h3>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100 text-center uppercase tracking-widest">
                      {itensNovos.length} novos
                    </span>
                  </div>
                  <div className="relative group">
                    <PlusCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-emerald-500 transition-colors" size={18} strokeWidth={2} />
                    <input
                      ref={inputAdicaoRef}
                      type="text"
                      placeholder="Bipar nova peça..."
                      value={barcodeAdicao}
                      onChange={(e) => setBarcodeAdicao(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          e.stopPropagation();
                          handleBipAdicao(barcodeAdicao);
                        }
                      }}
                      className="w-full bg-white border-2 border-zinc-100 rounded-2xl pl-12 pr-4 py-3 text-sm focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none font-mono placeholder:text-zinc-400 shadow-sm"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-3 pt-2">
                  {itensNovos.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center opacity-40 px-8 text-center text-zinc-400">
                      <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mb-4">
                        <ShoppingBag size={28} strokeWidth={1.5} className="text-zinc-400" />
                      </div>
                      <p className="text-xs font-bold uppercase tracking-widest">Bipe as peças novas<br/>para a troca</p>
                    </div>
                  ) : (
                    itensNovos.map(item => (
                      <div key={item.sku} className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/30 shadow-md ring-4 ring-emerald-50 animate-in slide-in-from-right-2 duration-200">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-bold text-sm text-zinc-900">{item.nome}</p>
                            <p className="text-[10px] text-zinc-400 font-mono mt-0.5">SKU: {item.sku}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-emerald-600">R$ {item.precoUnitario.toFixed(2)}</p>
                          </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-emerald-100 flex items-center justify-between">
                          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-1 rounded">Levando</span>
                          <div className="flex items-center gap-1 bg-white border border-emerald-100 rounded-lg p-1 shadow-inner">
                            <button onClick={() => handleRemoverNovoItem(item.sku)} className="w-7 h-7 flex items-center justify-center hover:bg-zinc-50 text-emerald-600 rounded-md transition-colors shadow-sm">
                              <Minus size={14} strokeWidth={2.5} />
                            </button>
                            <span className="w-8 text-center font-bold text-sm text-zinc-900">{item.quantidade}</span>
                            <button onClick={() => handleAdicionarNovoItem(item.sku)} className="w-7 h-7 flex items-center justify-center hover:bg-zinc-50 text-emerald-600 rounded-md transition-colors shadow-sm">
                              <Plus size={14} strokeWidth={2.5} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Rodapé Alertas */}
          <div className="h-10 flex items-center justify-center gap-3">
            {mensagemErro && <span className="text-xs text-red-500">{mensagemErro}</span>}
            {mensagemSucesso && <span className="text-xs text-emerald-600">{mensagemSucesso}</span>}
          </div>
        </div>

        {/* Lado Direito: Resumo */}
        <div className="w-[320px] bg-white pt-6 pb-6 px-8 flex flex-col relative z-20 shadow-[-10px_0_30px_rgba(0,0,0,0.02)]">
          <div className="flex-1">
            <h3 className="text-sm font-bold uppercase tracking-widest mb-6 text-zinc-400">
              Resumo Final
            </h3>

            <div className="space-y-5">
              {/* Total devolvido */}
              <div>
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mb-1">Total Devolvido</p>
                <div className="text-zinc-800">
                  <span className="text-sm font-bold text-zinc-400">R$</span>
                  <span className="text-3xl font-black ml-1 tracking-tight">{valorTotalRemovido.toFixed(2)}</span>
                </div>
              </div>

              {/* Total acrescentado (apenas troca) */}
              {!isConsignado && (
                <div>
                  <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mb-1">Total Acrescentado</p>
                  <div className="text-zinc-800">
                    <span className="text-sm font-bold text-zinc-400">R$</span>
                    <span className="text-3xl font-black ml-1 tracking-tight">{valorAdicionado.toFixed(2)}</span>
                  </div>
                </div>
              )}

              {/* Breakdown detalhado */}
              <div className="pt-4 space-y-3 border-t border-zinc-100">
                <div className="flex justify-between text-xs text-zinc-500 font-medium">
                  <span>Valor Original</span>
                  <span>R$ {valorTotalCompra.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-zinc-500 font-medium">
                  <span>(-) Devolvidos</span>
                  <span className="text-amber-600">- R$ {valorTotalRemovido.toFixed(2)}</span>
                </div>
                {!isConsignado && valorAdicionado > 0 && (
                  <div className="flex justify-between text-xs text-zinc-500 font-medium">
                    <span>(+) Acrescentados</span>
                    <span className="text-emerald-600">+ R$ {valorAdicionado.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs font-bold text-zinc-800 pt-2 border-t border-zinc-100">
                  <span>Saldo do cliente</span>
                  <span className="font-mono">R$ {saldoDevedor.toFixed(2)}</span>
                </div>
              </div>

              {/* Campo dinâmico de % de desconto — apenas consignado */}
              {isConsignado && (
                <div className="pt-2 space-y-3">
                  <div>
                    <label className="text-[10px] text-violet-600 font-bold uppercase tracking-widest mb-2 block">
                      % Desconto de Lucro do Vendedor
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={1}
                        value={percentualLucro}
                        onChange={(e) => setPercentualLucro(e.target.value)}
                        className="w-full bg-violet-50 border-2 border-violet-200 rounded-xl px-4 py-2.5 text-sm font-bold text-violet-900 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 outline-none transition-all text-center"
                        placeholder="0"
                      />
                      <span className="text-xl font-black text-violet-500 shrink-0">%</span>
                    </div>
                  </div>
                  {pctLucro > 0 && (
                    <div className="flex justify-between text-xs text-violet-600 font-bold bg-violet-50 px-3 py-2 rounded-lg">
                      <span>(-) Desconto ({pctLucro}%)</span>
                      <span>- R$ {valorDescontoLucro.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Total Final */}
          <div className="mt-6 space-y-4">
            <div className={`rounded-2xl p-6 border ${isConsignado ? 'bg-violet-50 border-violet-200' : 'bg-zinc-50 border-zinc-100'}`}>
              <p className={`text-[10px] uppercase font-bold tracking-widest mb-2 ${isConsignado ? 'text-violet-500' : 'text-zinc-500'}`}>
                Cobrança Final
              </p>
              <div className={`flex items-baseline ${isConsignado ? 'text-violet-700' : 'text-indigo-600'}`}>
                <span className="text-xl font-bold">R$</span>
                <span className="text-5xl font-black tracking-tighter ml-1">
                  {isConsignado ? valorFinalConsignado.toFixed(2) : valorBaseFinal.toFixed(2)}
                </span>
              </div>
              {isConsignado && pctLucro > 0 && (
                <p className="text-[10px] text-violet-400 mt-2 font-medium">
                  Saldo R$ {saldoDevedor.toFixed(2)} com {pctLucro}% de desconto de lucro
                </p>
              )}
            </div>

            <button
              onClick={handleConfirm}
              disabled={isConsignado ? false : (quantidadeRemovida === 0 && itensNovos.length === 0)}
              className="w-full h-14 bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 rounded-xl text-xs uppercase tracking-widest font-black hover:bg-indigo-700 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center disabled:bg-zinc-100 disabled:text-zinc-400 disabled:shadow-none disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              Confirmar Operação
            </button>

            <button onClick={onClose} className="w-full text-[10px] flex items-center justify-center font-bold text-zinc-400 hover:text-zinc-800 transition-colors uppercase tracking-widest h-8">
              Cancelar
            </button>
          </div>
        </div>

        {/* Gradiente de Decoração */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/5 blur-[120px] rounded-full -mr-32 -mt-32 pointer-events-none" />
      </div>
    </div>
  );
}
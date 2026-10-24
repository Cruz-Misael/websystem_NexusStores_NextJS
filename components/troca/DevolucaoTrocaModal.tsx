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
  Loader2,
} from "lucide-react";
import {
  buscarProdutoPorBarcodeOuSKU,
  listarProdutosPaginado,
} from "@/src/services/product.service";
import { useDebounce } from "@/src/hooks/useDebounce";

// Um termo com letras e >= 2 caracteres e busca por nome; so digitos continuam
// sendo tratados como bipagem de codigo de barras / SKU.
const temLetras = (texto: string) => /[a-zA-ZÀ-ÿ]/.test(texto);
const ehBuscaPorNome = (texto: string) => temLetras(texto) && texto.trim().length >= 2;

const money = (valor: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor || 0);

interface ItemVenda {
  id: number;
  nome: string;
  variante?: string;
  quantidade: number;
  precoUnitario: number;
  codigoBarras: string;
  sku?: number | string;
  tamanho?: string;
  /** Preenchido quando a peça entrou por troca, depois da venda. */
  entrouEm?: string;
  /** Quantas linhas desta mesma peça a venda tem (>1 = peça repetida). */
  linhasDaMesmaPeca?: number;
}

/** Etiqueta do tamanho: o que a conferência física procura primeiro. */
function Tamanho({ valor }: { valor?: string }) {
  if (!valor) return null;
  return (
    <span className="shrink-0 text-[11px] font-black uppercase bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">
      {valor}
    </span>
  );
}

/** "entrou na troca de 20/10" — explica a peça que não veio no kit original. */
function EntrouPorTroca({ quando }: { quando?: string }) {
  if (!quando) return null;
  const dia = new Date(quando).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo",
  });
  return (
    <span className="text-[10px] font-semibold text-violet-600 whitespace-nowrap">
      entrou na troca de {dia}
    </span>
  );
}

interface NovoItem {
  sku: number;
  nome: string;
  quantidade: number;
  precoUnitario: number;
  codigoBarras: string;
}

// Produto vindo do estoque (product.service). Só os campos que o modal usa —
// os mesmos que a busca do caixa mostra na lista: nome, SKU, barras, TAM, preço.
interface ProdutoEstoque {
  sku: number;
  name: string;
  price?: number | null;
  barcode?: string | number | null;
  size?: string | null;
  stock_quantity?: number | null;
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
    // O modal aguarda esta promessa para manter o botão travado enquanto a
    // operação roda no banco — é o que impede o clique repetido.
  }) => void | Promise<void>;
  isConsignado?: boolean;
}

export default function DevolucaoTrocaModal({ venda, onClose, onConfirm, isConsignado = false }: Props) {
  const [itensDevolvidos, setItensDevolvidos] = useState<Record<number, number>>({});
  const [itensNovos, setItensNovos] = useState<NovoItem[]>([]);
  const [motivo, setMotivo] = useState("");
  const [barcodeDevolucao, setBarcodeDevolucao] = useState("");
  const [barcodeAdicao, setBarcodeAdicao] = useState("");
  const [percentualLucro, setPercentualLucro] = useState<string>("30");
  // Trava do botão enquanto a operação roda. Sem isto, a troca demora alguns
  // segundos sem dar sinal de vida e quem está no caixa clica de novo — cada
  // clique repetia a devolução inteira (estoque creditado 2x, itens novos
  // inseridos 2x). Aconteceu na venda #214 em 16 e 17/09/2026.
  const [enviando, setEnviando] = useState(false);
  const [mensagemErro, setMensagemErro] = useState("");
  const [mensagemSucesso, setMensagemSucesso] = useState("");
  const lockBip = useRef(false);
  const inputDevolucaoRef = useRef<HTMLInputElement>(null);
  const inputAdicaoRef = useRef<HTMLInputElement>(null);

  // Autocomplete por nome (mesmo comportamento da busca do caixa).
  // Devolucao filtra os itens da propria venda; adicao busca no estoque.
  const [sugestoesDevolucao, setSugestoesDevolucao] = useState<ItemVenda[]>([]);
  const [indiceDevolucao, setIndiceDevolucao] = useState(-1);
  const [sugestoesAdicao, setSugestoesAdicao] = useState<ProdutoEstoque[]>([]);
  const [indiceAdicao, setIndiceAdicao] = useState(-1);
  const [buscandoAdicao, setBuscandoAdicao] = useState(false);
  const containerDevolucaoRef = useRef<HTMLDivElement>(null);
  const containerAdicaoRef = useRef<HTMLDivElement>(null);
  const debouncedAdicao = useDebounce(barcodeAdicao, 250);

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

  // Marca +1 unidade de um item da venda. Usada tanto pela bipagem quanto pela
  // seleção no dropdown de busca por nome.
  function marcarDevolucao(item: ItemVenda) {
    const atual = itensDevolvidos[item.id] ?? 0;
    if (atual >= item.quantidade) {
      setMensagemErro(`Limite atingido (${item.quantidade} un)`);
      return;
    }
    setItensDevolvidos((prev) => ({ ...prev, [item.id]: (prev[item.id] ?? 0) + 1 }));
    setMensagemSucesso(`${item.nome} marcado`);
  }

  function selecionarSugestaoDevolucao(item: ItemVenda) {
    marcarDevolucao(item);
    setBarcodeDevolucao("");
    setSugestoesDevolucao([]);
    setIndiceDevolucao(-1);
    inputDevolucaoRef.current?.focus();
  }

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
      marcarDevolucao(itemExistente);
    } else {
      setMensagemErro(
        temLetras(codigoLimpo)
          ? "Nenhum item desta venda com esse nome."
          : "Item não consta nesta venda."
      );
    }

    setTimeout(() => { lockBip.current = false; }, 400);
  }

  // Acrescenta +1 unidade de um produto do estoque à lista de troca.
  function adicionarProdutoNovo(produto: ProdutoEstoque) {
    setItensNovos(prev => {
      const index = prev.findIndex(p => p.sku === produto.sku);
      if (index >= 0) {
        const novos = [...prev];
        novos[index] = { ...novos[index], quantidade: novos[index].quantidade + 1 };
        return novos;
      }
      return [...prev, {
        sku: produto.sku,
        nome: produto.name,
        quantidade: 1,
        precoUnitario: produto.price || 0,
        codigoBarras: produto.barcode ? String(produto.barcode) : String(produto.sku)
      }];
    });
    setMensagemSucesso(`${produto.name} adicionado.`);
  }

  function selecionarSugestaoAdicao(produto: ProdutoEstoque) {
    adicionarProdutoNovo(produto);
    setBarcodeAdicao("");
    setSugestoesAdicao([]);
    setIndiceAdicao(-1);
    inputAdicaoRef.current?.focus();
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
        adicionarProdutoNovo(produtoNoBanco);
      } else {
        setMensagemErro(
          temLetras(codigoLimpo)
            ? "Nenhum produto com esse nome."
            : "Produto não encontrado."
        );
      }
    } catch {
      setMensagemErro("Erro na busca.");
    } finally {
      setTimeout(() => { lockBip.current = false; }, 400);
    }
  }

  // ── Sugestões da devolução: filtro local nos itens da própria venda ────────
  useEffect(() => {
    const termo = barcodeDevolucao.trim();
    if (!ehBuscaPorNome(termo)) {
      setSugestoesDevolucao([]);
      setIndiceDevolucao(-1);
      return;
    }
    const alvo = termo.toLowerCase();
    setSugestoesDevolucao(
      (venda?.itens ?? [])
        .filter(i => i.quantidade > 0 && i.nome?.toLowerCase().includes(alvo))
        .slice(0, 8)
    );
    setIndiceDevolucao(-1);
  }, [barcodeDevolucao, venda]);

  // ── Sugestões da troca: busca no estoque, igual ao caixa ──────────────────
  useEffect(() => {
    const termo = debouncedAdicao.trim();
    if (!ehBuscaPorNome(termo)) {
      setSugestoesAdicao([]);
      setIndiceAdicao(-1);
      setBuscandoAdicao(false);
      return;
    }
    let cancelado = false;
    setBuscandoAdicao(true);
    listarProdutosPaginado(1, 8, termo, false)
      .then(res => { if (!cancelado) { setSugestoesAdicao(res.produtos); setIndiceAdicao(-1); } })
      .catch(() => { if (!cancelado) setSugestoesAdicao([]); })
      .finally(() => { if (!cancelado) setBuscandoAdicao(false); });
    return () => { cancelado = true; };
  }, [debouncedAdicao]);

  // Fecha os dropdowns ao clicar fora
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerDevolucaoRef.current && !containerDevolucaoRef.current.contains(e.target as Node)) {
        setSugestoesDevolucao([]);
        setIndiceDevolucao(-1);
      }
      if (containerAdicaoRef.current && !containerAdicaoRef.current.contains(e.target as Node)) {
        setSugestoesAdicao([]);
        setIndiceAdicao(-1);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function onKeyDownDevolucao(e: React.KeyboardEvent) {
    if (e.key === 'Escape' && sugestoesDevolucao.length > 0) {
      e.preventDefault(); e.stopPropagation();
      setSugestoesDevolucao([]); setIndiceDevolucao(-1);
      return;
    }
    if (sugestoesDevolucao.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setIndiceDevolucao(prev => Math.min(prev + 1, sugestoesDevolucao.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setIndiceDevolucao(prev => Math.max(prev - 1, -1));
        return;
      }
      if (e.key === 'Enter') {
        // Sem navegar, Enter resolve sozinho quando há um único resultado.
        const alvo = indiceDevolucao >= 0
          ? sugestoesDevolucao[indiceDevolucao]
          : (sugestoesDevolucao.length === 1 ? sugestoesDevolucao[0] : null);
        if (alvo) {
          e.preventDefault(); e.stopPropagation();
          selecionarSugestaoDevolucao(alvo);
          return;
        }
      }
    }
    if (e.key === 'Enter') {
      e.preventDefault(); e.stopPropagation();
      handleBipDevolucao(barcodeDevolucao);
    }
  }

  function onKeyDownAdicao(e: React.KeyboardEvent) {
    if (e.key === 'Escape' && sugestoesAdicao.length > 0) {
      e.preventDefault(); e.stopPropagation();
      setSugestoesAdicao([]); setIndiceAdicao(-1);
      return;
    }
    if (sugestoesAdicao.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setIndiceAdicao(prev => Math.min(prev + 1, sugestoesAdicao.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setIndiceAdicao(prev => Math.max(prev - 1, -1));
        return;
      }
      if (e.key === 'Enter') {
        const alvo = indiceAdicao >= 0
          ? sugestoesAdicao[indiceAdicao]
          : (sugestoesAdicao.length === 1 ? sugestoesAdicao[0] : null);
        if (alvo) {
          e.preventDefault(); e.stopPropagation();
          selecionarSugestaoAdicao(alvo);
          return;
        }
      }
    }
    if (e.key === 'Enter') {
      e.preventDefault(); e.stopPropagation();
      handleBipAdicao(barcodeAdicao);
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

  // Contagem em PEÇAS, que é como a loja confere: o resto da tela fala em
  // dinheiro, e a pergunta na hora de bipar é "quantas saíram, quantas
  // voltaram, quantas ficam".
  const pecasQueSairam = venda?.itens?.reduce((t, i) => t + i.quantidade, 0) ?? 0;
  const pecasAdicionadas = itensNovos.reduce((t, i) => t + i.quantidade, 0);
  const pecasQueFicam = pecasQueSairam - quantidadeRemovida + pecasAdicionadas;

  const pctLucro = Math.min(100, Math.max(0, parseFloat(percentualLucro) || 0));
  const valorDescontoLucro = isConsignado ? saldoDevedor * (pctLucro / 100) : 0;
  const valorFinalConsignado = saldoDevedor - valorDescontoLucro;

  // Alias para manter compatibilidade com o restante do código (troca/devolução normal)
  const valorBaseFinal = saldoDevedor;

  const handleConfirm = async () => {
    if (enviando) return;

    if (!isConsignado && quantidadeRemovida === 0 && itensNovos.length === 0) {
      alert("Selecione pelo menos uma peça para devolver ou adicionar na troca");
      return;
    }

    setEnviando(true);
    try {
      await onConfirm({
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
    } finally {
      // Se a operação falhou, o modal segue aberto e o botão volta a funcionar;
      // se deu certo, a tela fecha o modal e este estado morre junto.
      setEnviando(false);
    }
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
            <div className="flex items-center gap-3">
              {/* Placar em peças, atualizando a cada bipada. */}
              <div className="hidden sm:flex items-center gap-3 bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-1.5">
                <div className="text-center">
                  <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest leading-none">Saíram</p>
                  <p className="text-sm font-bold text-zinc-700 leading-tight">{pecasQueSairam}</p>
                </div>
                <div className="w-px h-6 bg-zinc-200" />
                <div className="text-center">
                  <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest leading-none">Devolvidas</p>
                  <p className="text-sm font-bold text-amber-600 leading-tight">{quantidadeRemovida}</p>
                </div>
                {pecasAdicionadas > 0 && (
                  <>
                    <div className="w-px h-6 bg-zinc-200" />
                    <div className="text-center">
                      <p className="text-[9px] font-black text-violet-500 uppercase tracking-widest leading-none">Entraram</p>
                      <p className="text-sm font-bold text-violet-600 leading-tight">{pecasAdicionadas}</p>
                    </div>
                  </>
                )}
                <div className="w-px h-6 bg-zinc-200" />
                <div className="text-center">
                  <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest leading-none">
                    {isConsignado ? 'Ficam' : 'Restam'}
                  </p>
                  <p className="text-sm font-black text-emerald-600 leading-tight">{pecasQueFicam}</p>
                </div>
              </div>
              <button onClick={onClose} className="w-8 h-8 flex items-center justify-center hover:bg-zinc-100 rounded-lg transition-colors text-zinc-400">
                <X size={16} />
              </button>
            </div>
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
                <div ref={containerDevolucaoRef} className="relative">
                  <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={15} />
                  <input
                    ref={inputDevolucaoRef}
                    type="text"
                    placeholder="Bipar código ou digitar o nome..."
                    value={barcodeDevolucao}
                    onChange={(e) => setBarcodeDevolucao(e.target.value)}
                    onKeyDown={onKeyDownDevolucao}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 outline-none placeholder:text-zinc-400 transition-all"
                  />

                  {/* Dropdown de busca por nome — itens desta venda */}
                  {sugestoesDevolucao.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-zinc-200 rounded-lg shadow-xl z-50 overflow-hidden">
                      <div className="px-3 py-1.5 bg-zinc-50 border-b border-zinc-100">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                          {sugestoesDevolucao.length} nesta venda · ↑↓ · Enter
                        </span>
                      </div>
                      <div className="max-h-64 overflow-y-auto">
                        {sugestoesDevolucao.map((item, idx) => {
                          const jaMarcado = itensDevolvidos[item.id] ?? 0;
                          const esgotado = jaMarcado >= item.quantidade;
                          const ativo = idx === indiceDevolucao;
                          return (
                            <button
                              key={item.id}
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => selecionarSugestaoDevolucao(item)}
                              className={`w-full text-left px-4 py-2.5 flex items-start justify-between gap-3 border-b border-zinc-50 last:border-0 transition-colors ${
                                ativo ? 'bg-indigo-50' : esgotado ? 'opacity-50 hover:bg-zinc-50' : 'hover:bg-zinc-50'
                              }`}
                            >
                              <div className="min-w-0 flex-1">
                                {/* Nome completo em até 2 linhas: a coluna do modal é
                                    mais estreita que a busca do caixa e cortar em
                                    uma linha esconde o fim do nome. */}
                                <p className="text-sm font-semibold text-zinc-800 line-clamp-2 leading-tight flex items-start gap-1.5" title={item.nome}>
                                  <Tamanho valor={item.tamanho} />
                                  <span>{item.nome}</span>
                                </p>
                                <p className="text-[10px] text-zinc-400 font-mono truncate mt-0.5">
                                  {item.sku ? `SKU ${item.sku}` : `Item ${item.id}`}
                                  {item.codigoBarras ? ` · ${item.codigoBarras}` : ''}
                                </p>
                                <EntrouPorTroca quando={item.entrouEm} />
                              </div>
                              <div className="shrink-0 text-right">
                                <p className={`text-sm font-bold ${esgotado ? 'text-zinc-400' : 'text-zinc-900'}`}>
                                  {money(item.precoUnitario)}
                                </p>
                                <p className="text-[10px] text-zinc-400 leading-tight whitespace-nowrap">
                                  {jaMarcado > 0 ? `${jaMarcado}/${item.quantidade} marcada(s)` : `${item.quantidade} un.`}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
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
                        <p className="text-sm font-semibold text-zinc-800 line-clamp-2 leading-tight flex items-start gap-1.5" title={item.nome}>
                          <Tamanho valor={item.tamanho} />
                          <span>{item.nome}</span>
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <EntrouPorTroca quando={item.entrouEm} />
                          {(item.linhasDaMesmaPeca ?? 1) > 1 && (
                            <span
                              className="text-[10px] font-semibold text-amber-600 whitespace-nowrap"
                              title="A venda tem mais de uma peça igual a esta. Uma pode já ter sido devolvida — não é erro."
                            >
                              esta peça aparece {item.linhasDaMesmaPeca}× na venda
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-zinc-400 font-mono truncate mt-0.5">
                          {item.sku ? `SKU ${item.sku} · ` : ''}
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
                  <div ref={containerAdicaoRef} className="relative">
                    <PlusCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={15} />
                    <input
                      ref={inputAdicaoRef}
                      type="text"
                      placeholder="Bipar código ou digitar o nome..."
                      value={barcodeAdicao}
                      onChange={(e) => setBarcodeAdicao(e.target.value)}
                      onKeyDown={onKeyDownAdicao}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-lg pl-9 pr-8 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 outline-none placeholder:text-zinc-400 transition-all"
                    />
                    {buscandoAdicao && (
                      <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 animate-spin" />
                    )}

                    {/* Dropdown de busca por nome — estoque */}
                    {sugestoesAdicao.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-zinc-200 rounded-lg shadow-xl z-50 overflow-hidden">
                        <div className="px-3 py-1.5 bg-zinc-50 border-b border-zinc-100">
                          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                            {sugestoesAdicao.length} no estoque · ↑↓ · Enter
                          </span>
                        </div>
                        <div className="max-h-64 overflow-y-auto">
                          {sugestoesAdicao.map((produto, idx) => {
                            const semEstoque = (produto.stock_quantity || 0) <= 0;
                            const ativo = idx === indiceAdicao;
                            return (
                              <button
                                key={produto.sku}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => selecionarSugestaoAdicao(produto)}
                                className={`w-full text-left px-4 py-2.5 flex items-start justify-between gap-3 border-b border-zinc-50 last:border-0 transition-colors ${
                                  ativo ? 'bg-indigo-50' : semEstoque ? 'opacity-50 hover:bg-zinc-50' : 'hover:bg-zinc-50'
                                }`}
                              >
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-semibold text-zinc-800 line-clamp-2 leading-tight" title={produto.name}>
                                    {produto.name}
                                  </p>
                                  <p className="text-[10px] text-zinc-400 font-mono truncate mt-0.5">
                                    SKU {produto.sku}
                                    {produto.barcode ? ` · ${produto.barcode}` : ''}
                                  </p>
                                </div>
                                <div className="shrink-0 text-right">
                                  <p className={`text-sm font-bold ${semEstoque ? 'text-zinc-400' : 'text-zinc-900'}`}>
                                    {money(produto.price || 0)}
                                  </p>
                                  {produto.size && (
                                    <p className="text-[10px] font-medium text-indigo-500 uppercase leading-tight">{produto.size}</p>
                                  )}
                                  <p className={`text-[10px] leading-tight whitespace-nowrap ${semEstoque ? 'text-red-500' : 'text-zinc-400'}`}>
                                    {semEstoque ? 'sem estoque' : `${produto.stock_quantity} em estoque`}
                                  </p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
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

              {/* % comissão — consignado */}
              {isConsignado && (
                <>
                  <div className="pt-1">
                    <label className="text-[10px] text-zinc-400 font-semibold uppercase tracking-widest block mb-1.5">
                      Comissão
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
                      <span>(−) Comissão {pctLucro}%</span>
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
              disabled={enviando || (isConsignado ? false : (quantidadeRemovida === 0 && itensNovos.length === 0))}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold uppercase tracking-widest transition-colors disabled:bg-zinc-100 disabled:text-zinc-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {enviando && <Loader2 size={14} className="animate-spin" />}
              {enviando
                ? 'Processando, não feche a tela'
                : (isConsignado ? 'Confirmar Fechamento' : 'Confirmar Operação')}
            </button>

            <button
              onClick={onClose}
              disabled={enviando}
              className="w-full text-[11px] text-zinc-400 hover:text-zinc-600 transition-colors font-medium text-center disabled:text-zinc-300 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
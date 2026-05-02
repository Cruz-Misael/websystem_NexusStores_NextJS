"use client";

import { useState, useRef, useEffect } from "react";
import {
  Search,
  Trash2,
  CreditCard,
  Smartphone,
  QrCode,
  Banknote,
  User,
  Percent,
  MoreHorizontal,
  Box,
  Delete,
  ShoppingBag,
  Menu,
  Maximize2,
  Loader2,
  AlertCircle,
  CheckCircle
} from "lucide-react";
import { criarVenda } from "@/src/services/sales.service";
import PopupConfirmacao from "@/components/estoque/PopupConfirmacao";
import ToastNotificacao from "@/components/estoque/ToastNotificacao";
import { CreateSaleDTO } from "@/types/sales";
import { buscarPessoaPorId, listarPessoas } from "@/src/services/people.service";
import { listarProdutos, buscarProdutoPorSKU } from "@/src/services/product.service";
import { listarOperadores, Operator } from "@/src/services/operator.service";
import Recibo from "@/components/vendas/Recibo";
import { Sale } from "@/types/sales";

// Tipos
interface ItemCarrinho {
  id: number;
  codigo: string;
  nome: string;
  precoUnitario: number;
  quantidade: number;
  sku: number;
  custo?: number;
  estoqueAtual: number;
}

interface Cliente {
  id: number;
  name: string;
  email?: string;
  phone?: string;
}

export default function CaixaPDVPro() {
  const [busca, setBusca] = useState("");
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);
  const [pagamentoAtivo, setPagamentoAtivo] = useState("credito");
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);
  const [buscandoProduto, setBuscandoProduto] = useState(false);
  const [modalClienteAberto, setModalClienteAberto] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [buscaCliente, setBuscaCliente] = useState("");
  const [operadorSelecionado, setOperadorSelecionado] = useState<Operator | null>(null);
  const [modalOperadorAberto, setModalOperadorAberto] = useState(false);
  const [operadores, setOperadores] = useState<Operator[]>([]);
  const [buscaOperador, setBuscaOperador] = useState("");
  const [finalizando, setFinalizando] = useState(false);
  const [vendaFinalizada, setVendaFinalizada] = useState<Sale | null>(null);

  // Estado para evitar hydration mismatch
  const [horaAtual, setHoraAtual] = useState("");

  const inputRef = useRef<HTMLInputElement>(null);

  // Modal de consignado
  const [mostrarModalConsignado, setMostrarModalConsignado] = useState(false);
  const [dataPrevistaPagamento, setDataPrevistaPagamento] = useState("");
  const [observacaoConsignado, setObservacaoConsignado] = useState("");

  // Estados para popup e toast
  const [popupAberto, setPopupAberto] = useState(false);
  const [popupConfig, setPopupConfig] = useState({
    titulo: "",
    mensagem: "",
    tipo: "info" as "sucesso" | "erro" | "aviso" | "info",
    onConfirmar: undefined as (() => void) | undefined,
    textoConfirmar: "Confirmar",
    textoCancelar: "Cancelar",
  });

  const [toastAberto, setToastAberto] = useState(false);
  const [toastConfig, setToastConfig] = useState({
    mensagem: "",
    tipo: "sucesso" as "sucesso" | "erro" | "info",
  });

  // Funções auxiliares para mostrar popups e toasts
  const mostrarPopup = (
    titulo: string,
    mensagem: string,
    tipo: "sucesso" | "erro" | "aviso" | "info" = "info",
    onConfirmar?: () => void,
    textoConfirmar = "Confirmar",
    textoCancelar = "Cancelar"
  ) => {
    setPopupConfig({
      titulo,
      mensagem,
      tipo,
      onConfirmar,
      textoConfirmar,
      textoCancelar,
    });
    setPopupAberto(true);
  };

  const mostrarToast = (mensagem: string, tipo: "sucesso" | "erro" | "info" = "sucesso") => {
    setToastConfig({ mensagem, tipo });
    setToastAberto(true);
  };

  const fecharPopup = () => {
    setPopupAberto(false);
  };

  // Atualizar hora apenas no cliente para evitar hydration mismatch
  useEffect(() => {
    const atualizarHora = () => {
      setHoraAtual(new Date().toLocaleTimeString('pt-BR'));
    };

    atualizarHora();
    const interval = setInterval(atualizarHora, 1000);

    return () => clearInterval(interval);
  }, []);

  // Carregar clientes para o modal de seleção
  useEffect(() => {
    if (modalClienteAberto) carregarClientes();
  }, [modalClienteAberto]);

  // Carregar operadores para o modal de seleção
  useEffect(() => {
    if (modalOperadorAberto) carregarOperadores();
  }, [modalOperadorAberto]);

  // Persistência de foco no input de bipar
  useEffect(() => {
    const focusInput = () => {
      // Registrar se alguma modal ou campo de busca de cliente está aberto
      const modalAberta = modalClienteAberto || mostrarModalConsignado || popupAberto || modalOperadorAberto;
      
      if (!modalAberta && inputRef.current && document.activeElement?.tagName !== 'INPUT') {
        inputRef.current.focus();
      }
    };

    // Foca ao iniciar
    focusInput();

    // Tentar focar novamente se o usuário clicar fora ou em áreas neutras
    const handleGlobalClick = () => {
      // Pequeno delay para permitir que o clique em outro botão/input seja processado primeiro
      setTimeout(focusInput, 100);
    };

    window.addEventListener("click", handleGlobalClick);

    // Atalhos de teclado globais
    const handleKeyDownGlobal = (e: KeyboardEvent) => {
      // F2 foca o input de busca/bip
      if (e.key === "F2") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDownGlobal);

    return () => {
      window.removeEventListener("click", handleGlobalClick);
      window.removeEventListener("keydown", handleKeyDownGlobal);
    };
  }, [modalClienteAberto, mostrarModalConsignado, popupAberto, modalOperadorAberto]);

  const carregarClientes = async () => {
    try {
      const pessoas = await listarPessoas();
      setClientes(pessoas.filter((p: any) => p.is_active !== false));
    } catch (error) {
      console.error("Erro ao carregar clientes:", error);
    }
  };

  const carregarOperadores = async () => {
    try {
      const ops = await listarOperadores();
      setOperadores(ops.filter(o => o.is_active));
    } catch (error) {
      console.error("Erro ao carregar operadores:", error);
    }
  };

  // Totais
  const subtotal = carrinho.reduce((acc, item) => acc + (item.precoUnitario * item.quantidade), 0);
  const totalItens = carrinho.reduce((acc, item) => acc + item.quantidade, 0);
  const desconto = 0;
  const totalFinal = subtotal - desconto;

  // Formatação
  const money = (val: number) => new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(val);

  // Buscar produto por código
  const buscarProduto = async (codigo: string) => {
    setBuscandoProduto(true);
    try {
      // Limpar código (remover caracteres não numéricos)
      const codigoLimpo = codigo.replace(/\D/g, '');

      if (!codigoLimpo) {
        mostrarToast("Código inválido", "erro");
        return;
      }

      // Tenta encontrar por SKU
      const skuNumerico = parseInt(codigoLimpo);

      try {
        const produto = await buscarProdutoPorSKU(skuNumerico);
        if (produto) {
          if ((produto.stock_quantity || 0) > 0) {
            adicionarAoCarrinho({
              id: produto.sku,
              codigo: `SKU-${produto.sku}`,
              nome: produto.name,
              precoUnitario: produto.price || 0,
              quantidade: 1,
              sku: produto.sku,
              custo: produto.cost,
              estoqueAtual: produto.stock_quantity || 0
            });
            return;
          } else {
            mostrarPopup(
              "Produto Sem Estoque",
              `O produto "${produto.name}" está com estoque ZERO. Não é possível realizar a venda até que seja feita uma entrada de mercadoria.`,
              "erro",
              undefined,
              "Entendido"
            );
            return;
          }
        }
      } catch (error: any) {
        // Se erro 404/406, tenta buscar por código de barras
        console.log("Produto não encontrado por SKU, tentando por código de barras");
      }

      // Tenta por código de barras
      const produtos = await listarProdutos();
      const produtoPorBarcode = produtos.find(p => p.barcode?.toString() === codigoLimpo);

      if (produtoPorBarcode) {
        if ((produtoPorBarcode.stock_quantity || 0) > 0) {
          adicionarAoCarrinho({
            id: produtoPorBarcode.sku,
            codigo: codigo,
            nome: produtoPorBarcode.name,
            precoUnitario: produtoPorBarcode.price || 0,
            quantidade: 1,
            sku: produtoPorBarcode.sku,
            custo: produtoPorBarcode.cost,
            estoqueAtual: produtoPorBarcode.stock_quantity || 0
          });
        } else {
          mostrarPopup(
            "Produto Sem Estoque",
            `O produto "${produtoPorBarcode.name}" está com estoque esgotado.`,
            "erro",
            undefined,
            "Entendido"
          );
        }
        return;
      }

      mostrarToast("Produto não encontrado", "info");
    } catch (error) {
      console.error("Erro ao buscar produto:", error);
      mostrarToast("Erro ao buscar produto", "erro");
    } finally {
      setBuscandoProduto(false);
      // Garante que o foco volte após a limpeza do estado
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  };

  const adiconarComVerificacao = (item: any) => {
    if (item.estoqueAtual <= 0) {
      mostrarPopup(
        "Sem Estoque",
        `O item "${item.nome}" não possui unidades em estoque.`,
        "erro"
      );
      return;
    }
    adicionarAoCarrinho(item);
  };

  const adicionarAoCarrinho = (novoItem: ItemCarrinho, barcode?: string) => {
    setCarrinho(prev => {
      const existente = prev.find(item => item.sku === novoItem.sku);
      if (existente) {
        return prev.map(item =>
          item.sku === novoItem.sku
            ? { ...item, quantidade: item.quantidade + 1 }
            : item
        );
      }
      return [...prev, { ...novoItem, codigo: barcode || novoItem.codigo }];
    });
    setBusca("");
  };

  const handleKeyDown = async (e: React.KeyboardEvent) => {
    if (buscandoProduto) return;
    if (e.key === 'Enter' && busca) {
      await buscarProduto(busca);
    }
  };

  const removerItem = (id: number) => {
    setCarrinho(carrinho.filter(i => i.id !== id));
  };

  const alterarQuantidade = (id: number, novaQuantidade: number) => {
    if (novaQuantidade <= 0) {
      removerItem(id);
      return;
    }

    const item = carrinho.find(i => i.id === id);
    if (item && novaQuantidade > item.estoqueAtual) {
      mostrarPopup(
        "Estoque Insuficiente",
        `Você tentou adicionar ${novaQuantidade} unidades, mas existem apenas ${item.estoqueAtual} em estoque para "${item.nome}".`,
        "aviso",
        undefined,
        "Entendido"
      );
      return;
    }

    setCarrinho(prev =>
      prev.map(item =>
        item.id === id ? { ...item, quantidade: novaQuantidade } : item
      )
    );
  };

  const selecionarCliente = (cliente: Cliente) => {
    setClienteSelecionado(cliente);
    setModalClienteAberto(false);
    setBuscaCliente("");
  };

  const finalizarVenda = async () => {
    if (carrinho.length === 0) {
      mostrarToast("Carrinho vazio!", "info");
      return;
    }

    if (pagamentoAtivo === 'consignado' && !dataPrevistaPagamento) {
      setMostrarModalConsignado(true);
      return;
    }

    setFinalizando(true);

    try {
      // Mapear método de pagamento
      const getPaymentMethod = () => {
        switch (pagamentoAtivo) {
          case 'credito': return 'credit_card';
          case 'debito': return 'debit';
          case 'dinheiro': return 'cash';
          case 'pix': return 'pix';
          case 'consignado': return 'credit_card';
          default: return null;
        }
      };

      // Montar observação para consignado
      const getObservation = () => {
        if (pagamentoAtivo === 'consignado' && dataPrevistaPagamento) {
          return `Venda consignada - Pagamento previsto: ${dataPrevistaPagamento}${observacaoConsignado ? ` - ${observacaoConsignado}` : ''}`;
        }
        return undefined;
      };

      const vendaData: CreateSaleDTO = {
        customer_id: clienteSelecionado?.id || null,
        operator_id: operadorSelecionado?.id || null,
        payment_method: getPaymentMethod(),
        payment_status: pagamentoAtivo === 'consignado' ? 'pending' : 'paid',
        discount_amount: desconto,
        observation: getObservation(),
        items: carrinho.map(item => ({
          product_id: item.sku,
          quantity: item.quantidade,
          discount: 0
        }))
      };

      console.log("Enviando venda:", vendaData);

      const venda = await criarVenda(vendaData);

      // Limpar carrinho após venda
      setCarrinho([]);
      setClienteSelecionado(null);
      setOperadorSelecionado(null);
      setPagamentoAtivo('credito');
      setDataPrevistaPagamento("");
      setObservacaoConsignado("");

      // Mostrar recibo da venda finalizada
      setVendaFinalizada(venda as Sale);

    } catch (error: any) {
      console.error("Erro ao finalizar venda:", error);
      mostrarPopup("Erro na Venda", `Não foi possível finalizar: ${error.message}`, "erro");
    } finally {
      setFinalizando(false);
    }
  };

  const clientesFiltrados = clientes.filter(c =>
    c.name.toLowerCase().includes(buscaCliente.toLowerCase()) ||
    c.email?.toLowerCase().includes(buscaCliente.toLowerCase()) ||
    c.phone?.includes(buscaCliente)
  );

  return (
    <div className="flex flex-col h-full max-h-screen bg-zinc-50 text-zinc-900 font-sans overflow-hidden selection:bg-indigo-100 border border-zinc-300 rounded-lg shadow-2xl mx-auto">

      {/* HEADER COMPACTO */}
      <header className="h-14 bg-white border-b border-zinc-200 flex justify-between items-center px-4 shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-zinc-900 rounded-lg flex items-center justify-center text-white font-black text-[10px] shadow-md shrink-0">
            PDV
          </div>

          <div className="flex flex-col gap-0.5">
            <h1 className="text-lg font-extrabold text-zinc-900 tracking-tight leading-none">
              Checkout Pro
            </h1>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                Caixa 01 • Terminal Online
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setModalOperadorAberto(true)}
            className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg shadow-sm transition-colors ${
              operadorSelecionado
                ? 'bg-indigo-50 border-indigo-200 hover:bg-indigo-100'
                : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100'
            }`}
            title="Selecionar operador"
          >
            <div className={`w-5 h-5 rounded-full flex items-center justify-center ${operadorSelecionado ? 'bg-indigo-200' : 'bg-zinc-200'}`}>
              <User size={12} className={operadorSelecionado ? 'text-indigo-700' : 'text-zinc-600'} />
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-wide ${operadorSelecionado ? 'text-indigo-700' : 'text-zinc-700'}`}>
              {operadorSelecionado ? operadorSelecionado.name.split(' ')[0] : 'Operador'}
            </span>
          </button>

          <button className="p-2 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-all">
            <Maximize2 size={16} />
          </button>
        </div>
      </header>

      {/* BODY SPLIT VIEW */}
      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* ESQUERDA: LISTA DE PRODUTOS */}
        <div className="flex-[2] flex flex-col bg-white border-r border-zinc-200 min-h-0">

          {/* Barra de Busca */}
          <div className="p-4 border-b border-zinc-100 shrink-0">
            <div className="relative group">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2 text-zinc-400">
                <Search size={18} />
                {buscandoProduto && <Loader2 size={14} className="animate-spin" />}
              </div>
              <input
                ref={inputRef}
                type="text"
                value={busca}
                onChange={e => setBusca(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Escaneie ou digite o código (F2)..."
                className="w-full h-12 pl-10 pr-20 bg-zinc-50 border border-zinc-200 rounded-lg text-lg font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-zinc-400"
                autoFocus
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1">
                <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold text-zinc-500 bg-white border border-zinc-200 rounded shadow-sm">
                  ENTER
                </kbd>
              </div>
            </div>
          </div>

          {/* Tabela de Produtos */}
          <div className="flex-1 overflow-y-auto min-h-0 bg-white">
            {carrinho.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <ShoppingBag size={64} className="text-zinc-200 mb-4" />
                <p className="text-zinc-400 text-sm font-medium">Carrinho vazio</p>
                <p className="text-zinc-300 text-xs mt-1">Escaneie ou digite o código do produto</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="bg-zinc-50 sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="px-4 py-2 text-[10px] font-bold text-zinc-400 uppercase tracking-wider w-12 text-center">#</th>
                    <th className="px-4 py-2 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Descrição</th>
                    <th className="px-4 py-2 text-[10px] font-bold text-zinc-400 uppercase tracking-wider text-right">Qtd</th>
                    <th className="px-4 py-2 text-[10px] font-bold text-zinc-400 uppercase tracking-wider text-right">Unitário</th>
                    <th className="px-4 py-2 text-[10px] font-bold text-zinc-400 uppercase tracking-wider text-right">Total</th>
                    <th className="px-4 py-2 text-[10px] font-bold text-zinc-400 uppercase tracking-wider w-10"></th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {carrinho.map((item, index) => (
                    <tr key={item.id} className="group border-b border-zinc-50 hover:bg-indigo-50/30 transition-colors">
                      <td className="px-4 py-3 text-center text-zinc-400 font-mono text-xs">{index + 1}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-zinc-800">{item.nome}</div>
                        <div className="text-[10px] text-zinc-400 font-mono tracking-wide">{item.codigo}</div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => alterarQuantidade(item.id, item.quantidade - 1)}
                            className="w-5 h-5 bg-zinc-100 rounded hover:bg-zinc-200 text-zinc-600"
                          >
                            -
                          </button>
                          <span className="w-8 text-center font-mono text-zinc-600">{item.quantidade}</span>
                          <button
                            onClick={() => alterarQuantidade(item.id, item.quantidade + 1)}
                            className="w-5 h-5 bg-zinc-100 rounded hover:bg-zinc-200 text-zinc-600"
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-zinc-600">{money(item.precoUnitario)}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-zinc-900">
                        {money(item.precoUnitario * item.quantidade)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => removerItem(item.id)}
                          className="p-1.5 text-zinc-300 hover:text-red-600 hover:bg-red-50 rounded transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Footer da Tabela */}
          <div className="h-10 bg-zinc-50 border-t border-zinc-200 flex items-center justify-between px-4 text-xs text-zinc-500 shrink-0">
            <div className="flex gap-4">
              <span>Itens: <strong className="text-zinc-700">{carrinho.length}</strong></span>
              <span>Volume: <strong className="text-zinc-700">{totalItens}</strong></span>
            </div>
            <div>Ultima sinc: {horaAtual}</div> {/* Agora usa o estado */}
          </div>
        </div>

        {/* DIREITA: PAINEL DE PAGAMENTO */}
        <div className="w-[360px] bg-zinc-50 flex flex-col border-l border-zinc-200 shrink-0 min-h-0">

          {/* Seção Cliente */}
          <div className="p-4 border-b border-zinc-200 bg-white shrink-0">
            <div className="flex justify-between items-center mb-2">
              <label className="text-[10px] font-bold text-zinc-400 uppercase">Cliente</label>
              <button
                onClick={() => setModalClienteAberto(true)}
                className="text-[10px] text-indigo-600 font-bold hover:underline"
              >
                {clienteSelecionado ? 'TROCAR (F3)' : 'SELECIONAR (F3)'}
              </button>
            </div>
            <div className="flex items-center gap-3 p-3 bg-zinc-50 border border-zinc-200 rounded-lg">
              <div className="w-8 h-8 rounded-full bg-zinc-200 flex items-center justify-center text-zinc-500">
                <User size={16} />
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-bold text-zinc-800 truncate">
                  {clienteSelecionado ? clienteSelecionado.name : 'Consumidor Final'}
                </p>
                <p className="text-[10px] text-zinc-500 truncate">
                  {clienteSelecionado
                    ? clienteSelecionado.phone || clienteSelecionado.email || 'Cliente identificado'
                    : 'Não identificado'}
                </p>
              </div>
            </div>
          </div>

          {/* Resumo Financeiro */}
          <div className="flex-1 p-6 flex flex-col justify-center space-y-4 overflow-y-auto min-h-0">
            <div className="space-y-2">
              <div className="flex justify-between text-zinc-500 text-sm">
                <span>Subtotal</span>
                <span className="font-mono">{money(subtotal)}</span>
              </div>
              <div className="flex justify-between text-zinc-500 text-sm">
                <span>Descontos</span>
                <span className="font-mono">{money(desconto)}</span>
              </div>
            </div>

            <div className="py-6 border-y border-dashed border-zinc-300 shrink-0">
              <div className="flex justify-between items-end mb-1">
                <span className="text-sm font-bold text-zinc-400 uppercase">Total a Pagar</span>
              </div>
              <div className="text-5xl font-bold text-zinc-900 tracking-tight font-mono text-right">
                {money(totalFinal).replace('R$', '').trim()}
              </div>
            </div>

            {/* Informação de Consignado */}
            {pagamentoAtivo === 'consignado' && (
              <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShoppingBag size={16} className="text-orange-600" />
                    <span className="text-sm font-medium text-orange-700">Venda Consignada</span>
                  </div>
                  <button
                    onClick={() => setMostrarModalConsignado(true)}
                    className="text-xs text-orange-600 hover:text-orange-700 font-medium hover:underline"
                  >
                    Editar
                  </button>
                </div>
                {dataPrevistaPagamento && (
                  <div className="mt-2 text-xs text-orange-600">
                    <p>Pagamento previsto: <strong>{new Date(dataPrevistaPagamento).toLocaleDateString('pt-BR')}</strong></p>
                    {observacaoConsignado && (
                      <p className="mt-1 truncate" title={observacaoConsignado}>
                        Obs: {observacaoConsignado}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Grid de Pagamento */}
            <div className="shrink-0">
              <label className="text-[10px] font-bold text-zinc-400 uppercase mb-2 block">Método de Pagamento</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'credito', icon: CreditCard, label: 'Crédito', key: 'F6' },
                  { id: 'debito', icon: CreditCard, label: 'Débito', key: 'F7' },
                  { id: 'pix', icon: QrCode, label: 'Pix', key: 'F8' },
                  { id: 'dinheiro', icon: Banknote, label: 'Dinheiro', key: 'F9' },
                  { id: 'consignado', icon: ShoppingBag, label: 'Consignado', key: 'F10', cor: 'orange' },
                ].map(metodo => (
                  <button
                    key={metodo.id}
                    onClick={() => {
                      if (metodo.id === 'consignado') {
                        setMostrarModalConsignado(true);
                        setPagamentoAtivo('consignado');
                      } else {
                        setPagamentoAtivo(metodo.id);
                      }
                    }}
                    className={`relative flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${pagamentoAtivo === metodo.id
                        ? 'bg-zinc-800 text-white border-zinc-800 shadow-md transform scale-[1.02]'
                        : metodo.id === 'consignado'
                          ? 'bg-orange-50 text-orange-700 border-orange-200 hover:border-orange-300 hover:bg-orange-100'
                          : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50'
                      }`}
                  >
                    <metodo.icon size={20} className="mb-1.5" />
                    <span className="text-xs font-medium">{metodo.label}</span>
                    {metodo.id === 'consignado' && pagamentoAtivo === 'consignado' && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full border-2 border-white"></div>
                    )}
                    <span className={`absolute top-1 right-2 text-[9px] font-bold opacity-50 ${metodo.id === 'consignado'
                        ? 'text-orange-400'
                        : pagamentoAtivo === metodo.id
                          ? 'text-zinc-400'
                          : 'text-zinc-300'
                      }`}>
                      {metodo.key}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer de Ação */}
          <div className="p-4 bg-white border-t border-zinc-200 shrink-0">
            <button
              onClick={finalizarVenda}
              disabled={finalizando || carrinho.length === 0}
              className={`w-full h-14 rounded-lg font-bold text-lg shadow-lg transition-all flex items-center justify-between px-6 group active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${pagamentoAtivo === 'consignado'
                  ? 'bg-orange-600 hover:bg-orange-700 text-white shadow-orange-200'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200'
                }`}
            >
              {finalizando ? (
                <span className="flex items-center gap-2">
                  <Loader2 size={20} className="animate-spin" />
                  Processando...
                </span>
              ) : (
                <>
                  <span>
                    {pagamentoAtivo === 'consignado' ? 'FINALIZAR CONSIGNADO' : 'FINALIZAR VENDA'}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium opacity-80 group-hover:opacity-100 ${pagamentoAtivo === 'consignado' ? 'text-orange-200' : 'text-emerald-200'
                      }`}>
                      {money(totalFinal)}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-mono ${pagamentoAtivo === 'consignado'
                        ? 'bg-orange-800/40 text-orange-100'
                        : 'bg-emerald-800/40 text-emerald-100'
                      }`}>
                      {pagamentoAtivo === 'consignado' ? 'F10' : 'F5'}
                    </span>
                  </div>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Seleção de Cliente */}
      {modalClienteAberto && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-200 bg-indigo-50 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <User className="text-indigo-600" size={20} />
                <h2 className="text-lg font-bold text-zinc-900">Selecionar Cliente</h2>
              </div>
              <button
                onClick={() => setModalClienteAberto(false)}
                className="p-2 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200 rounded-full transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4 border-b border-zinc-200">
              <input
                type="text"
                placeholder="Buscar por nome, email ou telefone..."
                value={buscaCliente}
                onChange={(e) => setBuscaCliente(e.target.value)}
                className="w-full h-10 px-3 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                autoFocus
              />
            </div>

            <div className="max-h-96 overflow-y-auto p-2">
              <button
                onClick={() => selecionarCliente({ id: 0, name: "Consumidor Final" })}
                className="w-full text-left p-3 hover:bg-indigo-50 rounded-lg transition-colors border-b border-zinc-100 last:border-0"
              >
                <p className="font-medium text-zinc-800">Consumidor Final</p>
                <p className="text-xs text-zinc-500">Cliente não identificado</p>
              </button>

              {clientesFiltrados.map(cliente => (
                <button
                  key={cliente.id}
                  onClick={() => selecionarCliente(cliente)}
                  className="w-full text-left p-3 hover:bg-indigo-50 rounded-lg transition-colors border-b border-zinc-100 last:border-0"
                >
                  <p className="font-medium text-zinc-800">{cliente.name}</p>
                  <p className="text-xs text-zinc-500 truncate">
                    {cliente.phone && `${cliente.phone} • `}
                    {cliente.email}
                  </p>
                </button>
              ))}

              {clientesFiltrados.length === 0 && (
                <p className="text-center text-zinc-400 py-8">Nenhum cliente encontrado</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* RECIBO PÓS-VENDA */}
      {vendaFinalizada && (
        <Recibo venda={vendaFinalizada} onClose={() => setVendaFinalizada(null)} />
      )}

      {/* Modal de Seleção de Operador */}
      {modalOperadorAberto && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-200 bg-indigo-50 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <User className="text-indigo-600" size={20} />
                <h2 className="text-lg font-bold text-zinc-900">Selecionar Operador</h2>
              </div>
              <button
                onClick={() => { setModalOperadorAberto(false); setBuscaOperador(""); }}
                className="p-2 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200 rounded-full transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4 border-b border-zinc-200">
              <input
                type="text"
                placeholder="Buscar por nome ou código..."
                value={buscaOperador}
                onChange={(e) => setBuscaOperador(e.target.value)}
                className="w-full h-10 px-3 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                autoFocus
              />
            </div>

            <div className="max-h-80 overflow-y-auto p-2">
              {operadorSelecionado && (
                <button
                  onClick={() => { setOperadorSelecionado(null); setModalOperadorAberto(false); setBuscaOperador(""); }}
                  className="w-full text-left p-3 hover:bg-red-50 rounded-lg transition-colors border-b border-zinc-100 text-red-500 text-sm font-medium"
                >
                  Remover operador
                </button>
              )}

              {operadores
                .filter(op =>
                  op.name.toLowerCase().includes(buscaOperador.toLowerCase()) ||
                  (op.code?.toLowerCase() ?? '').includes(buscaOperador.toLowerCase())
                )
                .map(op => {
                  const isSelected = operadorSelecionado?.id === op.id;
                  return (
                    <button
                      key={op.id}
                      onClick={() => { setOperadorSelecionado(op); setModalOperadorAberto(false); setBuscaOperador(""); }}
                      className={`w-full text-left p-3 rounded-lg transition-colors border-b border-zinc-100 last:border-0 ${isSelected ? 'bg-indigo-50' : 'hover:bg-indigo-50'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-zinc-800">{op.name}</p>
                          <p className="text-xs text-zinc-500">
                            {op.code && <span className="font-mono mr-2">{op.code}</span>}
                            {({ operator: 'Operador', supervisor: 'Supervisor', manager: 'Gerente' }[op.role])}
                          </p>
                        </div>
                        {isSelected && (
                          <span className="text-[10px] font-bold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">Atual</span>
                        )}
                      </div>
                    </button>
                  );
                })
              }

              {operadores.filter(op =>
                op.name.toLowerCase().includes(buscaOperador.toLowerCase()) ||
                (op.code?.toLowerCase() ?? '').includes(buscaOperador.toLowerCase())
              ).length === 0 && (
                <p className="text-center text-zinc-400 py-8 text-sm">Nenhum operador encontrado</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Consignado */}
      {mostrarModalConsignado && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden">

            {/* Header */}
            <div className="px-6 py-4 border-b border-zinc-200 bg-orange-50 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="bg-orange-100 p-2 rounded-lg">
                  <ShoppingBag className="text-orange-600" size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-zinc-900">Venda Consignada</h2>
                  <p className="text-xs text-zinc-500">Configure os detalhes do pagamento futuro</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setMostrarModalConsignado(false);
                  if (!dataPrevistaPagamento) {
                    setPagamentoAtivo('credito');
                  }
                }}
                className="p-2 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200 rounded-full transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-zinc-700 mb-2 block">
                  Data Prevista de Pagamento *
                </label>
                <input
                  type="date"
                  value={dataPrevistaPagamento}
                  onChange={(e) => setDataPrevistaPagamento(e.target.value)}
                  className="w-full h-12 px-3 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium text-zinc-700 mb-2 block">
                  Observação (Opcional)
                </label>
                <textarea
                  value={observacaoConsignado}
                  onChange={(e) => setObservacaoConsignado(e.target.value)}
                  placeholder="Ex: Pagamento após venda do lote, acordo com cliente XYZ..."
                  className="w-full h-24 px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 resize-none"
                />
              </div>

              <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle size={18} className="text-orange-600 mt-0.5" />
                  <div className="text-xs text-orange-700">
                    <p className="font-medium mb-1">Informação Importante</p>
                    <p>O cliente levará os produtos agora e pagará na data especificada. Certifique-se de registrar todas as informações necessárias.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-zinc-50 border-t border-zinc-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setMostrarModalConsignado(false);
                  setDataPrevistaPagamento("");
                  setObservacaoConsignado("");
                  setPagamentoAtivo('credito');
                }}
                className="px-5 py-2.5 bg-white border border-zinc-300 text-zinc-700 rounded-lg text-sm font-medium hover:bg-zinc-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (!dataPrevistaPagamento) {
                    mostrarToast("Selecione uma data para o pagamento", "info");
                    return;
                  }

                  setPagamentoAtivo('consignado');
                  setMostrarModalConsignado(false);
                }}
                className="px-5 py-2.5 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 transition-colors shadow-sm shadow-orange-200"
              >
                Confirmar Consignado
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP DE CONFIRMAÇÃO / INFORMAÇÃO */}
      <PopupConfirmacao
        aberto={popupAberto}
        onFechar={fecharPopup}
        onConfirmar={popupConfig.onConfirmar || fecharPopup}
        onCancelar={popupConfig.onConfirmar ? fecharPopup : undefined}
        titulo={popupConfig.titulo}
        mensagem={popupConfig.mensagem}
        tipo={popupConfig.tipo}
        textoConfirmar={popupConfig.textoConfirmar}
        textoCancelar={popupConfig.textoCancelar}
      />

      {/* TOAST DE NOTIFICAÇÃO */}
      <ToastNotificacao
        aberto={toastAberto}
        onFechar={() => setToastAberto(false)}
        mensagem={toastConfig.mensagem}
        tipo={toastConfig.tipo}
      />
    </div>
  );
}
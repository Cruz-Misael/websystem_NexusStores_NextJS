"use client";

import { useState, useEffect, useMemo } from "react";
import { useDebounce } from "@/src/hooks/useDebounce";
import DevolucaoTrocaModal from "@/components/troca/DevolucaoTrocaModal";
import Recibo from "@/components/vendas/Recibo";
import { listarVendas, buscarVendaPorId, atualizarStatusPagamento, atualizarVendaConsignado, atualizarQuantidadeItemVenda, adicionarItemVenda, atualizarValorVenda } from "@/src/services/sales.service";
import { criarDevolucao } from "@/src/services/returns.service";
import PopupConfirmacao from "@/components/estoque/PopupConfirmacao";
import ToastNotificacao from "@/components/estoque/ToastNotificacao";
import { Sale } from "@/types/sales";
import {
  Search,
  Filter,
  Download,
  Printer,
  Receipt,
  XCircle,
  RotateCcw,
  ChevronRight,
  Calendar,
  CreditCard,
  ShoppingCart,
  User,
  Loader2,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Eye,
  FileText
} from "lucide-react";

type StatusVenda = "Concluída" | "Pendente" | "Cancelada";

const getStatusFromVenda = (venda: Sale): StatusVenda => {
  if (venda.payment_status === 'cancelled') return 'Cancelada';
  if (venda.payment_status === 'pending') return 'Pendente';
  return 'Concluída';
};

const getStatusColor = (venda: Sale) => {
  const status = getStatusFromVenda(venda);
  switch (status) {
    case "Concluída": return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "Pendente":  return "bg-amber-100 text-amber-700 border-amber-200";
    case "Cancelada": return "bg-rose-100 text-rose-700 border-rose-200";
    default:          return "bg-gray-100 text-gray-700";
  }
};

export default function HistoricoVendasCompacto() {
  const [selecionada, setSelecionada] = useState<Sale | null>(null); // <-- Mudou de Venda para Sale
  const [vendas, setVendas] = useState<Sale[]>([]); // <-- Mudou de Venda[] para Sale[]
  const [busca, setBusca] = useState("");
  const debouncedBusca = useDebounce(busca);
  const [modalRecibo, setModalRecibo] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [atualizando, setAtualizando] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [filtroData, setFiltroData] = useState<string>("");
  const [modoConsignado, setModoConsignado] = useState(false);

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

  // Carregar vendas do backend
  const carregarVendas = async () => {
    try {
      setCarregando(true);
      setErro(null);

      const result = await listarVendas(1, 100);
      setVendas(result.sales);

      if (result.sales.length > 0 && !selecionada) {
        setSelecionada(result.sales[0]);
      }
    } catch (error: any) {
      console.error("Erro ao carregar vendas:", error);
      setErro(error.message || "Erro ao carregar vendas");
    } finally {
      setCarregando(false);
      setAtualizando(false);
    }
  };

  useEffect(() => {
    carregarVendas();
  }, []);

  // Cancelar venda
  const handleCancelarVenda = async () => {
    if (!selecionada) return;

    mostrarPopup(
      "Confirmar Cancelamento",
      `Deseja realmente cancelar a venda #${selecionada.id}? Esta ação irá estornar os produtos ao estoque.`,
      "aviso",
      async () => {
        try {
          setAtualizando(true);
          await atualizarStatusPagamento(selecionada.id, 'cancelled');

          setVendas(prev => prev.map(v =>
            v.id === selecionada.id ? { ...v, payment_status: 'cancelled' } : v
          ));

          setSelecionada(prev => prev ? { ...prev, payment_status: 'cancelled' } : null);
          fecharPopup();
          mostrarToast("Venda cancelada com sucesso!", "sucesso");
        } catch (error: any) {
          console.error("Erro ao cancelar venda:", error);
          mostrarToast(`Erro ao cancelar: ${error.message}`, "erro");
        } finally {
          setAtualizando(false);
        }
      },
      "Sim, Cancelar",
      "Não, Voltar"
    );
  };

  // Confirmar pagamento (se estiver pendente)
  const handleConfirmarPagamento = async () => {
    if (!selecionada) return;

    try {
      setAtualizando(true);
      await atualizarStatusPagamento(selecionada.id, 'paid');

      setVendas(prev => prev.map(v =>
        v.id === selecionada.id ? { ...v, payment_status: 'paid' } : v
      ));

      setSelecionada(prev => prev ? { ...prev, payment_status: 'paid' } : null);

      mostrarToast("Pagamento confirmado com sucesso!", "sucesso");
    } catch (error: any) {
      console.error("Erro ao confirmar pagamento:", error);
      mostrarToast(`Erro ao confirmar pagamento: ${error.message}`, "erro");
    } finally {
      setAtualizando(false);
    }
  };

  // Processar devolução/troca (Ajustado para suportar adições)
  const handleDevolucao = async (payload: any) => {
    try {
      setAtualizando(true);

      // 1. Processar Devoluções
      if (payload.itens.length > 0) {
        await criarDevolucao({
          vendaId: payload.vendaId,
          itens: payload.itens.map((item: any) => ({
            itemId: item.itemId,
            quantidade: item.quantidade
          })),
          motive: payload.motivo,
          type: payload.tipo
        });

        // Atualizar quantidades na venda
        for (const itemDevolvido of payload.itens) {
          const itemOriginal = selecionada?.items.find(i => i.id === itemDevolvido.itemId);
          if (itemOriginal) {
            const novaQtd = itemOriginal.quantity - itemDevolvido.quantidade;
            await atualizarQuantidadeItemVenda(itemDevolvido.itemId, novaQtd);
          }
        }
      }

      // 2. Processar Adições (Novos itens na troca)
      if (payload.itensAdicionados && payload.itensAdicionados.length > 0) {
        for (const novoItem of payload.itensAdicionados) {
          await adicionarItemVenda(payload.vendaId, {
            product_id: novoItem.sku,
            quantity: novoItem.quantidade
          });
        }
      }

      // 3. Atualizar Valor Final da Venda (Apenas se não for acerto de consignado com juros)
      await atualizarValorVenda(payload.vendaId, payload.valorFinal);

      // Recarregar venda para atualizar UI
      const vendaAtualizada = await buscarVendaPorId(payload.vendaId);

      setVendas(prev => prev.map(v =>
        v.id === vendaAtualizada.id ? vendaAtualizada : v
      ));

      setSelecionada(vendaAtualizada);
      setModalAberto(false);

      mostrarToast(`Operação de ${payload.tipo === 'troca' ? 'Troca' : 'Devolução'} concluída!`, "sucesso");

    } catch (error: any) {
      console.error("Erro ao processar devolução:", error);
      mostrarPopup("Erro no Processamento", `Não foi possível processar: ${error.message}`, "erro");
    } finally {
      setAtualizando(false);
    }
  };

  // Processar fechamento de consignado
  const handleFecharConsignado = async (payload: any) => {
    try {
      setAtualizando(true);

      // 1. Processar devolução dos itens não vendidos
      if (payload.itens.length > 0) {
        await criarDevolucao({
          vendaId: payload.vendaId,
          itens: payload.itens.map((item: any) => ({
            itemId: item.itemId,
            quantidade: item.quantidade
          })),
          motive: "Fechamento de Consignado",
          type: 'devolucao'
        });
      }

      // 2. Atualizar quantidades de itens na venda original (subtrair devolvidos)
      if (payload.itens.length > 0) {
        for (const itemDevolvido of payload.itens) {
          const itemOriginal = selecionada?.items.find(i => i.id === itemDevolvido.itemId);
          if (itemOriginal) {
            const novaQtd = itemOriginal.quantity - itemDevolvido.quantidade;
            await atualizarQuantidadeItemVenda(itemDevolvido.itemId, novaQtd);
          }
        }
      }

      // 2.1 Adicionar novos itens (se houver troca no fechamento)
      if (payload.itensAdicionados && payload.itensAdicionados.length > 0) {
        for (const novoItem of payload.itensAdicionados) {
          await adicionarItemVenda(payload.vendaId, {
            product_id: novoItem.sku,
            quantity: novoItem.quantidade
          });
        }
      }

      // 3. Atualizar status e valor final com juros no banco
      const novaObs = `${selecionada?.observation || ''}\n[FECHADO EM ${new Date().toLocaleDateString('pt-BR')}] - Total final com 30% de juros sobre vendidos.`;

      const { error } = await atualizarVendaConsignado(payload.vendaId, {
        payment_status: 'paid',
        final_amount: payload.valorFinal,
        observation: novaObs
      });

      if (error) throw new Error(error.message);

      // 4. Recarregar venda completa para atualizar a UI
      const vendaAtualizada = await buscarVendaPorId(payload.vendaId);

      // Atualizar lista local
      setVendas(prev => prev.map(v =>
        v.id === vendaAtualizada.id ? vendaAtualizada : v
      ));

      // Atualizar item selecionado
      setSelecionada(vendaAtualizada);

      // Fechar modal antes do alerta para melhor UX
      setModalAberto(false);

      mostrarPopup(
        "Consignado Finalizado",
        `O acerto do consignado foi realizado com sucesso!\n\nValor final (com juros): ${formatarMoeda(payload.valorFinal)}`,
        "sucesso",
        undefined,
        "Excelente"
      );

    } catch (error: any) {
      console.error("Erro ao fechar consignado:", error);
      mostrarPopup(
        "Erro ao Finalizar",
        `Ocorreu um erro técnico: ${error.message}\n\nO banco de dados impediu a alteração para preservar o histórico de devoluções.`,
        "erro",
        undefined,
        "Entendido"
      );
    } finally {
      setAtualizando(false);
    }
  };

  // ======= UTILITÁRIOS CONSIGNADO =======
  const isConsignado = (venda: Sale) => {
    return venda.observation?.includes("Venda consignada") || venda.payment_method === 'credit_card' && venda.payment_status === 'pending';
  };

  const extrairDataConsignado = (obs: string | null) => {
    if (!obs) return null;
    const match = obs.match(/Pagamento previsto: (\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : null;
  };

  const estaAtrasado = (venda: Sale) => {
    if (venda.payment_status !== 'pending') return false;
    const dataStr = extrairDataConsignado(venda.observation);
    if (!dataStr) return false;

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const dataVencimento = new Date(dataStr + 'T12:00:00'); // Garante que a data seja interpretada corretamente
    return dataVencimento < hoje;
  };
  // ======================================

  // Formatar moeda
  const formatarMoeda = (val: number) => new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(val);

  const vendasFiltradas = useMemo(() =>
    vendas.filter(v => {
      const buscaMatch =
        v.customer?.name?.toLowerCase().includes(debouncedBusca.toLowerCase()) ||
        v.id.toString().includes(debouncedBusca);
      const statusMatch = filtroStatus === "todos" || getStatusFromVenda(v) === filtroStatus;
      const dataMatch = filtroData
        ? new Date(v.sale_date).toISOString().split('T')[0] === filtroData
        : true;
      return buscaMatch && statusMatch && dataMatch;
    }),
    [vendas, debouncedBusca, filtroStatus, filtroData]
  );

  const exportarCSV = () => {
    const cabecalho = ["ID", "Data", "Cliente", "Itens", "Pagamento", "Status", "Subtotal", "Desconto", "Total"];
    const linhas = vendasFiltradas.map((v) => [
      v.id,
      new Date(v.sale_date).toLocaleString("pt-BR"),
      v.customer?.name || "Consumidor Final",
      v.items?.filter((i) => i.quantity > 0).map((i) => `${i.product?.name || i.product_name} (${i.quantity}x)`).join(" | ") || "",
      v.payment_method || "",
      getStatusFromVenda(v),
      (v.total_amount || 0).toFixed(2).replace(".", ","),
      (v.discount_amount || 0).toFixed(2).replace(".", ","),
      (v.final_amount || 0).toFixed(2).replace(".", ","),
    ]);
    const csv = [cabecalho, ...linhas]
      .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";"))
      .join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vendas_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (carregando && vendas.length === 0) {
    return (
      <div className="flex h-full max-h-screen bg-zinc-50 overflow-hidden text-sm font-sans border border-zinc-300 rounded-lg shadow-2xl mx-auto">
        <div className="w-80 flex flex-col border-r border-gray-200 bg-white shrink-0">
          <div className="p-3 border-b border-gray-100 space-y-3">
            <div className="flex justify-between items-center">
              <div className="h-7 w-24 bg-zinc-200 rounded animate-pulse" />
              <div className="h-8 w-20 bg-zinc-100 rounded animate-pulse" />
            </div>
            <div className="h-8 w-full bg-zinc-100 rounded-md animate-pulse" />
            <div className="flex gap-2">
              <div className="flex-1 h-7 bg-zinc-100 rounded-md animate-pulse" />
              <div className="h-7 w-28 bg-zinc-100 rounded-md animate-pulse" />
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="p-3 border-b border-gray-50 space-y-1.5">
                <div className="flex justify-between">
                  <div className="h-3 w-12 bg-zinc-200 rounded animate-pulse" />
                  <div className="h-4 w-16 bg-zinc-100 rounded-full animate-pulse" />
                </div>
                <div className="flex justify-between items-baseline">
                  <div className="h-5 w-24 bg-zinc-200 rounded animate-pulse" />
                  <div className="h-3 w-14 bg-zinc-100 rounded animate-pulse" />
                </div>
                <div className="h-3 w-32 bg-zinc-100 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
        <div className="flex-1 flex flex-col bg-gray-50">
          <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
            <div className="flex justify-between items-center">
              <div className="space-y-2">
                <div className="h-6 w-36 bg-zinc-200 rounded animate-pulse" />
                <div className="h-3 w-64 bg-zinc-100 rounded animate-pulse" />
              </div>
              <div className="flex gap-2">
                <div className="h-8 w-36 bg-emerald-100 rounded-lg animate-pulse" />
                <div className="h-8 w-28 bg-zinc-100 rounded-lg animate-pulse" />
                <div className="h-8 w-20 bg-red-50 rounded-lg animate-pulse" />
              </div>
            </div>
          </div>
          <div className="flex-1 p-6">
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200">
                  <div className="h-3 w-24 bg-zinc-200 rounded animate-pulse" />
                </div>
                <div className="divide-y divide-gray-50">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex gap-4 px-4 py-3.5">
                      <div className="flex-1 space-y-1.5">
                        <div className="h-4 w-40 bg-zinc-200 rounded animate-pulse" />
                        <div className="h-3 w-20 bg-zinc-100 rounded animate-pulse" />
                      </div>
                      <div className="h-4 w-8 bg-zinc-100 rounded animate-pulse" />
                      <div className="h-4 w-16 bg-zinc-100 rounded animate-pulse" />
                      <div className="h-4 w-16 bg-zinc-200 rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-end">
                <div className="w-72 bg-white rounded-lg border border-gray-200 p-4 space-y-3">
                  <div className="flex justify-between">
                    <div className="h-3 w-16 bg-zinc-100 rounded animate-pulse" />
                    <div className="h-3 w-20 bg-zinc-100 rounded animate-pulse" />
                  </div>
                  <div className="border-t border-gray-100 pt-3 flex justify-between">
                    <div className="h-5 w-12 bg-zinc-200 rounded animate-pulse" />
                    <div className="h-6 w-24 bg-zinc-200 rounded animate-pulse" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full max-h-screen bg-zinc-50 overflow-hidden text-sm font-sans text-zinc-900 border border-zinc-300 rounded-lg shadow-2xl mx-auto">

      {/* SIDEBAR: LISTA DE VENDAS */}
      <div className="w-80 flex flex-col border-r border-gray-200 bg-white shrink-0">

        {/* Header da Sidebar */}
        <div className="p-3 border-b border-gray-100 flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <ShoppingCart size={22} className="text-indigo-600" strokeWidth={2.5} />
                <h1 className="text-xl font-extrabold text-zinc-900 tracking-tight leading-none">
                  Vendas
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setAtualizando(true);
                  carregarVendas();
                }}
                disabled={atualizando}
                className="p-1.5 text-zinc-500 hover:text-indigo-600 hover:bg-zinc-50 rounded-md transition-colors"
                title="Atualizar"
              >
                <RefreshCw size={16} className={atualizando ? 'animate-spin' : ''} />
              </button>
              <div className="flex items-center bg-white border border-zinc-200 rounded-lg p-1 shadow-sm">
                <button
                  className="p-1.5 text-zinc-500 hover:text-indigo-600 hover:bg-zinc-50 rounded-md transition-colors"
                  title="Filtrar"
                >
                  <Filter size={16} />
                </button>
                <div className="w-px h-4 bg-zinc-200 mx-1" />
                <button
                  onClick={exportarCSV}
                  className="p-1.5 text-zinc-500 hover:text-indigo-600 hover:bg-zinc-50 rounded-md transition-colors"
                  title="Exportar CSV"
                >
                  <Download size={16} />
                </button>
              </div>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="text"
              placeholder="Buscar ID ou Cliente..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
            />
          </div>

          {/* Filtros Rápidos */}
          <div className="flex gap-2">
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none focus:border-indigo-500"
            >
              <option value="todos">Todos os status</option>
              <option value="Concluída">Concluídas</option>
              <option value="Pendente">Pendentes</option>
              <option value="Cancelada">Canceladas</option>
            </select>

            <input
              type="date"
              value={filtroData}
              onChange={(e) => setFiltroData(e.target.value)}
              className="text-xs bg-gray-50 border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Lista Scrollavel */}
        <div className="flex-1 overflow-y-auto">
          {erro ? (
            <div className="p-4 text-center">
              <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
              <p className="text-red-600 text-xs mb-2">{erro}</p>
              <button
                onClick={carregarVendas}
                className="text-indigo-600 hover:text-indigo-700 text-xs font-medium"
              >
                Tentar novamente
              </button>
            </div>
          ) : vendasFiltradas.length === 0 ? (
            <div className="p-8 text-center">
              <ShoppingCart className="h-12 w-12 text-zinc-300 mx-auto mb-3" />
              <p className="text-zinc-500 text-sm mb-4">
                {busca ? "Nenhuma venda encontrada" : "Nenhuma venda registrada"}
              </p>
            </div>
          ) : (
            vendasFiltradas.map((venda) => (
              <div
                key={venda.id}
                onClick={() => setSelecionada(venda)}
                className={`group p-3 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-all ${selecionada?.id === venda.id ? 'bg-indigo-50/60 border-l-2 border-l-indigo-600' : 'border-l-2 border-l-transparent'
                  }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-mono font-medium text-gray-600 text-xs">#{venda.id}</span>
                  <div className="flex items-center gap-1.5">
                    {estaAtrasado(venda) && (
                      <span className="text-[9px] bg-red-600 text-white px-1.5 py-0.5 rounded-full font-black animate-pulse">
                        ATRASADO
                      </span>
                    )}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${getStatusColor(venda)}`}>
                      {getStatusFromVenda(venda)}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-baseline mb-0.5">
                  <span className="font-bold text-gray-800 text-base">{formatarMoeda(venda.final_amount)}</span>
                  <span className="text-xs text-gray-400">
                    {new Date(venda.sale_date).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500 truncate">
                  <User size={10} />
                  {venda.customer?.name || 'Consumidor Final'}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Total de registros */}
        <div className="p-2 border-t border-gray-100 text-[10px] text-gray-400 text-center bg-gray-50">
          {vendasFiltradas.length} registro(s) encontrado(s)
        </div>
      </div>

      {/* PAINEL PRINCIPAL: DETALHES */}
      <div className="flex-1 flex flex-col bg-gray-50 h-full overflow-hidden">

        {!selecionada ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-gray-400">Selecione uma venda para ver os detalhes</p>
          </div>
        ) : (
          <>
            {/* Header do Painel */}
            <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shrink-0 shadow-sm z-10">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-gray-900">Venda #{selecionada.id}</h2>
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${getStatusColor(selecionada)}`}>
                    {getStatusFromVenda(selecionada)}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                  <span className="flex items-center gap-1">
                    <Calendar size={12} /> {new Date(selecionada.sale_date).toLocaleString('pt-BR')}
                  </span>
                  <span className="flex items-center gap-1">
                    <User size={12} /> {selecionada.customer?.name || 'Consumidor Final'}
                  </span>
                  <span className="flex items-center gap-1">
                    <CreditCard size={12} /> {selecionada.payment_method || 'Não informado'}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                {selecionada.payment_status === 'pending' && (
                  <button
                    onClick={() => {
                      if (isConsignado(selecionada)) {
                        setModoConsignado(true);
                        setModalAberto(true);
                      } else {
                        handleConfirmarPagamento();
                      }
                    }}
                    disabled={atualizando}
                    className={`px-3 py-2 text-white rounded-lg font-medium text-xs flex items-center gap-2 shadow-sm disabled:opacity-50 ${isConsignado(selecionada)
                      ? 'bg-orange-600 hover:bg-orange-700 animate-bounce-subtle'
                      : 'bg-emerald-600 hover:bg-emerald-700'
                      }`}
                  >
                    {isConsignado(selecionada) ? (
                      <><RefreshCw size={16} /> Fechar Consignado</>
                    ) : (
                      <><CheckCircle size={16} /> Confirmar Pagamento</>
                    )}
                  </button>
                )}
                <button
                  onClick={() => setModalRecibo(true)}
                  className="px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-xs flex items-center gap-2 shadow-sm"
                >
                  <Printer size={16} /> Comprovante
                </button>
                {selecionada.payment_status !== 'cancelled' && (
                  <button
                    className="px-3 py-2 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 font-medium text-xs flex items-center gap-2 shadow-sm disabled:opacity-50"
                    onClick={handleCancelarVenda}
                    disabled={atualizando}
                    title="Estornar todos os itens ao estoque e cancelar a venda"
                  >
                    <XCircle size={16} /> Cancelar
                  </button>
                )}
              </div>
            </header>

            {/* Conteúdo Scrollavel do Detalhe */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-3xl mx-auto space-y-6">

                {/* Tabela de Itens */}
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="font-semibold text-gray-700 text-xs uppercase tracking-wide">Itens do Pedido</h3>
                    <span className="text-xs text-gray-500">{selecionada.items?.length || 0} itens</span>
                  </div>
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-100 text-xs text-gray-500">
                        <th className="px-4 py-3 font-medium">Produto</th>
                        <th className="px-4 py-3 font-medium text-right">Qtd</th>
                        <th className="px-4 py-3 font-medium text-right">Unitário</th>
                        <th className="px-4 py-3 font-medium text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {selecionada.items?.filter(item => item.quantity > 0).map((item) => (
                        <tr key={item.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-800">
                              {item.product?.name || item.product_name || "Produto não identificado"}
                            </p>
                            <p className="text-xs text-gray-400">
                              SKU: {item.product?.sku || item.product_id}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-right text-gray-600">{item.quantity}</td>
                          <td className="px-4 py-3 text-right text-gray-600">{formatarMoeda(item.unit_price)}</td>
                          <td className="px-4 py-3 text-right font-medium text-gray-800">
                            {formatarMoeda(item.total_price)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Resumo Financeiro */}
                <div className="flex justify-end">
                  <div className="w-72 bg-white rounded-lg border border-gray-200 shadow-sm p-4 space-y-3">
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Subtotal</span>
                      <span>{formatarMoeda(selecionada.total_amount || 0)}</span>
                    </div>
                    {selecionada.discount_amount > 0 && (
                      <div className="flex justify-between text-xs text-green-600">
                        <span>Desconto</span>
                        <span>- {formatarMoeda(selecionada.discount_amount)}</span>
                      </div>
                    )}
                    <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
                      <span className="font-bold text-gray-700">Total</span>
                      <span className="font-bold text-xl text-gray-900">{formatarMoeda(selecionada.final_amount)}</span>
                    </div>
                  </div>
                </div>

                {/* Ações Secundárias */}
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => {
                      setModoConsignado(false);
                      setModalAberto(true);
                    }}
                    disabled={selecionada.payment_status === 'cancelled'}
                    className={`flex items-center justify-center gap-2 p-4 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 text-gray-600 transition-colors shadow-sm text-xs font-medium ${selecionada.payment_status === 'cancelled' ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                  >
                    <RotateCcw size={18} />
                    Solicitar Devolução / Troca
                  </button>
                  <button className="flex items-center justify-center gap-2 p-4 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 text-gray-600 transition-colors shadow-sm text-xs font-medium">
                    <Receipt size={18} />
                    Enviar 2ª via por Email
                  </button>
                </div>

                {/* Informações adicionais */}
                {selecionada.observation && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-xs text-blue-700">
                      <span className="font-bold">Observação:</span> {selecionada.observation}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* RECIBO */}
      {modalRecibo && selecionada && (
        <Recibo venda={selecionada} onClose={() => setModalRecibo(false)} />
      )}

      {/* MODAL: DEVOLUÇÃO/TROCA */}
      {modalAberto && selecionada && (
        <DevolucaoTrocaModal
          venda={{
            id: selecionada.id,
            customer: selecionada.customer ? { id: selecionada.customer.id, name: selecionada.customer.name } : undefined,
            itens: selecionada.items.map(item => ({
              id: item.id,
              nome: item.product?.name || item.product_name || "Produto",
              quantidade: item.quantity,
              precoUnitario: item.unit_price,
              codigoBarras: item.product ? item.product_barcode || item.product?.sku?.toString() || "" : "",
              variante: item.product?.sku?.toString() || item.product_sku
            }))
          }}
          onClose={() => setModalAberto(false)}
          onConfirm={modoConsignado ? handleFecharConsignado : handleDevolucao}
          isConsignado={modoConsignado}
        />
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
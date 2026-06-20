"use client";

import { useState, useEffect, useMemo } from "react";
import { useDebounce } from "@/src/hooks/useDebounce";
import DevolucaoTrocaModal from "@/components/troca/DevolucaoTrocaModal";
import Recibo from "@/components/vendas/Recibo";
import { listarVendas, buscarVendaPorId, atualizarStatusPagamento, atualizarVendaConsignado, atualizarQuantidadeItemVenda, adicionarItemVenda, atualizarValorVenda, atualizarClienteVenda, atualizarDataAcertoConsignado } from "@/src/services/sales.service";
import { criarDevolucao } from "@/src/services/returns.service";
import PopupConfirmacao from "@/components/estoque/PopupConfirmacao";
import ToastNotificacao from "@/components/estoque/ToastNotificacao";
import { Sale, ConsignadoItemBreakdown } from "@/types/sales";
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
  ShoppingBag,
  Globe,
  User,
  Loader2,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Eye,
  FileText,
  Pencil,
  X,
  UserX,
} from "lucide-react";
import { listarPessoasPaginado } from "@/src/services/people.service";
import { useRef } from "react";
import { useDebounce as useDebounceLocal } from "@/src/hooks/useDebounce";

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

  // ── Edição de cliente ──
  const [editandoCliente, setEditandoCliente] = useState(false);
  const [buscaCliente, setBuscaCliente] = useState("");
  const debouncedBuscaCliente = useDebounceLocal(buscaCliente, 300);
  const [resultadosCliente, setResultadosCliente] = useState<any[]>([]);
  const [carregandoCliente, setCarregandoCliente] = useState(false);
  const [salvandoCliente, setSalvandoCliente] = useState(false);
  const clienteInputRef = useRef<HTMLInputElement>(null);

  // ── Edição de data do consignado ──
  const [editandoDataConsignado, setEditandoDataConsignado] = useState(false);
  const [novaDataConsignado, setNovaDataConsignado] = useState("");
  const [salvandoDataConsignado, setSalvandoDataConsignado] = useState(false);

  const [vendaConsignadoRecibo, setVendaConsignadoRecibo] = useState<{
    venda: Sale;
    breakdown: ConsignadoItemBreakdown;
  } | null>(null);

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

  // Busca de clientes para edição
  useEffect(() => {
    if (!editandoCliente) return;
    setCarregandoCliente(true);
    listarPessoasPaginado(1, 8, debouncedBuscaCliente)
      .then(r => setResultadosCliente(r.pessoas))
      .catch(() => setResultadosCliente([]))
      .finally(() => setCarregandoCliente(false));
  }, [debouncedBuscaCliente, editandoCliente]);

  const handleSalvarCliente = async (cliente: { id: number; name: string } | null) => {
    if (!selecionada) return;
    setSalvandoCliente(true);
    try {
      await atualizarClienteVenda(selecionada.id, cliente?.id ?? null);
      const atualizada = await buscarVendaPorId(selecionada.id);
      setVendas(prev => prev.map(v => v.id === atualizada.id ? atualizada : v));
      setSelecionada(atualizada);
      setEditandoCliente(false);
      setBuscaCliente("");
      mostrarToast(cliente ? `Cliente alterado para ${cliente.name}` : "Cliente removido da venda", "sucesso");
    } catch (e: any) {
      mostrarToast(`Erro ao salvar cliente: ${e.message}`, "erro");
    } finally {
      setSalvandoCliente(false);
    }
  };

  const handleAlterarDataConsignado = async () => {
    if (!selecionada || !novaDataConsignado) return;
    setSalvandoDataConsignado(true);
    try {
      const result = await atualizarDataAcertoConsignado(selecionada.id, novaDataConsignado);
      if (result.error) throw new Error((result.error as any).message || "Erro ao atualizar data");
      const novaObs = result.observation!;
      const atualizada = { ...selecionada, observation: novaObs };
      setSelecionada(atualizada);
      setVendas(prev => prev.map(v => v.id === selecionada.id ? { ...v, observation: novaObs } : v));
      setEditandoDataConsignado(false);
      mostrarToast("Data do acerto atualizada com sucesso!", "sucesso");
    } catch (e: any) {
      mostrarToast(e.message || "Erro ao atualizar data", "erro");
    } finally {
      setSalvandoDataConsignado(false);
    }
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

  useEffect(() => {
    setEditandoCliente(false);
    setBuscaCliente("");
    setResultadosCliente([]);
    setEditandoDataConsignado(false);
    setNovaDataConsignado("");
  }, [selecionada?.id]);

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

      // Capturar breakdown ANTES das alterações no banco
      const itensOriginais = (selecionada?.items || []).map((i) => ({
        nome: i.product?.name || i.product_name || "Produto",
        quantidade: i.quantity,
      }));
      const itensDevolvidos = payload.itens
        .map((item: any) => {
          const orig = selecionada?.items.find((i) => i.id === item.itemId);
          return { nome: orig?.product?.name || orig?.product_name || "Produto", quantidade: item.quantidade };
        })
        .filter((i: any) => i.quantidade > 0);
      const itensFicaram = (selecionada?.items || [])
        .map((i) => {
          const dev = payload.itens.find((d: any) => d.itemId === i.id);
          return { nome: i.product?.name || i.product_name || "Produto", quantidade: i.quantity - (dev?.quantidade || 0) };
        })
        .filter((i) => i.quantidade > 0);
      const breakdown: ConsignadoItemBreakdown = { itensOriginais, itensDevolvidos, itensFicaram };

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

      // 3. Atualizar status e valor final no banco
      const pct = payload.percentualLucro ?? 0;
      const saldo = payload.valorNetAnteComissao ?? payload.valorFinal;
      const saiu = itensOriginais.map((i) => `${i.nome} (x${i.quantidade})`).join("; ") || "Nenhuma";
      const devolveu = itensDevolvidos.length > 0 ? itensDevolvidos.map((i: any) => `${i.nome} (x${i.quantidade})`).join("; ") : "Nenhuma";
      const ficou = itensFicaram.length > 0 ? itensFicaram.map((i) => `${i.nome} (x${i.quantidade})`).join("; ") : "Nenhuma";
      const novaObs = [
        selecionada?.observation || '',
        `[FECHADO EM ${new Date().toLocaleDateString('pt-BR')}] Saldo: ${formatarMoeda(saldo)} | Desconto de lucro: ${pct}% (${formatarMoeda(saldo * pct / 100)}) | Cobrado: ${formatarMoeda(payload.valorFinal)}`,
        `Saídas: ${saiu} | Devolvidas: ${devolveu} | Mantidas: ${ficou}`,
      ].filter(Boolean).join('\n');

      const { error } = await atualizarVendaConsignado(payload.vendaId, {
        payment_status: 'paid',
        final_amount: payload.valorFinal,
        observation: novaObs,
        consignado_commission_percent: pct,
        consignado_net_before_commission: saldo,
      });

      if (error) throw new Error(error.message);

      // 4. Recarregar venda completa para atualizar a UI
      const vendaAtualizada = await buscarVendaPorId(payload.vendaId);

      setVendas(prev => prev.map(v =>
        v.id === vendaAtualizada.id ? vendaAtualizada : v
      ));
      setSelecionada(vendaAtualizada);
      setModalAberto(false);
      setVendaConsignadoRecibo({ venda: vendaAtualizada, breakdown });

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
  function parseConsignadoBreakdown(obs: string | null): ConsignadoItemBreakdown | null {
    if (!obs) return null;
    const match = obs.match(/Saídas: (.+?) \| Devolvidas: (.+?) \| Mantidas: (.+?)(?:\n|$)/);
    if (!match) return null;
    const parseList = (s: string) =>
      s === "Nenhuma"
        ? []
        : s.split("; ").map((e) => {
            const m = e.match(/^(.+?) \(x(\d+)\)$/);
            return m ? { nome: m[1], quantidade: parseInt(m[2]) } : null;
          }).filter((x): x is { nome: string; quantidade: number } => x !== null);
    return {
      itensOriginais: parseList(match[1]),
      itensDevolvidos: parseList(match[2]),
      itensFicaram: parseList(match[3]),
    };
  }

  const isConsignado = (venda: Sale) => {
    return venda.payment_method === 'consignado' ||
      venda.observation?.includes("Venda consignada") ||
      (venda.payment_method === 'credit_card' && venda.payment_status === 'pending');
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
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-medium text-gray-600 text-xs">#{venda.id}</span>
                    {venda.source === 'site' && (
                      <span className="text-[9px] bg-indigo-100 text-indigo-700 border border-indigo-200 px-1.5 py-0.5 rounded-full font-black flex items-center gap-0.5">
                        <Globe size={8} /> SITE
                      </span>
                    )}
                  </div>
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
                {isConsignado(venda) && venda.payment_status === 'pending' && (() => {
                  const dp = extrairDataConsignado(venda.observation);
                  if (!dp) return null;
                  const atrasado = estaAtrasado(venda);
                  return (
                    <div className={`flex items-center gap-1 text-[10px] font-bold mt-0.5 ${atrasado ? 'text-red-600' : 'text-orange-500'}`}>
                      <Calendar size={9} />
                      Prev.: {new Date(dp + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </div>
                  );
                })()}
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
            <header className="bg-white border-b border-gray-100 px-5 py-3 shrink-0 z-10">
              <div className="flex items-center justify-between gap-4">

                {/* Esquerda: ID + status + meta */}
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-base font-bold text-zinc-900 shrink-0">#{selecionada.id}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold shrink-0 ${getStatusColor(selecionada)}`}>
                    {getStatusFromVenda(selecionada)}
                  </span>
                  {selecionada.source === 'site' && (
                    <span className="text-[10px] bg-indigo-100 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full font-black flex items-center gap-1 shrink-0">
                      <Globe size={10} /> Loja Online
                    </span>
                  )}

                  <div className="w-px h-4 bg-zinc-200 shrink-0" />

                  {/* Meta: data · cliente · método · previsto */}
                  <div className="flex items-center gap-2.5 text-[11px] text-zinc-400 min-w-0 flex-wrap">
                    <span className="shrink-0">
                      {new Date(selecionada.sale_date).toLocaleDateString('pt-BR')}
                    </span>

                    <span className="text-zinc-200">·</span>

                    {/* Cliente editável */}
                    <div className="relative shrink-0">
                      {editandoCliente ? (
                        <div className="flex items-center gap-1">
                          <div className="relative">
                            <input
                              ref={clienteInputRef}
                              autoFocus
                              type="text"
                              placeholder="Buscar cliente…"
                              value={buscaCliente}
                              onChange={e => setBuscaCliente(e.target.value)}
                              className="h-6 w-40 pl-2 pr-6 text-[11px] border border-indigo-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white text-zinc-800"
                            />
                            {carregandoCliente
                              ? <Loader2 size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 animate-spin text-zinc-400" />
                              : <button onClick={() => { setEditandoCliente(false); setBuscaCliente(""); }} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"><X size={10} /></button>
                            }
                            {(resultadosCliente.length > 0 || (!carregandoCliente && buscaCliente === "" && selecionada.customer)) && (
                              <div className="absolute top-full left-0 mt-0.5 w-56 bg-white border border-zinc-200 rounded-lg shadow-xl z-50 overflow-hidden">
                                {selecionada.customer && (
                                  <button onClick={() => handleSalvarCliente(null)} disabled={salvandoCliente} className="w-full text-left px-3 py-1.5 text-[11px] text-red-500 hover:bg-red-50 border-b border-zinc-100 flex items-center gap-1.5">
                                    <UserX size={11} /> Remover cliente
                                  </button>
                                )}
                                {resultadosCliente.map(c => (
                                  <button key={c.id} onClick={() => handleSalvarCliente({ id: c.id, name: c.name })} disabled={salvandoCliente} className="w-full text-left px-3 py-1.5 hover:bg-indigo-50 border-b border-zinc-50 last:border-0">
                                    <p className="text-xs font-medium text-zinc-800 truncate">{c.name}</p>
                                    {c.phone && <p className="text-[10px] text-zinc-400">{c.phone}</p>}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          {salvandoCliente && <Loader2 size={10} className="animate-spin text-indigo-500" />}
                        </div>
                      ) : (
                        <button
                          onClick={() => { setEditandoCliente(true); setBuscaCliente(""); setResultadosCliente([]); }}
                          className="flex items-center gap-1 text-zinc-500 hover:text-indigo-600 group transition-colors"
                          title="Editar cliente"
                        >
                          <User size={11} />
                          <span className="font-medium text-zinc-600 max-w-[140px] truncate">{selecionada.customer?.name || 'Consumidor Final'}</span>
                          <Pencil size={9} className="opacity-0 group-hover:opacity-50 transition-opacity" />
                        </button>
                      )}
                    </div>

                    <span className="text-zinc-200">·</span>
                    <span className="shrink-0 capitalize">{selecionada.payment_method || '—'}</span>

                    {isConsignado(selecionada) && (() => {
                      const dp = extrairDataConsignado(selecionada.observation);
                      if (!dp) return null;
                      const atrasado = estaAtrasado(selecionada);
                      return (
                        <>
                          <span className="text-zinc-200">·</span>
                          {editandoDataConsignado ? (
                            <span className="flex items-center gap-1 shrink-0">
                              <input
                                type="date"
                                value={novaDataConsignado}
                                onChange={e => setNovaDataConsignado(e.target.value)}
                                className="text-xs border border-orange-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-orange-400 bg-white"
                              />
                              <button
                                onClick={handleAlterarDataConsignado}
                                disabled={salvandoDataConsignado || !novaDataConsignado}
                                title="Salvar nova data"
                                className="text-emerald-600 hover:text-emerald-700 disabled:opacity-50"
                              >
                                {salvandoDataConsignado ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                              </button>
                              <button
                                onClick={() => setEditandoDataConsignado(false)}
                                title="Cancelar"
                                className="text-zinc-400 hover:text-red-500"
                              >
                                <X size={12} />
                              </button>
                            </span>
                          ) : (
                            <span className={`shrink-0 font-semibold flex items-center gap-1 ${atrasado ? 'text-red-500' : 'text-orange-500'}`}>
                              <Calendar size={10} />
                              {new Date(dp + 'T12:00:00').toLocaleDateString('pt-BR')}
                              {atrasado && <span className="bg-red-500 text-white text-[9px] font-black px-1 py-px rounded">ATRASADO</span>}
                              {selecionada.payment_status === 'pending' && (
                                <button
                                  onClick={() => {
                                    setNovaDataConsignado(dp);
                                    setEditandoDataConsignado(true);
                                  }}
                                  title="Alterar data do acerto"
                                  className="text-orange-400 hover:text-orange-600 ml-0.5"
                                >
                                  <Pencil size={10} />
                                </button>
                              )}
                            </span>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* Direita: ações */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {selecionada.payment_status === 'pending' && (
                    <button
                      onClick={() => {
                        if (isConsignado(selecionada)) { setModoConsignado(true); setModalAberto(true); }
                        else handleConfirmarPagamento();
                      }}
                      disabled={atualizando}
                      className={`px-3 py-1.5 text-white rounded-lg font-semibold text-xs flex items-center gap-1.5 disabled:opacity-50 transition-colors ${
                        isConsignado(selecionada) ? 'bg-orange-500 hover:bg-orange-600' : 'bg-emerald-500 hover:bg-emerald-600'
                      }`}
                    >
                      {isConsignado(selecionada)
                        ? <><RefreshCw size={13} /> Fechar Consignado</>
                        : <><CheckCircle size={13} /> Confirmar Pagamento</>}
                    </button>
                  )}
                  <button
                    onClick={() => setModalRecibo(true)}
                    title="Imprimir comprovante"
                    className="p-1.5 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 rounded-lg transition-colors border border-zinc-200"
                  >
                    <Printer size={15} />
                  </button>
                  {selecionada.payment_status !== 'cancelled' && (
                    <button
                      onClick={handleCancelarVenda}
                      disabled={atualizando}
                      title="Cancelar venda"
                      className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-zinc-200 disabled:opacity-50"
                    >
                      <XCircle size={15} />
                    </button>
                  )}
                </div>
              </div>
            </header>

            {/* Conteúdo Scrollavel do Detalhe */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-3xl mx-auto space-y-6">

                {/* Tabela de Itens */}
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="font-semibold text-gray-700 text-xs uppercase tracking-wide">Itens do Pedido</h3>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500">{selecionada.items?.filter(i => i.quantity > 0).length || 0} itens</span>
                      <span className="text-xs text-gray-400">·</span>
                      <span className="text-xs text-gray-500">{selecionada.items?.reduce((acc, i) => acc + (i.quantity > 0 ? i.quantity : 0), 0) || 0} unidades</span>
                    </div>
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
                    <p className="text-xs text-blue-700 whitespace-pre-line">
                      <span className="font-bold">Observação:</span> {selecionada.observation}
                    </p>
                  </div>
                )}

                {/* Breakdown de itens — consignado fechado */}
                {isConsignado(selecionada) && selecionada.payment_status === "paid" && (() => {
                  const bd = parseConsignadoBreakdown(selecionada.observation);
                  if (!bd) return null;
                  return (
                    <div className="bg-violet-50 border border-violet-200 rounded-lg p-4 space-y-3">
                      <h4 className="text-xs font-bold text-violet-700 uppercase tracking-wide">Peças do Consignado</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {/* Saiu */}
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1 flex items-center gap-1">
                            <ShoppingBag size={10} /> Saiu da loja
                          </p>
                          {bd.itensOriginais.map((i, idx) => (
                            <div key={idx} className="flex justify-between text-xs text-zinc-600">
                              <span className="truncate">{i.nome}</span>
                              <span className="shrink-0 ml-1 font-medium">× {i.quantidade}</span>
                            </div>
                          ))}
                        </div>
                        {/* Devolveu */}
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-1 flex items-center gap-1">
                            <RotateCcw size={10} /> Devolvidas
                          </p>
                          {bd.itensDevolvidos.length === 0 ? (
                            <p className="text-xs text-zinc-400 italic">Nenhuma</p>
                          ) : bd.itensDevolvidos.map((i, idx) => (
                            <div key={idx} className="flex justify-between text-xs text-amber-700">
                              <span className="truncate">{i.nome}</span>
                              <span className="shrink-0 ml-1 font-medium">× {i.quantidade}</span>
                            </div>
                          ))}
                        </div>
                        {/* Ficou */}
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-1 flex items-center gap-1">
                            <CheckCircle size={10} /> Ficou com o cliente
                          </p>
                          {bd.itensFicaram.length === 0 ? (
                            <p className="text-xs text-zinc-400 italic">Nenhuma</p>
                          ) : bd.itensFicaram.map((i, idx) => (
                            <div key={idx} className="flex justify-between text-xs text-emerald-700">
                              <span className="truncate">{i.nome}</span>
                              <span className="shrink-0 ml-1 font-medium">× {i.quantidade}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </>
        )}
      </div>

      {/* RECIBO */}
      {modalRecibo && selecionada && (
        <Recibo
          venda={selecionada}
          onClose={() => setModalRecibo(false)}
          consignadoBreakdown={
            isConsignado(selecionada) && selecionada.payment_status === "paid"
              ? parseConsignadoBreakdown(selecionada.observation) ?? undefined
              : undefined
          }
        />
      )}

      {/* RECIBO DE FECHAMENTO DE CONSIGNADO */}
      {vendaConsignadoRecibo && (
        <Recibo
          venda={vendaConsignadoRecibo.venda}
          consignadoBreakdown={vendaConsignadoRecibo.breakdown}
          onClose={() => setVendaConsignadoRecibo(null)}
        />
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
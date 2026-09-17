"use client";

// components/vendas/HistoricoVendaModal.tsx
// Tudo que aconteceu com uma venda depois de fechada, numa linha do tempo só:
// trocas, devoluções, fechamento e reabertura de consignado. Junta o registro
// novo (sale_events) com o histórico antigo, que estava espalhado entre a
// tabela de devoluções e o texto da observação.

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  Loader2,
  Repeat,
  RotateCcw,
  X,
  XCircle,
} from "lucide-react";
import {
  ItemHistorico,
  TipoEvento,
  listarHistoricoVenda,
} from "@/src/services/sale-events.service";

const money = (v: number | undefined | null) =>
  v === undefined || v === null
    ? "—"
    : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const quandoTexto = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
};

const ESTILO: Record<TipoEvento, { rotulo: string; icone: typeof Repeat; cor: string; fundo: string }> = {
  troca:                 { rotulo: "Troca",                icone: Repeat,      cor: "text-indigo-600",  fundo: "bg-indigo-50" },
  devolucao:             { rotulo: "Devolução",            icone: ArrowDownLeft, cor: "text-amber-600", fundo: "bg-amber-50" },
  fechamento_consignado: { rotulo: "Fechamento",           icone: CheckCircle2, cor: "text-emerald-600", fundo: "bg-emerald-50" },
  reabertura_consignado: { rotulo: "Reabertura",           icone: RotateCcw,   cor: "text-amber-600",   fundo: "bg-amber-50" },
  pagamento:             { rotulo: "Pagamento",            icone: CheckCircle2, cor: "text-emerald-600", fundo: "bg-emerald-50" },
  cancelamento:          { rotulo: "Cancelamento",         icone: XCircle,     cor: "text-red-600",     fundo: "bg-red-50" },
  ajuste:                { rotulo: "Ajuste",               icone: Clock,       cor: "text-zinc-500",    fundo: "bg-zinc-100" },
};

function ListaPecas({ titulo, pecas, cor }: { titulo: string; pecas: ItemHistorico["saiu"]; cor: string }) {
  if (!pecas || pecas.length === 0) return null;
  return (
    <div className="mt-2">
      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">{titulo}</p>
      <div className="flex flex-wrap gap-1">
        {pecas.map((p, i) => (
          <span key={`${p.nome}-${i}`} className={`text-[11px] px-2 py-0.5 rounded-full ${cor}`}>
            {p.nome} <span className="font-bold">×{p.qtd}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

interface Props {
  saleId: number;
  observacao: string | null;
  onClose: () => void;
}

export default function HistoricoVendaModal({ saleId, observacao, onClose }: Props) {
  const [itens, setItens] = useState<ItemHistorico[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [migracaoPendente, setMigracaoPendente] = useState(false);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const r = await listarHistoricoVenda(saleId, observacao);
        if (!vivo) return;
        setItens(r.itens);
        setMigracaoPendente(r.migracaoPendente);
      } catch (e) {
        if (vivo) setErro(e instanceof Error ? e.message : "Não foi possível carregar o histórico.");
      } finally {
        if (vivo) setCarregando(false);
      }
    })();
    return () => { vivo = false; };
  }, [saleId, observacao]);

  return (
    <div className="fixed inset-0 bg-zinc-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white w-full max-w-2xl max-h-[85vh] rounded-2xl shadow-2xl flex flex-col">

        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-lg font-bold text-zinc-900">Histórico da venda</h3>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Venda #{saleId} — trocas, devoluções e acertos de consignado
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {migracaoPendente && (
            <div className="mb-4 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3">
              <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={16} />
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Rode <code className="font-mono bg-amber-100 px-1 rounded">sql/historico_venda.sql</code> no Supabase para
                que as próximas operações fiquem registradas aqui. Por enquanto a tela mostra só o que dá para reconstruir
                das devoluções e da observação.
              </p>
            </div>
          )}

          {carregando ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="animate-spin text-indigo-600" size={26} />
            </div>
          ) : erro ? (
            <div className="py-12 text-center">
              <AlertTriangle className="mx-auto text-red-500 mb-2" size={24} />
              <p className="text-sm font-bold text-zinc-900">Não deu para carregar</p>
              <p className="text-xs text-zinc-500 mt-1">{erro}</p>
            </div>
          ) : itens.length === 0 ? (
            <div className="py-12 text-center">
              <Clock className="mx-auto text-zinc-300 mb-2" size={26} />
              <p className="text-sm font-bold text-zinc-900">Nada aconteceu depois da venda</p>
              <p className="text-xs text-zinc-500 mt-1">Sem trocas, devoluções ou acertos registrados.</p>
            </div>
          ) : (
            <div className="relative">
              {/* Fio da linha do tempo */}
              <div className="absolute left-[15px] top-2 bottom-2 w-px bg-zinc-200" />

              <div className="space-y-4">
                {itens.map((item) => {
                  const e = ESTILO[item.tipo] ?? ESTILO.ajuste;
                  const Icone = e.icone;

                  return (
                    <div key={item.chave} className="relative pl-10">
                      <div className={`absolute left-0 top-0 w-8 h-8 rounded-full ${e.fundo} flex items-center justify-center`}>
                        <Icone size={15} className={e.cor} />
                      </div>

                      <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-bold text-zinc-900">
                              {e.rotulo}
                              {item.repeticoes > 1 && (
                                <span
                                  className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600"
                                  title="O mesmo registro entrou várias vezes — era o botão de confirmar sem trava, corrigido depois"
                                >
                                  registrado {item.repeticoes}× por engano
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-zinc-500 mt-0.5">{item.resumo}</p>
                          </div>
                          <span className="text-[11px] text-zinc-400 whitespace-nowrap shrink-0">
                            {quandoTexto(item.quando)}
                          </span>
                        </div>

                        <ListaPecas titulo="Saíram" pecas={item.saiu} cor="bg-amber-50 text-amber-700" />
                        <ListaPecas titulo="Entraram" pecas={item.entrou} cor="bg-emerald-50 text-emerald-700" />

                        {(item.saldo !== undefined || item.cobrado !== undefined || item.valorDepois != null) && (
                          <div className="mt-3 pt-3 border-t border-zinc-100 grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {item.saldo !== undefined && (
                              <div>
                                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Saldo</p>
                                <p className="text-xs font-bold text-zinc-800">{money(item.saldo)}</p>
                              </div>
                            )}
                            {item.comissaoPercent !== undefined && (
                              <div>
                                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Desconto de lucro</p>
                                <p className="text-xs font-bold text-zinc-800">
                                  {item.comissaoPercent}%
                                  {item.comissaoValor !== undefined && (
                                    <span className="text-zinc-400 font-normal"> ({money(item.comissaoValor)})</span>
                                  )}
                                </p>
                              </div>
                            )}
                            {item.cobrado !== undefined && (
                              <div>
                                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Cobrado</p>
                                <p className="text-xs font-black text-emerald-700">{money(item.cobrado)}</p>
                              </div>
                            )}
                            {item.valorDepois != null && (
                              // Ocupa duas colunas: com uma só, "R$ 5.171,68 → R$ 2.933,28"
                              // quebrava no meio do número e ficava ilegível.
                              <div className="col-span-2">
                                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Venda passou a</p>
                                <p className="text-xs font-bold text-zinc-800 flex items-center gap-1.5 whitespace-nowrap">
                                  {item.valorAntes != null && (
                                    <>
                                      <span className="text-zinc-400 line-through font-normal">{money(item.valorAntes)}</span>
                                      <ArrowRight size={11} className="text-zinc-300 shrink-0" />
                                    </>
                                  )}
                                  {money(item.valorDepois)}
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Rodapé */}
        <div className="px-6 py-3 bg-zinc-50 border-t border-zinc-200 flex items-center justify-between shrink-0">
          <p className="text-[11px] text-zinc-400">
            {itens.length === 0 ? "Nenhum registro" : `${itens.length} ${itens.length === 1 ? "registro" : "registros"}`}
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold rounded-lg transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

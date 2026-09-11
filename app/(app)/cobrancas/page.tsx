"use client";

// app/(app)/cobrancas/page.tsx
// Rotina diária de cobrança do consignado: quem venceu, quanto, e os dois
// caminhos para lembrar — WhatsApp (abre a conversa com o texto pronto, o envio
// é no aparelho de quem clicou) e e-mail (sai pelo servidor, na hora).
// O lembrete por e-mail também sai sozinho de manhã, se estiver ligado em
// Configurações › Cobrança.

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Loader2,
  Mail,
  MessageCircle,
  Search,
  Send,
  ShieldAlert,
  UserX,
} from "lucide-react";
import toast from "react-hot-toast";
import PopupConfirmacao from "@/components/estoque/PopupConfirmacao";
import { supabase } from "@/src/lib/supabase/client";
import { useDebounce } from "@/src/hooks/useDebounce";
import {
  CobrancaPendente,
  carregarConfigCobranca,
  enviarEmailsCobranca,
  getNomeLoja,
  listarCobrancas,
  registrarEnvioWhatsapp,
} from "@/src/services/collections.service";
import {
  CollectionSettings,
  SETTINGS_PADRAO,
  aplicarVariaveis,
  formatarDataBR,
  formatarValor,
  linkWhatsapp,
} from "@/src/lib/cobranca";

const PAPEIS_PERMITIDOS = ["admin", "gerente"];

type FiltroSituacao = "todas" | "atrasada" | "hoje";

/** "hoje", "ontem", "há 4 dias" — mais legível que a data crua na coluna de histórico. */
function quandoFoi(iso: string | null): string | null {
  if (!iso) return null;
  const dias = Math.floor((Date.now() - Date.parse(iso)) / 86400000);
  if (dias <= 0) return "hoje";
  if (dias === 1) return "ontem";
  return `há ${dias} dias`;
}

function BadgeAtraso({ dias }: { dias: number }) {
  if (dias <= 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[11px] font-bold">
        Vence hoje
      </span>
    );
  }
  const grave = dias >= 7;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
      grave ? "bg-red-50 text-red-700" : "bg-zinc-100 text-zinc-600"
    }`}>
      {dias} {dias === 1 ? "dia" : "dias"}
    </span>
  );
}

function CardKPI({
  icone: Icone,
  rotulo,
  valor,
  detalhe,
  cor,
}: {
  icone: typeof CalendarClock;
  rotulo: string;
  valor: string;
  detalhe?: string;
  cor: string;
}) {
  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <Icone size={16} className={cor} />
        <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">{rotulo}</p>
      </div>
      <p className="text-2xl font-black text-zinc-900 tracking-tight">{valor}</p>
      {detalhe && <p className="text-xs text-zinc-500 mt-0.5">{detalhe}</p>}
    </div>
  );
}

export default function CobrancasPage() {
  const [papel, setPapel] = useState<string | null>(null);
  const [verificandoPapel, setVerificandoPapel] = useState(true);

  const [cobrancas, setCobrancas] = useState<CobrancaPendente[]>([]);
  const [settings, setSettings] = useState<CollectionSettings>(SETTINGS_PADRAO);
  const [nomeLoja, setNomeLoja] = useState("nossa loja");
  const [migracaoPendente, setMigracaoPendente] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [busca, setBusca] = useState("");
  const buscaDebounced = useDebounce(busca, 250);
  const [filtro, setFiltro] = useState<FiltroSituacao>("todas");
  const [selecionadas, setSelecionadas] = useState<Set<number>>(new Set());
  const [enviando, setEnviando] = useState(false);
  const [popupLote, setPopupLote] = useState(false);

  /* ── Acesso: cobrança é de admin/gerente, igual ao Financeiro ── */
  useEffect(() => {
    async function verificar() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return setVerificandoPapel(false);

      const { data } = await supabase
        .from("authorized_users")
        .select("role")
        .eq("user_id", user.id)
        .single();

      setPapel(data?.role ?? null);
      setVerificandoPapel(false);
    }
    verificar();
  }, []);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const [lista, config, loja] = await Promise.all([
        listarCobrancas(),
        carregarConfigCobranca(),
        getNomeLoja(),
      ]);
      setCobrancas(lista.cobrancas);
      setSettings(config.settings);
      setNomeLoja(loja);
      setMigracaoPendente(lista.migracaoPendente || config.migracaoPendente);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível carregar as cobranças.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    if (papel && PAPEIS_PERMITIDOS.includes(papel)) carregar();
  }, [papel, carregar]);

  /* ── Derivados ── */
  const filtradas = useMemo(() => {
    const termo = buscaDebounced.trim().toLowerCase();
    return cobrancas.filter((c) => {
      if (filtro !== "todas" && c.situacao !== filtro) return false;
      if (!termo) return true;
      return c.clienteNome.toLowerCase().includes(termo) || String(c.saleId).includes(termo);
    });
  }, [cobrancas, filtro, buscaDebounced]);

  const resumo = useMemo(() => {
    const atrasadas = cobrancas.filter((c) => c.situacao === "atrasada");
    const hoje = cobrancas.filter((c) => c.situacao === "hoje");
    const semContato = cobrancas.filter((c) => !c.email && !c.whatsapp);
    const soma = (lista: CobrancaPendente[]) => lista.reduce((t, c) => t + c.valor, 0);

    return {
      atrasadas: atrasadas.length,
      valorAtrasado: soma(atrasadas),
      hoje: hoje.length,
      valorHoje: soma(hoje),
      semContato: semContato.length,
    };
  }, [cobrancas]);

  const selecionaveis = useMemo(() => filtradas.filter((c) => c.email), [filtradas]);
  const selecionadasValidas = useMemo(
    () => selecionaveis.filter((c) => selecionadas.has(c.saleId)),
    [selecionaveis, selecionadas]
  );

  /* ── Ações ── */
  const mensagemDe = useCallback(
    (c: CobrancaPendente) =>
      aplicarVariaveis(settings.whatsapp_template, {
        clienteNome: c.clienteNome,
        vendaId: c.saleId,
        valor: c.valor,
        dataPrevista: c.dataPrevista,
        diasAtraso: c.diasAtraso,
        qtdItens: c.qtdItens,
        nomeLoja,
      }),
    [settings.whatsapp_template, nomeLoja]
  );

  const cobrarPorWhatsapp = async (c: CobrancaPendente) => {
    if (!c.whatsapp) return;

    // Abre antes de registrar: o clique do usuário é o que autoriza a janela.
    // Registrar primeiro faria o navegador tratar como pop-up e bloquear.
    window.open(linkWhatsapp(c.whatsapp, mensagemDe(c)), "_blank", "noopener,noreferrer");

    try {
      await registrarEnvioWhatsapp(c);
      const agora = new Date().toISOString();
      setCobrancas((antes) =>
        antes.map((x) =>
          x.saleId === c.saleId
            ? { ...x, ultimoWhatsapp: agora, totalCobrancas: x.totalCobrancas + 1 }
            : x
        )
      );
    } catch (e) {
      // A conversa já abriu — o que falhou foi só guardar o registro.
      toast.error(`Mensagem aberta, mas não deu para registrar: ${e instanceof Error ? e.message : "erro"}`);
    }
  };

  const enviarEmails = async (alvos: CobrancaPendente[]) => {
    if (alvos.length === 0) return;
    setEnviando(true);
    try {
      const r = await enviarEmailsCobranca(alvos.map((c) => c.saleId));

      if (r.enviados > 0) {
        toast.success(r.enviados === 1 ? "Lembrete enviado por e-mail." : `${r.enviados} lembretes enviados por e-mail.`);
      }
      for (const f of r.falhas.slice(0, 3)) {
        toast.error(`Consignado #${f.sale_id}: ${f.motivo}`);
      }
      if (r.falhas.length > 3) {
        toast.error(`E mais ${r.falhas.length - 3} não enviados.`);
      }

      setSelecionadas(new Set());
      await carregar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao enviar os e-mails.");
    } finally {
      setEnviando(false);
      setPopupLote(false);
    }
  };

  const alternarSelecao = (saleId: number) => {
    setSelecionadas((antes) => {
      const novo = new Set(antes);
      if (novo.has(saleId)) novo.delete(saleId);
      else novo.add(saleId);
      return novo;
    });
  };

  const alternarTodas = () => {
    setSelecionadas((antes) =>
      antes.size === selecionaveis.length ? new Set() : new Set(selecionaveis.map((c) => c.saleId))
    );
  };

  /* ── Telas de exceção ── */
  if (verificandoPapel) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-indigo-600" size={28} />
      </div>
    );
  }

  if (!papel || !PAPEIS_PERMITIDOS.includes(papel)) {
    return (
      <div className="max-w-md mx-auto mt-16 bg-white border border-zinc-200 rounded-xl p-8 text-center shadow-sm">
        <ShieldAlert className="mx-auto text-amber-500 mb-3" size={32} />
        <h2 className="text-lg font-bold text-zinc-900">Acesso restrito</h2>
        <p className="text-sm text-zinc-500 mt-1">
          A cobrança de consignado está disponível para administrador e gerente.
        </p>
      </div>
    );
  }

  return (
    <div className="pt-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 flex items-center gap-2">
            <CalendarClock className="text-indigo-600" size={24} />
            Cobranças
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Consignados com acerto vencido ou vencendo hoje
            {settings.auto_email_enabled && " — o lembrete por e-mail também sai automaticamente de manhã"}
          </p>
        </div>

        <button
          onClick={() => setPopupLote(true)}
          disabled={selecionadasValidas.length === 0 || enviando}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-zinc-200 disabled:text-zinc-400 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors active:scale-95 disabled:active:scale-100"
        >
          {enviando ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          Enviar e-mail
          {selecionadasValidas.length > 0 && ` (${selecionadasValidas.length})`}
        </button>
      </div>

      {migracaoPendente && (
        <div className="mb-5 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={18} />
          <div className="text-sm text-amber-800">
            <p className="font-bold">Falta preparar o banco</p>
            <p className="text-amber-700 mt-0.5">
              Rode <code className="font-mono text-[12px] bg-amber-100 px-1 py-0.5 rounded">sql/cobrancas.sql</code> no
              SQL Editor do Supabase. Até lá a tela funciona, mas o histórico de cobrança e o envio automático não são gravados.
            </p>
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <CardKPI
          icone={AlertTriangle}
          cor="text-red-500"
          rotulo="Atrasadas"
          valor={String(resumo.atrasadas)}
          detalhe={formatarValor(resumo.valorAtrasado) + " em aberto"}
        />
        <CardKPI
          icone={CalendarClock}
          cor="text-amber-500"
          rotulo="Vencem hoje"
          valor={String(resumo.hoje)}
          detalhe={formatarValor(resumo.valorHoje) + " a acertar"}
        />
        <CardKPI
          icone={UserX}
          cor="text-zinc-400"
          rotulo="Sem contato"
          valor={String(resumo.semContato)}
          detalhe="sem e-mail e sem WhatsApp no cadastro"
        />
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative group flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-indigo-500 transition-colors"
            size={16}
          />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por cliente ou número do consignado"
            className="w-full bg-white border border-zinc-200 rounded-lg pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
        </div>

        <div className="flex gap-1 bg-white border border-zinc-200 rounded-lg p-1">
          {([
            ["todas", "Todas"],
            ["atrasada", "Atrasadas"],
            ["hoje", "Vencem hoje"],
          ] as [FiltroSituacao, string][]).map(([valor, rotulo]) => (
            <button
              key={valor}
              onClick={() => setFiltro(valor)}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${
                filtro === valor ? "bg-indigo-600 text-white" : "text-zinc-500 hover:bg-zinc-50"
              }`}
            >
              {rotulo}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden">
        {carregando ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-indigo-600" size={28} />
          </div>
        ) : erro ? (
          <div className="py-16 text-center">
            <AlertTriangle className="mx-auto text-red-500 mb-3" size={28} />
            <p className="text-sm font-bold text-zinc-900">Não deu para carregar</p>
            <p className="text-xs text-zinc-500 mt-1">{erro}</p>
            <button
              onClick={carregar}
              className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors"
            >
              Tentar de novo
            </button>
          </div>
        ) : filtradas.length === 0 ? (
          <div className="py-16 text-center">
            <CheckCircle2 className="mx-auto text-emerald-500 mb-3" size={28} />
            <p className="text-sm font-bold text-zinc-900">
              {cobrancas.length === 0 ? "Nenhum acerto vencido" : "Nada com esse filtro"}
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              {cobrancas.length === 0
                ? "Todos os consignados na rua estão dentro do prazo."
                : "Tente outra busca ou volte para “Todas”."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200 text-left">
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={selecionaveis.length > 0 && selecionadas.size === selecionaveis.length}
                      onChange={alternarTodas}
                      disabled={selecionaveis.length === 0}
                      title="Selecionar todas com e-mail"
                      className="w-4 h-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500/20"
                    />
                  </th>
                  {["Cliente", "Consignado", "Previsto", "Atraso", "Valor", "Última cobrança", ""].map((h, i) => (
                    <th
                      key={h || i}
                      className="px-4 py-3 text-[10px] font-black text-zinc-400 uppercase tracking-widest whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtradas.map((c) => {
                  const ultimoEmail = quandoFoi(c.ultimoEmail);
                  const ultimoZap = quandoFoi(c.ultimoWhatsapp);

                  return (
                    <tr key={c.saleId} className="border-b border-zinc-50 hover:bg-zinc-50/60 transition-colors">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selecionadas.has(c.saleId)}
                          onChange={() => alternarSelecao(c.saleId)}
                          disabled={!c.email}
                          title={c.email ? "Selecionar para e-mail" : "Cliente sem e-mail no cadastro"}
                          className="w-4 h-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500/20 disabled:opacity-40"
                        />
                      </td>

                      <td className="px-4 py-3">
                        <p className="font-bold text-zinc-900">{c.clienteNome}</p>
                        <p className="text-[11px] text-zinc-400">
                          {c.email || "sem e-mail"} · {c.whatsapp ? c.telefone : "sem WhatsApp válido"}
                        </p>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="font-mono text-[11px] text-zinc-400">#{c.saleId}</p>
                        <p className="text-xs text-zinc-500">
                          {c.qtdItens} {c.qtdItens === 1 ? "peça" : "peças"} · saiu {formatarDataBR(c.dataSaida)}
                        </p>
                      </td>

                      <td className="px-4 py-3 text-zinc-600 whitespace-nowrap">{formatarDataBR(c.dataPrevista)}</td>

                      <td className="px-4 py-3">
                        <BadgeAtraso dias={c.diasAtraso} />
                      </td>

                      <td className="px-4 py-3 font-bold text-zinc-900 whitespace-nowrap">{formatarValor(c.valor)}</td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        {ultimoEmail || ultimoZap ? (
                          <div className="text-[11px] text-zinc-500 space-y-0.5">
                            {ultimoZap && (
                              <p className="flex items-center gap-1">
                                <MessageCircle size={11} className="text-emerald-500" /> {ultimoZap}
                              </p>
                            )}
                            {ultimoEmail && (
                              <p className="flex items-center gap-1">
                                <Mail size={11} className="text-indigo-500" /> {ultimoEmail}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-zinc-400">nunca cobrada</span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => cobrarPorWhatsapp(c)}
                            disabled={!c.whatsapp}
                            title={c.whatsapp ? "Abrir conversa com a mensagem pronta" : "Telefone ausente ou incompleto no cadastro"}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:bg-zinc-50 disabled:text-zinc-300"
                          >
                            <MessageCircle size={14} />
                            WhatsApp
                          </button>

                          <button
                            onClick={() => enviarEmails([c])}
                            disabled={!c.email || enviando}
                            title={c.email ? "Enviar o lembrete por e-mail agora" : "Cliente sem e-mail no cadastro"}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors bg-indigo-50 text-indigo-700 hover:bg-indigo-100 disabled:bg-zinc-50 disabled:text-zinc-300"
                          >
                            <Mail size={14} />
                            E-mail
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!carregando && !erro && filtradas.length > 0 && (
          <div className="px-4 py-3 bg-zinc-50 border-t border-zinc-200 text-[11px] text-zinc-500">
            {filtradas.length} {filtradas.length === 1 ? "cobrança" : "cobranças"} ·{" "}
            {formatarValor(filtradas.reduce((t, c) => t + c.valor, 0))} em aberto
          </div>
        )}
      </div>

      <PopupConfirmacao
        aberto={popupLote}
        titulo="Enviar lembrete por e-mail"
        mensagem={
          selecionadasValidas.length === 1
            ? `Enviar o lembrete de acerto para ${selecionadasValidas[0]?.clienteNome}?`
            : `Enviar o lembrete de acerto para ${selecionadasValidas.length} clientes selecionadas?`
        }
        tipo="aviso"
        textoConfirmar="Enviar agora"
        confirmando={enviando}
        onConfirmar={() => enviarEmails(selecionadasValidas)}
        onCancelar={() => setPopupLote(false)}
        onFechar={() => setPopupLote(false)}
      />
    </div>
  );
}

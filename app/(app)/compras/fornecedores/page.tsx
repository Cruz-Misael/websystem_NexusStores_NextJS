"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Plus,
  Factory,
  Pencil,
  Power,
  Loader2,
  X,
  Phone,
  Mail,
  FileText,
} from "lucide-react";
import { useDebounce } from "@/src/hooks/useDebounce";
import {
  Supplier,
  listarFornecedoresPaginado,
  criarFornecedor,
  atualizarFornecedor,
  inativarFornecedor,
} from "@/src/services/suppliers.service";
import PopupConfirmacao from "@/components/estoque/PopupConfirmacao";
import ToastNotificacao from "@/components/estoque/ToastNotificacao";

interface FormFornecedor {
  name: string;
  legal_name: string;
  document: string;
  email: string;
  phone: string;
  contact_name: string;
  default_payment_terms: string;
  lead_time_days: string;
  pix: string;
  notes: string;
}

const FORM_VAZIO: FormFornecedor = {
  name: "",
  legal_name: "",
  document: "",
  email: "",
  phone: "",
  contact_name: "",
  default_payment_terms: "",
  lead_time_days: "",
  pix: "",
  notes: "",
};

export default function FornecedoresPage() {
  const [fornecedores, setFornecedores] = useState<Supplier[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const [mostrarInativos, setMostrarInativos] = useState(false);
  const debouncedBusca = useDebounce(busca, 300);

  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<Supplier | null>(null);
  const [form, setForm] = useState<FormFornecedor>(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);

  const [confirmacao, setConfirmacao] = useState<{ fornecedor: Supplier } | null>(null);
  const [toast, setToast] = useState<{ mensagem: string; tipo: "sucesso" | "erro" } | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const res = await listarFornecedoresPaginado(1, 200, debouncedBusca, mostrarInativos);
      setFornecedores(res.fornecedores);
    } catch (e: any) {
      setToast({ mensagem: e.message || "Erro ao carregar fornecedores", tipo: "erro" });
    } finally {
      setCarregando(false);
    }
  }, [debouncedBusca, mostrarInativos]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const abrirNovo = () => {
    setEditando(null);
    setForm(FORM_VAZIO);
    setModalAberto(true);
  };

  const abrirEdicao = (f: Supplier) => {
    setEditando(f);
    setForm({
      name: f.name || "",
      legal_name: f.legal_name || "",
      document: f.document || "",
      email: f.email || "",
      phone: f.phone || "",
      contact_name: f.contact_name || "",
      default_payment_terms: f.default_payment_terms || "",
      lead_time_days: f.lead_time_days?.toString() || "",
      pix: f.bank_info?.pix || "",
      notes: f.notes || "",
    });
    setModalAberto(true);
  };

  const salvar = async () => {
    if (!form.name.trim()) {
      setToast({ mensagem: "Informe o nome do fornecedor", tipo: "erro" });
      return;
    }
    setSalvando(true);
    try {
      const payload = {
        name: form.name.trim(),
        legal_name: form.legal_name.trim() || null,
        document: form.document.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        contact_name: form.contact_name.trim() || null,
        default_payment_terms: form.default_payment_terms.trim() || null,
        lead_time_days: form.lead_time_days ? parseInt(form.lead_time_days, 10) : null,
        bank_info: form.pix.trim() ? { pix: form.pix.trim() } : null,
        notes: form.notes.trim() || null,
      };

      if (editando) {
        await atualizarFornecedor(editando.id, payload);
        setToast({ mensagem: "Fornecedor atualizado", tipo: "sucesso" });
      } else {
        await criarFornecedor(payload);
        setToast({ mensagem: "Fornecedor criado", tipo: "sucesso" });
      }
      setModalAberto(false);
      carregar();
    } catch (e: any) {
      setToast({ mensagem: e.message || "Erro ao salvar", tipo: "erro" });
    } finally {
      setSalvando(false);
    }
  };

  const alternarAtivo = async (f: Supplier) => {
    try {
      await inativarFornecedor(f.id, !f.is_active);
      setToast({
        mensagem: f.is_active ? "Fornecedor inativado" : "Fornecedor reativado",
        tipo: "sucesso",
      });
      setConfirmacao(null);
      carregar();
    } catch (e: any) {
      setToast({ mensagem: e.message || "Erro ao atualizar", tipo: "erro" });
    }
  };

  const campo = (label: string, key: keyof FormFornecedor, placeholder = "", type = "text") => (
    <div>
      <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">
        {label}
      </label>
      <input
        type={type}
        value={form[key]}
        onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
      />
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto py-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 flex items-center gap-2">
            <Factory className="text-indigo-600" size={24} />
            Fornecedores
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Cadastro de fornecedores para pedidos de compra e contas a pagar
          </p>
        </div>
        <button
          onClick={abrirNovo}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
        >
          <Plus size={16} />
          Novo fornecedor
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome, razão social ou CNPJ..."
            className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-zinc-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <label className="inline-flex items-center gap-2 text-sm text-zinc-600 bg-white border border-zinc-200 rounded-lg px-3 py-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={mostrarInativos}
            onChange={(e) => setMostrarInativos(e.target.checked)}
            className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
          />
          Mostrar inativos
        </label>
      </div>

      {/* Lista */}
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        {carregando ? (
          <div className="flex items-center justify-center py-16 text-zinc-400">
            <Loader2 className="animate-spin mr-2" size={20} /> Carregando...
          </div>
        ) : fornecedores.length === 0 ? (
          <div className="text-center py-16 text-zinc-400 text-sm">
            Nenhum fornecedor encontrado — cadastre o primeiro para começar a criar pedidos de compra
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200">
                  {["Fornecedor", "CNPJ / CPF", "Contato", "Cond. pagamento", "Prazo", "Status", ""].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-500"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {fornecedores.map((f) => (
                  <tr key={f.id} className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50/60">
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-zinc-800">{f.name}</p>
                      {f.legal_name && <p className="text-xs text-zinc-400">{f.legal_name}</p>}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-600 whitespace-nowrap">
                      {f.document || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs text-zinc-600 space-y-0.5">
                        {f.phone && (
                          <p className="flex items-center gap-1"><Phone size={11} /> {f.phone}</p>
                        )}
                        {f.email && (
                          <p className="flex items-center gap-1"><Mail size={11} /> {f.email}</p>
                        )}
                        {!f.phone && !f.email && "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-600 whitespace-nowrap">
                      {f.default_payment_terms || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-600 whitespace-nowrap">
                      {f.lead_time_days ? `${f.lead_time_days} dias` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          f.is_active
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-zinc-100 text-zinc-500 border border-zinc-200"
                        }`}
                      >
                        {f.is_active ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => abrirEdicao(f)}
                          title="Editar"
                          className="p-2 rounded-lg text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => setConfirmacao({ fornecedor: f })}
                          title={f.is_active ? "Inativar" : "Reativar"}
                          className="p-2 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Power size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de cadastro/edição */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-zinc-200 sticky top-0 bg-white">
              <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
                <Factory size={18} className="text-indigo-600" />
                {editando ? `Editar — ${editando.name}` : "Novo fornecedor"}
              </h3>
              <button
                onClick={() => setModalAberto(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {campo("Nome fantasia *", "name", "Ex.: Lingerie Modas LTDA")}
              {campo("Razão social", "legal_name")}
              {campo("CNPJ / CPF", "document", "00.000.000/0000-00")}
              {campo("Pessoa de contato", "contact_name")}
              {campo("Telefone / WhatsApp", "phone", "(00) 00000-0000")}
              {campo("E-mail", "email", "", "email")}
              {campo("Condição de pagamento padrão", "default_payment_terms", 'Ex.: "30/60/90" ou "à vista"')}
              {campo("Prazo de entrega (dias)", "lead_time_days", "Ex.: 15", "number")}
              {campo("Chave PIX", "pix")}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">
                  Observações
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 p-4 border-t border-zinc-200 bg-zinc-50">
              <button
                onClick={() => setModalAberto(false)}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-zinc-600 hover:bg-zinc-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={salvar}
                disabled={salvando}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 transition-colors"
              >
                {salvando && <Loader2 size={14} className="animate-spin" />}
                {editando ? "Salvar alterações" : "Criar fornecedor"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmação de inativar/reativar */}
      <PopupConfirmacao
        aberto={!!confirmacao}
        titulo={confirmacao?.fornecedor.is_active ? "Inativar fornecedor" : "Reativar fornecedor"}
        mensagem={
          confirmacao
            ? confirmacao.fornecedor.is_active
              ? `"${confirmacao.fornecedor.name}" deixará de aparecer nas listas de seleção, mas o histórico é mantido.`
              : `"${confirmacao.fornecedor.name}" voltará a aparecer nas listas de seleção.`
            : ""
        }
        tipo="aviso"
        onConfirmar={() => confirmacao && alternarAtivo(confirmacao.fornecedor)}
        onCancelar={() => setConfirmacao(null)}
        onFechar={() => setConfirmacao(null)}
      />

      <ToastNotificacao
        aberto={!!toast}
        mensagem={toast?.mensagem || ""}
        tipo={toast?.tipo || "info"}
        onFechar={() => setToast(null)}
      />
    </div>
  );
}

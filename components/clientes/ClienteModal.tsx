"use client";

import {
  X,
  User,
  Mail,
  Phone,
  MapPin,
  FileText,
  Upload,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useState } from "react";

/* ========= TIPOS ========= */

export type ClienteForm = {
  nome: string;
  email: string;
  whatsapp: string;
  documento: string;
  cep: string;
  endereco: string;
  numero: string;
  cidade: string;
  estado: string;
  observacoes: string;
  anexos: File[];
};

interface Props {
  aberto: boolean;
  mode: "create" | "edit";
  cliente?: Partial<ClienteForm> | null;
  onClose: () => void;
  onSave: (cliente: ClienteForm) => void;
}

/* ========= ESTADO INICIAL ========= */

const estadoInicial: ClienteForm = {
  nome: "",
  email: "",
  whatsapp: "",
  documento: "",
  cep: "",
  endereco: "",
  numero: "",
  cidade: "",
  estado: "",
  observacoes: "",
  anexos: [],
};

export default function ClienteModal({
  aberto,
  mode,
  cliente,
  onClose,
  onSave,
}: Props) {
  const [form, setForm] = useState<ClienteForm>(estadoInicial);

  /* ========= AUTO-PREENCHIMENTO (EDIT) ========= */

  useEffect(() => {
    if (mode === "edit" && cliente) {
      setForm({ ...estadoInicial, ...cliente });
    }

    if (mode === "create") {
      setForm(estadoInicial);
    }
  }, [mode, cliente, aberto]);

  if (!aberto) return null;

  const handleChange = <K extends keyof ClienteForm>(
    field: K,
    value: ClienteForm[K]
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 bg-zinc-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] border border-zinc-200 overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* HEADER */}
        <div className="px-6 py-5 border-b border-zinc-100 flex justify-between items-center bg-white shrink-0">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <User size={22} className="text-indigo-600" strokeWidth={2.5} />
              <h2 className="text-xl font-extrabold text-zinc-900 tracking-tight leading-none">
                {mode === "create" ? "Novo Cliente" : "Editar Cliente"}
              </h2>
            </div>
            <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider ml-7">
              {mode === "create"
                ? "Cadastre um novo perfil na sua base de dados"
                : "Atualize as informações do cliente"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-100 rounded-full text-zinc-400 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* CONTEÚDO */}
        <div className="p-8 space-y-8 overflow-y-auto min-h-0 bg-white">
          
          {/* Identificação */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck size={16} className="text-zinc-400" />
              <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[2px]">
                Informações de Identificação
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-5">
              <Input
                icon={<User size={14} />}
                label="Nome Completo"
                value={form.nome}
                placeholder="Ex: Ricardo Oliveira"
                onChange={(v) => handleChange("nome", v)}
              />

              <Input
                icon={<FileText size={14} />}
                label="CPF / CNPJ"
                value={form.documento}
                placeholder="000.000.000-00"
                onChange={(v) => handleChange("documento", v)}
              />

              <Input
                icon={<Mail size={14} />}
                label="Email"
                value={form.email}
                placeholder="cliente@email.com"
                onChange={(v) => handleChange("email", v)}
              />

              <Input
                icon={<Phone size={14} />}
                label="WhatsApp"
                value={form.whatsapp}
                placeholder="(00) 00000-0000"
                onChange={(v) => handleChange("whatsapp", v)}
              />
            </div>
          </section>

          {/* Localização */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <MapPin size={16} className="text-zinc-400" />
              <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[2px]">
                Localização
              </h3>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <Input
                label="CEP"
                value={form.cep}
                placeholder="00000-000"
                onChange={(v) => handleChange("cep", v)}
              />
              <Input
                label="Cidade"
                value={form.cidade}
                placeholder="Cidade"
                onChange={(v) => handleChange("cidade", v)}
              />
              <Input
                label="UF"
                value={form.estado}
                placeholder="Ex: SP"
                onChange={(v) => handleChange("estado", v)}
              />
            </div>

            <div className="grid grid-cols-4 gap-4 mt-3">
              <div className="col-span-3">
                <Input
                  label="Logradouro"
                  value={form.endereco}
                  placeholder="Rua, Avenida..."
                  onChange={(v) => handleChange("endereco", v)}
                />
              </div>
              <Input
                label="Nº"
                value={form.numero}
                placeholder="123"
                onChange={(v) => handleChange("numero", v)}
              />
            </div>
          </section>

          {/* Anexos e Notas */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[2px]">
                Documentação
              </h3>
              <label className="flex flex-col items-center justify-center gap-2 cursor-pointer border-2 border-dashed border-zinc-200 rounded-2xl p-6 hover:bg-indigo-50/30 hover:border-indigo-200 transition-all group">
                <div className="p-3 bg-zinc-100 rounded-full group-hover:bg-indigo-100 transition-colors">
                  <Upload size={18} className="text-zinc-500 group-hover:text-indigo-600" />
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold text-zinc-700">Enviar arquivos</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">PDF ou Imagens</p>
                </div>
                <input
                  type="file"
                  multiple
                  hidden
                  onChange={(e) =>
                    handleChange("anexos", Array.from(e.target.files || []))
                  }
                />
              </label>
              {form.anexos.length > 0 && (
                <p className="text-[10px] font-bold text-indigo-600 text-center">
                  {form.anexos.length} arquivo(s) selecionado(s)
                </p>
              )}
            </div>

            <div className="space-y-2">
              <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[2px]">
                Notas Internas
              </h3>
              <textarea
                value={form.observacoes}
                onChange={(e) => handleChange("observacoes", e.target.value)}
                placeholder="Preferências, observações, histórico..."
                className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl p-4 text-xs resize-none h-full min-h-[110px] focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all"
              />
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="px-8 py-5 border-t border-zinc-100 flex justify-end gap-3 bg-zinc-50 shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-xs font-black uppercase tracking-widest text-zinc-400 hover:text-zinc-600 transition-colors"
          >
            Cancelar
          </button>

          <button
            onClick={() => onSave(form)}
            className="px-8 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-black uppercase tracking-[2px] shadow-lg shadow-zinc-200 transition-all active:scale-95"
          >
            {mode === "create" ? "Salvar Cliente" : "Atualizar Registro"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ========= COMPONENTES AUXILIARES ========= */

function Input({
  label,
  value,
  placeholder,
  icon,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  icon?: React.ReactNode;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-bold text-zinc-500 ml-1 uppercase tracking-tighter">
        {label}
      </label>
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
            {icon}
          </span>
        )}
        <input
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full bg-zinc-50 border border-zinc-200 rounded-xl ${
            icon ? "pl-9" : "pl-4"
          } pr-4 py-2.5 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all placeholder:text-zinc-300`}
        />
      </div>
    </div>
  );
}
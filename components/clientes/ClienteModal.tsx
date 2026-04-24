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
  Loader2,
  AlertCircle,
  File,
  FileImage,
  Calendar
} from "lucide-react";
import { useEffect, useState } from "react";
import { criarPessoa, atualizarPessoa, buscarPessoaPorId } from "@/src/services/people.service";
import { criarDocumento, listarDocumentosPorPessoa, deletarDocumento } from "@/src/services/document.service";
import ListaDocumentos from "./ListaDocumentos";

/* ========= TIPOS ========= */

export type ClienteForm = {
  nome: string;
  email: string;
  whatsapp: string;
  documento: string; // identity_number
  cep: string;
  endereco: string; // address_street
  numero: string; // address_number
  complemento: string; // address_complement
  bairro: string; // neighbourhood
  cidade: string;
  estado: string;
  observacoes: string; // observation
  dataNascimento: string; // birth_date
  anexos: File[];
};

interface PessoaDB {
  id: number;
  name: string;
  email: string;
  phone: string;
  identity_number: number | null;
  cep: number | null;
  address_street: string | null;
  address_number: number | null;
  address_complement: string | null;
  neighbourhood: string | null;
  city: string | null;
  state: string | null;
  observation: string | null;
  birth_date: string | null;
  documents?: Array<{
    id: number;
    document_file: string;
    file_name: string;
    file_type: string;
    file_size: number;
    created_at: string;
  }>;
}

interface Props {
  aberto: boolean;
  mode: "create" | "edit";
  clienteId?: number | null;
  onClose: () => void;
  onSave: () => void;
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
  complemento: "",
  bairro: "",
  cidade: "",
  estado: "",
  observacoes: "",
  dataNascimento: "",
  anexos: [],
};

export default function ClienteModal({
  aberto,
  mode,
  clienteId,
  onClose,
  onSave,
}: Props) {
  const [form, setForm] = useState<ClienteForm>(estadoInicial);
  const [documentosExistentes, setDocumentosExistentes] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [clienteSalvoId, setClienteSalvoId] = useState<number | null>(null);

  /* ========= CARREGAR DADOS PARA EDIÇÃO ========= */
  useEffect(() => {
    if (mode === "edit" && clienteId && aberto) {
      carregarCliente(clienteId);
    } else if (mode === "create" && aberto) {
      setForm(estadoInicial);
      setDocumentosExistentes([]);
      setClienteSalvoId(null);
      setErro(null);
    }
  }, [mode, clienteId, aberto]);

  const carregarCliente = async (id: number) => {
    try {
      setCarregando(true);
      setErro(null);
      
      const pessoa = await buscarPessoaPorId(id);
      console.log("Pessoa carregada:", pessoa);
      
      // Mapeia os dados do banco para o formulário
      setForm({
        nome: pessoa.name || "",
        email: pessoa.email || "",
        whatsapp: pessoa.phone || "",
        documento: pessoa.identity_number?.toString() || "",
        cep: pessoa.cep?.toString() || "",
        endereco: pessoa.address_street || "",
        numero: pessoa.address_number?.toString() || "",
        complemento: pessoa.address_complement || "",
        bairro: pessoa.neighbourhood || "",
        cidade: pessoa.city || "",
        estado: pessoa.state || "",
        observacoes: pessoa.observation || "",
        dataNascimento: pessoa.birth_date || "",
        anexos: [],
      });
      
      // Carrega documentos existentes
      if (pessoa.documents) {
        setDocumentosExistentes(pessoa.documents);
      }
      
    } catch (error: any) {
      console.error("Erro ao carregar cliente:", error);
      setErro(error.message || "Erro ao carregar dados do cliente");
    } finally {
      setCarregando(false);
    }
  };

  /* ========= FUNÇÃO PARA DELETAR DOCUMENTO ========= */
  const handleDeletarDocumento = async (documentId: number) => {
    try {
      setSalvando(true);
      await deletarDocumento(documentId);
      setDocumentosExistentes(prev => prev.filter(d => d.id !== documentId));
    } catch (error: any) {
      console.error("Erro ao deletar documento:", error);
      alert(`Erro ao deletar documento: ${error.message}`);
    } finally {
      setSalvando(false);
    }
  };

  /* ========= FUNÇÃO PARA SALVAR ========= */
  const handleSalvar = async () => {
    try {
      setSalvando(true);
      setErro(null);

      // 1. Preparar dados da pessoa
      const pessoaData = {
        name: form.nome,
        email: form.email || null,
        phone: form.whatsapp || null,
        identity_number: form.documento ? parseInt(form.documento.replace(/\D/g, '')) : null,
        cep: form.cep ? parseInt(form.cep.replace(/\D/g, '')) : null,
        address_street: form.endereco || null,
        address_number: form.numero ? parseInt(form.numero) : null,
        address_complement: form.complemento || null,
        neighbourhood: form.bairro || null,
        city: form.cidade || null,
        state: form.estado || null,
        observation: form.observacoes || null,
        birth_date: form.dataNascimento || null,
      };

      console.log("Dados a serem salvos:", pessoaData);

      let pessoaSalva;

      // 2. Criar ou atualizar pessoa
      if (mode === "edit" && clienteId) {
        pessoaSalva = await atualizarPessoa(clienteId, pessoaData);
      } else {
        pessoaSalva = await criarPessoa(pessoaData);
      }

      // 3. Upload de novos documentos (se houver)
      if (form.anexos.length > 0) {
        for (const arquivo of form.anexos) {
          // Converter para base64
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(arquivo);
          });
          
          // Salvar documento
          await criarDocumento(
            base64,
            pessoaSalva.id,
            {
              name: arquivo.name,
              type: arquivo.type,
              size: arquivo.size
            }
          );
        }
      }

      // 4. Fechar modal e notificar sucesso
      onSave();
      onClose();
      
    } catch (error: any) {
      console.error("Erro ao salvar cliente:", error);
      setErro(error.message || "Erro ao salvar cliente");
    } finally {
      setSalvando(false);
    }
  };

  const handleChange = <K extends keyof ClienteForm>(
    field: K,
    value: ClienteForm[K]
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const formatarDocumento = (value: string) => {
    const numeros = value.replace(/\D/g, '');
    if (numeros.length <= 11) {
      return numeros.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else {
      return numeros.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
  };

  const formatarCEP = (value: string) => {
    const numeros = value.replace(/\D/g, '');
    return numeros.replace(/(\d{5})(\d{3})/, '$1-$2');
  };

  const formatarTelefone = (value: string) => {
    const numeros = value.replace(/\D/g, '');
    if (numeros.length <= 10) {
      return numeros.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    } else {
      return numeros.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
  };

  const removerAnexo = (index: number) => {
    const novosAnexos = [...form.anexos];
    novosAnexos.splice(index, 1);
    handleChange("anexos", novosAnexos);
  };

  if (!aberto) return null;

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
            disabled={salvando}
          >
            <X size={20} />
          </button>
        </div>

        {/* CONTEÚDO */}
        <div className="p-8 space-y-8 overflow-y-auto min-h-0 bg-white relative">
          
          {carregando ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 size={32} className="animate-spin text-indigo-600 mb-4" />
              <p className="text-zinc-600 text-sm">Carregando dados do cliente...</p>
            </div>
          ) : erro ? (
            <div className="flex flex-col items-center justify-center py-12">
              <AlertCircle size={32} className="text-red-500 mb-4" />
              <p className="text-red-600 text-sm mb-2">{erro}</p>
              <button
                onClick={() => clienteId && carregarCliente(clienteId)}
                className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
              >
                Tentar novamente
              </button>
            </div>
          ) : (
            <>
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
                    label="Nome Completo *"
                    value={form.nome}
                    placeholder="Ex: Ricardo Oliveira"
                    onChange={(v) => handleChange("nome", v)}
                    required
                  />

                  <Input
                    icon={<FileText size={14} />}
                    label="CPF / CNPJ"
                    value={form.documento}
                    placeholder="000.000.000-00"
                    onChange={(v) => handleChange("documento", formatarDocumento(v))}
                  />

                  <Input
                    icon={<Mail size={14} />}
                    label="Email"
                    type="email"
                    value={form.email}
                    placeholder="cliente@email.com"
                    onChange={(v) => handleChange("email", v)}
                  />

                  <Input
                    icon={<Phone size={14} />}
                    label="WhatsApp"
                    value={form.whatsapp}
                    placeholder="(00) 00000-0000"
                    onChange={(v) => handleChange("whatsapp", formatarTelefone(v))}
                  />

                  <Input
                    label="Data de Nascimento"
                    type="date"
                    value={form.dataNascimento}
                    placeholder=""
                    onChange={(v) => handleChange("dataNascimento", v)}
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

                <div className="grid grid-cols-4 gap-4">
                  <Input
                    label="CEP"
                    value={form.cep}
                    placeholder="00000-000"
                    onChange={(v) => handleChange("cep", formatarCEP(v))}
                  />
                  <div className="col-span-2">
                    <Input
                      label="Cidade"
                      value={form.cidade}
                      placeholder="Cidade"
                      onChange={(v) => handleChange("cidade", v)}
                    />
                  </div>
                  <Input
                    label="UF"
                    value={form.estado}
                    placeholder="Ex: SP"
                    onChange={(v) => handleChange("estado", v.toUpperCase())}
                    maxLength={2}
                  />
                </div>

                <div className="grid grid-cols-12 gap-4 mt-3">
                  <div className="col-span-6">
                    <Input
                      label="Logradouro"
                      value={form.endereco}
                      placeholder="Rua, Avenida..."
                      onChange={(v) => handleChange("endereco", v)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      label="Nº"
                      value={form.numero}
                      placeholder="123"
                      onChange={(v) => handleChange("numero", v)}
                    />
                  </div>
                  <div className="col-span-4">
                    <Input
                      label="Complemento"
                      value={form.complemento}
                      placeholder="Apto, Bloco..."
                      onChange={(v) => handleChange("complemento", v)}
                    />
                  </div>
                </div>

                <div className="mt-3">
                  <Input
                    label="Bairro"
                    value={form.bairro}
                    placeholder="Centro, Jardim..."
                    onChange={(v) => handleChange("bairro", v)}
                  />
                </div>
              </section>

              {/* Documentação */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <FileText size={16} className="text-zinc-400" />
                  <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[2px]">
                    Documentos Anexados
                  </h3>
                </div>

                {/* Lista de documentos existentes */}
                {documentosExistentes.length > 0 && (
                  <div className="mb-6">
                    <ListaDocumentos
                      documentos={documentosExistentes}
                      onDelete={handleDeletarDocumento}
                      podeDeletar={mode === "edit"}
                    />
                  </div>
                )}

                {/* Upload de novos documentos */}
                <div className="space-y-4">
                  <label className="flex flex-col items-center justify-center gap-2 cursor-pointer border-2 border-dashed border-zinc-200 rounded-2xl p-6 hover:bg-indigo-50/30 hover:border-indigo-200 transition-all group">
                    <div className="p-3 bg-zinc-100 rounded-full group-hover:bg-indigo-100 transition-colors">
                      <Upload size={18} className="text-zinc-500 group-hover:text-indigo-600" />
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-bold text-zinc-700">Adicionar novos documentos</p>
                      <p className="text-[10px] text-zinc-400 mt-0.5">PDF, Imagens (máx 10MB)</p>
                    </div>
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
                      hidden
                      onChange={(e) => {
                        const novosArquivos = Array.from(e.target.files || []);
                        handleChange("anexos", [...form.anexos, ...novosArquivos]);
                      }}
                    />
                  </label>

                  {/* Lista de arquivos selecionados para upload */}
                  {form.anexos.length > 0 && (
                    <div className="space-y-2 mt-3">
                      <p className="text-[10px] font-bold text-indigo-600">
                        {form.anexos.length} arquivo(s) aguardando upload:
                      </p>
                      {form.anexos.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-indigo-50 rounded-lg">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {file.type.includes('pdf') ? (
                              <FileText size={14} className="text-red-500" />
                            ) : file.type.includes('image') ? (
                              <FileImage size={14} className="text-blue-500" />
                            ) : (
                              <File size={14} className="text-zinc-500" />
                            )}
                            <span className="text-xs truncate flex-1">{file.name}</span>
                            <span className="text-[9px] text-zinc-500">
                              {(file.size / 1024).toFixed(1)} KB
                            </span>
                          </div>
                          <button
                            onClick={() => removerAnexo(index)}
                            className="p-1 text-zinc-400 hover:text-red-600"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              {/* Notas Internas */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <FileText size={16} className="text-zinc-400" />
                  <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[2px]">
                    Notas Internas
                  </h3>
                </div>

                <textarea
                  value={form.observacoes}
                  onChange={(e) => handleChange("observacoes", e.target.value)}
                  placeholder="Preferências, observações, histórico..."
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl p-4 text-xs resize-none h-32 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all"
                />
              </section>
            </>
          )}
        </div>

        {/* FOOTER */}
        <div className="px-8 py-5 border-t border-zinc-100 flex justify-end gap-3 bg-zinc-50 shrink-0">
          <button
            onClick={onClose}
            disabled={salvando || carregando}
            className="px-5 py-2.5 text-xs font-black uppercase tracking-widest text-zinc-400 hover:text-zinc-600 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>

          <button
            onClick={handleSalvar}
            disabled={salvando || carregando || !form.nome.trim()}
            className="px-8 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-black uppercase tracking-[2px] shadow-lg shadow-zinc-200 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {salvando ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Salvando...
              </>
            ) : (
              mode === "create" ? "Salvar Cliente" : "Atualizar Registro"
            )}
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
  type = "text",
  required = false,
  maxLength,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  icon?: React.ReactNode;
  type?: string;
  required?: boolean;
  maxLength?: number;
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
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          maxLength={maxLength}
          className={`w-full bg-zinc-50 border border-zinc-200 rounded-xl ${
            icon ? "pl-9" : "pl-4"
          } pr-4 py-2.5 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all placeholder:text-zinc-300`}
        />
      </div>
    </div>
  );
}
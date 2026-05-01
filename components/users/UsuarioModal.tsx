'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
  X, User, Mail, Shield, Key, Eye, EyeOff,
  UserPlus, UserCog, CheckCircle, Loader2,
  Smartphone, Lock
} from 'lucide-react';

interface ModalUsuarioProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (usuario: any) => Promise<void>;
  usuarioParaEditar?: {
    id: string;
    full_name: string;
    email: string;
    role: string;
    status: 'ativo' | 'inativo' | 'pendente';
    phone?: string;
  } | null;
  modo?: 'criacao' | 'edicao';
}

interface FormData {
  nome: string;
  email: string;
  telefone: string;
  cargo: string;
  senha: string;
  confirmarSenha: string;
  status: 'ativo' | 'inativo' | 'pendente';
}

const EMPTY_FORM: FormData = {
  nome: '',
  email: '',
  telefone: '',
  cargo: 'colaborador',
  senha: '',
  confirmarSenha: '',
  status: 'ativo',
};

const CARGOS = [
  { value: 'colaborador', label: 'Colaborador', desc: 'Acesso básico ao sistema' },
  { value: 'gerente',     label: 'Gerente',     desc: 'Acesso a relatórios e gestão' },
  { value: 'admin',       label: 'Administrador', desc: 'Acesso completo ao sistema' },
];

export default function UsuarioModal({
  isOpen,
  onClose,
  onSave,
  usuarioParaEditar = null,
  modo = 'criacao',
}: ModalUsuarioProps) {
  const [isLoading, setIsLoading]     = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData]        = useState<FormData>(EMPTY_FORM);

  useEffect(() => {
    if (!isOpen) return;
    setShowPassword(false);
    if (modo === 'edicao' && usuarioParaEditar) {
      setFormData({
        nome:           usuarioParaEditar.full_name || '',
        email:          usuarioParaEditar.email,
        telefone:       usuarioParaEditar.phone || '',
        cargo:          usuarioParaEditar.role,
        senha:          '',
        confirmarSenha: '',
        status:         usuarioParaEditar.status || 'ativo',
      });
    } else {
      setFormData(EMPTY_FORM);
    }
  }, [isOpen, modo, usuarioParaEditar]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nome.trim() || !formData.email.trim()) {
      toast.error('Nome e e-mail são obrigatórios');
      return;
    }
    if (modo === 'criacao' && !formData.senha) {
      toast.error('A senha é obrigatória para novos usuários');
      return;
    }
    if (formData.senha && formData.senha !== formData.confirmarSenha) {
      toast.error('As senhas não coincidem');
      return;
    }
    if (formData.senha && formData.senha.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setIsLoading(true);
    try {
      const payload: any = {
        ...formData,
        id: modo === 'edicao' ? usuarioParaEditar?.id : undefined,
      };
      if (modo === 'edicao' && !formData.senha) {
        delete payload.senha;
        delete payload.confirmarSenha;
      }
      await onSave(payload);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar usuário');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-lg rounded-[24px] shadow-2xl border border-zinc-200 overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">

        {/* HEADER */}
        <div className="px-6 py-5 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50 sticky top-0">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 ${modo === 'criacao' ? 'bg-indigo-600 shadow-indigo-100' : 'bg-amber-500 shadow-amber-100'} rounded-xl flex items-center justify-center text-white shadow-lg`}>
              {modo === 'criacao' ? <UserPlus size={20} strokeWidth={2.5} /> : <UserCog size={20} strokeWidth={2.5} />}
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-tight text-zinc-800">
                {modo === 'criacao' ? 'Novo Colaborador' : 'Editar Colaborador'}
              </h2>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                {modo === 'criacao' ? 'Cadastro e acesso ao sistema' : 'Atualizar informações'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-200/50 rounded-xl transition-colors text-zinc-400">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">

          {/* SEÇÃO: DADOS DO COLABORADOR */}
          <div className="space-y-4">
            <SectionTitle>Dados do Colaborador</SectionTitle>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* NOME */}
              <div className="space-y-1.5">
                <FieldLabel>Nome Completo *</FieldLabel>
                <div className="relative group">
                  <FieldIcon><User size={16} /></FieldIcon>
                  <input
                    required
                    type="text"
                    placeholder="Ex: João Silva"
                    className={fieldClass}
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  />
                </div>
              </div>

              {/* EMAIL */}
              <div className="space-y-1.5">
                <FieldLabel>E-mail *</FieldLabel>
                <div className="relative group">
                  <FieldIcon><Mail size={16} /></FieldIcon>
                  <input
                    required
                    type="email"
                    placeholder="nome@empresa.com"
                    disabled={modo === 'edicao'}
                    className={`${fieldClass} disabled:opacity-50 disabled:cursor-not-allowed`}
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                {modo === 'edicao' && (
                  <p className="text-[10px] text-zinc-400 px-1">O e-mail não pode ser alterado</p>
                )}
              </div>

              {/* TELEFONE */}
              <div className="space-y-1.5">
                <FieldLabel>Telefone</FieldLabel>
                <div className="relative group">
                  <FieldIcon><Smartphone size={16} /></FieldIcon>
                  <input
                    type="tel"
                    placeholder="(00) 00000-0000"
                    className={fieldClass}
                    value={formData.telefone}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                  />
                </div>
              </div>

              {/* CARGO */}
              <div className="space-y-1.5">
                <FieldLabel>Cargo / Nível de Acesso *</FieldLabel>
                <div className="relative">
                  <FieldIcon><Shield size={16} /></FieldIcon>
                  <select
                    required
                    className={`${fieldClass} appearance-none cursor-pointer`}
                    value={formData.cargo}
                    onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                  >
                    {CARGOS.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <p className="text-[10px] text-zinc-400 px-1">
                  {CARGOS.find((c) => c.value === formData.cargo)?.desc}
                </p>
              </div>
            </div>
          </div>

          {/* SEÇÃO: SENHA */}
          <div className="space-y-4">
            <SectionTitle>
              {modo === 'criacao' ? 'Senha de Acesso' : 'Alterar Senha'}
            </SectionTitle>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* SENHA */}
              <div className="space-y-1.5">
                <FieldLabel>{modo === 'criacao' ? 'Senha Inicial *' : 'Nova Senha (opcional)'}</FieldLabel>
                <div className="relative group">
                  <FieldIcon><Key size={16} /></FieldIcon>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder={modo === 'criacao' ? 'Mínimo 6 caracteres' : 'Deixe em branco para manter'}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl pl-11 pr-12 py-3 text-xs font-semibold focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all placeholder:text-zinc-300"
                    value={formData.senha}
                    onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-300 hover:text-zinc-500 transition-colors"
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {/* CONFIRMAR SENHA */}
              {(modo === 'criacao' || formData.senha) && (
                <div className="space-y-1.5">
                  <FieldLabel>{modo === 'criacao' ? 'Confirmar Senha *' : 'Confirmar Nova Senha'}</FieldLabel>
                  <div className="relative group">
                    <FieldIcon><Lock size={16} /></FieldIcon>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Repita a senha"
                      className={fieldClass}
                      value={formData.confirmarSenha}
                      onChange={(e) => setFormData({ ...formData, confirmarSenha: e.target.value })}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* SEÇÃO: STATUS (apenas edição) */}
          {modo === 'edicao' && (
            <div className="space-y-3">
              <SectionTitle>Status da Conta</SectionTitle>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, status: 'ativo' })}
                  className={`flex-1 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    formData.status === 'ativo'
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : 'bg-zinc-100 text-zinc-400 hover:bg-zinc-200'
                  }`}
                >
                  Ativo
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, status: 'inativo' })}
                  className={`flex-1 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    formData.status === 'inativo'
                      ? 'bg-red-500 text-white shadow-sm'
                      : 'bg-zinc-100 text-zinc-400 hover:bg-zinc-200'
                  }`}
                >
                  Inativo
                </button>
              </div>
              <p className="text-[10px] text-zinc-400 px-1">
                Usuários inativos não conseguem fazer login no sistema.
              </p>
            </div>
          )}

          {/* FOOTER */}
          <div className="pt-2 border-t border-zinc-100 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-4 py-3 border border-zinc-200 text-zinc-500 rounded-xl text-[10px] font-black uppercase tracking-[2px] hover:bg-zinc-50 transition-all disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-[2] px-4 py-3 bg-zinc-900 text-white rounded-xl text-[10px] font-black uppercase tracking-[2px] shadow-lg shadow-zinc-200 hover:bg-zinc-800 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <><Loader2 size={14} className="animate-spin" />{modo === 'criacao' ? 'Criando...' : 'Salvando...'}</>
              ) : (
                <><CheckCircle size={14} />{modo === 'criacao' ? 'Confirmar Cadastro' : 'Salvar Alterações'}</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── helpers de estilo ──────────────────────────────────────────────────────────
const fieldClass =
  'w-full bg-zinc-50 border border-zinc-200 rounded-2xl pl-11 pr-4 py-3 text-xs font-semibold focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all placeholder:text-zinc-300';

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="text-[10px] font-black text-zinc-400 uppercase tracking-tight ml-1">{children}</label>;
}

function FieldIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300 group-focus-within:text-indigo-500 transition-colors">
      {children}
    </span>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-1 h-4 bg-indigo-500 rounded-full" />
      <h3 className="text-xs font-black text-zinc-600 uppercase tracking-widest">{children}</h3>
    </div>
  );
}

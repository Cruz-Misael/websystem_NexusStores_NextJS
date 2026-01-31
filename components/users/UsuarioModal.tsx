// components/users/UsuarioModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { 
  X, User, Mail, Shield, Key, Eye, EyeOff, 
  UserPlus, UserCog, CheckCircle, Loader2,
  Smartphone, Globe, Lock
} from 'lucide-react';

interface ModalUsuarioProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (usuario: UsuarioData) => void;
  usuarioParaEditar?: UsuarioData | null;
  modo?: 'criacao' | 'edicao';
}

interface UsuarioData {
  id?: string;
  nome: string;
  email: string;
  cargo: string;
  senha?: string;
  telefone?: string;
  departamento?: string;
  status?: 'ativo' | 'inativo' | 'pendente';
  permissoes?: string[];
}

export default function UsuarioModal({ 
  isOpen, 
  onClose, 
  onSave, 
  usuarioParaEditar = null,
  modo = 'criacao' 
}: ModalUsuarioProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState<UsuarioData>({
    nome: '',
    email: '',
    cargo: 'Operador',
    senha: '',
    telefone: '',
    departamento: '',
    status: 'ativo',
    permissoes: []
  });

  // Reset form when modal opens/closes or when editing user changes
  useEffect(() => {
    if (isOpen) {
      if (modo === 'edicao' && usuarioParaEditar) {
        // Preenche o formulário com os dados do usuário para edição
        setFormData({
          nome: usuarioParaEditar.nome,
          email: usuarioParaEditar.email,
          cargo: usuarioParaEditar.cargo,
          senha: '', // Senha em branco para edição
          telefone: usuarioParaEditar.telefone || '',
          departamento: usuarioParaEditar.departamento || '',
          status: usuarioParaEditar.status || 'ativo',
          permissoes: usuarioParaEditar.permissoes || []
        });
      } else {
        // Reseta o formulário para criação
        setFormData({
          nome: '',
          email: '',
          cargo: 'Operador',
          senha: '',
          telefone: '',
          departamento: '',
          status: 'ativo',
          permissoes: []
        });
      }
    }
  }, [isOpen, usuarioParaEditar, modo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Validações
    if (!formData.nome || !formData.email) {
      setIsLoading(false);
      return;
    }

    if (modo === 'criacao' && !formData.senha) {
      setIsLoading(false);
      return;
    }

    // Simulação de delay para feedback visual
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Prepara os dados para envio
    const usuarioData: UsuarioData = {
      ...formData,
      id: modo === 'edicao' ? usuarioParaEditar?.id : Date.now().toString(),
    };

    // Remove a senha se estiver em branco na edição
    if (modo === 'edicao' && !formData.senha) {
      delete usuarioData.senha;
    }

    onSave(usuarioData);
    setIsLoading(false);
    onClose();
  };

  const cargos = [
    { value: 'Operador', label: 'Operador', desc: 'Acesso básico ao sistema', color: 'blue' },
    { value: 'Gerente', label: 'Gerente', desc: 'Acesso a relatórios e gestão', color: 'green' },
    { value: 'Admin', label: 'Administrador', desc: 'Acesso completo ao sistema', color: 'purple' },
    { value: 'Financeiro', label: 'Financeiro', desc: 'Acesso a transações financeiras', color: 'amber' },
    { value: 'Estoque', label: 'Estoque', desc: 'Acesso ao controle de inventário', color: 'orange' }
  ];

  const departamentos = [
    'Vendas', 'Financeiro', 'Operações', 'TI', 'Marketing', 'RH', 'Logística'
  ];

  const permissoes = [
    { id: 'vendas', label: 'Módulo de Vendas' },
    { id: 'estoque', label: 'Controle de Estoque' },
    { id: 'financeiro', label: 'Gestão Financeira' },
    { id: 'relatorios', label: 'Acesso a Relatórios' },
    { id: 'configuracoes', label: 'Configurações do Sistema' },
    { id: 'usuarios', label: 'Gerenciar Usuários' }
  ];

  const handlePermissaoToggle = (permissaoId: string) => {
    setFormData(prev => {
      const novasPermissoes = prev.permissoes?.includes(permissaoId)
        ? prev.permissoes.filter(p => p !== permissaoId)
        : [...(prev.permissoes || []), permissaoId];
      
      return { ...prev, permissoes: novasPermissoes };
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-2xl rounded-[24px] shadow-2xl border border-zinc-200 overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
        
        {/* HEADER DO MODAL */}
        <div className="px-6 py-5 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50 sticky top-0">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 ${modo === 'criacao' ? 'bg-indigo-600' : 'bg-amber-500'} rounded-xl flex items-center justify-center text-white shadow-lg ${modo === 'criacao' ? 'shadow-indigo-100' : 'shadow-amber-100'}`}>
              {modo === 'criacao' ? <UserPlus size={20} strokeWidth={2.5} /> : <UserCog size={20} strokeWidth={2.5} />}
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-tight text-zinc-800">
                {modo === 'criacao' ? 'Novo Colaborador' : 'Editar Colaborador'}
              </h2>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                {modo === 'criacao' ? 'Acesso ao sistema' : 'Atualizar informações'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-zinc-200/50 rounded-xl transition-colors text-zinc-400"
          >
            <X size={18} />
          </button>
        </div>

        {/* FORMULÁRIO */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* SEÇÃO 1: INFORMAÇÕES BÁSICAS */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 bg-indigo-500 rounded-full"></div>
              <h3 className="text-xs font-black text-zinc-600 uppercase tracking-widest">Informações Pessoais</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* NOME COMPLETO */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-tight ml-1">
                  Nome Completo *
                </label>
                <div className="relative group">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300 group-focus-within:text-indigo-500 transition-colors">
                    <User size={16} />
                  </span>
                  <input 
                    required
                    type="text"
                    placeholder="Ex: João Silva"
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl pl-11 pr-4 py-3 text-xs font-semibold focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all placeholder:text-zinc-300"
                    value={formData.nome}
                    onChange={(e) => setFormData({...formData, nome: e.target.value})}
                  />
                </div>
              </div>

              {/* EMAIL */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-tight ml-1">
                  E-mail Profissional *
                </label>
                <div className="relative group">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300 group-focus-within:text-indigo-500 transition-colors">
                    <Mail size={16} />
                  </span>
                  <input 
                    required
                    type="email"
                    placeholder="nome@empresa.com"
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl pl-11 pr-4 py-3 text-xs font-semibold focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all placeholder:text-zinc-300"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </div>
              </div>

              {/* TELEFONE */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-tight ml-1">
                  Telefone
                </label>
                <div className="relative group">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300 group-focus-within:text-indigo-500 transition-colors">
                    <Smartphone size={16} />
                  </span>
                  <input 
                    type="tel"
                    placeholder="(00) 00000-0000"
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl pl-11 pr-4 py-3 text-xs font-semibold focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all placeholder:text-zinc-300"
                    value={formData.telefone}
                    onChange={(e) => setFormData({...formData, telefone: e.target.value})}
                  />
                </div>
              </div>

              {/* DEPARTAMENTO */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-tight ml-1">
                  Departamento
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300">
                    <Globe size={16} />
                  </span>
                  <select 
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl pl-11 pr-4 py-3 text-xs font-semibold focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all appearance-none cursor-pointer"
                    value={formData.departamento}
                    onChange={(e) => setFormData({...formData, departamento: e.target.value})}
                  >
                    <option value="">Selecione um departamento</option>
                    {departamentos.map(depto => (
                      <option key={depto} value={depto}>{depto}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* SEÇÃO 2: ACESSO E PERMISSÕES */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 bg-indigo-500 rounded-full"></div>
              <h3 className="text-xs font-black text-zinc-600 uppercase tracking-widest">Acesso ao Sistema</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* CARGO / PERMISSÃO */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-tight ml-1">
                  Cargo / Nível de Acesso *
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300">
                    <Shield size={16} />
                  </span>
                  <select 
                    required
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl pl-11 pr-4 py-3 text-xs font-semibold focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all appearance-none cursor-pointer"
                    value={formData.cargo}
                    onChange={(e) => setFormData({...formData, cargo: e.target.value})}
                  >
                    {cargos.map(cargo => (
                      <option key={cargo.value} value={cargo.value}>
                        {cargo.label}
                      </option>
                    ))}
                  </select>
                </div>
                {cargos.find(c => c.value === formData.cargo) && (
                  <p className="text-[10px] text-zinc-400 mt-1 px-1">
                    {cargos.find(c => c.value === formData.cargo)?.desc}
                  </p>
                )}
              </div>

              {/* SENHA */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-tight ml-1">
                  {modo === 'criacao' ? 'Senha Inicial *' : 'Nova Senha (opcional)'}
                </label>
                <div className="relative group">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300 group-focus-within:text-indigo-500 transition-colors">
                    <Key size={16} />
                  </span>
                  <input 
                    type={showPassword ? "text" : "password"}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl pl-11 pr-12 py-3 text-xs font-semibold focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all"
                    placeholder={modo === 'criacao' ? 'Digite a senha inicial' : 'Deixe em branco para manter'}
                    value={formData.senha || ''}
                    onChange={(e) => setFormData({...formData, senha: e.target.value})}
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-300 hover:text-zinc-500 transition-colors"
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                {modo === 'criacao' && (
                  <p className="text-[9px] text-zinc-400 mt-1 px-1">
                    O usuário poderá alterar a senha no primeiro acesso
                  </p>
                )}
              </div>
            </div>

            {/* STATUS (APENAS PARA EDIÇÃO) */}
            {modo === 'edicao' && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-tight ml-1">
                  Status da Conta
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, status: 'ativo'})}
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
                    onClick={() => setFormData({...formData, status: 'inativo'})}
                    className={`flex-1 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      formData.status === 'inativo' 
                        ? 'bg-red-500 text-white shadow-sm' 
                        : 'bg-zinc-100 text-zinc-400 hover:bg-zinc-200'
                    }`}
                  >
                    Inativo
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* SEÇÃO 3: PERMISSÕES ESPECÍFICAS */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 bg-indigo-500 rounded-full"></div>
              <h3 className="text-xs font-black text-zinc-600 uppercase tracking-widest">Permissões Específicas</h3>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {permissoes.map(permissao => (
                <label 
                  key={permissao.id}
                  className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${
                    formData.permissoes?.includes(permissao.id)
                      ? 'bg-indigo-50 border-indigo-200'
                      : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={formData.permissoes?.includes(permissao.id) || false}
                    onChange={() => handlePermissaoToggle(permissao.id)}
                    className="sr-only"
                  />
                  <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                    formData.permissoes?.includes(permissao.id)
                      ? 'bg-indigo-500 border-indigo-500'
                      : 'bg-white border-zinc-300'
                  }`}>
                    {formData.permissoes?.includes(permissao.id) && (
                      <CheckCircle size={12} className="text-white" />
                    )}
                  </div>
                  <span className="text-xs font-medium text-zinc-700">{permissao.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* FOOTER DO MODAL */}
          <div className="pt-6 border-t border-zinc-100 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-zinc-200 text-zinc-500 rounded-xl text-[10px] font-black uppercase tracking-[2px] hover:bg-zinc-50 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-[2] px-4 py-3 bg-zinc-900 text-white rounded-xl text-[10px] font-black uppercase tracking-[2px] shadow-lg shadow-zinc-200 hover:bg-zinc-800 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  {modo === 'criacao' ? 'Criando...' : 'Atualizando...'}
                </>
              ) : (
                <>
                  <CheckCircle size={14} />
                  {modo === 'criacao' ? 'Confirmar Cadastro' : 'Salvar Alterações'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
// app/configuracoes/page.tsx
'use client';
import UsuarioModal from '@/components/users/UsuarioModal';
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Toaster, toast } from 'react-hot-toast';
import { CompanyService, CompanyData } from '@/services/company.service';
import { UserService, AuthorizedUser } from '@/services/user.service';
import {
  listarTodasCategorias,
  criarCategoria,
  atualizarCategoria,
  deletarCategoria,
  ProductCategory,
} from '@/src/services/category.service';
import {
  listarOperadores,
  criarOperador,
  atualizarOperador,
  deletarOperador,
  Operator,
  OperatorPermissions,
} from '@/src/services/operator.service';
import {
  Building,
  Users,
  Settings,
  Upload,
  Loader2,
  FileText,
  Phone,
  Mail,
  UserPlus,
  Edit,
  Trash2,
  Save,
  Layers,
  Plus,
  X,
  Check,
  UserCog,
  CreditCard,
  Calendar,
  Lock,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { BillingService, BillingConfig, calcularProximoVencimento, calcularStatus } from '@/src/services/billing.service';

type TabType = 'loja' | 'usuarios' | 'categorias' | 'operadores' | 'pagamento';
type UsuarioCargo = 'admin' | 'gerente' | 'colaborador';
type UsuarioStatus = 'ativo' | 'inativo' | 'pendente';

interface UsuarioParaEdicao {
  id: string;
  full_name: string;
  email: string;
  role: UsuarioCargo;
  status: UsuarioStatus;
  phone?: string;
  department?: string;
  permissions?: string[];
}

interface FormLojaData {
  nomeCompleto: string;
  nomeFantasia: string;
  descricao: string;
  cnpj: string;
  telefone: string;
  email: string;
  website: string;
  logo: File | null;
  logoPreview: string;
}

const defaultPermissions: OperatorPermissions = {
  can_cancel_sale: false,
  can_give_discount: true,
  can_process_return: false,
  max_discount_percentage: 10,
};

const emptyOperator: Omit<Operator, 'id' | 'created_at' | 'updated_at'> = {
  name: '',
  code: '',
  pin: '',
  email: '',
  phone: '',
  role: 'operator',
  permissions: defaultPermissions,
  is_active: true,
};

export default function ConfiguracoesPage() {
  const [activeTab, setActiveTab] = useState<TabType>('loja');
  const [isLoading, setIsLoading] = useState(false);
  const [progresso, setProgresso] = useState({ loja: 0, usuarios: 0 });
  const [modalAberto, setModalAberto] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState<UsuarioParaEdicao | null>(null);
  const [modoModal, setModoModal] = useState<'criacao' | 'edicao'>('criacao');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Loja ---
  const [formLoja, setFormLoja] = useState<FormLojaData>({
    nomeCompleto: '', nomeFantasia: '', descricao: '', cnpj: '',
    telefone: '', email: '', website: '', logo: null, logoPreview: '',
  });

  // --- Usuários ---
  const [usuarios, setUsuarios] = useState<AuthorizedUser[]>([]);

  // --- Categorias ---
  const [categorias, setCategorias] = useState<ProductCategory[]>([]);
  const [categoriaEditando, setCategoriaEditando] = useState<ProductCategory | null>(null);
  const [modalCategoriaAberto, setModalCategoriaAberto] = useState(false);
  const [formCategoria, setFormCategoria] = useState({ name: '', description: '', color: '#6366f1' });
  const [salvandoCategoria, setSalvandoCategoria] = useState(false);

  // --- Operadores ---
  const [operadores, setOperadores] = useState<Operator[]>([]);
  const [operadorEditando, setOperadorEditando] = useState<Operator | null>(null);
  const [modalOperadorAberto, setModalOperadorAberto] = useState(false);
  const [formOperador, setFormOperador] = useState<Omit<Operator, 'id' | 'created_at' | 'updated_at'>>(emptyOperator);
  const [salvandoOperador, setSalvandoOperador] = useState(false);

  // --- Pagamento / Billing ---
  const [billing, setBilling] = useState<BillingConfig | null>(null);
  const [formBilling, setFormBilling] = useState({
    plan_type: 'monthly' as 'monthly' | 'annual',
    billing_start_date: new Date().toISOString().split('T')[0],
    due_day: 1,
    notes: '',
  });
  const [salvandoBilling, setSalvandoBilling] = useState(false);
  const [registrandoPagamento, setRegistrandoPagamento] = useState(false);

  // ========== LOJA ==========

  const handleLojaInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    let formattedValue = value;
    if (name === 'cnpj') {
      formattedValue = value.replace(/\D/g, '').replace(/(\d{2})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1/$2').replace(/(\d{4})(\d)/, '$1-$2').slice(0, 18);
    } else if (name === 'telefone') {
      formattedValue = value.replace(/\D/g, '').replace(/(\d{0})(\d)/, '$1($2').replace(/(\d{2})(\d)/, '$1) $2').replace(/(\d{5})(\d)/, '$1-$2').slice(0, 15);
    }
    setFormLoja(prev => ({ ...prev, [name]: formattedValue }));
  };

  const salvarConfiguracoesLoja = async () => {
    if (!formLoja.nomeCompleto || !formLoja.cnpj || !formLoja.telefone || !formLoja.email) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }
    setIsLoading(true);
    try {
      let logoUrl = formLoja.logoPreview;
      if (formLoja.logo) logoUrl = await CompanyService.uploadLogo(formLoja.logo);
      const companyData: CompanyData = {
        name: formLoja.nomeCompleto, fantasy_name: formLoja.nomeFantasia,
        description: formLoja.descricao, cnpj: formLoja.cnpj,
        phone: formLoja.telefone, email: formLoja.email,
        website: formLoja.website, logo_url: logoUrl,
      };
      await CompanyService.saveCompany(companyData);
      toast.success('Configurações da loja salvas com sucesso!');
    } catch (error) {
      toast.error('Erro ao salvar configurações da loja');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('A imagem deve ter no máximo 2MB.'); return; }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { toast.error('Formato inválido. Use JPG, PNG ou WebP.'); return; }
    const reader = new FileReader();
    reader.onloadend = () => setFormLoja(prev => ({ ...prev, logo: file, logoPreview: reader.result as string }));
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setFormLoja(prev => ({ ...prev, logo: null, logoPreview: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ========== USUÁRIOS ==========

  const abrirModalEdicao = (usuario: AuthorizedUser) => {
    setUsuarioEditando({ id: usuario.id, full_name: usuario.full_name || '', email: usuario.email, role: usuario.role, status: usuario.status, phone: usuario.phone || '', department: usuario.department || '', permissions: usuario.permissions || [] });
    setModoModal('edicao');
    setModalAberto(true);
  };

  const abrirModalCriacao = () => { setUsuarioEditando(null); setModoModal('criacao'); setModalAberto(true); };

  const handleDeleteUsuario = async (id: string) => {
    try { await UserService.removeAuthorizedUser(id); await loadAuthorizedUsers(); toast.success('Usuário removido'); } catch { toast.error('Erro ao remover usuário'); }
  };

  const handleSalvarUsuario = async (dadosUsuario: any) => {
    if (modoModal === 'criacao') {
      const response = await fetch('/api/create-user', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: dadosUsuario.email, password: dadosUsuario.senha, name: dadosUsuario.nome, role: dadosUsuario.cargo }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Falha ao criar usuário.');
      toast.success('Usuário criado!');
    } else {
      if (!usuarioEditando) throw new Error('Nenhum usuário selecionado.');
      await UserService.updateAuthorizedUser(usuarioEditando.id, { full_name: dadosUsuario.nome, phone: dadosUsuario.telefone, role: dadosUsuario.cargo, status: dadosUsuario.status });
      if (dadosUsuario.senha) {
        const userToEdit = usuarios.find(u => u.id === usuarioEditando.id);
        if (!userToEdit) throw new Error('ID não encontrado.');
        await UserService.updateUserPassword(userToEdit.user_id, dadosUsuario.senha);
      }
      toast.success('Usuário atualizado!');
    }
    await loadAuthorizedUsers();
    setModalAberto(false);
  };

  // ========== CATEGORIAS ==========

  const loadCategorias = async () => {
    try { setCategorias(await listarTodasCategorias()); } catch { toast.error('Erro ao carregar categorias'); }
  };

  const abrirModalNovaCategoria = () => {
    setCategoriaEditando(null);
    setFormCategoria({ name: '', description: '', color: '#6366f1' });
    setModalCategoriaAberto(true);
  };

  const abrirModalEditarCategoria = (cat: ProductCategory) => {
    setCategoriaEditando(cat);
    setFormCategoria({ name: cat.name, description: cat.description || '', color: cat.color });
    setModalCategoriaAberto(true);
  };

  const handleSalvarCategoria = async () => {
    if (!formCategoria.name.trim()) { toast.error('Nome é obrigatório'); return; }
    setSalvandoCategoria(true);
    try {
      if (categoriaEditando) {
        await atualizarCategoria(categoriaEditando.id, formCategoria);
        toast.success('Categoria atualizada!');
      } else {
        await criarCategoria(formCategoria);
        toast.success('Categoria criada!');
      }
      await loadCategorias();
      setModalCategoriaAberto(false);
    } catch (e: any) {
      toast.error(e.message || 'Erro ao salvar categoria');
    } finally {
      setSalvandoCategoria(false);
    }
  };

  const handleToggleCategoria = async (cat: ProductCategory) => {
    try {
      await atualizarCategoria(cat.id, { is_active: !cat.is_active });
      await loadCategorias();
    } catch { toast.error('Erro ao atualizar categoria'); }
  };

  const handleDeleteCategoria = async (id: string) => {
    try { await deletarCategoria(id); await loadCategorias(); toast.success('Categoria removida'); } catch (e: any) { toast.error(e.message || 'Erro ao remover categoria'); }
  };

  // ========== OPERADORES ==========

  const loadOperadores = async () => {
    try { setOperadores(await listarOperadores()); } catch { toast.error('Erro ao carregar operadores'); }
  };

  const abrirModalNovoOperador = () => {
    setOperadorEditando(null);
    setFormOperador(emptyOperator);
    setModalOperadorAberto(true);
  };

  const abrirModalEditarOperador = (op: Operator) => {
    setOperadorEditando(op);
    setFormOperador({ name: op.name, code: op.code, pin: op.pin, email: op.email, phone: op.phone, role: op.role, permissions: { ...op.permissions }, is_active: op.is_active });
    setModalOperadorAberto(true);
  };

  const handleSalvarOperador = async () => {
    if (!formOperador.name.trim()) { toast.error('Nome é obrigatório'); return; }
    setSalvandoOperador(true);
    try {
      if (operadorEditando) {
        await atualizarOperador(operadorEditando.id, formOperador);
        toast.success('Operador atualizado!');
      } else {
        await criarOperador(formOperador);
        toast.success('Operador criado!');
      }
      await loadOperadores();
      setModalOperadorAberto(false);
    } catch (e: any) {
      toast.error(e.message || 'Erro ao salvar operador');
    } finally {
      setSalvandoOperador(false);
    }
  };

  const handleDeleteOperador = async (id: string) => {
    try { await deletarOperador(id); await loadOperadores(); toast.success('Operador removido'); } catch (e: any) { toast.error(e.message || 'Erro ao remover operador'); }
  };

  // ========== PAGAMENTO ==========

  const loadBilling = async () => {
    try {
      const data = await BillingService.getBilling();
      if (data) {
        setBilling(data);
        setFormBilling({
          plan_type: data.plan_type,
          billing_start_date: data.billing_start_date,
          due_day: data.due_day,
          notes: data.notes || '',
        });
      }
    } catch { toast.error('Erro ao carregar configurações de pagamento'); }
  };

  const handleSalvarBilling = async () => {
    if (!formBilling.billing_start_date) { toast.error('Informe a data de início'); return; }
    if (formBilling.due_day < 1 || formBilling.due_day > 28) { toast.error('Dia de cobrança deve ser entre 1 e 28'); return; }
    setSalvandoBilling(true);
    try {
      const nextDue = calcularProximoVencimento(formBilling.plan_type, formBilling.due_day, formBilling.billing_start_date);
      const saved = await BillingService.saveBilling({ ...formBilling, next_due_date: nextDue });
      setBilling(saved);
      toast.success('Configuração de pagamento salva!');
    } catch (e: any) {
      toast.error(e.message || 'Erro ao salvar');
    } finally {
      setSalvandoBilling(false);
    }
  };

  const handleRegistrarPagamento = async () => {
    setRegistrandoPagamento(true);
    try {
      const updated = await BillingService.registrarPagamento();
      setBilling(updated);
      toast.success('Pagamento registrado! Próximo vencimento atualizado.');
    } catch (e: any) {
      toast.error(e.message || 'Erro ao registrar pagamento');
    } finally {
      setRegistrandoPagamento(false);
    }
  };

  const billingStatusInfo = () => {
    if (!billing) return { label: 'Não configurado', color: 'bg-zinc-100 text-zinc-500', icon: AlertTriangle };
    const s = calcularStatus(billing.next_due_date);
    if (s === 'active') return { label: 'Em dia', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 };
    if (s === 'overdue') return { label: 'Em atraso', color: 'bg-amber-100 text-amber-700', icon: AlertTriangle };
    return { label: 'Bloqueado', color: 'bg-red-100 text-red-700', icon: Lock };
  };

  // ========== EFEITOS ==========

  useEffect(() => {
    const campos = [
      { value: formLoja.nomeCompleto, peso: 25 }, { value: formLoja.cnpj, peso: 15 },
      { value: formLoja.telefone, peso: 15 }, { value: formLoja.email, peso: 20 },
      { value: formLoja.descricao, peso: 10 }, { value: formLoja.logoPreview, peso: 15 },
    ];
    const total = campos.reduce((acc, { value, peso }) => acc + (value?.trim() ? peso : 0), 0);
    setProgresso(prev => ({ ...prev, loja: total }));
  }, [formLoja]);

  useEffect(() => {
    const ativos = usuarios.filter(u => u.status === 'ativo').length;
    setProgresso(prev => ({ ...prev, usuarios: Math.min(100, (ativos / Math.max(usuarios.length, 1)) * 100) }));
  }, [usuarios]);

  useEffect(() => { loadCompanyData(); loadAuthorizedUsers(); loadCategorias(); loadOperadores(); loadBilling(); }, []);

  const loadCompanyData = async () => {
    try {
      const company = await CompanyService.getCompany();
      if (company) setFormLoja({ nomeCompleto: company.name, nomeFantasia: company.fantasy_name || '', descricao: company.description || '', cnpj: company.cnpj || '', telefone: company.phone || '', email: company.email || '', website: company.website || '', logo: null, logoPreview: company.logo_url || '' });
    } catch { toast.error('Erro ao carregar dados da empresa'); }
  };

  const loadAuthorizedUsers = async () => {
    try { setUsuarios(await UserService.getAuthorizedUsers()); } catch { toast.error('Erro ao carregar usuários'); }
  };

  const getStatusColor = (status: UsuarioStatus) => ({ ativo: 'bg-green-100 text-green-800 border-green-200', inativo: 'bg-red-100 text-red-800 border-red-200', pendente: 'bg-yellow-100 text-yellow-800 border-yellow-200' }[status]);
  const getCargoColor = (cargo: UsuarioCargo) => ({ admin: 'bg-purple-100 text-purple-800 border-purple-200', gerente: 'bg-blue-100 text-blue-800 border-blue-200', colaborador: 'bg-gray-100 text-gray-800 border-gray-200' }[cargo]);
  const getAvatarColor = (nome: string) => (['bg-gradient-to-r from-indigo-500 to-purple-500', 'bg-gradient-to-r from-blue-500 to-cyan-500', 'bg-gradient-to-r from-emerald-500 to-green-500', 'bg-gradient-to-r from-amber-500 to-orange-500', 'bg-gradient-to-r from-pink-500 to-rose-500'][nome.charCodeAt(0) % 5]);
  const getRoleLabel = (role: string) => ({ operator: 'Operador', supervisor: 'Supervisor', manager: 'Gerente' }[role] ?? role);
  const getRoleColor = (role: string) => ({ operator: 'bg-gray-100 text-gray-800 border-gray-200', supervisor: 'bg-blue-100 text-blue-800 border-blue-200', manager: 'bg-purple-100 text-purple-800 border-purple-200' }[role] ?? 'bg-gray-100 text-gray-700 border-gray-200');

  const tabs = [
    { id: 'loja', label: 'Dados da Loja', icon: Building, desc: 'Identidade e CNPJ' },
    { id: 'usuarios', label: 'Usuários', icon: Users, desc: 'Equipe e permissões' },
    { id: 'categorias', label: 'Categorias', icon: Layers, desc: 'Categorias de produtos' },
    { id: 'operadores', label: 'Operadores', icon: UserCog, desc: 'Operadores do caixa' },
    { id: 'pagamento', label: 'Pagamento', icon: CreditCard, desc: 'Assinatura e vencimento' },
  ];

  return (
    <div className="flex flex-col h-full max-h-screen bg-zinc-50 text-zinc-900 font-sans overflow-hidden border border-zinc-300 rounded-lg shadow-2xl mx-auto">
      <Toaster position="top-right" />

      <header className="h-16 bg-white border-b border-zinc-200 flex justify-between items-center px-6 shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Settings size={22} className="text-indigo-600" strokeWidth={2.5} />
              <h1 className="text-xl font-extrabold text-zinc-900 tracking-tight leading-none">Configurações</h1>
            </div>
            <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider ml-7">Ajustes do sistema e acessos</p>
          </div>
        </div>
        {activeTab === 'loja' && (
          <button onClick={salvarConfiguracoesLoja} disabled={isLoading} className="bg-zinc-900 hover:bg-zinc-800 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[2px] transition-all shadow-lg active:scale-95 disabled:opacity-50 flex items-center gap-2">
            {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {isLoading ? 'Salvando' : 'Salvar Alterações'}
          </button>
        )}
        {activeTab === 'pagamento' && (
          <button onClick={handleSalvarBilling} disabled={salvandoBilling} className="bg-zinc-900 hover:bg-zinc-800 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[2px] transition-all shadow-lg active:scale-95 disabled:opacity-50 flex items-center gap-2">
            {salvandoBilling ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {salvandoBilling ? 'Salvando' : 'Salvar Configuração'}
          </button>
        )}
      </header>

      <div className="flex flex-1 overflow-hidden min-h-0">
        <aside className="w-64 border-r border-zinc-200 bg-white flex flex-col shrink-0 min-h-0">
          <nav className="p-4 space-y-2">
            {tabs.map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as TabType)}
                className={`w-full p-3 rounded-2xl transition-all flex items-center gap-3 group border-2 ${activeTab === tab.id ? 'bg-indigo-50 border-indigo-100 text-indigo-600' : 'bg-transparent border-transparent text-zinc-500 hover:bg-zinc-50'}`}>
                <div className={`p-2 rounded-xl ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-md' : 'bg-zinc-100 group-hover:bg-zinc-200'}`}>
                  <tab.icon size={18} strokeWidth={activeTab === tab.id ? 2.5 : 2} />
                </div>
                <div className="text-left">
                  <p className="text-xs font-black uppercase tracking-tight leading-none">{tab.label}</p>
                  <p className="text-[10px] font-medium opacity-60 mt-1">{tab.desc}</p>
                </div>
              </button>
            ))}
          </nav>
          <div className="mt-auto p-6 border-t border-zinc-100 space-y-4">
            <div>
              <div className="flex justify-between text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">
                <span>Perfil da Loja</span><span className="text-indigo-600">{progresso.loja}%</span>
              </div>
              <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-600 transition-all duration-700" style={{ width: `${progresso.loja}%` }} />
              </div>
            </div>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto bg-zinc-50/50 p-8 min-h-0">
          <div className="max-w-4xl mx-auto">

            {/* ===== ABA LOJA ===== */}
            {activeTab === 'loja' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-400">
                <section className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm flex items-center gap-8">
                  <div className="relative w-24 h-24 shrink-0">
                    {formLoja.logoPreview ? (
                      <Image priority src={formLoja.logoPreview} alt="Logo" fill className="rounded-2xl object-cover border-4 border-white shadow-md" />
                    ) : (
                      <div className="w-full h-full bg-zinc-50 rounded-2xl border-2 border-dashed border-zinc-200 flex flex-col items-center justify-center text-zinc-300"><Upload size={24} /></div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-[11px] font-black text-zinc-800 uppercase tracking-[2px] mb-1">Logo da Empresa</h3>
                    <p className="text-xs text-zinc-400 mb-4">Exibida em recibos, PDV e relatórios. (Max 2MB)</p>
                    <div className="flex gap-2">
                      <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-zinc-900 text-white text-[10px] font-black rounded-lg uppercase tracking-widest hover:bg-zinc-800 transition-all">Escolher Arquivo</button>
                      {formLoja.logoPreview && <button onClick={handleRemoveLogo} className="px-4 py-2 bg-white border border-red-100 text-red-500 text-[10px] font-black rounded-lg uppercase tracking-widest hover:bg-red-50 transition-all">Remover</button>}
                    </div>
                  </div>
                  <input ref={fileInputRef} type="file" className="hidden" accept="image/png,image/jpeg,image/webp" onChange={handleImageUpload} />
                </section>
                <section className="bg-white p-8 rounded-2xl border border-zinc-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-6"><div className="w-1 h-4 bg-indigo-500 rounded-full"></div><h3 className="text-xs font-black text-zinc-800 uppercase tracking-[2px]">Dados Cadastrais</h3></div>
                  <div className="grid grid-cols-2 gap-6">
                    <Input label="Razão Social" name="nomeCompleto" value={formLoja.nomeCompleto} onChange={handleLojaInputChange} icon={<Building size={14} />} placeholder="Nome oficial" />
                    <Input label="CNPJ" name="cnpj" value={formLoja.cnpj} onChange={handleLojaInputChange} icon={<FileText size={14} />} placeholder="00.000.000/0000-00" />
                    <Input label="E-mail Comercial" name="email" value={formLoja.email} onChange={handleLojaInputChange} icon={<Mail size={14} />} placeholder="loja@email.com" />
                    <Input label="Telefone" name="telefone" value={formLoja.telefone} onChange={handleLojaInputChange} icon={<Phone size={14} />} placeholder="(00) 00000-0000" />
                    <div className="col-span-2 space-y-1">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-tight ml-1">Descrição do Negócio</label>
                      <textarea name="descricao" value={formLoja.descricao} onChange={handleLojaInputChange} rows={3} className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl p-4 text-xs font-medium focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all resize-none" placeholder="Sobre sua loja..." />
                    </div>
                  </div>
                </section>
              </div>
            )}

            {/* ===== ABA USUÁRIOS ===== */}
            {activeTab === 'usuarios' && (
              <div className="space-y-6 animate-in fade-in duration-400">
                <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-inner"><UserPlus size={22} /></div>
                    <div><h3 className="text-sm font-black uppercase tracking-tight">Membros da Equipe</h3><p className="text-[11px] font-medium text-zinc-400">Gerencie níveis de acesso e colaboradores</p></div>
                  </div>
                  <button onClick={abrirModalCriacao} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-[2px] shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">+ Novo Usuário</button>
                </div>
                <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-zinc-50/80 text-[10px] font-black text-zinc-400 uppercase border-b border-zinc-100">
                      <tr><th className="px-6 py-4 tracking-widest">Colaborador</th><th className="px-6 py-4 tracking-widest">Nível</th><th className="px-6 py-4 tracking-widest">Status</th><th className="px-6 py-4 tracking-widest text-right">Ações</th></tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50 text-xs">
                      {usuarios.map(u => {
                        const displayName = u.full_name || u.email.split('@')[0];
                        return (
                          <tr key={u.id} className="hover:bg-indigo-50/20 transition-colors group">
                            <td className="px-6 py-4 flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-xl ${getAvatarColor(displayName)} text-white flex items-center justify-center font-black text-[10px] shadow-md`}>{displayName.substring(0, 2).toUpperCase()}</div>
                              <div><p className="font-bold text-zinc-800 leading-none">{displayName}</p><p className="text-[10px] text-zinc-400 mt-1 font-medium">{u.email}</p></div>
                            </td>
                            <td className="px-6 py-4"><span className={`text-[9px] font-black uppercase px-2 py-1 rounded-md border ${getCargoColor(u.role as UsuarioCargo)}`}>{u.role}</span></td>
                            <td className="px-6 py-4"><span className={`text-[9px] font-black uppercase px-2 py-1 rounded-md border ${getStatusColor(u.status as UsuarioStatus)}`}>{u.status}</span></td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => abrirModalEdicao(u)} className="p-2 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"><Edit size={14} /></button>
                                <button onClick={() => handleDeleteUsuario(u.id)} className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={14} /></button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ===== ABA CATEGORIAS ===== */}
            {activeTab === 'categorias' && (
              <div className="space-y-6 animate-in fade-in duration-400">
                <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-inner"><Layers size={22} /></div>
                    <div><h3 className="text-sm font-black uppercase tracking-tight">Categorias de Produtos</h3><p className="text-[11px] font-medium text-zinc-400">{categorias.length} categoria{categorias.length !== 1 ? 's' : ''} cadastrada{categorias.length !== 1 ? 's' : ''}</p></div>
                  </div>
                  <button onClick={abrirModalNovaCategoria} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-[2px] shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2"><Plus size={14} /> Nova Categoria</button>
                </div>
                <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
                  {categorias.length === 0 ? (
                    <div className="p-12 text-center"><Layers className="mx-auto mb-3 text-zinc-300" size={40} /><p className="text-zinc-500 text-sm">Nenhuma categoria cadastrada</p><button onClick={abrirModalNovaCategoria} className="mt-4 text-indigo-600 text-sm font-medium hover:underline">Criar primeira categoria</button></div>
                  ) : (
                    <table className="w-full text-left">
                      <thead className="bg-zinc-50/80 text-[10px] font-black text-zinc-400 uppercase border-b border-zinc-100">
                        <tr><th className="px-6 py-4 tracking-widest">Categoria</th><th className="px-6 py-4 tracking-widest">Descrição</th><th className="px-6 py-4 tracking-widest">Status</th><th className="px-6 py-4 tracking-widest text-right">Ações</th></tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-50 text-xs">
                        {categorias.map(cat => (
                          <tr key={cat.id} className="hover:bg-indigo-50/20 transition-colors group">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                                <span className="font-bold text-zinc-800">{cat.name}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-zinc-500">{cat.description || '—'}</td>
                            <td className="px-6 py-4">
                              <button onClick={() => handleToggleCategoria(cat)} className={`text-[9px] font-black uppercase px-2 py-1 rounded-md border transition-colors ${cat.is_active ? 'bg-green-100 text-green-800 border-green-200' : 'bg-zinc-100 text-zinc-500 border-zinc-200'}`}>
                                {cat.is_active ? 'Ativa' : 'Inativa'}
                              </button>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => abrirModalEditarCategoria(cat)} className="p-2 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"><Edit size={14} /></button>
                                <button onClick={() => handleDeleteCategoria(cat.id)} className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={14} /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

            {/* ===== ABA OPERADORES ===== */}
            {activeTab === 'operadores' && (
              <div className="space-y-6 animate-in fade-in duration-400">
                <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-inner"><UserCog size={22} /></div>
                    <div><h3 className="text-sm font-black uppercase tracking-tight">Operadores do Caixa</h3><p className="text-[11px] font-medium text-zinc-400">{operadores.filter(o => o.is_active).length} operador{operadores.filter(o => o.is_active).length !== 1 ? 'es' : ''} ativo{operadores.filter(o => o.is_active).length !== 1 ? 's' : ''}</p></div>
                  </div>
                  <button onClick={abrirModalNovoOperador} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-[2px] shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2"><Plus size={14} /> Novo Operador</button>
                </div>
                <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
                  {operadores.length === 0 ? (
                    <div className="p-12 text-center"><UserCog className="mx-auto mb-3 text-zinc-300" size={40} /><p className="text-zinc-500 text-sm">Nenhum operador cadastrado</p><button onClick={abrirModalNovoOperador} className="mt-4 text-indigo-600 text-sm font-medium hover:underline">Cadastrar primeiro operador</button></div>
                  ) : (
                    <table className="w-full text-left">
                      <thead className="bg-zinc-50/80 text-[10px] font-black text-zinc-400 uppercase border-b border-zinc-100">
                        <tr><th className="px-6 py-4 tracking-widest">Operador</th><th className="px-6 py-4 tracking-widest">Código</th><th className="px-6 py-4 tracking-widest">Perfil</th><th className="px-6 py-4 tracking-widest">Permissões</th><th className="px-6 py-4 tracking-widest text-right">Ações</th></tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-50 text-xs">
                        {operadores.map(op => (
                          <tr key={op.id} className={`hover:bg-indigo-50/20 transition-colors group ${!op.is_active ? 'opacity-50' : ''}`}>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-xl ${getAvatarColor(op.name)} text-white flex items-center justify-center font-black text-[10px] shadow-md`}>{op.name.substring(0, 2).toUpperCase()}</div>
                                <div><p className="font-bold text-zinc-800 leading-none">{op.name}</p><p className="text-[10px] text-zinc-400 mt-1">{op.email || '—'}</p></div>
                              </div>
                            </td>
                            <td className="px-6 py-4 font-mono text-zinc-600">{op.code || '—'}</td>
                            <td className="px-6 py-4"><span className={`text-[9px] font-black uppercase px-2 py-1 rounded-md border ${getRoleColor(op.role)}`}>{getRoleLabel(op.role)}</span></td>
                            <td className="px-6 py-4">
                              <div className="flex gap-1 flex-wrap">
                                {op.permissions.can_give_discount && <span className="text-[9px] bg-amber-50 text-amber-700 border border-amber-100 px-1.5 py-0.5 rounded font-medium">Desconto {op.permissions.max_discount_percentage}%</span>}
                                {op.permissions.can_cancel_sale && <span className="text-[9px] bg-red-50 text-red-700 border border-red-100 px-1.5 py-0.5 rounded font-medium">Cancelar</span>}
                                {op.permissions.can_process_return && <span className="text-[9px] bg-blue-50 text-blue-700 border border-blue-100 px-1.5 py-0.5 rounded font-medium">Devolução</span>}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => abrirModalEditarOperador(op)} className="p-2 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"><Edit size={14} /></button>
                                <button onClick={() => handleDeleteOperador(op.id)} className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={14} /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

            {/* ===== ABA PAGAMENTO ===== */}
            {activeTab === 'pagamento' && (() => {
              const statusInfo = billingStatusInfo();
              const StatusIcon = statusInfo.icon;
              const nextDue = billing
                ? new Date(billing.next_due_date + 'T12:00:00').toLocaleDateString('pt-BR')
                : calcularProximoVencimento(formBilling.plan_type, formBilling.due_day, formBilling.billing_start_date)
                    ? new Date(calcularProximoVencimento(formBilling.plan_type, formBilling.due_day, formBilling.billing_start_date) + 'T12:00:00').toLocaleDateString('pt-BR')
                    : '—';

              return (
                <div className="space-y-6 animate-in fade-in duration-400">

                  {/* Status Card */}
                  <section className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm flex items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-2xl ${statusInfo.color.includes('emerald') ? 'bg-emerald-50' : statusInfo.color.includes('amber') ? 'bg-amber-50' : statusInfo.color.includes('red') ? 'bg-red-50' : 'bg-zinc-50'}`}>
                        <StatusIcon size={24} className={statusInfo.color.split(' ')[1]} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Status da Assinatura</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs font-black uppercase px-2 py-1 rounded-lg ${statusInfo.color}`}>{statusInfo.label}</span>
                          {billing && (
                            <span className="text-xs text-zinc-500">
                              · Próximo vencimento: <span className="font-bold text-zinc-800">{nextDue}</span>
                            </span>
                          )}
                        </div>
                        {billing?.last_payment_date && (
                          <p className="text-[11px] text-zinc-400 mt-1">
                            Último pagamento: {new Date(billing.last_payment_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={handleRegistrarPagamento}
                      disabled={registrandoPagamento || !billing}
                      className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-100 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                    >
                      {registrandoPagamento ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                      Registrar Pagamento
                    </button>
                  </section>

                  {/* Configuração da cobrança */}
                  <section className="bg-white p-8 rounded-2xl border border-zinc-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-6">
                      <div className="w-1 h-4 bg-indigo-500 rounded-full" />
                      <h3 className="text-xs font-black text-zinc-800 uppercase tracking-[2px]">Configuração da Cobrança</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      {/* Tipo de plano */}
                      <div className="col-span-2">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-tight ml-1 mb-2 block">Tipo de Plano</label>
                        <div className="flex gap-3">
                          {(['monthly', 'annual'] as const).map((type) => (
                            <button
                              key={type}
                              onClick={() => setFormBilling(p => ({ ...p, plan_type: type }))}
                              className={`flex-1 py-3 px-4 rounded-2xl border-2 text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                                formBilling.plan_type === type
                                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                  : 'border-zinc-100 bg-zinc-50 text-zinc-500 hover:border-zinc-200'
                              }`}
                            >
                              <Calendar size={16} />
                              {type === 'monthly' ? 'Mensal' : 'Anual'}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Data de início */}
                      <div>
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-tight ml-1 mb-1 block">Data de Início da Cobrança</label>
                        <input
                          type="date"
                          value={formBilling.billing_start_date}
                          onChange={e => setFormBilling(p => ({ ...p, billing_start_date: e.target.value }))}
                          className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-2.5 text-xs font-medium focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all"
                        />
                      </div>

                      {/* Dia de cobrança (apenas mensal) */}
                      {formBilling.plan_type === 'monthly' && (
                        <div>
                          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-tight ml-1 mb-1 block">Dia de Cobrança (1–28)</label>
                          <input
                            type="number"
                            min={1}
                            max={28}
                            value={formBilling.due_day}
                            onChange={e => setFormBilling(p => ({ ...p, due_day: Number(e.target.value) }))}
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-2.5 text-xs font-medium focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all"
                          />
                        </div>
                      )}

                      {/* Próximo vencimento (calculado) */}
                      <div className={formBilling.plan_type === 'annual' ? '' : ''}>
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-tight ml-1 mb-1 block">Próximo Vencimento (calculado)</label>
                        <div className="w-full bg-zinc-100 border border-zinc-200 rounded-2xl px-4 py-2.5 text-xs font-bold text-zinc-700 flex items-center gap-2">
                          <Calendar size={13} className="text-zinc-400" />
                          {formBilling.billing_start_date
                            ? new Date(calcularProximoVencimento(formBilling.plan_type, formBilling.due_day, formBilling.billing_start_date) + 'T12:00:00').toLocaleDateString('pt-BR')
                            : '—'}
                        </div>
                      </div>

                      {/* Observações */}
                      <div className="col-span-2">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-tight ml-1 mb-1 block">Observações</label>
                        <textarea
                          value={formBilling.notes}
                          onChange={e => setFormBilling(p => ({ ...p, notes: e.target.value }))}
                          rows={3}
                          className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl p-4 text-xs font-medium focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all resize-none"
                          placeholder="Notas sobre o pagamento, forma de pagamento, etc..."
                        />
                      </div>
                    </div>
                  </section>

                  {/* Regras de bloqueio */}
                  <section className="bg-amber-50 border border-amber-100 p-6 rounded-2xl">
                    <div className="flex items-start gap-3">
                      <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-black text-amber-800 uppercase tracking-widest mb-1">Regras de Acesso</p>
                        <ul className="text-xs text-amber-700 space-y-1">
                          <li>· Pagamento <span className="font-bold">em atraso</span>: exibe alerta em todas as telas.</li>
                          <li>· Pagamento <span className="font-bold">atrasado por mais de 10 dias</span>: sistema bloqueado para uso.</li>
                          <li>· A tela de Configurações permanece acessível para regularização.</li>
                        </ul>
                      </div>
                    </div>
                  </section>

                </div>
              );
            })()}

          </div>
        </main>
      </div>

      {/* MODAL USUÁRIO */}
      <UsuarioModal isOpen={modalAberto} onClose={() => setModalAberto(false)} onSave={handleSalvarUsuario} usuarioParaEditar={usuarioEditando} modo={modoModal} />

      {/* MODAL CATEGORIA */}
      {modalCategoriaAberto && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-100 flex justify-between items-center bg-zinc-50">
              <div className="flex items-center gap-2">
                <div className="bg-indigo-100 p-2 rounded-lg"><Layers className="text-indigo-600" size={18} /></div>
                <h2 className="text-base font-bold text-zinc-900">{categoriaEditando ? 'Editar Categoria' : 'Nova Categoria'}</h2>
              </div>
              <button onClick={() => setModalCategoriaAberto(false)} className="p-2 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-full"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-zinc-600 mb-1.5 block">Nome *</label>
                <input value={formCategoria.name} onChange={e => setFormCategoria(p => ({ ...p, name: e.target.value }))} className="w-full h-10 px-3 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" placeholder="Ex: Roupas, Calçados..." />
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-600 mb-1.5 block">Descrição</label>
                <input value={formCategoria.description} onChange={e => setFormCategoria(p => ({ ...p, description: e.target.value }))} className="w-full h-10 px-3 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" placeholder="Opcional..." />
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-600 mb-1.5 block">Cor de Identificação</label>
                <div className="flex items-center gap-3">
                  <input type="color" value={formCategoria.color} onChange={e => setFormCategoria(p => ({ ...p, color: e.target.value }))} className="h-10 w-14 border border-zinc-300 rounded-lg cursor-pointer p-1" />
                  <span className="text-sm font-mono text-zinc-600">{formCategoria.color}</span>
                  <div className="flex gap-1.5 ml-auto">
                    {['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'].map(c => (
                      <button key={c} onClick={() => setFormCategoria(p => ({ ...p, color: c }))} className={`w-6 h-6 rounded-full border-2 transition-all ${formCategoria.color === c ? 'border-zinc-800 scale-110' : 'border-transparent'}`} style={{ backgroundColor: c }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-zinc-50 border-t border-zinc-100 flex justify-end gap-3">
              <button onClick={() => setModalCategoriaAberto(false)} className="px-4 py-2 border border-zinc-300 text-zinc-700 rounded-lg text-sm font-medium hover:bg-zinc-50">Cancelar</button>
              <button onClick={handleSalvarCategoria} disabled={salvandoCategoria} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-2 disabled:opacity-50">
                {salvandoCategoria ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                {categoriaEditando ? 'Atualizar' : 'Criar Categoria'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL OPERADOR */}
      {modalOperadorAberto && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-100 flex justify-between items-center bg-zinc-50">
              <div className="flex items-center gap-2">
                <div className="bg-indigo-100 p-2 rounded-lg"><UserCog className="text-indigo-600" size={18} /></div>
                <h2 className="text-base font-bold text-zinc-900">{operadorEditando ? 'Editar Operador' : 'Novo Operador'}</h2>
              </div>
              <button onClick={() => setModalOperadorAberto(false)} className="p-2 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-full"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-zinc-600 mb-1.5 block">Nome completo *</label>
                  <input value={formOperador.name} onChange={e => setFormOperador(p => ({ ...p, name: e.target.value }))} className="w-full h-10 px-3 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" placeholder="Nome do operador" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-600 mb-1.5 block">Código de acesso</label>
                  <input value={formOperador.code || ''} onChange={e => setFormOperador(p => ({ ...p, code: e.target.value }))} className="w-full h-10 px-3 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono" placeholder="Ex: OP001" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-600 mb-1.5 block">PIN (numérico)</label>
                  <input value={formOperador.pin || ''} onChange={e => setFormOperador(p => ({ ...p, pin: e.target.value.replace(/\D/g, '').slice(0, 6) }))} className="w-full h-10 px-3 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono tracking-widest" placeholder="••••••" type="password" maxLength={6} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-600 mb-1.5 block">E-mail</label>
                  <input value={formOperador.email || ''} onChange={e => setFormOperador(p => ({ ...p, email: e.target.value }))} className="w-full h-10 px-3 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" placeholder="operador@email.com" type="email" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-600 mb-1.5 block">Telefone</label>
                  <input value={formOperador.phone || ''} onChange={e => setFormOperador(p => ({ ...p, phone: e.target.value }))} className="w-full h-10 px-3 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" placeholder="(00) 00000-0000" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-zinc-600 mb-1.5 block">Perfil</label>
                  <select value={formOperador.role} onChange={e => setFormOperador(p => ({ ...p, role: e.target.value as Operator['role'] }))} className="w-full h-10 px-3 border border-zinc-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500">
                    <option value="operator">Operador</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="manager">Gerente</option>
                  </select>
                </div>
              </div>

              <div className="border-t border-zinc-100 pt-4">
                <h3 className="text-xs font-bold text-zinc-500 uppercase mb-3">Permissões</h3>
                <div className="space-y-3">
                  <PermissionToggle label="Pode dar desconto" checked={formOperador.permissions.can_give_discount} onChange={v => setFormOperador(p => ({ ...p, permissions: { ...p.permissions, can_give_discount: v } }))} />
                  {formOperador.permissions.can_give_discount && (
                    <div className="ml-6">
                      <label className="text-xs text-zinc-500 mb-1 block">Desconto máximo (%)</label>
                      <input type="number" min={0} max={100} value={formOperador.permissions.max_discount_percentage} onChange={e => setFormOperador(p => ({ ...p, permissions: { ...p.permissions, max_discount_percentage: Number(e.target.value) } }))} className="w-24 h-8 px-3 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                    </div>
                  )}
                  <PermissionToggle label="Pode cancelar venda" checked={formOperador.permissions.can_cancel_sale} onChange={v => setFormOperador(p => ({ ...p, permissions: { ...p.permissions, can_cancel_sale: v } }))} />
                  <PermissionToggle label="Pode processar devoluções" checked={formOperador.permissions.can_process_return} onChange={v => setFormOperador(p => ({ ...p, permissions: { ...p.permissions, can_process_return: v } }))} />
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 bg-zinc-50 rounded-lg border border-zinc-200">
                <input type="checkbox" id="op_active" checked={formOperador.is_active} onChange={e => setFormOperador(p => ({ ...p, is_active: e.target.checked }))} className="h-4 w-4 text-indigo-600 rounded" />
                <label htmlFor="op_active" className="text-xs font-medium text-zinc-700">Operador ativo</label>
              </div>
            </div>
            <div className="px-6 py-4 bg-zinc-50 border-t border-zinc-100 flex justify-end gap-3">
              <button onClick={() => setModalOperadorAberto(false)} className="px-4 py-2 border border-zinc-300 text-zinc-700 rounded-lg text-sm font-medium hover:bg-zinc-50">Cancelar</button>
              <button onClick={handleSalvarOperador} disabled={salvandoOperador} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-2 disabled:opacity-50">
                {salvandoOperador ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                {operadorEditando ? 'Atualizar' : 'Criar Operador'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Input({ label, icon, ...props }: any) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-tight ml-1">{label}</label>
      <div className="relative group">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300 group-focus-within:text-indigo-500 transition-colors">{icon}</span>
        <input {...props} className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl pl-11 pr-4 py-2.5 text-xs font-medium focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all placeholder:text-zinc-300" />
      </div>
    </div>
  );
}

function PermissionToggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer group">
      <div onClick={() => onChange(!checked)} className={`w-9 h-5 rounded-full transition-colors relative ${checked ? 'bg-indigo-600' : 'bg-zinc-200'}`}>
        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </div>
      <span className="text-xs text-zinc-700 group-hover:text-zinc-900">{label}</span>
    </label>
  );
}

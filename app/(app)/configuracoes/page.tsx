// app/configuracoes/page.tsx
'use client';
import UsuarioModal from '@/components/users/UsuarioModal';
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Toaster, toast } from 'react-hot-toast';
import { CompanyService, CompanyData } from '@/services/company.service';
import { UserService, AuthorizedUser } from '@/services/user.service';
import { supabase } from '@/lib/supabase/client';
import {
  Building,
  Users,
  Settings,
  Upload,
  Shield,
  CheckCircle,
  Loader2,
  X,
  FileText,
  Globe,
  Phone,
  Mail,
  UserPlus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  ChevronRight,
  Save,
  Calendar,
  Key
} from 'lucide-react';

// Tipos
type TabType = 'loja' | 'usuarios';
type UsuarioCargo = 'admin' | 'gerente' | 'colaborador';
type UsuarioStatus = 'ativo' | 'inativo' | 'pendente';

// Este tipo agora reflete mais de perto o que o modal usa e o que vem do DB.
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

interface NovoUsuarioData {
  nome: string;
  email: string;
  cargo: UsuarioCargo;
  senha: string;
  confirmarSenha: string;
}

export default function ConfiguracoesPage() {
    // Estado principal
    const [activeTab, setActiveTab] = useState<TabType>('loja');
    const [isLoading, setIsLoading] = useState(false);
    const [progresso, setProgresso] = useState({ loja: 0, usuarios: 0 });
    const [mostrarSenha, setMostrarSenha] = useState(false);
    const [isAddingUsuario, setIsAddingUsuario] = useState(false);
    const [modalAberto, setModalAberto] = useState(false);
    const [usuarioEditando, setUsuarioEditando] = useState<UsuarioParaEdicao | null>(null);
    const [modoModal, setModoModal] = useState<'criacao' | 'edicao'>('criacao');

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Dados da loja
    const [formLoja, setFormLoja] = useState<FormLojaData>({
        nomeCompleto: '',
        nomeFantasia: '',
        descricao: '',
        cnpj: '',
        telefone: '',
        email: '',
        website: '',
        logo: null,
        logoPreview: ''
    });

    // Dados do novo usuário
    const [novoUsuario, setNovoUsuario] = useState<NovoUsuarioData>({
        nome: '',
        email: '',
        cargo: 'colaborador',
        senha: '',
        confirmarSenha: ''
    });

    // Lista de usuários autorizados
    const [usuarios, setUsuarios] = useState<AuthorizedUser[]>([]);

    // Configurações das tabs
    const tabs = [
        {
        id: 'loja' as TabType,
        label: 'Configurações da Loja',
        icon: Building,
        description: 'Dados cadastrais e informações',
        color: 'indigo'
        },
        {
        id: 'usuarios' as TabType,
        label: 'Gerenciamento de Usuários',
        icon: Users,
        description: 'Permissões e acessos',
        color: 'green'
        }
    ];

    // Opções de cargo
    const cargos = [
        { 
        value: 'admin', 
        label: 'Administrador', 
        desc: 'Acesso completo ao sistema', 
        icon: Shield,
        color: 'purple'
        },
        { 
        value: 'gerente', 
        label: 'Gerente', 
        desc: 'Acesso a relatórios e gestão', 
        icon: Users,
        color: 'blue'
        },
        { 
        value: 'colaborador', 
        label: 'Colaborador', 
        desc: 'Acesso básico operacional', 
        icon: CheckCircle,
        color: 'gray'
        }
    ];

    // Função para abrir modal de edição
    const abrirModalEdicao = (usuario: AuthorizedUser) => {
        setUsuarioEditando({
            id: usuario.id,
            full_name: usuario.full_name || '',
            email: usuario.email,
            role: usuario.role,
            status: usuario.status,
            phone: usuario.phone || '',
            department: usuario.department || '',
            permissions: usuario.permissions || []
        });
        setModoModal('edicao');
        setModalAberto(true);
    };

    // Função para abrir modal de criação
    const abrirModalCriacao = () => {
    setUsuarioEditando(null);
    setModoModal('criacao');
    setModalAberto(true);
    };

    // ========== FUNÇÕES DA LOJA ==========

    const handleLojaInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        
        let formattedValue = value;

        // Máscaras
        if (name === 'cnpj') {
        formattedValue = value
            .replace(/\D/g, '')
            .replace(/(\d{2})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1/$2')
            .replace(/(\d{4})(\d)/, '$1-$2')
            .slice(0, 18);
        } else if (name === 'telefone') {
        formattedValue = value
            .replace(/\D/g, '')
            .replace(/(\d{0})(\d)/, '$1($2')
            .replace(/(\d{2})(\d)/, '$1) $2')
            .replace(/(\d{5})(\d)/, '$1-$2')
            .slice(0, 15);
        }

        setFormLoja(prev => ({ ...prev, [name]: formattedValue }));
        calcularProgressoLoja();
    };

    const calcularProgressoLoja = () => {
        let total = 0;
        const campos = [
        formLoja.nomeCompleto,
        formLoja.cnpj,
        formLoja.telefone,
        formLoja.email,
        formLoja.descricao,
        formLoja.logoPreview
        ];
        
        campos.forEach((campo, index) => {
        if (campo && campo.toString().trim() !== '') {
            total += index === 4 ? 20 : 10; // Descrição vale mais
        }
        });

        setProgresso(prev => ({ ...prev, loja: Math.min(total, 100) }));
        return total;
    };

    const salvarConfiguracoesLoja = async () => {
        if (!formLoja.nomeCompleto || !formLoja.cnpj || !formLoja.telefone || !formLoja.email) {
            toast.error('Preencha os campos obrigatórios');
            return;
        }

        setIsLoading(true);
        try {
            let logoUrl = formLoja.logoPreview; // Mantém a URL existente por padrão

            // Se um novo arquivo de logo foi selecionado, faz o upload
            if (formLoja.logo) {
                logoUrl = await CompanyService.uploadLogo(formLoja.logo);
            }

            const companyData: CompanyData = {
                name: formLoja.nomeCompleto,
                fantasy_name: formLoja.nomeFantasia,
                description: formLoja.descricao,
                cnpj: formLoja.cnpj,
                phone: formLoja.telefone,
                email: formLoja.email,
                website: formLoja.website,
                logo_url: logoUrl
            };

            await CompanyService.saveCompany(companyData);
            toast.success('Configurações da loja salvas com sucesso!');
        } catch (error) {
            console.error('Erro ao salvar configurações:', error);
            toast.error('Erro ao salvar configurações da loja');
        } finally {
            setIsLoading(false);
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) { // Limite de 2MB
            toast.error('A imagem deve ter no máximo 2MB.');
            return;
        }

        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
            toast.error('Formato de imagem inválido. Use JPG, PNG ou WebP.');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setFormLoja(prev => ({
                ...prev,
                logo: file,
                logoPreview: reader.result as string
            }));
            toast.success('Logo pronto para o upload!');
        };
        reader.readAsDataURL(file);
    };

    const handleRemoveLogo = () => {
        setFormLoja(prev => ({ ...prev, logo: null, logoPreview: '' }));
        if(fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        toast.success('Logo removida.');
    };

    // ========== FUNÇÕES DE USUÁRIOS ==========

    const handleAddUsuario = async () => {
        if (!novoUsuario.nome || !novoUsuario.email || !novoUsuario.senha) {
        toast.error('Preencha todos os campos obrigatórios');
        return;
        }

        if (novoUsuario.senha !== novoUsuario.confirmarSenha) {
        toast.error('As senhas não coincidem');
        return;
        }

        if (novoUsuario.senha.length < 6) {
        toast.error('A senha deve ter pelo menos 6 caracteres');
        return;
        }

        setIsLoading(true);
        try {
            // Primeiro, criar usuário no Supabase Auth
            const { data, error } = await supabase.auth.signUp({
                email: novoUsuario.email,
                password: novoUsuario.senha,
                options: {
                    data: {
                        name: novoUsuario.nome
                    }
                }
            });

            if (error) {
              toast.error(error.message);
              throw error;
            }

            if (!data.user) {
              throw new Error("Usuário não foi criado no Supabase Auth.");
            }

            // Adicionar à tabela de usuários autorizados
            await UserService.addAuthorizedUser(data.user.id, novoUsuario.email, novoUsuario.cargo);

            setNovoUsuario({
                nome: '',
                email: '',
                cargo: 'colaborador',
                senha: '',
                confirmarSenha: ''
            });
            setIsAddingUsuario(false);
            await loadAuthorizedUsers();
            calcularProgressoUsuarios();
            
            toast.success('Usuário criado com sucesso! Um email de confirmação foi enviado.');
        } catch (error) {
            console.error('Erro ao criar usuário:', error);
            toast.error('Erro ao criar usuário');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteUsuario = async (id: string) => {
        try {
            await UserService.removeAuthorizedUser(id);
            await loadAuthorizedUsers();
            toast.success('Usuário removido com sucesso');
            calcularProgressoUsuarios();
        } catch (error) {
            console.error('Erro ao remover usuário:', error);
            toast.error('Erro ao remover usuário');
        }
    };

    const handleStatusChange = async (id: string, status: UsuarioStatus) => {
        try {
            await UserService.updateAuthorizedUser(id, { status });
            await loadAuthorizedUsers();
            toast.success(`Status atualizado para ${status}`);
            calcularProgressoUsuarios();
        } catch (error) {
            console.error('Erro ao atualizar status:', error);
            toast.error('Erro ao atualizar status');
        }
    };

    const calcularProgressoUsuarios = () => {
        const usuariosAtivos = usuarios.filter(u => u.status === 'ativo').length;
        const progress = Math.min(100, (usuariosAtivos / Math.max(usuarios.length, 1)) * 100);
        setProgresso(prev => ({ ...prev, usuarios: progress }));
        return progress;
    };

    // ========== FUNÇÕES GERAIS ==========

    const salvarTodasConfiguracoes = async () => {
        setIsLoading(true);
        try {
            await salvarConfiguracoesLoja();
            toast.success('Todas as configurações foram salvas com sucesso!', {
                duration: 4000,
                icon: '✅'
            });
        } catch (error) {
            toast.error('Erro ao salvar configurações');
        } finally {
            setIsLoading(false);
        }
    };

    // ========== HELPER FUNCTIONS ==========

    const getStatusColor = (status: UsuarioStatus) => {
        const colors = {
        ativo: 'bg-green-100 text-green-800 border-green-200',
        inativo: 'bg-red-100 text-red-800 border-red-200',
        pendente: 'bg-yellow-100 text-yellow-800 border-yellow-200'
        };
        return colors[status];
    };

    const getCargoColor = (cargo: UsuarioCargo) => {
        const colors = {
        admin: 'bg-purple-100 text-purple-800 border-purple-200',
        gerente: 'bg-blue-100 text-blue-800 border-blue-200',
        colaborador: 'bg-gray-100 text-gray-800 border-gray-200'
        };
        return colors[cargo];
    };

    const getAvatarColor = (nome: string) => {
        const colors = [
        'bg-gradient-to-r from-indigo-500 to-purple-500',
        'bg-gradient-to-r from-blue-500 to-cyan-500',
        'bg-gradient-to-r from-emerald-500 to-green-500',
        'bg-gradient-to-r from-amber-500 to-orange-500',
        'bg-gradient-to-r from-pink-500 to-rose-500'
        ];
        const index = nome.charCodeAt(0) % colors.length;
        return colors[index];
    };

    // Efeitos
    useEffect(() => {
        loadCompanyData();
        loadAuthorizedUsers();
        calcularProgressoLoja();
        calcularProgressoUsuarios();
    }, []);

    const loadCompanyData = async () => {
        try {
            const company = await CompanyService.getCompany();
            if (company) {
                setFormLoja({
                    nomeCompleto: company.name,
                    nomeFantasia: company.fantasy_name || '',
                    descricao: company.description || '',
                    cnpj: company.cnpj || '',
                    telefone: company.phone || '',
                    email: company.email || '',
                    website: company.website || '',
                    logo: null, // Importante: resetar o arquivo ao carregar
                    logoPreview: company.logo_url || ''
                });
            }
        } catch (error) {
            console.error('Erro ao carregar dados da empresa:', error);
            toast.error('Erro ao carregar dados da empresa');
        }
    };

    const loadAuthorizedUsers = async () => {
        try {
            const users = await UserService.getAuthorizedUsers();
            setUsuarios(users);
        } catch (error) {
            console.error('Erro ao carregar usuários:', error);
            toast.error('Erro ao carregar usuários');
        }
    };

    const currentProgress = activeTab === 'loja' ? progresso.loja : progresso.usuarios;

    const handleSalvarUsuario = async (dadosUsuario: any) => {
        setIsLoading(true);
        try {
            if (modoModal === 'criacao') {
                // A lógica de criação permanece a mesma, pois envolve Auth + DB
                const response = await fetch('/api/create-user', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: dadosUsuario.email,
                        password: dadosUsuario.senha,
                        name: dadosUsuario.nome, // Passando o nome para a API
                        role: dadosUsuario.cargo
                    })
                });
    
                const result = await response.json();
                if (!response.ok) {
                    throw new Error(result.error || 'Falha ao criar usuário.');
                }
                toast.success('Usuário criado com sucesso! Um email de confirmação foi enviado.');
    
            } else { // Modo de edição
                if (!usuarioEditando) throw new Error("Nenhum usuário selecionado para edição.");
    
                // Mapeamento CORRETO dos campos do formulário para as colunas do banco
                const updates: Partial<AuthorizedUser> = {
                    full_name: dadosUsuario.nome, // 'nome' do form -> 'full_name' no DB
                    phone: dadosUsuario.telefone,
                    department: dadosUsuario.departamento,
                    role: dadosUsuario.cargo,
                    status: dadosUsuario.status,
                    permissions: dadosUsuario.permissoes,
                };
                
                await UserService.updateAuthorizedUser(usuarioEditando.id, updates);
    
                // 2. Se uma nova senha foi fornecida, chama a API de atualização de senha
                if (dadosUsuario.senha) {
                    if (dadosUsuario.senha !== dadosUsuario.confirmarSenha) {
                        throw new Error("As senhas não coincidem.");
                    }
                    if (dadosUsuario.senha.length < 6) {
                        throw new Error("A nova senha deve ter no mínimo 6 caracteres.");
                    }
                    const userToEdit = usuarios.find(u => u.id === usuarioEditando.id);
                    if (!userToEdit) throw new Error("Não foi possível encontrar o ID de autenticação do usuário.");
    
                    await UserService.updateUserPassword(userToEdit.user_id, dadosUsuario.senha);
                }
                toast.success('Usuário atualizado com sucesso!');
            }
            
            await loadAuthorizedUsers();
            setModalAberto(false);
            calcularProgressoUsuarios();
    
        } catch (error: any) {
            console.error('Erro ao salvar usuário:', error);
            toast.error(error.message || 'Ocorreu um erro inesperado ao salvar o usuário.');
        } finally {
            setIsLoading(false);
        }
        };

    return (
        <div className="flex flex-col h-full max-h-screen bg-zinc-50 text-zinc-900 font-sans overflow-hidden border border-zinc-300 rounded-lg shadow-2xl mx-auto">
        <Toaster position="top-right" />

        {/* HEADER PADRONIZADO */}
        <header className="h-16 bg-white border-b border-zinc-200 flex justify-between items-center px-6 shrink-0 z-10">
            <div className="flex items-center gap-3">
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                <Settings size={22} className="text-indigo-600" strokeWidth={2.5} />
                <h1 className="text-xl font-extrabold text-zinc-900 tracking-tight leading-none">
                    Configurações
                </h1>
                </div>
                <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider ml-7">
                Ajustes do sistema e acessos
                </p>
            </div>
            </div>

            <button
            onClick={salvarTodasConfiguracoes}
            disabled={isLoading}
            className="bg-zinc-900 hover:bg-zinc-800 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[2px] transition-all shadow-lg active:scale-95 disabled:opacity-50 flex items-center gap-2"
            >
            {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {isLoading ? 'Salvando' : 'Salvar Alterações'}
            </button>
        </header>

        <div className="flex flex-1 overflow-hidden min-h-0">
            {/* SIDEBAR DE NAVEGAÇÃO INTERNA */}
            <aside className="w-64 border-r border-zinc-200 bg-white flex flex-col shrink-0 min-h-0">
            <nav className="p-4 space-y-2">
                {[
                { id: 'loja', label: 'Dados da Loja', icon: Building, desc: 'Identidade e CNPJ' },
                { id: 'usuarios', label: 'Usuários', icon: Users, desc: 'Equipe e Permissões' }
                ].map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as TabType)}
                    className={`w-full p-3 rounded-2xl transition-all flex items-center gap-3 group border-2 ${
                    activeTab === tab.id 
                        ? 'bg-indigo-50 border-indigo-100 text-indigo-600' 
                        : 'bg-transparent border-transparent text-zinc-500 hover:bg-zinc-50'
                    }`}
                >
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

            {/* INDICADORES DE COMPLETUDE NO RODAPÉ DA SIDEBAR */}
            <div className="mt-auto p-6 border-t border-zinc-100 space-y-4">
                <div>
                <div className="flex justify-between text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">
                    <span>Perfil da Loja</span>
                    <span className="text-indigo-600">{progresso.loja}%</span>
                </div>
                <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-600 transition-all duration-700" style={{ width: `${progresso.loja}%` }} />
                </div>
                </div>
            </div>
            </aside>

            {/* CONTEÚDO PRINCIPAL SCROLLABLE */}
            <main className="flex-1 overflow-y-auto bg-zinc-50/50 p-8 min-h-0">
            <div className="max-w-4xl mx-auto">
                {activeTab === 'loja' ? (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-400">
                    
                    {/* UPLOAD DE LOGO */}
                    <section className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm flex items-center gap-8">
                    <div className="relative w-24 h-24 shrink-0">
                        {formLoja.logoPreview ? (
                        <Image priority src={formLoja.logoPreview} alt="Pré-visualização do Logo" fill className="rounded-2xl object-cover border-4 border-white shadow-md" />
                        ) : (
                        <div className="w-full h-full bg-zinc-50 rounded-2xl border-2 border-dashed border-zinc-200 flex flex-col items-center justify-center text-zinc-300">
                            <Upload size={24} />
                        </div>
                        )}
                    </div>
                    <div className="flex-1">
                        <h3 className="text-[11px] font-black text-zinc-800 uppercase tracking-[2px] mb-1">Logo da Empresa</h3>
                        <p className="text-xs text-zinc-400 mb-4">A logo será exibida em recibos, PDV e relatórios. (Max 2MB)</p>
                        <div className="flex gap-2">
                        <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-zinc-900 text-white text-[10px] font-black rounded-lg uppercase tracking-widest hover:bg-zinc-800 transition-all">Escolher Arquivo</button>
                        {formLoja.logoPreview && (
                            <button onClick={handleRemoveLogo} className="px-4 py-2 bg-white border border-red-100 text-red-500 text-[10px] font-black rounded-lg uppercase tracking-widest hover:bg-red-50 transition-all">Remover</button>
                        )}
                        </div>
                    </div>
                    <input ref={fileInputRef} type="file" className="hidden" accept="image/png, image/jpeg, image/webp" onChange={handleImageUpload} />
                    </section>

                    {/* FORMULÁRIO DE DADOS */}
                    <section className="bg-white p-8 rounded-2xl border border-zinc-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-6">
                        <div className="w-1 h-4 bg-indigo-500 rounded-full"></div>
                        <h3 className="text-xs font-black text-zinc-800 uppercase tracking-[2px]">Dados Cadastrais</h3>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-6">
                        <Input label="Razão Social" name="nomeCompleto" value={formLoja.nomeCompleto} onChange={handleLojaInputChange} icon={<Building size={14}/>} placeholder="Nome oficial" />
                        <Input label="CNPJ" name="cnpj" value={formLoja.cnpj} onChange={handleLojaInputChange} icon={<FileText size={14}/>} placeholder="00.000.000/0000-00" />
                        <Input label="E-mail Comercial" name="email" value={formLoja.email} onChange={handleLojaInputChange} icon={<Mail size={14}/>} placeholder="loja@email.com" />
                        <Input label="Telefone de Contato" name="telefone" value={formLoja.telefone} onChange={handleLojaInputChange} icon={<Phone size={14}/>} placeholder="(00) 00000-0000" />
                        
                        <div className="col-span-2 space-y-1">
                            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-tight ml-1">Descrição do Negócio</label>
                            <textarea 
                            name="descricao"
                            value={formLoja.descricao}
                            onChange={handleLojaInputChange}
                            rows={3} 
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl p-4 text-xs font-medium focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all resize-none" 
                            placeholder="Sobre sua loja..." 
                            />
                        </div>
                    </div>
                    </section>
                </div>
                ) : (
                /* GERENCIAMENTO DE USUÁRIOS */
                <div className="space-y-6 animate-in fade-in duration-400">
                    <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-inner"><UserPlus size={22} /></div>
                        <div>
                            <h3 className="text-sm font-black uppercase tracking-tight">Membros da Equipe</h3>
                            <p className="text-[11px] font-medium text-zinc-400">Gerencie níveis de acesso e colaboradores</p>
                        </div>
                    </div>
                        <button 
                            onClick={abrirModalCriacao} 
                            className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-[2px] shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">
                            + Novo Usuário
                        </button>
                    </div>

                    <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-zinc-50/80 text-[10px] font-black text-zinc-400 uppercase border-b border-zinc-100">
                        <tr>
                            <th className="px-6 py-4 tracking-widest">Colaborador</th>
                            <th className="px-6 py-4 tracking-widest">Nível</th>
                            <th className="px-6 py-4 tracking-widest">Status</th>
                            <th className="px-6 py-4 tracking-widest text-right">Ações</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-50 text-xs">
                        {usuarios.map(u => {
                            const nome = u.email || 'Usuário';
                            const avatar = nome.split('@')[0].substring(0, 2).toUpperCase();
                            return (
                            <tr key={u.id} className="hover:bg-indigo-50/20 transition-colors group">
                            <td className="px-6 py-4 flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-xl ${getAvatarColor(nome)} text-white flex items-center justify-center font-black text-[10px] shadow-md`}>{avatar}</div>
                                <div>
                                <p className="font-bold text-zinc-800 leading-none">{nome}</p>
                                <p className="text-[10px] text-zinc-400 mt-1 font-medium">{u.email}</p>
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-md border ${getCargoColor(u.role as UsuarioCargo)}`}>{u.role}</span>
                            </td>
                            <td className="px-6 py-4">
                                <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-md border ${getStatusColor(u.status as UsuarioStatus)}`}>{u.status}</span>
                            </td>
                            <td className="px-6 py-4 text-right">
                                <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                    onClick={() => abrirModalEdicao(u)}
                                    className="p-2 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"><Edit size={14} /></button>
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
            </div>
            </main>
        </div>
            <UsuarioModal 
            isOpen={modalAberto}
            onClose={() => setModalAberto(false)}
            onSave={handleSalvarUsuario}
            usuarioParaEditar={usuarioEditando}
            modo={modoModal}
            />
        </div>
    );
    }

    function Input({ label, icon, ...props }: any) {
    return (
        <div className="space-y-1">
        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-tight ml-1">{label}</label>
        <div className="relative group">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300 group-focus-within:text-indigo-500 transition-colors">
            {icon}
            </span>
            <input 
            {...props} 
            className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl pl-11 pr-4 py-2.5 text-xs font-medium focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all placeholder:text-zinc-300" 
            />
        </div>
        </div>
    );
}
// app/configuracoes/page.tsx
'use client';
import UsuarioModal from "@/components/users/UsuarioModal";
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Toaster, toast } from 'react-hot-toast';
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

interface Usuario {
  id: string;
  nome: string;
  email: string;
  cargo: UsuarioCargo;
  status: UsuarioStatus;
  ultimoAcesso: string;
  avatar?: string;
  telefone?: string;
  departamento?: string;
  permissoes?: string[];
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
    const [usuarioEditando, setUsuarioEditando] = useState<Usuario | null>(null);
    const [modoModal, setModoModal] = useState<'criacao' | 'edicao'>('criacao');

    // Referências
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

    // Lista de usuários
    const [usuarios, setUsuarios] = useState<Usuario[]>([
        {
        id: '1',
        nome: 'João Silva',
        email: 'joao@loja.com',
        cargo: 'admin',
        status: 'ativo',
        ultimoAcesso: 'Hoje, 09:30',
        avatar: 'JS'
        },
        {
        id: '2',
        nome: 'Maria Santos',
        email: 'maria@loja.com',
        cargo: 'gerente',
        status: 'ativo',
        ultimoAcesso: 'Ontem, 16:45',
        avatar: 'MS'
        },
        {
        id: '3',
        nome: 'Carlos Oliveira',
        email: 'carlos@loja.com',
        cargo: 'colaborador',
        status: 'pendente',
        ultimoAcesso: 'Nunca',
        avatar: 'CO'
        }
    ]);

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
    const abrirModalEdicao = (usuario: Usuario) => {
    setUsuarioEditando(usuario);
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
    
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
        toast.error('A imagem deve ter menos de 5MB');
        return;
        }

        if (!file.type.startsWith('image/')) {
        toast.error('Por favor, selecione uma imagem válida');
        return;
        }

        const reader = new FileReader();
        reader.onloadstart = () => toast.loading('Carregando imagem...');
        reader.onload = (event) => {
        setFormLoja(prev => ({
            ...prev,
            logo: file,
            logoPreview: event.target?.result as string
        }));
        toast.dismiss();
        toast.success('Logo carregada com sucesso!');
        calcularProgressoLoja();
        };
        reader.onerror = () => {
        toast.error('Erro ao carregar a imagem');
        };
        reader.readAsDataURL(file);
    };

    const handleRemoveLogo = () => {
        setFormLoja(prev => ({ ...prev, logo: null, logoPreview: '' }));
        calcularProgressoLoja();
        toast.success('Logo removida');
    };

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

    const salvarConfiguracoesLoja = () => {
        if (!formLoja.nomeCompleto || !formLoja.cnpj || !formLoja.telefone || !formLoja.email) {
        toast.error('Preencha os campos obrigatórios');
        return;
        }

        setIsLoading(true);
        setTimeout(() => {
        setIsLoading(false);
        toast.success('Configurações da loja salvas com sucesso!');
        }, 1500);
    };

    // ========== FUNÇÕES DE USUÁRIOS ==========

    const handleAddUsuario = () => {
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

        const novo: Usuario = {
        id: Date.now().toString(),
        nome: novoUsuario.nome,
        email: novoUsuario.email,
        cargo: novoUsuario.cargo,
        status: 'pendente',
        ultimoAcesso: 'Nunca',
        avatar: novoUsuario.nome.split(' ').map(n => n[0]).join('').toUpperCase()
        };

        setUsuarios(prev => [...prev, novo]);
        setNovoUsuario({
        nome: '',
        email: '',
        cargo: 'colaborador',
        senha: '',
        confirmarSenha: ''
        });
        setIsAddingUsuario(false);
        calcularProgressoUsuarios();
        
        toast.success('Convite enviado! O usuário receberá um email para ativar a conta.');
    };

    const handleDeleteUsuario = (id: string) => {
        setUsuarios(prev => prev.filter(u => u.id !== id));
        toast.success('Usuário removido com sucesso');
        calcularProgressoUsuarios();
    };

    const handleStatusChange = (id: string, status: UsuarioStatus) => {
        setUsuarios(prev => 
        prev.map(u => u.id === id ? { ...u, status } : u)
        );
        toast.success(`Status atualizado para ${status}`);
        calcularProgressoUsuarios();
    };

    const calcularProgressoUsuarios = () => {
        const usuariosAtivos = usuarios.filter(u => u.status === 'ativo').length;
        const progress = Math.min(100, (usuariosAtivos / Math.max(usuarios.length, 1)) * 100);
        setProgresso(prev => ({ ...prev, usuarios: progress }));
        return progress;
    };

    // ========== FUNÇÕES GERAIS ==========

    const salvarTodasConfiguracoes = () => {
        setIsLoading(true);
        setTimeout(() => {
        setIsLoading(false);
        toast.success('Todas as configurações foram salvas com sucesso!', {
            duration: 4000,
            icon: '✅'
        });
        }, 2000);
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
        calcularProgressoLoja();
        calcularProgressoUsuarios();
    }, []);

    const currentProgress = activeTab === 'loja' ? progresso.loja : progresso.usuarios;

    // Função para salvar (tanto criação quanto edição)
    const handleSalvarUsuario = (dadosUsuario: any) => {
    if (modoModal === 'criacao') {
        // Adicionar novo usuário
        const novoUsuario: Usuario = {
        id: Date.now().toString(),
        nome: dadosUsuario.nome,
        email: dadosUsuario.email,
        cargo: dadosUsuario.cargo as UsuarioCargo,
        status: 'ativo',
        ultimoAcesso: 'Nunca',
        avatar: dadosUsuario.nome.split(' ').map((n: string) => n[0]).join('').toUpperCase(),
        telefone: dadosUsuario.telefone,
        departamento: dadosUsuario.departamento
        };
        
        setUsuarios(prev => [...prev, novoUsuario]);
        toast.success('Usuário criado com sucesso!');
    } else {
        // Editar usuário existente
        setUsuarios(prev => prev.map(u => 
        u.id === usuarioEditando?.id 
            ? { 
                ...u, 
                nome: dadosUsuario.nome,
                email: dadosUsuario.email,
                cargo: dadosUsuario.cargo as UsuarioCargo,
                telefone: dadosUsuario.telefone,
                departamento: dadosUsuario.departamento,
                status: dadosUsuario.status || u.status
            } 
            : u
        ));
        toast.success('Usuário atualizado com sucesso!');
    }
    
    setModalAberto(false);
    calcularProgressoUsuarios();
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
                    
                    {/* UPLOAD DE LOGO COMPACTO */}
                    <section className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm flex items-center gap-8">
                    <div className="relative w-24 h-24 shrink-0">
                        {formLoja.logoPreview ? (
                        <Image src={formLoja.logoPreview} alt="Logo" fill className="rounded-2xl object-cover border-4 border-white shadow-md" />
                        ) : (
                        <div className="w-full h-full bg-zinc-50 rounded-2xl border-2 border-dashed border-zinc-200 flex flex-col items-center justify-center text-zinc-300">
                            <Upload size={24} />
                        </div>
                        )}
                    </div>
                    <div className="flex-1">
                        <h3 className="text-[11px] font-black text-zinc-800 uppercase tracking-[2px] mb-1">Identidade Visual</h3>
                        <p className="text-xs text-zinc-400 mb-4">A logo será exibida em recibos, PDV e relatórios.</p>
                        <div className="flex gap-2">
                        <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-zinc-900 text-white text-[10px] font-black rounded-lg uppercase tracking-widest hover:bg-zinc-800 transition-all">Upload</button>
                        {formLoja.logoPreview && (
                            <button onClick={handleRemoveLogo} className="px-4 py-2 bg-white border border-red-100 text-red-500 text-[10px] font-black rounded-lg uppercase tracking-widest hover:bg-red-50 transition-all">Remover</button>
                        )}
                        </div>
                    </div>
                    <input ref={fileInputRef} type="file" className="hidden" onChange={handleImageUpload} />
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
                        {usuarios.map(u => (
                            <tr key={u.id} className="hover:bg-indigo-50/20 transition-colors group">
                            <td className="px-6 py-4 flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-zinc-900 text-white flex items-center justify-center font-black text-[10px] shadow-md">{u.avatar}</div>
                                <div>
                                <p className="font-bold text-zinc-800 leading-none">{u.nome}</p>
                                <p className="text-[10px] text-zinc-400 mt-1 font-medium">{u.email}</p>
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-md border ${getCargoColor(u.cargo)}`}>{u.cargo}</span>
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-1.5 uppercase font-black text-[9px] text-emerald-600 tracking-tighter">
                                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> Ativo
                                </div>
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
                        ))}
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
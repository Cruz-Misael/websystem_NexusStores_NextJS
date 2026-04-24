"use client";
import { useState, useEffect } from "react";
import ClienteModal from "@/components/clientes/ClienteModal";
import VisualizarDocumento from "@/components/clientes/VisualizarDocumento";
import PopupConfirmacao from "@/components/clientes/PopupConfirmacao";
import { 
  Search, 
  Mail, 
  Calendar, 
  ShoppingBag,
  MessageSquare,
  Users,
  Plus,
  Info,
  Edit2,
  Phone,
  Loader2,
  RefreshCw,
  AlertCircle,
  Trash2,
  Eye,
  FileText,
  MoreVertical,
  Ban,
  CheckCircle
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";
import { listarPessoas, buscarPessoaPorId, deletarPessoa, atualizarPessoa } from "@/src/services/people.service";

// Tipo do backend
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
  document_id: number | null;
  created_at: string;
  is_active?: boolean;
  document?: {
    id: number;
    document_file: string;
  } | null;
}

// Tipo para uso na interface
export type Cliente = {
  id: number;
  nome: string;
  email: string;
  telefone: string;
  ultimaCompra: string;
  totalGasto: number;
  documento?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  observacoes?: string;
  dataNascimento?: string;
  is_active?: boolean;
  document?: {
    id: number;
    document_file: string;
  } | null;
};

export default function CRMCompacto() {
  const [selecionado, setSelecionado] = useState<Cliente | null>(null);
  const [listaClientes, setListaClientes] = useState<Cliente[]>([]);
  const [busca, setBusca] = useState("");
  const [modalAberto, setModalAberto] = useState(false);
  const [modoModal, setModoModal] = useState<"create" | "edit">("create");
  const [clienteIdEdit, setClienteIdEdit] = useState<number | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [atualizando, setAtualizando] = useState(false);
  
  // Estados para documentos
  const [documentoAberto, setDocumentoAberto] = useState(false);
  const [documentoSelecionado, setDocumentoSelecionado] = useState<{
    id: number;
    document_file: string;
  } | null>(null);
  
  // Estados para popup de confirmação
  const [popupAberto, setPopupAberto] = useState(false);
  const [popupConfig, setPopupConfig] = useState({
    titulo: "",
    mensagem: "",
    tipo: "aviso" as "aviso" | "erro" | "info",
    onConfirmar: undefined as (() => void) | undefined,
  });
  
  // Estado para menu de ações
  const [menuAberto, setMenuAberto] = useState<number | null>(null);

  // Funções do popup
  const mostrarPopup = (
    titulo: string,
    mensagem: string,
    tipo: "aviso" | "erro" | "info" = "aviso",
    onConfirmar?: () => void
  ) => {
    setPopupConfig({ titulo, mensagem, tipo, onConfirmar });
    setPopupAberto(true);
  };

  const fecharPopup = () => {
    setPopupAberto(false);
    setTimeout(() => {
      setPopupConfig({
        titulo: "",
        mensagem: "",
        tipo: "aviso",
        onConfirmar: undefined,
      });
    }, 300);
  };

  // Carregar clientes do banco
  const carregarClientes = async (mostrarInativos = false) => {
    try {
      setCarregando(true);
      setErro(null);
      
      const pessoas = await listarPessoas();
      console.log("Pessoas carregadas:", pessoas);
      
      // Filtrar inativos se necessário
      const pessoasFiltradas = mostrarInativos 
        ? pessoas 
        : pessoas.filter((p: any) => p.is_active !== false);
      
      // Converter do formato do banco para o formato da interface
      const clientesConvertidos: Cliente[] = pessoasFiltradas.map((p: PessoaDB) => ({
        id: p.id,
        nome: p.name || "Sem nome",
        email: p.email || "",
        telefone: p.phone || "",
        ultimaCompra: "", // Implementar depois
        totalGasto: 0, // Implementar depois
        documento: p.identity_number?.toString() || "",
        endereco: p.address_street || "",
        cidade: p.city || "",
        estado: p.state || "",
        observacoes: p.observation || "",
        dataNascimento: p.birth_date || "",
        is_active: p.is_active ?? true,
        document: p.document,
      }));
      
      setListaClientes(clientesConvertidos);
      
      // Seleciona o primeiro cliente se não houver selecionado
      if (clientesConvertidos.length > 0 && !selecionado) {
        setSelecionado(clientesConvertidos[0]);
      } else if (selecionado) {
        // Atualiza o cliente selecionado se ele ainda existir
        const clienteAtualizado = clientesConvertidos.find(c => c.id === selecionado.id);
        if (clienteAtualizado) {
          setSelecionado(clienteAtualizado);
        } else if (clientesConvertidos.length > 0) {
          setSelecionado(clientesConvertidos[0]);
        }
      }
      
    } catch (error: any) {
      console.error("Erro ao carregar clientes:", error);
      setErro(error.message || "Erro ao carregar clientes");
    } finally {
      setCarregando(false);
      setAtualizando(false);
    }
  };

  // Função para deletar/inativar cliente
  const handleDeletarCliente = async (cliente: Cliente) => {
    mostrarPopup(
      "Confirmar exclusão",
      `Tem certeza que deseja excluir permanentemente o cliente "${cliente.nome}"?\n\nEsta ação não pode ser desfeita.`,
      "aviso",
      async () => {
        try {
          setAtualizando(true);
          await deletarPessoa(cliente.id);
          
          // Remover da lista
          const novaLista = listaClientes.filter(c => c.id !== cliente.id);
          setListaClientes(novaLista);
          
          // Se o cliente deletado era o selecionado, seleciona outro
          if (selecionado?.id === cliente.id) {
            setSelecionado(novaLista.length > 0 ? novaLista[0] : null);
          }
          
          mostrarPopup(
            "Cliente excluído",
            `O cliente "${cliente.nome}" foi excluído com sucesso.`,
            "info"
          );
          
          fecharPopup();
        } catch (error: any) {
          console.error("Erro ao deletar cliente:", error);
          mostrarPopup(
            "Erro ao excluir",
            error.message || "Ocorreu um erro ao tentar excluir o cliente.",
            "erro"
          );
        } finally {
          setAtualizando(false);
        }
      }
    );
  };

  // Função para inativar/ativar cliente
  const handleToggleAtivo = async (cliente: Cliente) => {
    const novoStatus = !cliente.is_active;
    const acao = novoStatus ? "ativar" : "inativar";
    
    mostrarPopup(
      `Confirmar ${acao}`,
      `Tem certeza que deseja ${acao} o cliente "${cliente.nome}"?`,
      "aviso",
      async () => {
        try {
          setAtualizando(true);
          await atualizarPessoa(cliente.id, { is_active: novoStatus });
          
          // Atualizar na lista
          const clienteAtualizado = { ...cliente, is_active: novoStatus };
          setListaClientes(prev => 
            prev.map(c => c.id === cliente.id ? clienteAtualizado : c)
          );
          
          if (selecionado?.id === cliente.id) {
            setSelecionado(clienteAtualizado);
          }
          
          mostrarPopup(
            "Sucesso",
            `Cliente ${acao}do com sucesso.`,
            "info"
          );
          
          fecharPopup();
        } catch (error: any) {
          console.error(`Erro ao ${acao} cliente:`, error);
          mostrarPopup(
            "Erro",
            error.message || `Ocorreu um erro ao tentar ${acao} o cliente.`,
            "erro"
          );
        } finally {
          setAtualizando(false);
        }
      }
    );
  };

  // Função para visualizar documento
  const handleVisualizarDocumento = (documento: any) => {
    if (!documento) {
      mostrarPopup(
        "Sem documento",
        "Este cliente não possui documento anexado.",
        "info"
      );
      return;
    }
    setDocumentoSelecionado(documento);
    setDocumentoAberto(true);
  };

  // Carregar na inicialização
  useEffect(() => {
    carregarClientes();
  }, []);

  // Fechar menu ao clicar fora
  useEffect(() => {
    const handleClickOutside = () => setMenuAberto(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Função para abrir modal de NOVO cliente
  const abrirNovoCliente = () => {
    setModoModal("create");
    setClienteIdEdit(null);
    setModalAberto(true);
  };

  // Função para abrir modal de EDIÇÃO
  const abrirEdicao = (cliente: Cliente) => {
    setModoModal("edit");
    setClienteIdEdit(cliente.id);
    setModalAberto(true);
  };

  // Função chamada após salvar no modal
  const handleSalvarCliente = async () => {
    await carregarClientes();
  };

  // Filtra clientes pela busca
  const filtrarClientes = () => {
    return listaClientes.filter(c => 
      c.nome.toLowerCase().includes(busca.toLowerCase()) || 
      c.email.toLowerCase().includes(busca.toLowerCase())
    );
  };

  // Função auxiliar para status
  const getStatus = (cliente: Cliente) => {
    if (!cliente.is_active) return "Inativo";
    if (cliente.totalGasto > 1000) return "VIP";
    if (cliente.totalGasto > 0) return "Regular";
    return "Novo";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "VIP": return "bg-purple-100 text-purple-700 border-purple-200";
      case "Novo": return "bg-blue-100 text-blue-700 border-blue-200";
      case "Inativo": return "bg-gray-100 text-gray-500 border-gray-200";
      default: return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getIniciais = (nome: string) => 
    nome.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();

  // Loading state
  if (carregando && listaClientes.length === 0) {
    return (
      <div className="flex h-full items-center justify-center bg-zinc-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-zinc-600">Carregando clientes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full max-h-screen bg-zinc-50 overflow-hidden text-sm font-sans text-zinc-900 border border-zinc-300 rounded-lg shadow-2xl mx-auto">
      
      {/* COLUNA ESQUERDA: LISTA DE CLIENTES */}
      <div className="w-80 flex flex-col border-r border-zinc-200 bg-white shrink-0">
        
        {/* Header da Lista */}
        <div className="p-4 border-b border-zinc-100 bg-white shrink-0">
          <div className="flex justify-between items-center mb-4">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <Users size={22} className="text-indigo-600" strokeWidth={2.5} />
                <h1 className="text-xl font-extrabold text-zinc-900 tracking-tight leading-none">
                  Clientes
                </h1>
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => {
                  setAtualizando(true);
                  carregarClientes();
                }}
                disabled={atualizando}
                className="p-2 text-zinc-500 hover:text-indigo-600 hover:bg-zinc-100 rounded-lg transition-colors"
                title="Atualizar lista"
              >
                <RefreshCw size={18} className={atualizando ? 'animate-spin' : ''} />
              </button>
              <button 
                onClick={abrirNovoCliente}
                className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm transition-all active:scale-95"
              >
                <Plus size={18} strokeWidth={2.5} />
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-indigo-500 transition-colors" size={15} />
              <input 
                type="text" 
                placeholder="Buscar por nome ou email..." 
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full pl-10 pr-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all"
              />
            </div>

            <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              <button 
                onClick={() => carregarClientes(false)}
                className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-tight transition-all border
                  ${!busca ? 'bg-zinc-900 border-zinc-900 text-white shadow-sm' : 'bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300'}
                `}
              >
                Ativos
              </button>
              <button 
                onClick={() => carregarClientes(true)}
                className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-tight transition-all border
                  ${busca === 'todos' ? 'bg-zinc-900 border-zinc-900 text-white shadow-sm' : 'bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300'}
                `}
              >
                Todos
              </button>
            </div>
          </div>
        </div>

        {/* Lista Scrollavel */}
        <div className="flex-1 overflow-y-auto min-h-0 bg-white">
          {erro ? (
            <div className="p-4 text-center">
              <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
              <p className="text-red-600 text-xs mb-2">{erro}</p>
              <button
                onClick={() => carregarClientes()}
                className="text-indigo-600 hover:text-indigo-700 text-xs font-medium"
              >
                Tentar novamente
              </button>
            </div>
          ) : filtrarClientes().length === 0 ? (
            <div className="p-8 text-center">
              <Users className="h-12 w-12 text-zinc-300 mx-auto mb-3" />
              <p className="text-zinc-500 text-sm mb-4">
                {busca ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"}
              </p>
              {!busca && (
                <button
                  onClick={abrirNovoCliente}
                  className="text-indigo-600 hover:text-indigo-700 font-medium text-sm"
                >
                  Cadastre seu primeiro cliente
                </button>
              )}
            </div>
          ) : (
            filtrarClientes().map((cliente) => (
              <div 
                key={cliente.id}
                className={`relative group p-3 border-b border-zinc-50 cursor-pointer hover:bg-zinc-50 transition-all ${
                  selecionado?.id === cliente.id 
                  ? 'bg-indigo-50/60 border-l-2 border-l-indigo-600' 
                  : 'border-l-2 border-l-transparent'
                } ${!cliente.is_active ? 'opacity-60' : ''}`}
                onClick={() => setSelecionado(cliente)}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-bold text-zinc-800 truncate text-xs flex items-center gap-2">
                    {cliente.nome}
                    {!cliente.is_active && (
                      <span className="text-[8px] bg-gray-200 text-gray-600 px-1 py-0.5 rounded">
                        Inativo
                      </span>
                    )}
                  </span>
                  <span className="text-[10px] text-zinc-400 font-mono italic">
                    {cliente.ultimaCompra || "-"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500 truncate text-[11px]">{cliente.email}</span>
                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border uppercase tracking-widest ${getStatusColor(getStatus(cliente))}`}>
                    {getStatus(cliente)}
                  </span>
                </div>

                {/* Menu de ações no hover */}
                <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden group-hover:flex gap-1 bg-white shadow-lg rounded-lg border border-zinc-200 p-1 z-10">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      abrirEdicao(cliente);
                    }}
                    className="p-1.5 text-zinc-500 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                    title="Editar"
                  >
                    <Edit2 size={14} />
                  </button>
                  {cliente.document && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleVisualizarDocumento(cliente.document);
                      }}
                      className="p-1.5 text-zinc-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                      title="Ver documento"
                    >
                      <Eye size={14} />
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleAtivo(cliente);
                    }}
                    className="p-1.5 text-zinc-500 hover:text-amber-600 hover:bg-amber-50 rounded"
                    title={cliente.is_active ? "Inativar" : "Ativar"}
                  >
                    {cliente.is_active ? <Ban size={14} /> : <CheckCircle size={14} />}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletarCliente(cliente);
                    }}
                    className="p-1.5 text-zinc-500 hover:text-red-600 hover:bg-red-50 rounded"
                    title="Excluir permanentemente"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
        
        <div className="p-3 border-t border-zinc-100 text-[10px] font-bold text-zinc-400 text-center bg-zinc-50 uppercase tracking-widest">
          {filtrarClientes().length} registros encontrados
        </div>
      </div>

      {/* COLUNA DIREITA: DETALHES */}
      <div className="flex-1 flex flex-col bg-zinc-50 h-full overflow-hidden">
        
        {/* Se não tem cliente selecionado */}
        {!selecionado ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            <Users className="h-16 w-16 text-zinc-300 mb-4" />
            <h3 className="text-lg font-semibold text-zinc-700 mb-2">Nenhum cliente selecionado</h3>
            <p className="text-zinc-500 text-sm mb-6 text-center max-w-md">
              Selecione um cliente da lista ao lado para ver os detalhes.
            </p>
          </div>
        ) : (
          <>
            {/* Header do Detalhe */}
            <header className="bg-white border-b border-zinc-200 px-6 py-5 flex justify-between items-center shrink-0 shadow-sm z-10">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-zinc-900 flex items-center justify-center text-white font-black text-xl shadow-lg border-4 border-white relative">
                  {getIniciais(selecionado.nome)}
                  {!selecionado.is_active && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-gray-400 rounded-full border-2 border-white"></div>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-2xl font-extrabold text-zinc-900 tracking-tight leading-none">
                      {selecionado.nome}
                    </h2>
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border uppercase tracking-widest ${getStatusColor(getStatus(selecionado))}`}>
                      {getStatus(selecionado)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-zinc-400 text-[11px] font-medium">
                    <span className="flex items-center gap-1.5 uppercase tracking-wider">
                      <Mail size={12} className="text-indigo-500" /> {selecionado.email || "Não informado"}
                    </span>
                    <span className="flex items-center gap-1.5 uppercase tracking-wider">
                      <Phone size={12} className="text-indigo-500" /> {selecionado.telefone || "Não informado"}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2">
                <button 
                  onClick={() => abrirEdicao(selecionado)}
                  className="px-4 py-2 bg-white border border-zinc-300 text-zinc-700 rounded-lg hover:bg-zinc-50 font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all shadow-sm"
                >
                  <Edit2 size={14}/> Editar
                </button>
                
                {selecionado.document && (
                  <button
                    onClick={() => handleVisualizarDocumento(selecionado.document)}
                    className="px-4 py-2 bg-white border border-zinc-300 text-zinc-700 rounded-lg hover:bg-blue-50 hover:text-blue-600 font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all shadow-sm"
                  >
                    <FileText size={14}/> Documento
                  </button>
                )}
                
                <button
                  onClick={() => handleToggleAtivo(selecionado)}
                  className={`px-4 py-2 rounded-lg font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all shadow-sm ${
                    selecionado.is_active
                      ? 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  {selecionado.is_active ? <Ban size={14} /> : <CheckCircle size={14} />}
                  {selecionado.is_active ? 'Inativar' : 'Ativar'}
                </button>
                
                <button
                  onClick={() => handleDeletarCliente(selecionado)}
                  className="px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all shadow-sm border border-red-200"
                >
                  <Trash2 size={14}/> Excluir
                </button>
              </div>
            </header>

            {/* Área de Conteúdo Scrollavel */}
            <div className="flex-1 overflow-y-auto p-8 min-h-0 bg-zinc-50/50">
              <div className="max-w-4xl mx-auto space-y-6">
                
                {/* Informações do Cliente */}
                <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-zinc-100 bg-zinc-50/50">
                    <h3 className="text-xs font-black text-zinc-800 uppercase tracking-[2px] flex items-center gap-2">
                      <Info size={14} className="text-indigo-600" />
                      Informações Cadastrais
                    </h3>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Documento</label>
                          <p className="text-sm font-medium text-zinc-800">{selecionado.documento || "Não informado"}</p>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Data de Nascimento</label>
                          <p className="text-sm font-medium text-zinc-800">
                            {selecionado.dataNascimento 
                              ? new Date(selecionado.dataNascimento).toLocaleDateString('pt-BR')
                              : "Não informada"}
                          </p>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Status</label>
                          <p className="text-sm font-medium text-zinc-800">
                            {selecionado.is_active ? (
                              <span className="text-emerald-600">Ativo</span>
                            ) : (
                              <span className="text-gray-500">Inativo</span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Endereço</label>
                          <p className="text-sm font-medium text-zinc-800">
                            {selecionado.endereco || "Não informado"}
                            {selecionado.cidade && ` - ${selecionado.cidade}`}
                            {selecionado.estado && `/${selecionado.estado}`}
                          </p>
                        </div>
                        {selecionado.document && (
                          <div>
                            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Documento Anexado</label>
                            <button
                              onClick={() => handleVisualizarDocumento(selecionado.document)}
                              className="mt-1 flex items-center gap-2 text-indigo-600 hover:text-indigo-700 text-sm"
                            >
                              <FileText size={16} />
                              Visualizar documento
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    {selecionado.observacoes && (
                      <div className="mt-4 pt-4 border-t border-zinc-100">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Observações</label>
                        <p className="text-sm font-medium text-zinc-800 mt-1">{selecionado.observacoes}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-3 gap-5">
                  <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm relative overflow-hidden group hover:border-indigo-200 transition-all">
                    <p className="text-zinc-400 text-[10px] font-black uppercase tracking-widest mb-1">Lifetime Value</p>
                    <p className="text-3xl font-black text-zinc-900 tracking-tighter font-mono">
                      {selecionado.totalGasto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                    <ShoppingBag size={48} className="absolute -right-3 -bottom-3 text-zinc-50 group-hover:text-indigo-50/50 transition-colors" />
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm relative overflow-hidden group hover:border-indigo-200 transition-all">
                    <p className="text-zinc-400 text-[10px] font-black uppercase tracking-widest mb-1">Último Pedido</p>
                    <p className="text-3xl font-black text-zinc-900 tracking-tighter font-mono">
                      {selecionado.ultimaCompra || "Nenhum"}
                    </p>
                    <Calendar size={48} className="absolute -right-3 -bottom-3 text-zinc-50 group-hover:text-indigo-50/50 transition-colors" />
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm relative overflow-hidden group hover:border-indigo-200 transition-all">
                    <p className="text-zinc-400 text-[10px] font-black uppercase tracking-widest mb-1">Ticket Médio Est.</p>
                    <p className="text-3xl font-black text-zinc-900 tracking-tighter font-mono">
                      {selecionado.totalGasto > 0 
                        ? (selecionado.totalGasto / 3.2).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) 
                        : "R$ 0,00"}
                    </p>
                    <Info size={48} className="absolute -right-3 -bottom-3 text-zinc-50 group-hover:text-indigo-50/50 transition-colors" />
                  </div>
                </div>

                {/* Timeline de Atividades */}
                <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
                  <div className="px-5 py-3 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
                    <h3 className="text-[11px] font-black text-zinc-800 uppercase tracking-widest flex items-center gap-2">
                      Histórico de Atividades
                    </h3>
                  </div>
                  <div className="p-6">
                    <div className="relative pl-6 border-l-2 border-zinc-100 space-y-8">
                      <div className="relative">
                        <div className="absolute -left-[31px] top-1 w-4 h-4 bg-emerald-500 rounded-full border-4 border-white shadow-sm"></div>
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-bold text-zinc-800 text-xs uppercase">Cliente Criado</p>
                            <p className="text-zinc-500 text-[11px] font-medium mt-0.5">Cadastro inicial</p>
                          </div>
                          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">
                            {new Date(selecionado.dataNascimento || Date.now()).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* MODAL de Cliente */}
      {modalAberto && (
        <ClienteModal
          aberto={modalAberto}
          mode={modoModal}
          clienteId={clienteIdEdit}
          onClose={() => {
            setModalAberto(false);
            setClienteIdEdit(null);
          }}
          onSave={handleSalvarCliente}
        />
      )}

      {/* MODAL de Visualização de Documento */}
      <VisualizarDocumento
        aberto={documentoAberto}
        documento={documentoSelecionado}
        onClose={() => {
          setDocumentoAberto(false);
          setDocumentoSelecionado(null);
        }}
      />

      {/* POPUP de Confirmação */}
      <PopupConfirmacao
        aberto={popupAberto}
        titulo={popupConfig.titulo}
        mensagem={popupConfig.mensagem}
        tipo={popupConfig.tipo}
        onConfirmar={popupConfig.onConfirmar}
        onCancelar={fecharPopup}
        onFechar={fecharPopup}
        confirmando={atualizando}
        textoConfirmar="Confirmar"
        textoCancelar="Cancelar"
      />
    </div>
  );
}
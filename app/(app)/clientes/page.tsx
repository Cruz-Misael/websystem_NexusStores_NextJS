"use client";
import { useState } from "react";
import ClienteModal, { ClienteForm as ClienteFormModal } from "@/components/clientes/ClienteModal";
import { clientes } from "@/mocks/clientes"
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
  Phone
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

// Seus tipos existentes
export type Cliente = {
  id: number;
  nome: string;
  email: string;
  telefone: string;
  ultimaCompra: string;
  totalGasto: number;
};

// Função para converter do tipo do modal para seu tipo Cliente
const converterParaCliente = (form: ClienteFormModal, id?: number): Cliente => {
  return {
    id: id || Date.now(), // Se não tiver ID, usa timestamp como ID temporário
    nome: form.nome,
    email: form.email,
    telefone: form.whatsapp, // Usa o whatsapp como telefone
    ultimaCompra: id ? form.observacoes.includes("nova compra") ? new Date().toLocaleDateString('pt-BR') : "" : "-", // Lógica simples para exemplo
    totalGasto: id ? 0 : Math.random() * 1000, // Para novos clientes, gera um valor aleatório
  };
};

// Função para converter do seu tipo Cliente para o tipo do modal
const converterParaFormModal = (cliente: Cliente): Partial<ClienteFormModal> => {
  return {
    nome: cliente.nome,
    email: cliente.email,
    whatsapp: cliente.telefone,
    documento: "",
    cep: "",
    endereco: "",
    numero: "",
    cidade: "",
    estado: "",
    observacoes: "",
    anexos: [],
  };
};

export default function CRMCompacto() {
  const [selecionado, setSelecionado] = useState<Cliente>(clientes[0]);
  const [listaClientes, setListaClientes] = useState<Cliente[]>(clientes);
  const [busca, setBusca] = useState("");
  const [modalAberto, setModalAberto] = useState(false);
  const [modoModal, setModoModal] = useState<"create" | "edit">("create");
  const [clienteParaEditar, setClienteParaEditar] = useState<Cliente | null>(null);

  // Função para abrir modal de NOVO cliente
  const abrirNovoCliente = () => {
    setModoModal("create");
    setClienteParaEditar(null);
    setModalAberto(true);
  };

  // Função para abrir modal de EDIÇÃO
  const abrirEdicao = (cliente: Cliente) => {
    setModoModal("edit");
    setClienteParaEditar(cliente);
    setModalAberto(true);
  };

  // Função que é chamada quando salva no modal
  const handleSalvarCliente = (clienteForm: ClienteFormModal) => {
    if (modoModal === "edit" && clienteParaEditar) {
      // Atualiza cliente existente
      const clienteAtualizado = converterParaCliente(clienteForm, clienteParaEditar.id);
      
      setListaClientes(prev => 
        prev.map(c => c.id === clienteParaEditar.id ? clienteAtualizado : c)
      );
      setSelecionado(clienteAtualizado);
      
      console.log("✅ Cliente editado:", clienteAtualizado);
    } else {
      // Cria novo cliente
      const novoCliente = converterParaCliente(clienteForm);
      
      setListaClientes(prev => [novoCliente, ...prev]);
      setSelecionado(novoCliente);
      
      console.log("🆕 Novo cliente criado:", novoCliente);
    }
    
    setModalAberto(false);
    setClienteParaEditar(null);
  };

  // Filtra clientes pela busca
  const filtrarClientes = () => {
    return listaClientes.filter(c => 
      c.nome.toLowerCase().includes(busca.toLowerCase()) || 
      c.email.toLowerCase().includes(busca.toLowerCase())
    );
  };

  // Função auxiliar para status (baseado no total gasto)
  const getStatus = (cliente: Cliente) => {
    if (cliente.totalGasto > 1000) return "Indicação";
    if (cliente.totalGasto > 0) return "Regular";
    return "Novo";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Indicação": return "bg-purple-100 text-purple-700 border-purple-200";
      case "Novo": return "bg-blue-100 text-blue-700 border-blue-200";
      default: return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getIniciais = (nome: string) => 
    nome.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();

return (
    <div className="flex h-full max-h-screen bg-zinc-50 overflow-hidden text-sm font-sans text-zinc-900 border border-zinc-300 rounded-lg shadow-2xl mx-auto">
      
      {/* COLUNA ESQUERDA: LISTA DE CLIENTES */}
      <div className="w-80 flex flex-col border-r border-zinc-200 bg-white shrink-0">
        
        {/* Header da Lista Padronizado */}
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
            <button 
              onClick={abrirNovoCliente}
              className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm transition-all active:scale-95"
            >
              <Plus size={18} strokeWidth={2.5} />
            </button>
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
              {["Todos", "VIP", "Recentes", "Inativos"].map(tag => (
                <button 
                  key={tag} 
                  className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-tight transition-all border
                    ${tag === "Todos" 
                      ? 'bg-zinc-900 border-zinc-900 text-white shadow-sm' 
                      : 'bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300 hover:bg-zinc-50'
                    }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Lista Scrollavel */}
        <div className="flex-1 overflow-y-auto min-h-0 bg-white">
          {filtrarClientes().map((cliente) => (
            <div 
              key={cliente.id}
              onClick={() => setSelecionado(cliente)}
              className={`p-3 border-b border-zinc-50 cursor-pointer hover:bg-zinc-50 transition-all ${
                selecionado.id === cliente.id 
                ? 'bg-indigo-50/60 border-l-2 border-l-indigo-600' 
                : 'border-l-2 border-l-transparent'
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                <span className="font-bold text-zinc-800 truncate text-xs">{cliente.nome}</span>
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
            </div>
          ))}
        </div>
        
        <div className="p-3 border-t border-zinc-100 text-[10px] font-bold text-zinc-400 text-center bg-zinc-50 uppercase tracking-widest">
          {filtrarClientes().length} registros encontrados
        </div>
      </div>

      {/* COLUNA DIREITA: DETALHES */}
      <div className="flex-1 flex flex-col bg-zinc-50 h-full overflow-hidden">
        
        {/* Header do Detalhe Padronizado */}
        <header className="bg-white border-b border-zinc-200 px-6 py-5 flex justify-between items-center shrink-0 shadow-sm z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-zinc-900 flex items-center justify-center text-white font-black text-xl shadow-lg border-4 border-white">
              {getIniciais(selecionado.nome)}
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
                  <Mail size={12} className="text-indigo-500" /> {selecionado.email}
                </span>
                <span className="flex items-center gap-1.5 uppercase tracking-wider">
                  <Phone size={12} className="text-indigo-500" /> {selecionado.telefone}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button 
              onClick={() => abrirEdicao(selecionado)}
              className="px-4 py-2 bg-white border border-zinc-300 text-zinc-700 rounded-lg hover:bg-zinc-50 font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all shadow-sm"
            >
              <Edit2 size={14}/> Editar Perfil
            </button>
            <button className="px-4 py-2 bg-white border border-zinc-300 text-zinc-700 rounded-lg hover:bg-zinc-50 font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all shadow-sm">
              <MessageSquare size={14}/> WhatsApp
            </button>
            <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-indigo-100 transition-all active:scale-95">
              <ShoppingBag size={14}/> Nova Venda
            </button>
          </div>
        </header>

        {/* Área de Conteúdo Scrollavel */}
        <div className="flex-1 overflow-y-auto p-8 min-h-0 bg-zinc-50/50">
          <div className="max-w-4xl mx-auto space-y-6">
            
            {/* KPI Cards Estilizados */}
            <div className="grid grid-cols-3 gap-5">
              <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm relative overflow-hidden group hover:border-indigo-200 transition-all">
                <p className="text-zinc-400 text-[10px] font-black uppercase tracking-widest mb-1">Lifetime Value (LTV)</p>
                <p className="text-3xl font-black text-zinc-900 tracking-tighter font-mono">
                  {selecionado.totalGasto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
                <ShoppingBag size={48} className="absolute -right-3 -bottom-3 text-zinc-50 group-hover:text-indigo-50/50 transition-colors" />
              </div>

              <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm relative overflow-hidden group hover:border-indigo-200 transition-all">
                <p className="text-zinc-400 text-[10px] font-black uppercase tracking-widest mb-1">Último Pedido</p>
                <p className="text-3xl font-black text-zinc-900 tracking-tighter font-mono">{selecionado.ultimaCompra || "Nenhum"}</p>
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

            {/* Timeline Histórico Padronizada */}
            <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
                <h3 className="text-[11px] font-black text-zinc-800 uppercase tracking-widest flex items-center gap-2">
                  Histórico de Atividades
                </h3>
                <button className="text-indigo-600 text-[10px] font-black uppercase tracking-widest hover:underline">Ver tudo</button>
              </div>
              <div className="p-6">
                <div className="relative pl-6 border-l-2 border-zinc-100 space-y-8">
                  <div className="relative">
                    <div className="absolute -left-[31px] top-1 w-4 h-4 bg-emerald-500 rounded-full border-4 border-white shadow-sm"></div>
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-zinc-800 text-xs uppercase">Compra Realizada #9021</p>
                        <p className="text-zinc-500 text-[11px] font-medium mt-0.5">3 itens • R$ 349,90</p>
                      </div>
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">25 Jan</span>
                    </div>
                  </div>

                  <div className="relative">
                    <div className="absolute -left-[31px] top-1 w-4 h-4 bg-indigo-500 rounded-full border-4 border-white shadow-sm"></div>
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-zinc-800 text-xs uppercase">Email Enviado</p>
                        <p className="text-zinc-500 text-[11px] font-medium mt-0.5">Campanha de Verão 2026</p>
                      </div>
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">20 Jan</span>
                    </div>
                  </div>

                  <div className="relative">
                    <div className="absolute -left-[31px] top-1 w-4 h-4 bg-rose-500 rounded-full border-4 border-white shadow-sm"></div>
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-zinc-800 text-xs uppercase">Devolução Solicitada</p>
                        <p className="text-zinc-500 text-[11px] font-medium mt-0.5">Motivo: Tamanho incorreto</p>
                      </div>
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">15 Jan</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Histórico/Notas Internas */}
            <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-1 h-4 bg-indigo-500 rounded-full"></div>
                <h3 className="text-xs font-black text-zinc-800 uppercase tracking-[2px]">Notas e Observações</h3>
              </div>
              <textarea 
                className="w-full text-xs font-medium border border-zinc-200 rounded-xl p-4 h-32 bg-zinc-50 focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 focus:outline-none resize-none transition-all"
                placeholder="Adicione detalhes estratégicos sobre este cliente..."
              ></textarea>
              <div className="mt-3 flex justify-end">
                <button className="text-[10px] font-black text-white bg-zinc-900 px-6 py-2.5 rounded-lg hover:bg-zinc-800 uppercase tracking-[2px] shadow-lg shadow-zinc-200 transition-all active:scale-95">
                  Salvar Observação
                </button>
              </div>
            </div>

{/* Gráfico de Top Itens do Cliente */}
<div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden flex flex-col">
  <div className="px-6 py-4 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
    <div className="flex flex-col gap-0.5">
      <h3 className="text-[11px] font-black text-zinc-800 uppercase tracking-[2px] flex items-center gap-2">
        <ShoppingBag size={14} className="text-indigo-600" />
        Top 10 Itens Adquiridos
      </h3>
      <p className="text-[10px] text-zinc-400 font-medium ml-6 uppercase">Baseado no volume histórico de compras</p>
    </div>
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Total: 42 itens</span>
    </div>
  </div>

  <div className="p-6 h-[320px] w-full">
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        layout="vertical"
        data={[
          { name: "Camiseta Algodão Pima", qtd: 12 },
          { name: "Calça Chino Slim", qtd: 8 },
          { name: "Tênis Urban Knit", qtd: 7 },
          { name: "Meias Performance", qtd: 6 },
          { name: "Cinto Couro Legítimo", qtd: 4 },
          { name: "Jaqueta Bomber", qtd: 2 },
          { name: "Boné Heritage", qtd: 1 },
          { name: "Perfume Signature", qtd: 1 },
          { name: "Carteira Minimalist", qtd: 1 },
        ]}
        margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f4f4f5" />
        <XAxis type="number" hide />
        <YAxis 
          dataKey="name" 
          type="category" 
          axisLine={false} 
          tickLine={false} 
          width={140}
          tick={{ fill: '#71717a', fontSize: 10, fontWeight: 700 }}
        />
        <Tooltip 
          cursor={{ fill: '#f4f4f5' }}
          contentStyle={{ 
            backgroundColor: '#18181b', 
            borderRadius: '12px', 
            border: 'none', 
            color: '#fff',
            fontSize: '11px',
            fontWeight: 'bold',
            padding: '8px 12px'
          }}
          itemStyle={{ color: '#818cf8' }}
        />
        <Bar 
          dataKey="qtd" 
          fill="#4f46e5" 
          radius={[0, 4, 4, 0]} 
          barSize={12}
        />
      </BarChart>
    </ResponsiveContainer>
  </div>
  
  <div className="px-6 py-3 bg-zinc-50 border-t border-zinc-100">
    <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest text-center italic">
      Este gráfico é atualizado automaticamente a cada nova transação aprovada.
    </p>
  </div>
</div>

          </div>
        </div>
      </div>

      {/* MODAL PADRONIZADO */}
      {modalAberto && (
        <ClienteModal
          aberto={modalAberto}
          mode={modoModal}
          cliente={clienteParaEditar ? converterParaFormModal(clienteParaEditar) : null}
          onClose={() => {
            setModalAberto(false);
            setClienteParaEditar(null);
          }}
          onSave={handleSalvarCliente}
        />
      )}
    </div>
  );
}
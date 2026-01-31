"use client";
import DevolucaoTrocaModal from "@/components/troca/DevolucaoTrocaModal";
import { Venda, ItemVenda } from "@/types/vendas";
import { vendasMock } from "@/mocks/vendas";
import { useState } from "react";
import { 
  Search, 
  Filter, 
  Download, 
  Printer, 
  Receipt, 
  XCircle, 
  RotateCcw, 
  ChevronRight,
  Calendar,
  CreditCard,
  ShoppingCart,
  User
} from "lucide-react";

// Tipos
type StatusVenda = "Concluída" | "Pendente" | "Cancelada";


export default function HistoricoVendasCompacto() {
  const [selecionada, setSelecionada] = useState<Venda>(vendasMock[0]);
  const [busca, setBusca] = useState("");
  const [modalRecibo, setModalRecibo] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);

  const formatarMoeda = (val: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

  const getStatusColor = (status: StatusVenda) => {
    switch (status) {
      case "Concluída": return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "Pendente": return "bg-amber-100 text-amber-700 border-amber-200";
      case "Cancelada": return "bg-rose-100 text-rose-700 border-rose-200";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const filtrarVendas = () => {
    return vendasMock.filter(v => 
      v.cliente.toLowerCase().includes(busca.toLowerCase()) || 
      v.id.toString().includes(busca)
    );
  };

  return (
  <div className="flex h-full max-h-screen bg-zinc-50 overflow-hidden text-sm font-sans text-zinc-900 border border-zinc-300 rounded-lg shadow-2xl mx-auto">
      
      {/* SIDEBAR: LISTA DE VENDAS */}
      <div className="w-80 flex flex-col border-r border-gray-200 bg-white shrink-0">
        
        {/* Header da Sidebar */}
        <div className="p-3 border-b border-gray-100 flex flex-col gap-3">
<div className="flex justify-between items-center">
  {/* Lado Esquerdo: Identidade da Página */}
  <div className="flex flex-col gap-1">
    <div className="flex items-center gap-2">
      <ShoppingCart size={22} className="text-indigo-600" strokeWidth={2.5} />
      <h1 className="text-xl font-extrabold text-zinc-900 tracking-tight leading-none">
        Vendas
      </h1>
    </div>
  </div>

  {/* Lado Direito: Grupo de Ações */}
  <div className="flex items-center gap-2">
    <div className="flex items-center bg-white border border-zinc-200 rounded-lg p-1 shadow-sm">
      <button 
        className="p-1.5 text-zinc-500 hover:text-indigo-600 hover:bg-zinc-50 rounded-md transition-colors" 
        title="Filtrar"
      >
        <Filter size={16} />
      </button>
      <div className="w-px h-4 bg-zinc-200 mx-1" /> {/* Divisor sutil */}
      <button 
        className="p-1.5 text-zinc-500 hover:text-indigo-600 hover:bg-zinc-50 rounded-md transition-colors" 
        title="Exportar CSV"
      >
        <Download size={16} />
      </button>
    </div>
    
    {/* Caso você tenha uma ação principal aqui no futuro, como "Nova Venda", ela entraria aqui ao lado */}
  </div>
</div>
          
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input 
              type="text" 
              placeholder="Buscar ID ou Cliente..." 
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            />
          </div>

          {/* Filtro Rápido de Data (Visual) */}
          <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 p-1.5 rounded border border-gray-100 cursor-pointer hover:bg-gray-100">
            <Calendar size={12} />
            <span>Jan 2023</span>
            <span className="ml-auto">▼</span>
          </div>
        </div>

        {/* Lista Scrollavel */}
        <div className="flex-1 overflow-y-auto">
          {filtrarVendas().map((venda) => (
            <div 
              key={venda.id}
              onClick={() => setSelecionada(venda)}
              className={`group p-3 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-all ${
                selecionada.id === venda.id ? 'bg-blue-50 border-l-2 border-l-blue-600' : 'border-l-2 border-l-transparent'
              }`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="font-mono font-medium text-gray-600 text-xs">#{venda.id}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded border ${getStatusColor(venda.status)}`}>
                  {venda.status}
                </span>
              </div>
              <div className="flex justify-between items-baseline mb-0.5">
                <span className="font-bold text-gray-800 text-base">{formatarMoeda(venda.total)}</span>
                <span className="text-xs text-gray-400">{venda.dataHora.split(' ')[0]}</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-500 truncate">
                <User size={10} />
                {venda.cliente}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* PAINEL PRINCIPAL: DETALHES */}
      <div className="flex-1 flex flex-col bg-gray-50 h-full overflow-hidden">
        
        {/* Header do Painel */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shrink-0 shadow-sm z-10">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-gray-900">Venda #{selecionada.id}</h2>
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${getStatusColor(selecionada.status)}`}>
                {selecionada.status}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
              <span className="flex items-center gap-1"><Calendar size={12}/> {selecionada.dataHora}</span>
              <span className="flex items-center gap-1"><User size={12}/> {selecionada.cliente}</span>
              <span className="flex items-center gap-1"><CreditCard size={12}/> {selecionada.metodoPagamento}</span>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button 
              onClick={() => setModalRecibo(true)}
              className="px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-xs flex items-center gap-2 shadow-sm"
            >
              <Printer size={16}/> Comprovante
            </button>
            {selecionada.status !== "Cancelada" && (
              <button 
                className="px-3 py-2 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 font-medium text-xs flex items-center gap-2 shadow-sm"
                onClick={() => confirm("Deseja cancelar esta venda?") && alert("Lógica de cancelamento")}
              >
                <XCircle size={16}/> Cancelar
              </button>
            )}
          </div>
        </header>

        {/* Conteúdo Scrollavel do Detalhe */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto space-y-6">
            
            {/* Tabela de Itens */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex justify-between items-center">
                <h3 className="font-semibold text-gray-700 text-xs uppercase tracking-wide">Itens do Pedido</h3>
                <span className="text-xs text-gray-500">{selecionada.itens.length} itens</span>
              </div>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 text-xs text-gray-500">
                    <th className="px-4 py-3 font-medium">Produto</th>
                    <th className="px-4 py-3 font-medium text-right">Qtd</th>
                    <th className="px-4 py-3 font-medium text-right">Unitário</th>
                    <th className="px-4 py-3 font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {selecionada.itens.map((item) => (
                    <tr key={item.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800">{item.nome}</p>
                        {item.variante && <p className="text-xs text-gray-400">{item.variante}</p>}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">{item.quantidade}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{formatarMoeda(item.precoUnitario)}</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-800">
                        {formatarMoeda(item.precoUnitario * item.quantidade)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Resumo Financeiro */}
            <div className="flex justify-end">
              <div className="w-72 bg-white rounded-lg border border-gray-200 shadow-sm p-4 space-y-3">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Subtotal</span>
                  <span>{formatarMoeda(selecionada.itens.reduce((acc, i) => acc + (i.precoUnitario * i.quantidade), 0))}</span>
                </div>
                {selecionada.desconto && (
                  <div className="flex justify-between text-xs text-green-600">
                    <span>Desconto</span>
                    <span>- {formatarMoeda(selecionada.desconto)}</span>
                  </div>
                )}
                <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
                  <span className="font-bold text-gray-700">Total</span>
                  <span className="font-bold text-xl text-gray-900">{formatarMoeda(selecionada.total)}</span>
                </div>
              </div>
            </div>

            {/* Ações Secundárias */}
            <div className="grid grid-cols-2 gap-4">
               <button 
                onClick={() => setModalAberto(true)}
                className="flex items-center justify-center gap-2 p-4 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 text-gray-600 transition-colors shadow-sm text-xs font-medium">
                 <RotateCcw size={18} />
                 Solicitar Devolução / Troca
               </button>
               <button className="flex items-center justify-center gap-2 p-4 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 text-gray-600 transition-colors shadow-sm text-xs font-medium">
                 <Receipt size={18} />
                 Enviar 2ª via por Email
               </button>
            </div>

          </div>
        </div>
      </div>

      {/* MODAL: RECIBO TÉRMICO */}
      {modalRecibo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#fffef0] w-full max-w-[320px] shadow-2xl overflow-hidden relative font-mono text-xs text-gray-800 leading-tight">
             {/* Efeito de papel rasgado (CSS Clip Path simulado com borda) */}
             <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-gray-200 via-white to-gray-200 opacity-50"></div>
             
             <div className="p-6 pb-8">
               <div className="text-center mb-4">
                 <h3 className="font-bold text-lg uppercase tracking-widest border-b-2 border-dashed border-gray-300 pb-2 mb-2">Minha Loja</h3>
                 <p>CNPJ: 00.000.000/0001-00</p>
                 <p>{selecionada.dataHora}</p>
                 <p>Venda: #{selecionada.id}</p>
               </div>

               <div className="border-b border-dashed border-gray-300 pb-2 mb-2">
                 <div className="grid grid-cols-12 font-bold mb-1">
                   <span className="col-span-6">ITEM</span>
                   <span className="col-span-2 text-right">QTD</span>
                   <span className="col-span-4 text-right">VALOR</span>
                 </div>
                 {selecionada.itens.map(item => (
                   <div key={item.id} className="grid grid-cols-12 mb-1">
                     <span className="col-span-6 truncate">{item.nome}</span>
                     <span className="col-span-2 text-right">{item.quantidade}</span>
                     <span className="col-span-4 text-right">{formatarMoeda(item.precoUnitario * item.quantidade)}</span>
                   </div>
                 ))}
               </div>

               <div className="flex justify-between font-bold text-sm mt-2">
                 <span>TOTAL</span>
                 <span>{formatarMoeda(selecionada.total)}</span>
               </div>
               <div className="flex justify-between mt-1 text-[10px]">
                 <span>Pagamento:</span>
                 <span>{selecionada.metodoPagamento.toUpperCase()}</span>
               </div>
               
               <div className="text-center mt-6 text-[10px] text-gray-500">
                 <p>*** NÃO É DOCUMENTO FISCAL ***</p>
                 <p>Obrigado pela preferência!</p>
               </div>
             </div>

             {/* Botões do Modal */}
             <div className="bg-gray-800 p-3 flex gap-2">
               <button 
                 onClick={() => window.print()} 
                 className="flex-1 bg-white text-black py-2 rounded font-bold hover:bg-gray-200"
               >
                 IMPRIMIR
               </button>
               <button 
                 onClick={() => setModalRecibo(false)} 
                 className="flex-1 bg-gray-700 text-white py-2 rounded font-bold hover:bg-gray-600"
               >
                 FECHAR
               </button>
             </div>
          </div>
        </div>
      )}

    {modalAberto && selecionada && (
      <DevolucaoTrocaModal
        venda={selecionada}
        onClose={() => setModalAberto(false)}
        onConfirm={(payload) => {
          console.log("Devolução confirmada:", payload);
          /*
            payload = {
              vendaId: number,
              itens: [
                { itemId: number, quantidade: number }
              ]
            }
          */
          setModalAberto(false);
        }}
      />
    )}


    </div>
  );
}
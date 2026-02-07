"use client";

import { useState, useRef, useEffect } from "react";
import { 
  Search, 
  Trash2, 
  CreditCard, 
  Smartphone, 
  QrCode, 
  Banknote,
  User,
  Percent,
  MoreHorizontal,
  Box,
  Delete,
  ShoppingBag,
  Menu,
  Maximize2
} from "lucide-react";

// Tipos
interface ItemCarrinho {
  id: number;
  codigo: string;
  nome: string;
  precoUnitario: number;
  quantidade: number;
}

export default function CaixaPDVPro() {
  const [busca, setBusca] = useState("");
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([
    { id: 1, codigo: "789100", nome: "Camiseta Básica Algodão (Preta/M)", precoUnitario: 59.90, quantidade: 1 },
    { id: 2, codigo: "789101", nome: "Coca-Cola Lata 350ml", precoUnitario: 6.00, quantidade: 2 },
    { id: 3, codigo: "789102", nome: "Tênis Esportivo Run (41)", precoUnitario: 219.90, quantidade: 1 },
  ]);
  const [pagamentoAtivo, setPagamentoAtivo] = useState("credito");
  
  const inputRef = useRef<HTMLInputElement>(null);

  // Totais
  const subtotal = carrinho.reduce((acc, item) => acc + (item.precoUnitario * item.quantidade), 0);
  const totalItens = carrinho.reduce((acc, item) => acc + item.quantidade, 0);
  const desconto = 0;
  const totalFinal = subtotal - desconto;

  // Adicione após os outros estados
   const [mostrarModalConsignado, setMostrarModalConsignado] = useState(false);
   const [dataPrevistaPagamento, setDataPrevistaPagamento] = useState("");
   const [observacaoConsignado, setObservacaoConsignado] = useState("");

  // Formatação
  const money = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  // Handlers
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && busca) {
      const novoItem: ItemCarrinho = {
        id: Date.now(),
        codigo: Math.floor(Math.random() * 99999).toString(),
        nome: `Produto Genérico ${Math.floor(Math.random() * 100)}`,
        precoUnitario: parseFloat((Math.random() * 100).toFixed(2)),
        quantidade: 1
      };
      setCarrinho([...carrinho, novoItem]);
      setBusca("");
    }
  };

  const removerItem = (id: number) => {
    setCarrinho(carrinho.filter(i => i.id !== id));
  };

   return (
   <div className="flex flex-col h-full max-h-screen bg-zinc-50 text-zinc-900 font-sans overflow-hidden selection:bg-indigo-100 border border-zinc-300 rounded-lg shadow-2xl mx-auto">      
      
      {/* HEADER COMPACTO - Altura fixa */}
<header className="h-14 bg-white border-b border-zinc-200 flex justify-between items-center px-4 shrink-0 z-10">
  <div className="flex items-center gap-3">
    {/* Box de Identidade PDV - Mantendo o estilo, mas ajustando o tamanho */}
    <div className="w-9 h-9 bg-zinc-900 rounded-lg flex items-center justify-center text-white font-black text-[10px] shadow-md shrink-0">
      PDV
    </div>
    
    {/* Título e Subtítulo Padronizados */}
    <div className="flex flex-col gap-0.5">
      <h1 className="text-lg font-extrabold text-zinc-900 tracking-tight leading-none">
        Checkout Pro
      </h1>
      <div className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
          Caixa 01 • Terminal Online
        </p>
      </div>
    </div>
  </div>
  
  <div className="flex items-center gap-3">
    {/* Badge do Operador - Mais limpo */}
    <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg shadow-sm">
      <div className="w-5 h-5 rounded-full bg-zinc-200 flex items-center justify-center">
        <User size={12} className="text-zinc-600"/>
      </div>
      <span className="text-[10px] font-bold text-zinc-700 uppercase tracking-wide">
        Op. Ricardo
      </span>
    </div>
    
    <button className="p-2 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-all">
      <Maximize2 size={16} />
    </button>
  </div>
</header>

      {/* BODY SPLIT VIEW - flex-1 garante que ocupe o espaço restante do h-[700px] */}
      <div className="flex flex-1 overflow-hidden min-h-0">
         
         {/* ESQUERDA: LISTA DE PRODUTOS */}
         <div className="flex-[2] flex flex-col bg-white border-r border-zinc-200 min-h-0">
         
         {/* Barra de Busca - shrink-0 para não amassar */}
         <div className="p-4 border-b border-zinc-100 shrink-0">
            <div className="relative group">
               <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2 text-zinc-400">
                  <Search size={18} />
               </div>
               <input 
                  ref={inputRef}
                  type="text"
                  value={busca}
                  onChange={e => setBusca(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Escaneie ou digite o código (F2)..."
                  className="w-full h-12 pl-10 pr-20 bg-zinc-50 border border-zinc-200 rounded-lg text-lg font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-zinc-400"
                  autoFocus
               />
               <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1">
                  <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold text-zinc-500 bg-white border border-zinc-200 rounded shadow-sm">
                     ENTER
                  </kbd>
               </div>
            </div>
         </div>

         {/* Tabela de Produtos - flex-1 + overflow-y-auto gerencia o scroll interno */}
         <div className="flex-1 overflow-y-auto min-h-0 bg-white">
            <table className="w-full text-left border-collapse">
               <thead className="bg-zinc-50 sticky top-0 z-10 shadow-sm">
                  <tr>
                     <th className="px-4 py-2 text-[10px] font-bold text-zinc-400 uppercase tracking-wider w-12 text-center">#</th>
                     <th className="px-4 py-2 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Descrição</th>
                     <th className="px-4 py-2 text-[10px] font-bold text-zinc-400 uppercase tracking-wider text-right">Qtd</th>
                     <th className="px-4 py-2 text-[10px] font-bold text-zinc-400 uppercase tracking-wider text-right">Unitário</th>
                     <th className="px-4 py-2 text-[10px] font-bold text-zinc-400 uppercase tracking-wider text-right">Total</th>
                     <th className="px-4 py-2 text-[10px] font-bold text-zinc-400 uppercase tracking-wider w-10"></th>
                  </tr>
               </thead>
               <tbody className="text-sm">
                  {carrinho.map((item, index) => (
                     <tr key={item.id} className="group border-b border-zinc-50 hover:bg-indigo-50/30 transition-colors">
                        <td className="px-4 py-3 text-center text-zinc-400 font-mono text-xs">{index + 1}</td>
                        <td className="px-4 py-3">
                           <div className="font-medium text-zinc-800">{item.nome}</div>
                           <div className="text-[10px] text-zinc-400 font-mono tracking-wide">{item.codigo}</div>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-zinc-600">{item.quantidade}</td>
                        <td className="px-4 py-3 text-right font-mono text-zinc-600">{item.precoUnitario.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-zinc-900">
                           {(item.precoUnitario * item.quantidade).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-center">
                           <button 
                              onClick={() => removerItem(item.id)}
                              className="p-1.5 text-zinc-300 hover:text-red-600 hover:bg-red-50 rounded transition-all opacity-0 group-hover:opacity-100"
                           >
                              <Trash2 size={14} />
                           </button>
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>

         {/* Footer da Tabela - shrink-0 */}
         <div className="h-10 bg-zinc-50 border-t border-zinc-200 flex items-center justify-between px-4 text-xs text-zinc-500 shrink-0">
            <div className="flex gap-4">
               <span>Itens: <strong className="text-zinc-700">{carrinho.length}</strong></span>
               <span>Volume: <strong className="text-zinc-700">{totalItens}</strong></span>
            </div>
            <div>Ultima sinc: 14:32:01</div>
         </div>
         </div>

         {/* DIREITA: PAINEL DE PAGAMENTO */}
         <div className="w-[360px] bg-zinc-50 flex flex-col border-l border-zinc-200 shrink-0 min-h-0">
         
         {/* Seção Cliente - shrink-0 */}
         <div className="p-4 border-b border-zinc-200 bg-white shrink-0">
            <div className="flex justify-between items-center mb-2">
               <label className="text-[10px] font-bold text-zinc-400 uppercase">Cliente</label>
               <button className="text-[10px] text-indigo-600 font-bold hover:underline">ALTERAR (F3)</button>
            </div>
            <div className="flex items-center gap-3 p-3 bg-zinc-50 border border-zinc-200 rounded-lg">
               <div className="w-8 h-8 rounded-full bg-zinc-200 flex items-center justify-center text-zinc-500">
                  <User size={16} />
               </div>
               <div className="overflow-hidden">
                  <p className="text-sm font-bold text-zinc-800 truncate">Consumidor Final</p>
                  <p className="text-[10px] text-zinc-500 truncate">Não identificado</p>
               </div>
            </div>
         </div>

         {/* Resumo Financeiro - flex-1 e overflow-y-auto para telas muito pequenas */}
         <div className="flex-1 p-6 flex flex-col justify-center space-y-4 overflow-y-auto min-h-0">
            <div className="space-y-2">
               <div className="flex justify-between text-zinc-500 text-sm">
                  <span>Subtotal</span>
                  <span className="font-mono">{money(subtotal)}</span>
               </div>
               <div className="flex justify-between text-zinc-500 text-sm">
                  <span>Descontos</span>
                  <span className="font-mono">{money(desconto)}</span>
               </div>
            </div>

            <div className="py-6 border-y border-dashed border-zinc-300 shrink-0">
               <div className="flex justify-between items-end mb-1">
                  <span className="text-sm font-bold text-zinc-400 uppercase">Total a Pagar</span>
               </div>
               <div className="text-5xl font-bold text-zinc-900 tracking-tight font-mono text-right">
                  {money(totalFinal).replace('R$', '').trim()}
                  <span className="text-xl text-zinc-400 ml-1">,00</span>
               </div>
            </div>

            {/* Adicione isso após o resumo financeiro, antes do grid de pagamento */}
            {pagamentoAtivo === 'consignado' && (
            <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
               <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                  <ShoppingBag size={16} className="text-orange-600" />
                  <span className="text-sm font-medium text-orange-700">Venda Consignada</span>
                  </div>
                  <button 
                  onClick={() => setMostrarModalConsignado(true)}
                  className="text-xs text-orange-600 hover:text-orange-700 font-medium hover:underline"
                  >
                  Editar
                  </button>
               </div>
               {dataPrevistaPagamento && (
                  <div className="mt-2 text-xs text-orange-600">
                  <p>Pagamento previsto: <strong>{new Date(dataPrevistaPagamento).toLocaleDateString('pt-BR')}</strong></p>
                  {observacaoConsignado && (
                     <p className="mt-1 truncate" title={observacaoConsignado}>
                        Obs: {observacaoConsignado}
                     </p>
                  )}
                  </div>
               )}
            </div>
            )}
            
{/* Grid de Pagamento */}
<div className="shrink-0">
  <label className="text-[10px] font-bold text-zinc-400 uppercase mb-2 block">Método de Pagamento</label>
  <div className="grid grid-cols-2 gap-2">
    {[
      {id: 'credito', icon: CreditCard, label: 'Crédito', key: 'F6'},
      {id: 'debito', icon: CreditCard, label: 'Débito', key: 'F7'},
      {id: 'pix', icon: QrCode, label: 'Pix', key: 'F8'},
      {id: 'dinheiro', icon: Banknote, label: 'Dinheiro', key: 'F9'},
      {id: 'consignado', icon: ShoppingBag, label: 'Consignado', key: 'F10', cor: 'orange'},
    ].map(metodo => (
      <button
        key={metodo.id}
        onClick={() => {
          if (metodo.id === 'consignado') {
            setMostrarModalConsignado(true);
            setPagamentoAtivo('consignado');
          } else {
            setPagamentoAtivo(metodo.id);
          }
        }}
        className={`relative flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${
          pagamentoAtivo === metodo.id 
          ? 'bg-zinc-800 text-white border-zinc-800 shadow-md transform scale-[1.02]' 
          : metodo.id === 'consignado'
            ? 'bg-orange-50 text-orange-700 border-orange-200 hover:border-orange-300 hover:bg-orange-100'
            : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50'
        }`}
      >
        <metodo.icon size={20} className="mb-1.5" />
        <span className="text-xs font-medium">{metodo.label}</span>
        {metodo.id === 'consignado' && pagamentoAtivo === 'consignado' && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full border-2 border-white"></div>
        )}
        <span className={`absolute top-1 right-2 text-[9px] font-bold opacity-50 ${
          metodo.id === 'consignado' 
            ? 'text-orange-400' 
            : pagamentoAtivo === metodo.id 
              ? 'text-zinc-400' 
              : 'text-zinc-300'
        }`}>
          {metodo.key}
        </span>
      </button>
    ))}
  </div>
</div>
         </div>

         {/* Footer de Ação */}
         <div className="p-4 bg-white border-t border-zinc-200 shrink-0">
         <button 
            onClick={() => {
               if (pagamentoAtivo === 'consignado') {
               // Se for consignado, reabre o modal para confirmar
               setMostrarModalConsignado(true);
               } else {
               // Lógica normal de finalização
               alert(`Venda finalizada via ${pagamentoAtivo.toUpperCase()}! Total: ${money(totalFinal)}`);
               }
            }}
            className={`w-full h-14 rounded-lg font-bold text-lg shadow-lg transition-all flex items-center justify-between px-6 group active:scale-[0.98] ${
               pagamentoAtivo === 'consignado'
               ? 'bg-orange-600 hover:bg-orange-700 text-white shadow-orange-200'
               : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200'
            }`}
         >
            <span>
               {pagamentoAtivo === 'consignado' ? 'FINALIZAR CONSIGNADO' : 'FINALIZAR VENDA'}
            </span>
            <div className="flex items-center gap-2">
               <span className={`text-sm font-medium opacity-80 group-hover:opacity-100 ${
               pagamentoAtivo === 'consignado' ? 'text-orange-200' : 'text-emerald-200'
               }`}>
               R$ {money(totalFinal)}
               </span>
               <span className={`px-2 py-1 rounded text-xs font-mono ${
               pagamentoAtivo === 'consignado' 
                  ? 'bg-orange-800/40 text-orange-100' 
                  : 'bg-emerald-800/40 text-emerald-100'
               }`}>
               {pagamentoAtivo === 'consignado' ? 'F10' : 'F5'}
               </span>
            </div>
         </button>
         </div>

         {/* Modal de Consignado */}
         {mostrarModalConsignado && (
         <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden">
               
               {/* Header */}
               <div className="px-6 py-4 border-b border-zinc-200 bg-orange-50 flex justify-between items-center">
               <div className="flex items-center gap-2">
                  <div className="bg-orange-100 p-2 rounded-lg">
                     <ShoppingBag className="text-orange-600" size={20} />
                  </div>
                  <div>
                     <h2 className="text-lg font-bold text-zinc-900">Venda Consignada</h2>
                     <p className="text-xs text-zinc-500">Configure os detalhes do pagamento futuro</p>
                  </div>
               </div>
               <button 
                  onClick={() => {
                     setMostrarModalConsignado(false);
                     setDataPrevistaPagamento("");
                     setObservacaoConsignado("");
                     setPagamentoAtivo('credito'); 
                  }}
                  className="p-2 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200 rounded-full transition-colors"
               >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
               </button>
               </div>

               {/* Body */}
               <div className="p-6 space-y-4">
               <div>
                  <label className="text-sm font-medium text-zinc-700 mb-2 block">
                     Data Prevista de Pagamento *
                  </label>
                  <input
                     type="date"
                     value={dataPrevistaPagamento}
                     onChange={(e) => setDataPrevistaPagamento(e.target.value)}
                     className="w-full h-12 px-3 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                     min={new Date().toISOString().split('T')[0]}
                     required
                  />
               </div>

               <div>
                  <label className="text-sm font-medium text-zinc-700 mb-2 block">
                     Observação (Opcional)
                  </label>
                  <textarea
                     value={observacaoConsignado}
                     onChange={(e) => setObservacaoConsignado(e.target.value)}
                     placeholder="Ex: Pagamento após venda do lote, acordo com cliente XYZ..."
                     className="w-full h-24 px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 resize-none"
                  />
               </div>

               <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-start gap-2">
                     <div className="text-orange-600 mt-0.5">
                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                     </svg>
                     </div>
                     <div className="text-xs text-orange-700">
                     <p className="font-medium mb-1">Informação Importante</p>
                     <p>O cliente levará os produtos agora e pagará na data especificada. Certifique-se de registrar todas as informações necessárias.</p>
                     </div>
                  </div>
               </div>
               </div>

               {/* Footer */}
               <div className="px-6 py-4 bg-zinc-50 border-t border-zinc-200 flex justify-end gap-3">
               <button 
                  onClick={() => {
                     setMostrarModalConsignado(false);
                     setDataPrevistaPagamento("");
                     setObservacaoConsignado("");
                  }}
                  className="px-5 py-2.5 bg-white border border-zinc-300 text-zinc-700 rounded-lg text-sm font-medium hover:bg-zinc-50 transition-colors"
               >
                  Cancelar
               </button>
               <button
                  onClick={() => {
                     if (!dataPrevistaPagamento) {
                     alert("Por favor, selecione uma data prevista para o pagamento");
                     return;
                     }
                     
                     setPagamentoAtivo('consignado');
                     setMostrarModalConsignado(false);
                     
                     // Aqui você pode salvar os dados da venda consignada
                     console.log("Venda consignada configurada:", {
                     dataPrevistaPagamento,
                     observacao: observacaoConsignado,
                     total: totalFinal
                     });
                  }}
                  className="px-5 py-2.5 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 transition-colors shadow-sm shadow-orange-200"
               >
                  Confirmar Consignado
               </button>
               </div>
            </div>
         </div>
         )}
         </div>
      </div>
   </div>
   );

}
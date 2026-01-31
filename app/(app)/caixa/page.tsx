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

            {/* Grid de Pagamento */}
            <div className="shrink-0">
               <label className="text-[10px] font-bold text-zinc-400 uppercase mb-2 block">Método de Pagamento</label>
               <div className="grid grid-cols-2 gap-2">
                  {[
                     {id: 'credito', icon: CreditCard, label: 'Crédito', key: 'F6'},
                     {id: 'debito', icon: CreditCard, label: 'Débito', key: 'F7'},
                     {id: 'pix', icon: QrCode, label: 'Pix', key: 'F8'},
                     {id: 'dinheiro', icon: Banknote, label: 'Dinheiro', key: 'F9'},
                  ].map(metodo => (
                     <button
                        key={metodo.id}
                        onClick={() => setPagamentoAtivo(metodo.id)}
                        className={`relative flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${
                           pagamentoAtivo === metodo.id 
                           ? 'bg-zinc-800 text-white border-zinc-800 shadow-md transform scale-[1.02]' 
                           : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50'
                        }`}
                     >
                        <metodo.icon size={20} className="mb-1.5" />
                        <span className="text-xs font-medium">{metodo.label}</span>
                        <span className={`absolute top-1 right-2 text-[9px] font-bold opacity-50 ${pagamentoAtivo === metodo.id ? 'text-zinc-400' : 'text-zinc-300'}`}>
                           {metodo.key}
                        </span>
                     </button>
                  ))}
               </div>
            </div>
         </div>

         {/* Footer de Ação - shrink-0 fixo no fundo */}
         <div className="p-4 bg-white border-t border-zinc-200 shrink-0">
            <button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-14 rounded-lg font-bold text-lg shadow-lg shadow-emerald-200 transition-all flex items-center justify-between px-6 group active:scale-[0.98]">
               <span>FINALIZAR VENDA</span>
               <div className="flex items-center gap-2">
                  <span className="text-emerald-200 text-sm font-medium opacity-80 group-hover:opacity-100">R$ {money(totalFinal)}</span>
                  <span className="bg-emerald-800/40 px-2 py-1 rounded text-xs font-mono">F5</span>
               </div>
            </button>
         </div>

         </div>
      </div>
   </div>
   );

}
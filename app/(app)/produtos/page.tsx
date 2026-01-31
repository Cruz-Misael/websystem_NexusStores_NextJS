"use client";
import ProdutoModal from "@/components/estoque/ProdutoModal";
import { produtosMock } from "@/mocks/produtos";
import type { Produto } from "@/mocks/produtos";
import { useState } from "react";
import { 
  Search, 
  Plus, 
  Filter, 
  Package, 
  AlertCircle, 
  History,
  QrCode,
  Edit2,
  Trash2,
  Save,
  ArrowUp,
  ArrowDown
} from "lucide-react";

// Função para converter do tipo do modal para seu tipo Produto
const converterParaProduto = (form: any, id?: number): Produto => {
  return {
    id: id || Date.now(),
    nome: form.nome,
    categoria: form.categoria,
    fornecedor: form.fornecedor,
    localizacao: form.localizacao,
    preco: form.preco,
    custo: form.custo,
    estoque: form.estoque,
    estoqueMinimo: form.estoqueMinimo,
    estoqueMaximo: form.estoqueMaximo,
    sku: form.sku,
    codigoBarras: form.codigoBarras,
    imagem: form.imagem,
    ultimaMovimentacao: form.ultimaMovimentacao
  };
};

// Função para converter do seu Produto para o tipo do modal
const converterParaFormModal = (produto: Produto) => {
  return {
    nome: produto.nome,
    categoria: produto.categoria,
    fornecedor: produto.fornecedor,
    localizacao: produto.localizacao,
    preco: produto.preco,
    custo: produto.custo,
    estoque: produto.estoque,
    estoqueMinimo: produto.estoqueMinimo,
    estoqueMaximo: produto.estoqueMaximo,
    sku: produto.sku,
    codigoBarras: produto.codigoBarras,
    imagem: produto.imagem,
  };
};

export default function GestaoEstoqueCompacto() {
  const [selecionado, setSelecionado] = useState<Produto>(produtosMock[0]);
  const [listaProdutos, setListaProdutos] = useState<Produto[]>(produtosMock);
  const [busca, setBusca] = useState("");
  const [ajusteEstoque, setAjusteEstoque] = useState(0);
  const [modalAberto, setModalAberto] = useState(false);
  const [modoModal, setModoModal] = useState<"create" | "edit">("create");
  const [produtoParaEditar, setProdutoParaEditar] = useState<Produto | null>(null);

  // Função para abrir modal de NOVO produto
  const abrirNovoProduto = () => {
    setModoModal("create");
    setProdutoParaEditar(null);
    setModalAberto(true);
  };

  // Função para abrir modal de EDIÇÃO
  const abrirEdicao = (produto: Produto) => {
    setModoModal("edit");
    setProdutoParaEditar(produto);
    setModalAberto(true);
  };

  // Função que é chamada quando salva no modal
  const handleSalvarProduto = (produtoForm: any) => {
    if (modoModal === "edit" && produtoParaEditar) {
      // Atualiza produto existente
      const produtoAtualizado = converterParaProduto(produtoForm, produtoParaEditar.id);
      
      setListaProdutos(prev => 
        prev.map(p => p.id === produtoParaEditar.id ? produtoAtualizado : p)
      );
      setSelecionado(produtoAtualizado);
      
      console.log("✅ Produto editado:", produtoAtualizado);
    } else {
      // Cria novo produto
      const novoProduto = converterParaProduto(produtoForm);
      
      setListaProdutos(prev => [novoProduto, ...prev]);
      setSelecionado(novoProduto);
      
      console.log("🆕 Novo produto criado:", novoProduto);
    }
    
    setModalAberto(false);
    setProdutoParaEditar(null);
  };

  // Filtra produtos
  const produtosFiltrados = listaProdutos.filter(p => 
    p.nome.toLowerCase().includes(busca.toLowerCase()) || 
    p.sku.toLowerCase().includes(busca.toLowerCase())
  );

  // Cálculos de Status
  const getStatusEstoque = (qtd: number, min: number) => {
    if (qtd <= min) return { label: "Crítico", color: "text-red-600 bg-red-50 border-red-200", dot: "bg-red-500" };
    if (qtd <= min * 1.5) return { label: "Baixo", color: "text-amber-600 bg-amber-50 border-amber-200", dot: "bg-amber-500" };
    return { label: "OK", color: "text-emerald-600 bg-emerald-50 border-emerald-200", dot: "bg-emerald-500" };
  };

  const formatarMoeda = (val: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

  return (
    <div className="flex h-full max-h-screen bg-zinc-50 overflow-hidden text-sm font-sans text-zinc-900 border border-zinc-300 rounded-lg shadow-2xl mx-auto">
      
      {/* COLUNA ESQUERDA: LISTAGEM */}
      <div className="w-96 flex flex-col border-r border-zinc-200 bg-white shrink-0">
        
        {/* Header da Lista */}
        <div className="p-3 border-b border-zinc-100 flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <Package size={22} className="text-indigo-600" strokeWidth={2.5} />
                <h1 className="text-xl font-extrabold text-zinc-900 tracking-tight leading-none">
                  Estoque
                </h1>
              </div>
            </div>
            <button 
              onClick={abrirNovoProduto}
              className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm hover:shadow"
            >
              <Plus size={18} strokeWidth={2.5} />
            </button>
          </div>
          
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
              <input 
                type="text" 
                placeholder="Buscar SKU ou Nome..." 
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-md text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <button className="p-1.5 bg-zinc-50 border border-zinc-200 rounded-md text-zinc-500 hover:text-indigo-600 hover:border-indigo-200">
              <Filter size={16} />
            </button>
          </div>
          
          {/* Quick Stats na Lista */}
          <div className="flex justify-between text-[10px] text-zinc-400 px-1">
             <span>{produtosFiltrados.length} produtos</span>
             <span>Valor Total: {formatarMoeda(produtosFiltrados.reduce((acc, p) => acc + (p.preco * p.estoque), 0))}</span>
          </div>
        </div>

        {/* Lista Scrollavel */}
        <div className="flex-1 overflow-y-auto">
          {produtosFiltrados.map((produto) => {
            const status = getStatusEstoque(produto.estoque, produto.estoqueMinimo);
            return (
              <div 
                key={produto.id}
                onClick={() => setSelecionado(produto)}
                className={`group p-3 border-b border-zinc-50 cursor-pointer hover:bg-zinc-50 transition-all ${
                  selecionado.id === produto.id ? 'bg-indigo-50/60 border-l-2 border-l-indigo-600' : 'border-l-2 border-l-transparent'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-semibold text-gray-800 truncate">{produto.nome}</span>
                  <span className={`text-[10px] px-1.5 rounded-full border font-medium ${status.color}`}>
                    {status.label}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="flex flex-col">
                     <span className="font-mono text-[10px] text-zinc-400">{produto.sku}</span>
                     <span className="text-[10px] text-zinc-500">{produto.categoria}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-sm text-zinc-800">{produto.estoque} un</div>
                    <div className="text-[10px] text-zinc-400">Min: {produto.estoqueMinimo}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* COLUNA DIREITA: DETALHES E EDIÇÃO */}
      <div className="flex-1 flex flex-col bg-zinc-50 h-full overflow-hidden">
        
        {/* Header do Detalhe */}
        <header className="bg-white border-b border-zinc-200 px-6 py-4 flex justify-between items-start shrink-0 shadow-sm z-10">
          <div>
            <div className="flex items-center gap-2 text-[10px] text-zinc-400 uppercase tracking-wider mb-1">
              <span>{selecionado.categoria}</span>
              <span>•</span>
              <span>SKU: {selecionado.sku}</span>
              <span>•</span>
              <span>Loc: {selecionado.localizacao}</span>
            </div>
            <h2 className="text-2xl font-bold text-zinc-900">{selecionado.nome}</h2>
          </div>
          
          <div className="flex gap-2">
            <button 
              onClick={() => abrirEdicao(selecionado)}
              className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-xs font-medium shadow-sm transition-colors"
            >
              <Edit2 size={14}/> Editar
            </button>
            <button className="p-1.5 text-zinc-400 hover:text-red-600 transition-colors">
               <Trash2 size={16} />
            </button>
          </div>
        </header>

        {/* Conteúdo Principal */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-5xl mx-auto space-y-6">
            
            {/* KPIs do Produto */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-1 h-full ${getStatusEstoque(selecionado.estoque, selecionado.estoqueMinimo).dot}`}></div>
                <p className="text-zinc-500 text-xs font-medium uppercase mb-1">Estoque Atual</p>
                <p className="text-3xl font-bold text-zinc-900">{selecionado.estoque}</p>
                <div className="flex items-center gap-1 mt-2 text-xs">
                   <span className="text-zinc-400">Capacidade:</span>
                   <div className="flex-1 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                      <div className="h-full bg-zinc-800 rounded-full" style={{ width: `${(selecionado.estoque / selecionado.estoqueMaximo) * 100}%` }}></div>
                   </div>
                   <span className="text-zinc-600">{Math.round((selecionado.estoque / selecionado.estoqueMaximo) * 100)}%</span>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
                <p className="text-zinc-500 text-xs font-medium uppercase mb-1">Preço Venda</p>
                <p className="text-2xl font-bold text-zinc-900">{formatarMoeda(selecionado.preco)}</p>
                {selecionado.custo > 0 && (
                  <p className="text-xs text-emerald-600 mt-1 font-medium">
                    +{Math.round(((selecionado.preco - selecionado.custo) / selecionado.custo) * 100)}% Markup
                  </p>
                )}
              </div>

              <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
                <p className="text-zinc-500 text-xs font-medium uppercase mb-1">Custo Unit.</p>
                <p className="text-2xl font-bold text-zinc-700">{formatarMoeda(selecionado.custo)}</p>
                <p className="text-xs text-zinc-400 mt-1">Fornecedor: {selecionado.fornecedor}</p>
              </div>

              <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
                <p className="text-zinc-500 text-xs font-medium uppercase mb-1">Valor em Estoque</p>
                <p className="text-2xl font-bold text-zinc-700">{formatarMoeda(selecionado.estoque * selecionado.preco)}</p>
                <p className="text-xs text-zinc-400 mt-1">Estimativa de Venda</p>
              </div>
            </div>

            {/* Ações Rápidas de Movimentação (Placeholder) */}
            <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-6">
              <h3 className="text-sm font-bold text-zinc-800 mb-4 flex items-center gap-2">
                <History size={16}/> Ajuste Rápido de Estoque
              </h3>
              
              <div className="flex items-end gap-4 bg-zinc-50 p-4 rounded-lg border border-zinc-100">
                 <div>
                    <label className="text-xs font-medium text-zinc-500 block mb-1.5">Tipo de Movimento</label>
                    <div className="flex bg-white rounded-md border border-zinc-200 p-1">
                       <button className="px-4 py-1.5 text-xs font-medium rounded bg-emerald-100 text-emerald-700 flex items-center gap-1">
                          <ArrowUp size={12}/> Entrada
                       </button>
                       <button className="px-4 py-1.5 text-xs font-medium rounded hover:bg-zinc-50 text-zinc-600 flex items-center gap-1">
                          <ArrowDown size={12}/> Saída
                       </button>
                    </div>
                 </div>
                 
                 <div>
                    <label className="text-xs font-medium text-zinc-500 block mb-1.5">Quantidade</label>
                    <div className="flex items-center">
                       <button 
                         onClick={() => setAjusteEstoque(Math.max(0, ajusteEstoque - 1))}
                         className="w-8 h-9 bg-white border border-zinc-300 rounded-l-md flex items-center justify-center hover:bg-zinc-50"
                       >-</button>
                       <input 
                          type="number" 
                          value={ajusteEstoque}
                          onChange={(e) => setAjusteEstoque(parseInt(e.target.value) || 0)}
                          className="w-16 h-9 border-y border-zinc-300 text-center text-sm font-bold focus:outline-none"
                       />
                       <button 
                         onClick={() => setAjusteEstoque(ajusteEstoque + 1)}
                         className="w-8 h-9 bg-white border border-zinc-300 rounded-r-md flex items-center justify-center hover:bg-zinc-50"
                       >+</button>
                    </div>
                 </div>

                 <div className="flex-1">
                    <label className="text-xs font-medium text-zinc-500 block mb-1.5">Observação (Opcional)</label>
                    <input type="text" placeholder="Ex: Ajuste de inventário" className="w-full h-9 px-3 border border-zinc-300 rounded-md text-sm focus:outline-none focus:border-indigo-500" />
                 </div>

                 <button className="h-9 px-4 bg-zinc-900 text-white rounded-md text-xs font-medium hover:bg-zinc-800 flex items-center gap-2 shadow-sm">
                    <Save size={14} /> Confirmar
                 </button>
              </div>
            </div>

            {/* Informações Adicionais / Histórico Recente */}
            <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
               <div className="px-6 py-4 border-b border-zinc-100 flex justify-between items-center">
                  <h3 className="text-sm font-bold text-zinc-800">Últimas Movimentações</h3>
                  <button className="text-indigo-600 text-xs font-medium hover:underline">Ver Histórico Completo</button>
               </div>
               <table className="w-full text-left">
                  <thead className="bg-zinc-50 text-xs text-zinc-500 uppercase">
                     <tr>
                        <th className="px-6 py-3 font-medium">Data</th>
                        <th className="px-6 py-3 font-medium">Tipo</th>
                        <th className="px-6 py-3 font-medium">Qtd</th>
                        <th className="px-6 py-3 font-medium">Usuário</th>
                     </tr>
                  </thead>
                  <tbody className="text-sm">
                     <tr className="border-b border-zinc-50 hover:bg-zinc-50/50">
                        <td className="px-6 py-3 text-zinc-600">Hoje, 10:00</td>
                        <td className="px-6 py-3"><span className="text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded">Entrada</span></td>
                        <td className="px-6 py-3 font-bold text-zinc-800">+50</td>
                        <td className="px-6 py-3 text-zinc-500">Ricardo</td>
                     </tr>
                     <tr className="border-b border-zinc-50 hover:bg-zinc-50/50">
                        <td className="px-6 py-3 text-zinc-600">24 Jan, 15:30</td>
                        <td className="px-6 py-3"><span className="text-xs text-rose-600 font-medium bg-rose-50 px-2 py-0.5 rounded">Saída</span></td>
                        <td className="px-6 py-3 font-bold text-zinc-800">-12</td>
                        <td className="px-6 py-3 text-zinc-500">Venda #1029</td>
                     </tr>
                  </tbody>
               </table>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL */}
      {modalAberto && (
        <ProdutoModal
          aberto={modalAberto}
          mode={modoModal}
          produto={produtoParaEditar ? converterParaFormModal(produtoParaEditar) : null}
          onClose={() => {
            setModalAberto(false);
            setProdutoParaEditar(null);
          }}
          onSave={handleSalvarProduto}
        />
      )}
    </div>
  );
}
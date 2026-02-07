"use client";

import ProdutoModal from "@/components/estoque/ProdutoModal";
import { listarProdutos, criarProduto, atualizarProduto } from "@/src/services/product.service";
import type { Produto } from "@/mocks/produtos";
import { useState, useEffect } from "react";
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
  ArrowDown,
  Loader2,
  RefreshCw,
  Eye,
  EyeOff
} from "lucide-react";

// Interface para o produto do banco
interface ProdutoDB {
  sku: number;
  created_at: string;
  name: string;
  description: string | null;
  color: string | null;
  size: string | null;
  barcode: number | null;
  category: string | null;
  stock_quantity: number | null;
  is_active: boolean | null;
  price: number | null;
  cost: number | null;
  units_type: string | null;
  minimum_stock: number | null;
  supplier: string | null;
  maximum_stock: number | null;
  localizacao: string | null;
  imagem: string | null;
}

// Função para converter do banco para seu tipo Produto
const converterParaProduto = (produtoDB: ProdutoDB): Produto => {
  return {
    id: produtoDB.sku, // Usa o SKU como ID
    nome: produtoDB.name || "",
    categoria: produtoDB.category || "",
    fornecedor: produtoDB.supplier || "",
    localizacao: produtoDB.localizacao || "",
    preco: produtoDB.price || 0,
    custo: produtoDB.cost || 0,
    estoque: produtoDB.stock_quantity || 0,
    estoqueMinimo: produtoDB.minimum_stock || 0,
    estoqueMaximo: produtoDB.maximum_stock || 0,
    sku: `SKU-${produtoDB.sku}`,
    codigoBarras: produtoDB.barcode?.toString() || "",
    imagem: produtoDB.imagem || "",
    ultimaMovimentacao: produtoDB.created_at,
    description: produtoDB.description || "",
    color: produtoDB.color || "",
    size: produtoDB.size || "",
    units_type: produtoDB.units_type || "un",
    is_active: produtoDB.is_active ?? true,
  };
};

// Função para converter do seu Produto para o formato do modal
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
    description: produto.description || "",
    color: produto.color || "",
    size: produto.size || "",
    units_type: produto.units_type || "un",
    is_active: produto.is_active ?? true,
  };
};

// Função para converter do modal para o formato do banco
const converterParaBanco = (produtoForm: any) => {
  return {
    name: produtoForm.nome,
    description: produtoForm.description || "",
    color: produtoForm.color || "",
    size: produtoForm.size || "",
    category: produtoForm.categoria,
    supplier: produtoForm.fornecedor,
    localizacao: produtoForm.localizacao,
    price: Number(produtoForm.preco) || 0,
    cost: Number(produtoForm.custo) || 0,
    stock_quantity: Number(produtoForm.estoque) || 0,
    minimum_stock: Number(produtoForm.estoqueMinimo) || 0,
    maximum_stock: Number(produtoForm.estoqueMaximo) || 0,
    sku: produtoForm.sku ? parseInt(produtoForm.sku.replace('SKU-', '')) : undefined,
    barcode: produtoForm.codigoBarras ? parseInt(produtoForm.codigoBarras) : null,
    imagem: produtoForm.imagem || null,
    units_type: produtoForm.units_type || "un",
    is_active: produtoForm.is_active ?? true,
  };
};

export default function GestaoEstoqueCompacto() {
  const [selecionado, setSelecionado] = useState<Produto | null>(null);
  const [listaProdutos, setListaProdutos] = useState<Produto[]>([]);
  const [busca, setBusca] = useState("");
  const [ajusteEstoque, setAjusteEstoque] = useState(0);
  const [modalAberto, setModalAberto] = useState(false);
  const [modoModal, setModoModal] = useState<"create" | "edit">("create");
  const [produtoParaEditar, setProdutoParaEditar] = useState<Produto | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [carregandoAcao, setCarregandoAcao] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [mostrarInativos, setMostrarInativos] = useState(false);

  // Carrega produtos do Supabase
  const carregarProdutos = async () => {
    try {
      setCarregando(true);
      setErro(null);
      
      const produtosDB = await listarProdutos();
      
      // Converte para o formato da aplicação
      const produtosConvertidos = produtosDB.map(converterParaProduto);
      
      setListaProdutos(produtosConvertidos);
      
      // Seleciona o primeiro produto automaticamente
      if (produtosConvertidos.length > 0 && !selecionado) {
        setSelecionado(produtosConvertidos[0]);
      }
      
      console.log("✅ Produtos carregados:", produtosConvertidos.length);
    } catch (error: any) {
      console.error("❌ Erro ao carregar produtos:", error);
      setErro(error.message || "Erro ao carregar produtos");
    } finally {
      setCarregando(false);
    }
  };

  // Carrega produtos na inicialização
  useEffect(() => {
    carregarProdutos();
  }, []);

  // Atualiza estoque
  const atualizarEstoque = async (quantidade: number) => {
    if (!selecionado) return;
    
    try {
      setCarregandoAcao(true);
      
      const novoEstoque = Math.max(0, selecionado.estoque + quantidade);
      
      // Atualiza no Supabase
      await atualizarProduto(
        parseInt(selecionado.sku.replace('SKU-', '')), 
        { stock_quantity: novoEstoque }
      );
      
      // Atualiza localmente
      const produtoAtualizado = {
        ...selecionado,
        estoque: novoEstoque
      };
      
      setSelecionado(produtoAtualizado);
      setListaProdutos(prev => 
        prev.map(p => 
          p.id === produtoAtualizado.id ? produtoAtualizado : p
        )
      );
      
      setAjusteEstoque(0);
      
      console.log(`✅ Estoque atualizado: ${quantidade > 0 ? '+' : ''}${quantidade}`);
    } catch (error: any) {
      console.error("❌ Erro ao atualizar estoque:", error);
      alert(`Erro ao atualizar estoque: ${error.message}`);
    } finally {
      setCarregandoAcao(false);
    }
  };

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

  // Função para deletar produto
  const deletarProduto = async (produto: Produto) => {
    if (!confirm(`Tem certeza que deseja excluir o produto "${produto.nome}"?`)) {
      return;
    }
    
    try {
      setCarregandoAcao(true);
      
      // Aqui você precisa criar uma função deleteProduto no product.service
      // Por enquanto, vamos apenas marcar como inativo
      const skuNumber = parseInt(produto.sku.replace('SKU-', ''));
      await atualizarProduto(skuNumber, { is_active: false });
      
      // Remove da lista local
      const novaLista = listaProdutos.filter(p => p.id !== produto.id);
      setListaProdutos(novaLista);
      
      // Se o produto deletado era o selecionado, seleciona outro
      if (selecionado?.id === produto.id && novaLista.length > 0) {
        setSelecionado(novaLista[0]);
      } else if (novaLista.length === 0) {
        setSelecionado(null);
      }
      
      console.log("✅ Produto excluído:", produto.nome);
    } catch (error: any) {
      console.error("❌ Erro ao excluir produto:", error);
      alert(`Erro ao excluir produto: ${error.message}`);
    } finally {
      setCarregandoAcao(false);
    }
  };

  // Função que é chamada quando salva no modal
  const handleSalvarProduto = async (produtoForm: any) => {
    try {
      setCarregandoAcao(true);
      
      const produtoBanco = converterParaBanco(produtoForm);
      
      if (modoModal === "edit" && produtoParaEditar) {
        // Atualiza produto existente
        const skuNumber = parseInt(produtoParaEditar.sku.replace('SKU-', ''));
        await atualizarProduto(skuNumber, produtoBanco);
        
        // Recarrega produtos
        await carregarProdutos();
        
        console.log("✅ Produto editado:", produtoForm.nome);
      } else {
        // Cria novo produto
        await criarProduto(produtoBanco);
        
        // Recarrega produtos
        await carregarProdutos();
        
        console.log("🆕 Novo produto criado:", produtoForm.nome);
      }
      
      setModalAberto(false);
      setProdutoParaEditar(null);
    } catch (error: any) {
      console.error("❌ Erro ao salvar produto:", error);
      alert(`Erro ao salvar produto: ${error.message}`);
    } finally {
      setCarregandoAcao(false);
    }
  };

  // Filtra produtos
  const produtosFiltrados = listaProdutos.filter(p => {
    const buscaMatch = p.nome.toLowerCase().includes(busca.toLowerCase()) || 
                      p.sku.toLowerCase().includes(busca.toLowerCase());
    
    if (mostrarInativos) {
      return buscaMatch;
    } else {
      return buscaMatch && p.is_active !== false;
    }
  });

  // Cálculos de Status
  const getStatusEstoque = (qtd: number, min: number) => {
    if (qtd <= min) return { label: "Crítico", color: "text-red-600 bg-red-50 border-red-200", dot: "bg-red-500" };
    if (qtd <= min * 1.5) return { label: "Baixo", color: "text-amber-600 bg-amber-50 border-amber-200", dot: "bg-amber-500" };
    return { label: "OK", color: "text-emerald-600 bg-emerald-50 border-emerald-200", dot: "bg-emerald-500" };
  };

  const formatarMoeda = (val: number) => new Intl.NumberFormat("pt-BR", { 
    style: "currency", 
    currency: "BRL" 
  }).format(val);

  // Se não há produtos
  if (carregando && listaProdutos.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-zinc-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-zinc-600">Carregando produtos...</p>
        </div>
      </div>
    );
  }

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
            <div className="flex gap-2">
              <button 
                onClick={carregarProdutos}
                className="p-2 text-zinc-500 hover:text-indigo-600 hover:bg-zinc-100 rounded-lg transition-colors"
                title="Recarregar"
              >
                <RefreshCw size={18} />
              </button>
              <button 
                onClick={abrirNovoProduto}
                className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm hover:shadow"
              >
                <Plus size={18} strokeWidth={2.5} />
              </button>
            </div>
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
            <button 
              onClick={() => setMostrarInativos(!mostrarInativos)}
              className="p-1.5 bg-zinc-50 border border-zinc-200 rounded-md text-zinc-500 hover:text-indigo-600 hover:border-indigo-200 flex items-center gap-1"
              title={mostrarInativos ? "Mostrar apenas ativos" : "Mostrar inativos"}
            >
              {mostrarInativos ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          
          {/* Quick Stats na Lista */}
          <div className="flex justify-between text-[10px] text-zinc-400 px-1">
            <span>{produtosFiltrados.length} {produtosFiltrados.length === 1 ? 'produto' : 'produtos'}</span>
            <span>Valor Total: {formatarMoeda(
              produtosFiltrados.reduce((acc, p) => acc + (p.preco * p.estoque), 0)
            )}</span>
          </div>
        </div>

        {/* Lista Scrollavel */}
        <div className="flex-1 overflow-y-auto">
          {erro ? (
            <div className="p-4 text-center">
              <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
              <p className="text-red-600 text-sm">{erro}</p>
              <button
                onClick={carregarProdutos}
                className="mt-2 text-indigo-600 hover:text-indigo-700 text-sm font-medium"
              >
                Tentar novamente
              </button>
            </div>
          ) : produtosFiltrados.length === 0 ? (
            <div className="p-8 text-center">
              <Package className="h-12 w-12 text-zinc-300 mx-auto mb-3" />
              <p className="text-zinc-500 text-sm mb-4">
                {busca ? "Nenhum produto encontrado" : "Nenhum produto cadastrado"}
              </p>
              {!busca && (
                <button
                  onClick={abrirNovoProduto}
                  className="text-indigo-600 hover:text-indigo-700 font-medium text-sm"
                >
                  Cadastre seu primeiro produto
                </button>
              )}
            </div>
          ) : (
            produtosFiltrados.map((produto) => {
              const status = getStatusEstoque(produto.estoque, produto.estoqueMinimo);
              const estaSelecionado = selecionado?.id === produto.id;
              
              return (
                <div 
                  key={produto.id}
                  onClick={() => setSelecionado(produto)}
                  className={`group p-3 border-b border-zinc-50 cursor-pointer hover:bg-zinc-50 transition-all ${
                    estaSelecionado ? 'bg-indigo-50/60 border-l-2 border-l-indigo-600' : 'border-l-2 border-l-transparent'
                  } ${!produto.is_active ? 'opacity-60' : ''}`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-semibold text-gray-800 truncate flex items-center gap-2">
                      {produto.nome}
                      {!produto.is_active && (
                        <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                          Inativo
                        </span>
                      )}
                    </span>
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
                      <div className="font-bold text-sm text-zinc-800">{produto.estoque} {produto.units_type || 'un'}</div>
                      <div className="text-[10px] text-zinc-400">Min: {produto.estoqueMinimo}</div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* COLUNA DIREITA: DETALHES E EDIÇÃO */}
      <div className="flex-1 flex flex-col bg-zinc-50 h-full overflow-hidden">
        
        {/* Se não tem produto selecionado */}
        {!selecionado ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            <Package className="h-16 w-16 text-zinc-300 mb-4" />
            <h3 className="text-lg font-semibold text-zinc-700 mb-2">Nenhum produto selecionado</h3>
            <p className="text-zinc-500 text-sm mb-6 text-center max-w-md">
              Selecione um produto da lista ao lado para ver os detalhes ou crie um novo produto.
            </p>
            <button
              onClick={abrirNovoProduto}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors"
            >
              <Plus size={18} />
              Novo Produto
            </button>
          </div>
        ) : (
          <>
            {/* Header do Detalhe */}
            <header className="bg-white border-b border-zinc-200 px-6 py-4 flex justify-between items-start shrink-0 shadow-sm z-10">
              <div>
                <div className="flex items-center gap-2 text-[10px] text-zinc-400 uppercase tracking-wider mb-1">
                  <span>{selecionado.categoria}</span>
                  <span>•</span>
                  <span>SKU: {selecionado.sku}</span>
                  <span>•</span>
                  <span>Loc: {selecionado.localizacao}</span>
                  {!selecionado.is_active && (
                    <>
                      <span>•</span>
                      <span className="text-amber-600">INATIVO</span>
                    </>
                  )}
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
                <button 
                  onClick={() => deletarProduto(selecionado)}
                  disabled={carregandoAcao}
                  className="p-1.5 text-zinc-400 hover:text-red-600 transition-colors disabled:opacity-50"
                  title="Excluir produto"
                >
                  {carregandoAcao ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
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
                        <div 
                          className="h-full bg-zinc-800 rounded-full" 
                          style={{ 
                            width: selecionado.estoqueMaximo > 0 
                              ? `${Math.min(100, (selecionado.estoque / selecionado.estoqueMaximo) * 100)}%` 
                              : '0%' 
                          }}
                        ></div>
                      </div>
                      <span className="text-zinc-600">
                        {selecionado.estoqueMaximo > 0 
                          ? `${Math.round((selecionado.estoque / selecionado.estoqueMaximo) * 100)}%`
                          : 'N/A'
                        }
                      </span>
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
                    <p className="text-xs text-zinc-400 mt-1 truncate" title={selecionado.fornecedor}>
                      Fornecedor: {selecionado.fornecedor || "Não informado"}
                    </p>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
                    <p className="text-zinc-500 text-xs font-medium uppercase mb-1">Valor em Estoque</p>
                    <p className="text-2xl font-bold text-zinc-700">{formatarMoeda(selecionado.estoque * selecionado.preco)}</p>
                    <p className="text-xs text-zinc-400 mt-1">Estimativa de Venda</p>
                  </div>
                </div>

                {/* Ações Rápidas de Movimentação */}
                <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-6">
                  <h3 className="text-sm font-bold text-zinc-800 mb-4 flex items-center gap-2">
                    <History size={16}/> Ajuste Rápido de Estoque
                  </h3>
                  
                  <div className="flex items-end gap-4 bg-zinc-50 p-4 rounded-lg border border-zinc-100">
                    <div>
                      <label className="text-xs font-medium text-zinc-500 block mb-1.5">Tipo de Movimento</label>
                      <div className="flex bg-white rounded-md border border-zinc-200 p-1">
                        <button 
                          onClick={() => atualizarEstoque(ajusteEstoque)}
                          disabled={carregandoAcao || ajusteEstoque <= 0}
                          className="px-4 py-1.5 text-xs font-medium rounded bg-emerald-100 text-emerald-700 flex items-center gap-1 hover:bg-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ArrowUp size={12}/> Entrada
                        </button>
                        <button 
                          onClick={() => atualizarEstoque(-ajusteEstoque)}
                          disabled={carregandoAcao || ajusteEstoque <= 0}
                          className="px-4 py-1.5 text-xs font-medium rounded hover:bg-zinc-50 text-zinc-600 flex items-center gap-1 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ArrowDown size={12}/> Saída
                        </button>
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-xs font-medium text-zinc-500 block mb-1.5">Quantidade</label>
                      <div className="flex items-center">
                        <button 
                          onClick={() => setAjusteEstoque(Math.max(0, ajusteEstoque - 1))}
                          disabled={carregandoAcao}
                          className="w-8 h-9 bg-white border border-zinc-300 rounded-l-md flex items-center justify-center hover:bg-zinc-50 disabled:opacity-50"
                        >-</button>
                        <input 
                          type="number" 
                          value={ajusteEstoque}
                          onChange={(e) => setAjusteEstoque(Math.max(0, parseInt(e.target.value) || 0))}
                          disabled={carregandoAcao}
                          className="w-16 h-9 border-y border-zinc-300 text-center text-sm font-bold focus:outline-none disabled:bg-zinc-100"
                        />
                        <button 
                          onClick={() => setAjusteEstoque(ajusteEstoque + 1)}
                          disabled={carregandoAcao}
                          className="w-8 h-9 bg-white border border-zinc-300 rounded-r-md flex items-center justify-center hover:bg-zinc-50 disabled:opacity-50"
                        >+</button>
                      </div>
                    </div>

                    <div className="flex-1">
                      <label className="text-xs font-medium text-zinc-500 block mb-1.5">Observação (Opcional)</label>
                      <input 
                        type="text" 
                        placeholder="Ex: Ajuste de inventário" 
                        className="w-full h-9 px-3 border border-zinc-300 rounded-md text-sm focus:outline-none focus:border-indigo-500 disabled:bg-zinc-100" 
                        disabled={carregandoAcao}
                      />
                    </div>

                    <button 
                      onClick={() => atualizarEstoque(ajusteEstoque)}
                      disabled={carregandoAcao || ajusteEstoque <= 0}
                      className="h-9 px-4 bg-zinc-900 text-white rounded-md text-xs font-medium hover:bg-zinc-800 flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {carregandoAcao ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Save size={14} />
                      )}
                      Confirmar
                    </button>
                  </div>
                </div>

                {/* Informações Adicionais */}
                <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-zinc-100">
                    <h3 className="text-sm font-bold text-zinc-800">Detalhes do Produto</h3>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <label className="text-xs text-zinc-500 block mb-1">Descrição</label>
                          <p className="text-sm text-zinc-800">{selecionado.description || "Sem descrição"}</p>
                        </div>
                        <div>
                          <label className="text-xs text-zinc-500 block mb-1">Código de Barras</label>
                          <p className="text-sm font-mono text-zinc-800">{selecionado.codigoBarras || "Não informado"}</p>
                        </div>
                        <div>
                          <label className="text-xs text-zinc-500 block mb-1">Características</label>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {selecionado.color && (
                              <span className="px-2 py-1 bg-zinc-100 text-zinc-700 rounded text-xs">
                                Cor: {selecionado.color}
                              </span>
                            )}
                            {selecionado.size && (
                              <span className="px-2 py-1 bg-zinc-100 text-zinc-700 rounded text-xs">
                                Tamanho: {selecionado.size}
                              </span>
                            )}
                            <span className="px-2 py-1 bg-zinc-100 text-zinc-700 rounded text-xs">
                              Unidade: {selecionado.units_type || 'un'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <label className="text-xs text-zinc-500 block mb-1">Status</label>
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${selecionado.is_active ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                            <span className="text-sm text-zinc-800">
                              {selecionado.is_active ? 'Ativo' : 'Inativo'}
                            </span>
                          </div>
                        </div>
                        <div>
                          <label className="text-xs text-zinc-500 block mb-1">Localização</label>
                          <p className="text-sm text-zinc-800">{selecionado.localizacao || "Não informada"}</p>
                        </div>
                        <div>
                          <label className="text-xs text-zinc-500 block mb-1">Última Atualização</label>
                          <p className="text-sm text-zinc-800">
                            {selecionado.ultimaMovimentacao 
                              ? new Date(selecionado.ultimaMovimentacao).toLocaleString('pt-BR')
                              : 'Não disponível'
                            }
                          </p>
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
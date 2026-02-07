"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { 
  X, 
  Upload, 
  RefreshCw, 
  Printer, 
  Package, 
  DollarSign, 
  MapPin, 
  Factory,
  Layers,
  Image as ImageIcon,
  Tag,
  Ruler,
  Palette,
  FileText
} from "lucide-react";
import EtiquetaProduto from "./EtiquetaProduto";

interface ProdutoForm {
  nome: string;
  categoria: string;
  fornecedor: string;
  localizacao: string;
  preco: number;
  custo: number;
  estoque: number;
  estoqueMinimo: number;
  estoqueMaximo: number;
  sku: string;
  codigoBarras: string;
  imagem: string;
  description: string;
  color: string;
  size: string;
  units_type: string;
  is_active: boolean;
}

interface Props {
  aberto: boolean;
  mode: "create" | "edit";
  produto?: any | null;
  onClose: () => void;
  onSave: (produto: ProdutoForm) => void;
}

const estadoInicial: ProdutoForm = {
  nome: "",
  categoria: "",
  fornecedor: "",
  localizacao: "",
  preco: 0,
  custo: 0,
  estoque: 0,
  estoqueMinimo: 0,
  estoqueMaximo: 0,
  sku: "",
  codigoBarras: "",
  imagem: "",
  description: "",
  color: "",
  size: "",
  units_type: "un",
  is_active: true,
};

// Funções de mapeamento
const mapearParaBanco = (form: ProdutoForm) => {
  return {
    name: form.nome,
    description: form.description || "",
    color: form.color || "",
    size: form.size || "",
    category: form.categoria,
    supplier: form.fornecedor,
    localizacao: form.localizacao,
    price: Number(form.preco) || 0,
    cost: Number(form.custo) || 0,
    stock_quantity: Number(form.estoque) || 0,
    minimum_stock: Number(form.estoqueMinimo) || 0,
    maximum_stock: Number(form.estoqueMaximo) || 0,
    sku: form.sku ? parseInt(form.sku.replace('SKU-', '')) : undefined,
    barcode: form.codigoBarras ? parseInt(form.codigoBarras) : null,
    imagem: form.imagem || null,
    units_type: form.units_type || "un",
    is_active: form.is_active ?? true,
  };
};

const mapearParaForm = (produtoDB: any): ProdutoForm => {
  return {
    nome: produtoDB.name || "",
    categoria: produtoDB.category || "",
    fornecedor: produtoDB.supplier || "",
    localizacao: produtoDB.localizacao || "",
    preco: Number(produtoDB.price) || 0,
    custo: Number(produtoDB.cost) || 0,
    estoque: Number(produtoDB.stock_quantity) || 0,
    estoqueMinimo: Number(produtoDB.minimum_stock) || 0,
    estoqueMaximo: Number(produtoDB.maximum_stock) || 0,
    sku: produtoDB.sku ? `SKU-${produtoDB.sku}` : "",
    codigoBarras: produtoDB.barcode?.toString() || "",
    imagem: produtoDB.imagem || "",
    description: produtoDB.description || "",
    color: produtoDB.color || "",
    size: produtoDB.size || "",
    units_type: produtoDB.units_type || "un",
    is_active: produtoDB.is_active ?? true,
  };
};

export default function ProdutoModal({ aberto, mode, produto, onClose, onSave }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<ProdutoForm>(estadoInicial);
  const [preview, setPreview] = useState<string | null>(null);
  
  // Funções de geração
  const gerarSKU = () => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `SKU-${timestamp}${random}`.slice(-12);
  };

  const gerarCodigoBarras = () => {
    const base = "789" + Math.floor(100000000 + Math.random() * 900000000).toString();
    return base.slice(0, 13);
  };

  useEffect(() => {
    if (mode === "edit" && produto) {
      const produtoMapeado = mapearParaForm(produto);
      setForm(produtoMapeado);
      
      if (produto.imagem) {
        setPreview(produto.imagem);
      }
    } else if (mode === "create") {
      const novoForm = {
        ...estadoInicial,
        sku: gerarSKU(),
        codigoBarras: gerarCodigoBarras(),
        is_active: true,
      };
      setForm(novoForm);
      setPreview(null);
    }
  }, [mode, produto]);

  const handleImagemChange = (file: File | null) => {
    if (!file) return;
    
    // Validação básica do tipo de arquivo
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      alert('Por favor, selecione uma imagem JPEG, PNG ou WebP');
      return;
    }
    
    // Validação de tamanho (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('A imagem deve ter no máximo 5MB');
      return;
    }
    
    const url = URL.createObjectURL(file);
    setPreview(url);
    setForm(prev => ({ ...prev, imagem: url }));
  };

  const handleInputChange = (field: keyof ProdutoForm, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    // Validações básicas
    if (!form.nome.trim()) {
      alert('O nome do produto é obrigatório');
      return;
    }
    
    if (form.preco <= 0) {
      alert('O preço deve ser maior que zero');
      return;
    }
    
    if (form.estoque < 0) {
      alert('O estoque não pode ser negativo');
      return;
    }
    
    if (form.estoqueMinimo < 0) {
      alert('O estoque mínimo não pode ser negativo');
      return;
    }
    
    if (form.estoqueMaximo < 0) {
      alert('O estoque máximo não pode ser negativo');
      return;
    }
    
    if (form.estoqueMaximo > 0 && form.estoqueMinimo > form.estoqueMaximo) {
      alert('O estoque mínimo não pode ser maior que o estoque máximo');
      return;
    }
    
    onSave(form);
  };

  const imprimirEtiqueta = () => {
    const conteudo = document.getElementById("etiqueta-print");
    if (!conteudo) return;

    const win = window.open("", "_blank", "width=400,height=300");
    if (!win) return;

    win.document.open();
    win.document.write(`
      <html>
        <head>
          <title>Etiqueta - ${form.nome || "Produto"}</title>
          <style>
            @page { margin: 0; }
            body {
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              background: white;
            }
            * {
              box-sizing: border-box;
            }
          </style>
        </head>
        <body>
          ${conteudo.outerHTML}
          <script>
            window.onload = function () {
              window.print();
              setTimeout(() => window.close(), 1000);
            };
          </script>
        </body>
      </html>
    `);
    win.document.close();
  };

  const handleGerarNovosCodigos = () => {
    setForm(prev => ({ 
      ...prev, 
      sku: gerarSKU(), 
      codigoBarras: gerarCodigoBarras() 
    }));
  };

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-6xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">

        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 flex justify-between items-center bg-zinc-50">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-100 p-2 rounded-lg">
              <Package className="text-indigo-600" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-900">
                {mode === "create" ? "Novo Produto" : "Editar Produto"}
              </h2>
              <p className="text-xs text-zinc-500">
                {mode === "create" ? "Cadastre um novo produto no estoque" : "Atualize as informações do produto"}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 bg-white">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* COLUNA ESQUERDA: IMAGEM E IDENTIFICAÇÃO */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* Upload de Imagem */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide flex items-center gap-2">
                  <ImageIcon size={14} /> Imagem do Produto
                </label>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="group relative h-48 w-full border-2 border-dashed border-zinc-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-zinc-50 hover:border-indigo-400 transition-all overflow-hidden"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/jpg"
                    className="hidden"
                    onChange={(e) => handleImagemChange(e.target.files?.[0] || null)}
                  />
                  
                  {preview ? (
                    <>
                      <Image
                        src={preview}
                        alt="Preview"
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 33vw"
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Upload className="text-white" size={24} />
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center text-zinc-400 group-hover:text-indigo-500 transition-colors">
                      <div className="p-3 bg-zinc-100 rounded-full mb-2 group-hover:bg-indigo-50">
                        <ImageIcon size={24} />
                      </div>
                      <span className="text-xs font-medium">Clique para enviar</span>
                      <span className="text-[10px] mt-1">JPG, PNG ou WebP (max 5MB)</span>
                    </div>
                  )}
                </div>
                {preview && (
                  <button
                    onClick={() => {
                      setPreview(null);
                      setForm(prev => ({ ...prev, imagem: "" }));
                    }}
                    className="text-xs text-red-600 hover:text-red-700"
                  >
                    Remover imagem
                  </button>
                )}
              </div>

              {/* Card de Identificação */}
              <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-2">
                    <Tag size={14} /> Identificação
                  </span>
                  <button 
                    onClick={handleGerarNovosCodigos}
                    className="text-[10px] font-medium text-indigo-600 flex items-center gap-1 hover:underline"
                  >
                    <RefreshCw size={10} /> Gerar Novos
                  </button>
                </div>

                <div className="space-y-3">
                  {/* SKU */}
                  <div>
                    <label className="text-[10px] text-zinc-500 mb-1 block">SKU (Código Interno)</label>
                    <input
                      value={form.sku}
                      onChange={(e) => handleInputChange("sku", e.target.value.toUpperCase())}
                      className="w-full h-8 px-3 text-xs border border-zinc-300 rounded font-mono bg-white"
                      placeholder="SKU-123456"
                    />
                  </div>

                  {/* Código de Barras */}
                  <div>
                    <label className="text-[10px] text-zinc-500 mb-1 block">Código de Barras (EAN-13)</label>
                    <input
                      value={form.codigoBarras}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 13);
                        handleInputChange("codigoBarras", value);
                      }}
                      className="w-full h-8 px-3 text-xs border border-zinc-300 rounded font-mono bg-white"
                      placeholder="7891234567890"
                    />
                  </div>
                  
                  {/* Área da Etiqueta */}
                  <div className="bg-white p-3 border border-zinc-200 rounded flex flex-col items-center justify-center">
                    <div id="etiqueta-print">
                      <EtiquetaProduto
                        nome={form.nome || "Nome do Produto"}
                        sku={form.sku}
                        codigo={form.codigoBarras}
                        preco={form.preco}
                        empresa="Minha Empresa"
                      />
                    </div>
                  </div>

                  <button 
                    onClick={imprimirEtiqueta}
                    className="w-full h-8 flex items-center justify-center gap-2 bg-white border border-zinc-300 text-zinc-700 rounded text-xs font-medium hover:bg-zinc-100 transition-colors"
                  >
                    <Printer size={12} /> Imprimir Etiqueta
                  </button>
                </div>
              </div>
            </div>

            {/* COLUNA DIREITA: FORMULÁRIO */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* Seção Dados Básicos */}
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-zinc-700 mb-1.5 block">Nome do Produto *</label>
                  <input
                    placeholder="Ex: Tênis Esportivo Nike Air Max"
                    className="w-full h-10 px-3 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-zinc-400"
                    value={form.nome}
                    onChange={(e) => handleInputChange("nome", e.target.value)}
                  />
                </div>

                {/* Descrição */}
                <div>
                  <label className="text-xs font-medium text-zinc-700 mb-1.5 flex items-center gap-1">
                    <FileText size={12} className="text-zinc-400"/> Descrição
                  </label>
                  <textarea
                    placeholder="Descreva o produto, suas características principais, materiais, etc."
                    className="w-full h-24 px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                    value={form.description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-zinc-700 mb-1.5 flex items-center gap-1">
                      <Layers size={12} className="text-zinc-400"/> Categoria *
                    </label>
                    <select
                      className="w-full h-10 px-3 border border-zinc-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      value={form.categoria}
                      onChange={(e) => handleInputChange("categoria", e.target.value)}
                    >
                      <option value="">Selecione uma categoria...</option>
                      <option value="Roupas">Roupas</option>
                      <option value="Calçados">Calçados</option>
                      <option value="Acessórios">Acessórios</option>
                      <option value="Eletrônicos">Eletrônicos</option>
                      <option value="Móveis">Móveis</option>
                      <option value="Esportes">Esportes</option>
                      <option value="Beleza">Beleza</option>
                      <option value="Alimentos">Alimentos</option>
                      <option value="Bebidas">Bebidas</option>
                      <option value="Outros">Outros</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-zinc-700 mb-1.5 flex items-center gap-1">
                      <Factory size={12} className="text-zinc-400"/> Fornecedor
                    </label>
                    <input
                      placeholder="Ex: Nike Distribuidora Ltda"
                      className="w-full h-10 px-3 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      value={form.fornecedor}
                      onChange={(e) => handleInputChange("fornecedor", e.target.value)}
                    />
                  </div>
                </div>

                {/* Características */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-medium text-zinc-700 mb-1.5 flex items-center gap-1">
                      <Palette size={12} className="text-zinc-400"/> Cor
                    </label>
                    <input
                      placeholder="Ex: Preto, Branco, Vermelho"
                      className="w-full h-10 px-3 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      value={form.color}
                      onChange={(e) => handleInputChange("color", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-zinc-700 mb-1.5 flex items-center gap-1">
                      <Ruler size={12} className="text-zinc-400"/> Tamanho
                    </label>
                    <input
                      placeholder="Ex: P, M, G, 42, 10x20cm"
                      className="w-full h-10 px-3 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      value={form.size}
                      onChange={(e) => handleInputChange("size", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-zinc-700 mb-1.5 block">Tipo de Unidade</label>
                    <select
                      className="w-full h-10 px-3 border border-zinc-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      value={form.units_type}
                      onChange={(e) => handleInputChange("units_type", e.target.value)}
                    >
                      <option value="un">Unidade (un)</option>
                      <option value="kg">Quilograma (kg)</option>
                      <option value="g">Grama (g)</option>
                      <option value="l">Litro (l)</option>
                      <option value="ml">Mililitro (ml)</option>
                      <option value="m">Metro (m)</option>
                      <option value="cm">Centímetro (cm)</option>
                      <option value="cx">Caixa (cx)</option>
                      <option value="pc">Peça (pc)</option>
                    </select>
                  </div>
                </div>
              </div>

              <hr className="border-zinc-100" />

              {/* Seção Financeiro */}
              <div>
                <h3 className="text-xs font-bold text-zinc-500 uppercase mb-3 flex items-center gap-2">
                  <DollarSign size={14}/> Financeiro
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-zinc-700 mb-1.5 block">Preço de Venda *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0,00"
                        className="w-full h-10 pl-9 pr-3 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        value={form.preco || ""}
                        onChange={(e) => handleInputChange("preco", parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-zinc-700 mb-1.5 block">Custo Unitário</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0,00"
                        className="w-full h-10 pl-9 pr-3 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                        value={form.custo || ""}
                        onChange={(e) => handleInputChange("custo", parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <hr className="border-zinc-100" />

              {/* Seção Estoque */}
              <div>
                <h3 className="text-xs font-bold text-zinc-500 uppercase mb-3 flex items-center gap-2">
                  <Package size={14}/> Controle de Estoque
                </h3>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="text-xs font-medium text-zinc-700 mb-1.5 block">Estoque Atual</label>
                    <input
                      type="number"
                      min="0"
                      className="w-full h-10 px-3 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      value={form.estoque || ""}
                      onChange={(e) => handleInputChange("estoque", parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-zinc-700 mb-1.5 block">Estoque Mínimo</label>
                    <input
                      type="number"
                      min="0"
                      className="w-full h-10 px-3 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      value={form.estoqueMinimo || ""}
                      onChange={(e) => handleInputChange("estoqueMinimo", parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-zinc-700 mb-1.5 block">Estoque Máximo</label>
                    <input
                      type="number"
                      min="0"
                      className="w-full h-10 px-3 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      value={form.estoqueMaximo || ""}
                      onChange={(e) => handleInputChange("estoqueMaximo", parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="text-xs font-medium text-zinc-700 mb-1.5 flex items-center gap-1">
                    <MapPin size={12} className="text-zinc-400"/> Localização no Armazém
                  </label>
                  <input
                    placeholder="Ex: Corredor B, Prateleira 4, Box 12"
                    className="w-full h-10 px-3 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    value={form.localizacao}
                    onChange={(e) => handleInputChange("localizacao", e.target.value)}
                  />
                </div>
                
                {/* Status Ativo (apenas para edição) */}
                {mode === "edit" && (
                  <div className="mt-4 flex items-center gap-2 p-3 bg-zinc-50 rounded-lg border border-zinc-200">
                    <input
                      type="checkbox"
                      id="is_active"
                      checked={form.is_active}
                      onChange={(e) => handleInputChange("is_active", e.target.checked)}
                      className="h-4 w-4 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                    <label htmlFor="is_active" className="text-xs font-medium text-zinc-700">
                      Produto ativo no sistema
                    </label>
                    <span className="text-xs text-zinc-500 ml-auto">
                      {form.is_active ? "✓ Disponível" : "✗ Indisponível"}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      
        {/* Footer */}
        <div className="px-6 py-4 bg-zinc-50 border-t border-zinc-200 flex justify-between items-center">
          <div className="text-xs text-zinc-500">
            Campos marcados com * são obrigatórios
            {mode === "edit" && form.sku && (
              <span className="ml-4 font-mono">SKU: {form.sku}</span>
            )}
          </div>
          <div className="flex gap-3">
            <button 
              onClick={onClose} 
              className="px-5 py-2.5 bg-white border border-zinc-300 text-zinc-700 rounded-lg text-sm font-medium hover:bg-zinc-50 transition-colors shadow-sm"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-200 flex items-center gap-2"
            >
              {mode === "create" ? (
                <>
                  <Package size={16} />
                  Salvar Produto
                </>
              ) : (
                "Atualizar Produto"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
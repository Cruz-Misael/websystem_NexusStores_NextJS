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
  Image as ImageIcon
} from "lucide-react";
import BarcodeEtiqueta from "./BarcodeEtiqueta";
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
}

interface Props {
  aberto: boolean;
  mode: "create" | "edit";
  produto?: Partial<ProdutoForm> | null;
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
};

export default function ProdutoModal({ aberto, mode, produto, onClose, onSave }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<ProdutoForm>(estadoInicial);
  const [preview, setPreview] = useState<string | null>(null);

  const gerarSKU = () => `SKU-${Date.now().toString().slice(-6)}`;
  const gerarCodigoBarras = () => `789${Date.now().toString().slice(-9)}`;

  useEffect(() => {
    if (mode === "edit" && produto) {
      setForm({ ...estadoInicial, ...produto });
      if (produto.imagem) {
        setPreview(produto.imagem);
      }
    } else if (mode === "create") {
      const novoForm = {
        ...estadoInicial,
        sku: gerarSKU(),
        codigoBarras: gerarCodigoBarras(),
      };
      setForm(novoForm);
      setPreview(null);
    }
  }, [mode, produto]);

  const handleImagemChange = (file: File | null) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    setForm(prev => ({ ...prev, imagem: url }));
  };

  const handleInputChange = (field: keyof ProdutoForm, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
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
          <title>Etiqueta</title>
          <style>
            @page { margin: 0; }
            body {
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
            }
          </style>
        </head>
        <body>
          ${conteudo.outerHTML}
          <script>
            window.onload = function () {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    win.document.close();
  };

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-4xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

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
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Imagem do Produto</label>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="group relative h-48 w-full border-2 border-dashed border-zinc-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-zinc-50 hover:border-indigo-400 transition-all overflow-hidden"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleImagemChange(e.target.files?.[0] || null)}
                  />
                  
                  {preview ? (
                    <Image
                      src={preview}
                      alt="Preview"
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center text-zinc-400 group-hover:text-indigo-500 transition-colors">
                      <div className="p-3 bg-zinc-100 rounded-full mb-2 group-hover:bg-indigo-50">
                        <ImageIcon size={24} />
                      </div>
                      <span className="text-xs font-medium">Clique para enviar</span>
                      <span className="text-[10px] mt-1">JPG, PNG ou WebP</span>
                    </div>
                  )}

                  {preview && (
                     <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Upload className="text-white" size={24} />
                     </div>
                  )}
                </div>
              </div>

              {/* Card de Identificação */}
              <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-zinc-500 uppercase">Identificação</span>
                  <button 
                    onClick={() => {
                      setForm(prev => ({ 
                        ...prev, 
                        sku: gerarSKU(), 
                        codigoBarras: gerarCodigoBarras() 
                      }));
                    }}
                    className="text-[10px] font-medium text-indigo-600 flex items-center gap-1 hover:underline"
                  >
                    <RefreshCw size={10} /> Gerar Novos
                  </button>
                </div>

                <div className="space-y-3">
                  {/* SKU */}
                  <div>
                    <label className="text-[10px] text-zinc-500 mb-1 block">SKU</label>
                    <input
                      value={form.sku}
                      onChange={(e) => handleInputChange("sku", e.target.value.toUpperCase())}
                      className="w-full h-8 px-3 text-xs border border-zinc-300 rounded font-mono"
                    />
                  </div>

                  {/* Código de Barras */}
                  <div>
                    <label className="text-[10px] text-zinc-500 mb-1 block">Código de Barras</label>
                    <input
                      value={form.codigoBarras}
                      onChange={(e) => handleInputChange("codigoBarras", e.target.value)}
                      className="w-full h-8 px-3 text-xs border border-zinc-300 rounded font-mono"
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
              <div className="grid gap-4">
                <div className="col-span-1">
                  <label className="text-xs font-medium text-zinc-700 mb-1.5 block">Nome do Produto</label>
                  <input
                    placeholder="Ex: Tênis Esportivo Nike Air"
                    className="w-full h-10 px-3 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-zinc-400"
                    value={form.nome}
                    onChange={(e) => handleInputChange("nome", e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-zinc-700 mb-1.5 flex items-center gap-1">
                      <Layers size={12} className="text-zinc-400"/> Categoria
                    </label>
                    <select
                      className="w-full h-10 px-3 border border-zinc-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      value={form.categoria}
                      onChange={(e) => handleInputChange("categoria", e.target.value)}
                    >
                      <option value="">Selecione...</option>
                      <option value="Roupas">Roupas</option>
                      <option value="Calçados">Calçados</option>
                      <option value="Acessórios">Acessórios</option>
                      <option value="Eletrônicos">Eletrônicos</option>
                      <option value="Móveis">Móveis</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-zinc-700 mb-1.5 flex items-center gap-1">
                      <Factory size={12} className="text-zinc-400"/> Fornecedor
                    </label>
                    <input
                      placeholder="Ex: Nike Distribuidora"
                      className="w-full h-10 px-3 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      value={form.fornecedor}
                      onChange={(e) => handleInputChange("fornecedor", e.target.value)}
                    />
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
                    <label className="text-xs font-medium text-zinc-700 mb-1.5 block">Preço de Venda</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">R$</span>
                      <input
                        type="number"
                        placeholder="0,00"
                        className="w-full h-10 pl-9 pr-3 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        value={form.preco || ""}
                        onChange={(e) => handleInputChange("preco", Number(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-zinc-700 mb-1.5 block">Custo Unitário</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">R$</span>
                      <input
                        type="number"
                        placeholder="0,00"
                        className="w-full h-10 pl-9 pr-3 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                        value={form.custo || ""}
                        onChange={(e) => handleInputChange("custo", Number(e.target.value) || 0)}
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
                    <div className="relative">
                       <input
                         type="number"
                         className="w-full h-10 px-3 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                         value={form.estoque || ""}
                         onChange={(e) => handleInputChange("estoque", Number(e.target.value) || 0)}
                       />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-zinc-700 mb-1.5 block">Estoque Mínimo</label>
                    <input
                      type="number"
                      className="w-full h-10 px-3 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      value={form.estoqueMinimo || ""}
                      onChange={(e) => handleInputChange("estoqueMinimo", Number(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-zinc-700 mb-1.5 block">Estoque Máximo</label>
                    <input
                      type="number"
                      className="w-full h-10 px-3 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      value={form.estoqueMaximo || ""}
                      onChange={(e) => handleInputChange("estoqueMaximo", Number(e.target.value) || 0)}
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="text-xs font-medium text-zinc-700 mb-1.5 flex items-center gap-1">
                    <MapPin size={12} className="text-zinc-400"/> Localização no Armazém
                  </label>
                  <input
                    placeholder="Ex: Corredor B, Prateleira 4"
                    className="w-full h-10 px-3 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    value={form.localizacao}
                    onChange={(e) => handleInputChange("localizacao", e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      
        {/* Footer */}
        <div className="px-6 py-4 bg-zinc-50 border-t border-zinc-200 flex justify-end gap-3">
          <button 
            onClick={onClose} 
            className="px-5 py-2.5 bg-white border border-zinc-300 text-zinc-700 rounded-lg text-sm font-medium hover:bg-zinc-50 transition-colors shadow-sm"
          >
            Cancelar
          </button>
          <button
            onClick={() => onSave(form)}
            className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-200"
          >
            {mode === "create" ? "Salvar Produto" : "Atualizar Produto"}
          </button>
        </div>
      </div>
    </div>
  );
}
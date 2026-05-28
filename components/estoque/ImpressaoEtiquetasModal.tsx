"use client";

import { useState, useEffect } from "react";
import JsBarcode from "jsbarcode";
import {
  Printer,
  X,
  Plus,
  Minus,
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Package,
} from "lucide-react";
import { listarProdutos } from "@/src/services/product.service";
import EtiquetaColacril from "./EtiquetaColacril";

const COLUNAS = 6;
const LINHAS = 16;
const POR_PAGINA = COLUNAS * LINHAS; // 96

interface PrintItem {
  id: string;
  nome: string;
  sku: string;
  codigoBarras: string;
  tamanho?: string;
  quantidade: number;
}

interface ProdutoInicial {
  nome: string;
  sku: string;
  codigoBarras: string;
  tamanho?: string;
}

interface Props {
  aberto: boolean;
  onClose: () => void;
  produtoInicial?: ProdutoInicial;
}

// Gera o SVG do código de barras de forma síncrona para usar no HTML de impressão
function gerarBarcodeSVG(codigo: string): string {
  if (!codigo) return "";
  try {
    const svgEl = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    JsBarcode(svgEl, codigo, {
      format: "CODE128",
      width: 1.0,
      height: 25,
      displayValue: false,
      margin: 0,
      background: "transparent",
      lineColor: "#000000",
    });
    return svgEl.outerHTML;
  } catch {
    return "";
  }
}

function gerarLabelHTML(item: Omit<PrintItem, "quantidade" | "id">): string {
  const nome =
    item.nome.length > 34 ? item.nome.slice(0, 32) + "…" : item.nome;
  const svgStr = gerarBarcodeSVG(item.codigoBarras);
  const tamSpan = item.tamanho
    ? `<span style="font-weight:bold">TAM: ${item.tamanho.toUpperCase()}</span>`
    : "";
  const barcodeContent = svgStr
    ? svgStr
    : `<span style="font-size:3.5pt;color:#aaa">Sem código</span>`;

  return `<div class="etiqueta">
  <div class="et-nome">${nome}</div>
  <div class="et-meta"><span>${item.sku}</span>${tamSpan}</div>
  <div class="et-barcode">${barcodeContent}</div>
  <div class="et-codigo">${item.codigoBarras}</div>
</div>`;
}

function gerarHTMLImpressao(items: PrintItem[], posicaoInicial: number): string {
  // Monta a lista expandida: placeholders + etiquetas reais
  const todas: Array<Omit<PrintItem, "quantidade" | "id"> | null> = [];

  for (let i = 0; i < posicaoInicial - 1; i++) {
    todas.push(null);
  }

  for (const item of items) {
    for (let q = 0; q < item.quantidade; q++) {
      todas.push(item);
    }
  }

  // Divide em páginas de 96
  const paginas: Array<typeof todas> = [];
  for (let i = 0; i < todas.length; i += POR_PAGINA) {
    paginas.push(todas.slice(i, i + POR_PAGINA));
  }
  if (paginas.length === 0) paginas.push([]);

  const paginasHTML = paginas
    .map((pagina, idx) => {
      // Completa a página com células vazias até 96
      const celulas = [...pagina];
      while (celulas.length < POR_PAGINA) celulas.push(null);

      const isLast = idx === paginas.length - 1;
      const celulasHTML = celulas
        .map((item) =>
          item ? gerarLabelHTML(item) : `<div class="etiqueta-vazia"></div>`
        )
        .join("");

      return `<div class="page${isLast ? " last-page" : ""}">${celulasHTML}</div>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Etiquetas Colacril CA4348</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }

    @page {
      size: A4 portrait;
      margin: 0;
    }

    html, body {
      width: 210mm;
      background: white;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      color-adjust: exact;
      font-family: Arial, Helvetica, sans-serif;
    }

    @media screen {
      body { padding: 8px; background: #d0d0d0; }
      .page { margin-bottom: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.25); }
      .etiqueta { border: 0.3pt solid #ddd; }
    }

    @media print {
      body { padding: 0; background: white; }
      .etiqueta { border: none; }
    }

    .page {
      width: 210mm;
      height: 297mm;
      padding-top: 12.5mm;
      padding-left: 12mm;
      padding-right: 12mm;
      display: grid;
      grid-template-columns: repeat(6, 31mm);
      grid-template-rows: repeat(16, 17mm);
      gap: 0;
      page-break-after: always;
      overflow: hidden;
      background: white;
    }

    .last-page {
      page-break-after: auto;
    }

    .etiqueta {
      width: 31mm;
      height: 17mm;
      overflow: hidden;
      box-sizing: border-box;
      padding: 0.4mm 0.5mm;
      display: flex;
      flex-direction: column;
      break-inside: avoid;
      page-break-inside: avoid;
      background: white;
    }

    .etiqueta-vazia {
      width: 31mm;
      height: 17mm;
      box-sizing: border-box;
      background: white;
    }

    .et-nome {
      font-size: 5.5pt;
      font-weight: bold;
      line-height: 1.2;
      height: 3mm;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
      color: #000;
      flex-shrink: 0;
    }

    .et-meta {
      font-size: 4pt;
      line-height: 1;
      height: 2.2mm;
      display: flex;
      justify-content: space-between;
      overflow: hidden;
      color: #333;
      flex-shrink: 0;
      margin-top: 0.2mm;
    }

    .et-barcode {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      min-height: 0;
    }

    .et-barcode svg {
      width: 29mm;
      height: auto;
      max-height: 8mm;
      display: block;
    }

    .et-codigo {
      font-size: 3.5pt;
      text-align: center;
      font-family: Courier New, monospace;
      letter-spacing: 0.2px;
      height: 2mm;
      overflow: hidden;
      white-space: nowrap;
      color: #444;
      flex-shrink: 0;
    }
  </style>
</head>
<body>
${paginasHTML}
</body>
</html>`;
}

export default function ImpressaoEtiquetasModal({
  aberto,
  onClose,
  produtoInicial,
}: Props) {
  const [items, setItems] = useState<PrintItem[]>([]);
  const [posicaoInicial, setPosicaoInicial] = useState(1);
  const [busca, setBusca] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [todosProdutos, setTodosProdutos] = useState<any[]>([]);
  const [carregandoProdutos, setCarregandoProdutos] = useState(false);
  const [mostrarBusca, setMostrarBusca] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    if (aberto && produtoInicial) {
      setItems([
        {
          id: produtoInicial.sku || Date.now().toString(),
          nome: produtoInicial.nome,
          sku: produtoInicial.sku,
          codigoBarras: produtoInicial.codigoBarras,
          tamanho: produtoInicial.tamanho,
          quantidade: 1,
        },
      ]);
      setPosicaoInicial(1);
    }
    if (!aberto) {
      setItems([]);
      setPosicaoInicial(1);
      setBusca("");
      setMostrarBusca(false);
      setTodosProdutos([]);
    }
  }, [aberto, produtoInicial]);

  useEffect(() => {
    if (!mostrarBusca || todosProdutos.length > 0) return;
    setCarregandoProdutos(true);
    listarProdutos()
      .then((data) => setTodosProdutos(data))
      .catch(() => {})
      .finally(() => setCarregandoProdutos(false));
  }, [mostrarBusca, todosProdutos.length]);

  if (!aberto) return null;

  const totalEtiquetas = items.reduce((s, i) => s + i.quantidade, 0);
  const totalComOffset = posicaoInicial - 1 + totalEtiquetas;
  const folhasNecessarias = totalEtiquetas > 0 ? Math.ceil(totalComOffset / POR_PAGINA) : 0;

  const produtosFiltrados = todosProdutos
    .filter((p) => {
      if (!busca.trim()) return true;
      const t = busca.toLowerCase();
      return (
        p.name?.toLowerCase().includes(t) || p.sku?.toString().includes(t)
      );
    })
    .slice(0, 10);

  const adicionarProduto = (p: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    const skuStr = `SKU-${p.sku}`;
    if (items.find((i) => i.sku === skuStr)) {
      setItems((prev) =>
        prev.map((i) =>
          i.sku === skuStr ? { ...i, quantidade: i.quantidade + 1 } : i
        )
      );
    } else {
      setItems((prev) => [
        ...prev,
        {
          id: `${skuStr}-${Date.now()}`,
          nome: p.name || "",
          sku: skuStr,
          codigoBarras: p.barcode?.toString() || "",
          tamanho: p.size || undefined,
          quantidade: 1,
        },
      ]);
    }
    setBusca("");
    setMostrarBusca(false);
  };

  const removerItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const alterarQuantidade = (id: string, delta: number) => {
    setItems((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i;
        return { ...i, quantidade: Math.max(1, Math.min(96, i.quantidade + delta)) };
      })
    );
  };

  const setQuantidadeDigitada = (id: string, valor: string) => {
    const n = parseInt(valor);
    if (!isNaN(n)) {
      setItems((prev) =>
        prev.map((i) =>
          i.id === id ? { ...i, quantidade: Math.max(1, Math.min(96, n)) } : i
        )
      );
    }
  };

  const imprimir = () => {
    if (items.length === 0) return;
    setIsPrinting(true);
    try {
      const html = gerarHTMLImpressao(items, posicaoInicial);
      const win = window.open("", "_blank");
      if (!win) {
        alert(
          "Por favor, permita popups neste site para imprimir as etiquetas."
        );
        setIsPrinting(false);
        return;
      }
      win.document.open();
      win.document.write(html);
      win.document.close();
      // Aguarda o DOM renderizar antes de abrir o diálogo de impressão
      setTimeout(() => {
        win.focus();
        win.print();
        setIsPrinting(false);
      }, 400);
    } catch (e) {
      console.error("Erro ao gerar impressão:", e);
      setIsPrinting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white w-full max-w-4xl rounded-xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">

        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 flex justify-between items-center bg-zinc-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 p-2 rounded-lg">
              <Printer className="text-indigo-600" size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900">
                Impressão de Etiquetas
              </h2>
              <p className="text-xs text-zinc-500">
                Colacril CA4348 · 6×16 · 96 etiquetas por folha · 31×17mm
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200 rounded-full transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-zinc-200">

            {/* ── ESQUERDA: Produtos ─────────────────────────── */}
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-zinc-700">
                  Produtos a imprimir
                </h3>
                {totalEtiquetas > 0 && (
                  <span className="text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                    {totalEtiquetas} etiqueta{totalEtiquetas !== 1 ? "s" : ""}
                  </span>
                )}
              </div>

              {/* Lista de itens */}
              <div className="space-y-2">
                {items.length === 0 && (
                  <div className="flex flex-col items-center justify-center gap-2 py-8 border border-dashed border-zinc-200 rounded-xl text-zinc-400">
                    <Package size={28} strokeWidth={1.5} />
                    <p className="text-sm">Nenhum produto adicionado</p>
                  </div>
                )}
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 px-3 py-2.5 border border-zinc-200 rounded-lg bg-white hover:border-zinc-300 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-800 truncate">
                        {item.nome || "Produto sem nome"}
                      </p>
                      <p className="text-xs text-zinc-500 truncate">
                        {item.sku}
                        {item.tamanho && ` · Tam: ${item.tamanho}`}
                        {item.codigoBarras && ` · ${item.codigoBarras}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => alterarQuantidade(item.id, -1)}
                        className="w-6 h-6 flex items-center justify-center border border-zinc-300 rounded text-zinc-600 hover:bg-zinc-100 transition-colors"
                      >
                        <Minus size={10} />
                      </button>
                      <input
                        type="number"
                        min={1}
                        max={96}
                        value={item.quantidade}
                        onChange={(e) =>
                          setQuantidadeDigitada(item.id, e.target.value)
                        }
                        className="w-11 h-6 text-center text-xs border border-zinc-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-400"
                      />
                      <button
                        onClick={() => alterarQuantidade(item.id, 1)}
                        className="w-6 h-6 flex items-center justify-center border border-zinc-300 rounded text-zinc-600 hover:bg-zinc-100 transition-colors"
                      >
                        <Plus size={10} />
                      </button>
                    </div>
                    <button
                      onClick={() => removerItem(item.id)}
                      className="p-1 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors shrink-0"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Adicionar produto */}
              {!mostrarBusca ? (
                <button
                  onClick={() => setMostrarBusca(true)}
                  className="w-full h-9 flex items-center justify-center gap-1.5 border border-dashed border-zinc-300 rounded-lg text-xs text-zinc-500 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                >
                  <Plus size={12} />
                  Adicionar produto
                </button>
              ) : (
                <div className="space-y-1">
                  <div className="relative">
                    <Search
                      size={13}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"
                    />
                    <input
                      autoFocus
                      placeholder="Buscar por nome ou SKU..."
                      value={busca}
                      onChange={(e) => setBusca(e.target.value)}
                      className="w-full h-9 pl-8 pr-8 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                    <button
                      onClick={() => {
                        setMostrarBusca(false);
                        setBusca("");
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                    >
                      <X size={13} />
                    </button>
                  </div>
                  <div className="border border-zinc-200 rounded-lg overflow-hidden max-h-44 overflow-y-auto">
                    {carregandoProdutos ? (
                      <div className="flex items-center gap-2 p-3 text-xs text-zinc-500">
                        <Loader2 size={13} className="animate-spin" />
                        Carregando produtos...
                      </div>
                    ) : produtosFiltrados.length === 0 ? (
                      <p className="text-xs text-zinc-400 p-3 text-center">
                        Nenhum produto encontrado
                      </p>
                    ) : (
                      produtosFiltrados.map((p) => (
                        <button
                          key={p.sku}
                          onClick={() => adicionarProduto(p)}
                          className="w-full text-left px-3 py-2 hover:bg-indigo-50 border-b border-zinc-100 last:border-0 transition-colors"
                        >
                          <p className="text-sm font-medium text-zinc-800 truncate">
                            {p.name}
                          </p>
                          <p className="text-xs text-zinc-500">
                            SKU-{p.sku}
                            {p.size ? ` · ${p.size}` : ""}
                            {p.barcode ? ` · ${p.barcode}` : ""}
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Preview de etiquetas */}
              {items.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">
                    Preview (tamanho real)
                  </p>
                  <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 overflow-y-auto max-h-44">
                    <div className="flex flex-wrap gap-1">
                      {items.flatMap((item) =>
                        Array.from(
                          { length: Math.min(item.quantidade, 3) },
                          (_, qi) => (
                            <EtiquetaColacril
                              key={`${item.id}-${qi}`}
                              nome={item.nome}
                              sku={item.sku}
                              codigoBarras={item.codigoBarras}
                              tamanho={item.tamanho}
                            />
                          )
                        )
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ── DIREITA: Configurações ─────────────────────── */}
            <div className="p-6 space-y-5">

              {/* Resumo */}
              <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-semibold text-zinc-700">
                  Resumo da impressão
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-zinc-500 mb-0.5">Total de etiquetas</p>
                    <p className="text-lg font-bold text-zinc-900">{totalEtiquetas}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 mb-0.5">Folhas necessárias</p>
                    <p className="text-lg font-bold text-zinc-900">
                      {folhasNecessarias || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 mb-0.5">Posição inicial</p>
                    <p className="text-lg font-bold text-zinc-900">
                      {posicaoInicial}
                      <span className="text-xs font-normal text-zinc-400"> / 96</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 mb-0.5">Espaços disponíveis</p>
                    <p className="text-lg font-bold text-zinc-900">
                      {POR_PAGINA - (posicaoInicial - 1)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Posição inicial */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-zinc-700">
                    Posição inicial na folha
                  </h3>
                  <span className="text-xs text-zinc-400">
                    Para folhas parcialmente usadas
                  </span>
                </div>

                <div className="flex items-center gap-3 mb-4">
                  <button
                    onClick={() => setPosicaoInicial((p) => Math.max(1, p - 1))}
                    className="w-9 h-9 flex items-center justify-center border border-zinc-300 rounded-lg hover:bg-zinc-100 transition-colors"
                  >
                    <ChevronLeft size={15} />
                  </button>
                  <div className="flex-1 text-center">
                    <span className="text-3xl font-bold text-zinc-900 tabular-nums">
                      {posicaoInicial}
                    </span>
                    <span className="text-sm text-zinc-400"> / 96</span>
                  </div>
                  <button
                    onClick={() => setPosicaoInicial((p) => Math.min(96, p + 1))}
                    className="w-9 h-9 flex items-center justify-center border border-zinc-300 rounded-lg hover:bg-zinc-100 transition-colors"
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>

                {/* Grade visual 6×16 */}
                <div className="border border-zinc-200 rounded-xl p-3 bg-white">
                  <p className="text-[11px] text-zinc-400 text-center mb-2">
                    Clique para selecionar a posição inicial
                  </p>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(6, 1fr)",
                      gap: "2px",
                    }}
                  >
                    {Array.from({ length: POR_PAGINA }, (_, i) => {
                      const pos = i + 1;
                      const isSelected = pos === posicaoInicial;
                      const isUsed = pos < posicaoInicial;
                      return (
                        <button
                          key={i}
                          title={`Posição ${pos}`}
                          onClick={() => setPosicaoInicial(pos)}
                          className={`h-[10px] rounded-[2px] transition-colors ${
                            isSelected
                              ? "bg-indigo-600"
                              : isUsed
                              ? "bg-zinc-200 cursor-default"
                              : "bg-zinc-100 hover:bg-indigo-100 border border-zinc-200 hover:border-indigo-300"
                          }`}
                        />
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-4 mt-2.5 justify-center">
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-2.5 rounded-[2px] bg-zinc-200" />
                      <span className="text-[10px] text-zinc-400">Ignorado</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-2.5 rounded-[2px] bg-indigo-600" />
                      <span className="text-[10px] text-zinc-400">Início</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-2.5 rounded-[2px] bg-zinc-100 border border-zinc-200" />
                      <span className="text-[10px] text-zinc-400">Disponível</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-200 flex justify-between items-center bg-zinc-50 shrink-0">
          <p className="text-xs text-zinc-500">
            {totalEtiquetas > 0
              ? `${totalEtiquetas} etiqueta${totalEtiquetas !== 1 ? "s" : ""} · ${folhasNecessarias} folha${folhasNecessarias !== 1 ? "s" : ""} · iniciando na posição ${posicaoInicial}`
              : "Adicione pelo menos um produto para imprimir"}
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-zinc-700 border border-zinc-300 rounded-lg hover:bg-zinc-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={imprimir}
              disabled={items.length === 0 || isPrinting}
              className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isPrinting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Preparando...
                </>
              ) : (
                <>
                  <Printer size={14} />
                  Imprimir Etiquetas
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

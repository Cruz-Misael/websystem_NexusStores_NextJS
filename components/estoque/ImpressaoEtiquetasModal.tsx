"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import JsBarcode from "jsbarcode";
import {
  Printer, X, Plus, Minus, Search, Loader2,
  ChevronLeft, ChevronRight, Package, Settings2, LayoutGrid, ScanBarcode,
} from "lucide-react";
import { listarProdutosPaginado, buscarProdutoPorBarcodeOuSKU } from "@/src/services/product.service";
import { useDebounce } from "@/src/hooks/useDebounce";
import EtiquetaColacril from "./EtiquetaColacril";

// ─── TYPES ───────────────────────────────────────────────────────────────────

interface ConfigPapel {
  largura: number;
  altura: number;
  margemEsquerda: number;
  margemDireita: number;
  margemSuperior: number;
  margemInferior: number;
}

interface ConfigEtiqueta {
  largura: number;
  altura: number;
  gapHorizontal: number;
  gapVertical: number;
  paddingH: number;
  paddingV: number;
}

interface Preset {
  id: string;
  nome: string;
  papel: ConfigPapel;
  etiqueta: ConfigEtiqueta;
}

interface PrintItem {
  id: string;
  nome: string;
  sku: string;
  codigoBarras: string;
  tamanho?: string;
  preco?: number;
  quantidade: number;
}

interface ProdutoInicial {
  nome: string;
  sku: string;
  codigoBarras: string;
  tamanho?: string;
  preco?: number;
}

interface Props {
  aberto: boolean;
  onClose: () => void;
  produtoInicial?: ProdutoInicial;
}

// ─── PRESETS ─────────────────────────────────────────────────────────────────

const PRESETS: Preset[] = [
  {
    id: "colacril-ca4348",
    nome: "Colacril CA4348 / Pimaco A4348",
    papel: { largura: 210, altura: 297, margemEsquerda: 6, margemDireita: 6, margemSuperior: 12.5, margemInferior: 12.5 },
    etiqueta: { largura: 31, altura: 17, gapHorizontal: 2, gapVertical: 0, paddingH: 0.5, paddingV: 2 },
  },
  {
    id: "a4-3x8",
    nome: "A4 Genérico 3×8 (65×35mm)",
    papel: { largura: 210, altura: 297, margemEsquerda: 7.5, margemDireita: 7.5, margemSuperior: 13, margemInferior: 13 },
    etiqueta: { largura: 65, altura: 35, gapHorizontal: 0, gapVertical: 0, paddingH: 3, paddingV: 1.5 },
  },
  {
    id: "termica-58",
    nome: "Térmica 58mm (etiqueta única)",
    papel: { largura: 58, altura: 40, margemEsquerda: 2, margemDireita: 2, margemSuperior: 2, margemInferior: 2 },
    etiqueta: { largura: 54, altura: 36, gapHorizontal: 0, gapVertical: 0, paddingH: 1, paddingV: 1 },
  },
  {
    id: "termica-80",
    nome: "Térmica 80mm (etiqueta única)",
    papel: { largura: 80, altura: 50, margemEsquerda: 2, margemDireita: 2, margemSuperior: 2, margemInferior: 2 },
    etiqueta: { largura: 76, altura: 46, gapHorizontal: 0, gapVertical: 0, paddingH: 1.5, paddingV: 1.5 },
  },
  {
    id: "custom",
    nome: "Personalizado",
    papel: { largura: 210, altura: 297, margemEsquerda: 10, margemDireita: 10, margemSuperior: 10, margemInferior: 10 },
    etiqueta: { largura: 50, altura: 30, gapHorizontal: 0, gapVertical: 0, paddingH: 1, paddingV: 1 },
  },
];

// ─── CALCULATIONS ─────────────────────────────────────────────────────────────

function calcularGrade(papel: ConfigPapel, etiqueta: ConfigEtiqueta) {
  const areaW = papel.largura - papel.margemEsquerda - papel.margemDireita;
  const areaH = papel.altura - papel.margemSuperior - papel.margemInferior;
  const gH = etiqueta.gapHorizontal;
  const gV = etiqueta.gapVertical;
  // n*label + (n-1)*gap <= area  →  n <= (area + gap) / (label + gap)
  const colunas = Math.max(1, Math.floor(gH > 0 ? (areaW + gH) / (etiqueta.largura + gH) : areaW / etiqueta.largura));
  const linhas  = Math.max(1, Math.floor(gV > 0 ? (areaH + gV) / (etiqueta.altura  + gV) : areaH / etiqueta.altura));
  return { colunas, linhas, total: colunas * linhas };
}

// ─── BARCODE & HTML ──────────────────────────────────────────────────────────

function gerarBarcodeSVG(codigo: string, heightPx = 25): string {
  if (!codigo) return "";
  try {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    JsBarcode(svg, codigo, {
      format: "CODE128",
      width: 1.0,
      height: heightPx,
      displayValue: false,
      margin: 0,
      background: "transparent",
      lineColor: "#000000",
    });
    return svg.outerHTML;
  } catch {
    return "";
  }
}

function fontesPorAltura(alturaMM: number) {
  const h = alturaMM;
  return {
    // linha nome (largura total, mais espaço)
    headerH: `${Math.max(3.4, Math.min(6.0, h * 0.26)).toFixed(1)}mm`,
    nome:    `${Math.max(4.0, Math.min(6.0, h * 0.32)).toFixed(1)}pt`,
    // linha tamanho + preço (mesma linha)
    tam:     `${Math.max(4.5, Math.min(6.5, h * 0.32)).toFixed(1)}pt`,
    tamH:    `${Math.max(2.4, Math.min(4.0, h * 0.17)).toFixed(1)}mm`,
    preco:   `${Math.max(4.5, Math.min(6.5, h * 0.32)).toFixed(1)}pt`,
    // número do barcode — em negrito e ligeiramente maior
    codigo:  `${Math.max(4.5, Math.min(6.5, h * 0.32)).toFixed(1)}pt`,
    codigoH: `${Math.max(2.4, Math.min(4.0, h * 0.17)).toFixed(1)}mm`,
    // max-height do svg — barras mais baixas
    barcodeMaxH: `${(h * 0.37).toFixed(1)}mm`,
  };
}

function formatarPrecoHTML(preco?: number): string {
  if (!preco || preco <= 0) return "";
  return preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function gerarLabelHTML(
  item: Omit<PrintItem, "quantidade" | "id">,
  etiqueta: ConfigEtiqueta,
): string {
  const f = fontesPorAltura(etiqueta.altura);
  const barcodeH = Math.max(10, Math.round(etiqueta.altura * 0.35 * 3.78));
  const svgStr = gerarBarcodeSVG(item.codigoBarras, barcodeH);
  const precoStr = formatarPrecoHTML(item.preco);

  const maxLen = 38;
  const nome = item.nome.length > maxLen ? item.nome.slice(0, maxLen - 1) + "…" : item.nome;

  const tamPrecoHTML = (item.tamanho || precoStr)
    ? `<div class="et-tam-preco" style="height:${f.tamH}">
        ${item.tamanho ? `<span class="et-tam" style="font-size:${f.tam}">TAM: ${item.tamanho.toUpperCase()}</span>` : ""}
        ${precoStr ? `<span class="et-preco" style="font-size:${f.preco}">${precoStr}</span>` : ""}
      </div>`
    : "";
  const barcodeContent = svgStr
    ? svgStr
    : `<span style="font-size:3pt;color:#bbb">Sem código</span>`;
  const codigoHTML = item.codigoBarras
    ? `<div class="et-codigo" style="font-size:${f.codigo};height:${f.codigoH}">${item.codigoBarras}</div>`
    : "";

  return `<div class="etiqueta">
  <div class="et-header" style="height:${f.headerH}">
    <span class="et-nome" style="font-size:${f.nome}">${nome}</span>
  </div>
  ${tamPrecoHTML}
  <div class="et-barcode">${barcodeContent}</div>
  ${codigoHTML}
</div>`;
}

function gerarHTMLImpressao(
  items: PrintItem[],
  posicaoInicial: number,
  papel: ConfigPapel,
  etiqueta: ConfigEtiqueta,
): string {
  const { colunas, linhas, total: porPagina } = calcularGrade(papel, etiqueta);
  const f = fontesPorAltura(etiqueta.altura);

  const todas: Array<Omit<PrintItem, "quantidade" | "id"> | null> = [];
  for (let i = 0; i < posicaoInicial - 1; i++) todas.push(null);
  for (const item of items) {
    for (let q = 0; q < item.quantidade; q++) todas.push(item);
  }

  const paginas: Array<typeof todas> = [];
  for (let i = 0; i < todas.length; i += porPagina) {
    paginas.push(todas.slice(i, i + porPagina));
  }
  if (paginas.length === 0) paginas.push([]);

  const paginasHTML = paginas
    .map((pagina, idx) => {
      const celulas = [...pagina];
      while (celulas.length < porPagina) celulas.push(null);
      const isLast = idx === paginas.length - 1;
      const html = celulas
        .map(item =>
          item
            ? gerarLabelHTML(item, etiqueta)
            : `<div class="etiqueta-vazia"></div>`
        )
        .join("");
      return `<div class="page${isLast ? " last-page" : ""}">${html}</div>`;
    })
    .join("\n");

  const padH = etiqueta.paddingH.toFixed(2);
  const padV = etiqueta.paddingV.toFixed(2);
  const pageSize = papel.altura > 0
    ? `${papel.largura}mm ${papel.altura}mm`
    : `${papel.largura}mm`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Etiquetas</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    @page { size: ${pageSize} portrait; margin: 0; }
    html, body {
      width: ${papel.largura}mm;
      background: white;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      color-adjust: exact;
      font-family: Arial, Helvetica, sans-serif;
    }
    @media screen {
      body { padding: 8px; background: #c8c8c8; }
      .page { margin-bottom: 12px; box-shadow: 0 2px 12px rgba(0,0,0,.3); }
      .etiqueta { border: 0.3pt solid #ddd; }
    }
    @media print {
      body { padding: 0; background: white; }
      .etiqueta { border: none; }
    }
    .page {
      width: ${papel.largura}mm;
      ${papel.altura > 0 ? `height: ${papel.altura}mm;` : ""}
      padding-top: ${papel.margemSuperior}mm;
      padding-left: ${papel.margemEsquerda}mm;
      padding-right: ${papel.margemDireita}mm;
      display: grid;
      grid-template-columns: repeat(${colunas}, ${etiqueta.largura}mm);
      grid-template-rows: repeat(${linhas}, ${etiqueta.altura}mm);
      gap: ${etiqueta.gapVertical}mm ${etiqueta.gapHorizontal}mm;
      justify-content: center;
      align-content: start;
      page-break-after: always;
      overflow: hidden;
      background: white;
    }
    .last-page { page-break-after: auto; }
    .etiqueta {
      width: ${etiqueta.largura}mm;
      height: ${etiqueta.altura}mm;
      overflow: hidden;
      box-sizing: border-box;
      padding: ${padV}mm ${padH}mm;
      display: flex;
      flex-direction: column;
      break-inside: avoid;
      page-break-inside: avoid;
      background: white;
    }
    .etiqueta-vazia {
      width: ${etiqueta.largura}mm;
      height: ${etiqueta.altura}mm;
      box-sizing: border-box;
      background: white;
    }
    /* ── linha nome (largura total) ── */
    .et-header {
      overflow: hidden;
      flex-shrink: 0;
      line-height: 1.15;
    }
    .et-nome {
      font-weight: bold;
      color: #000;
      display: block;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
    /* ── linha tamanho + preço ── */
    .et-tam-preco {
      display: flex;
      align-items: center;
      justify-content: space-between;
      overflow: hidden;
      flex-shrink: 0;
      line-height: 1;
      margin-top: 0.1mm;
    }
    .et-tam {
      font-weight: bold;
      color: #000;
    }
    .et-preco {
      font-weight: bold;
      color: #000;
      white-space: nowrap;
      margin-left: auto;
    }
    /* ── barcode ── */
    .et-barcode {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      min-height: 0;
      margin-top: 0.2mm;
    }
    .et-barcode svg {
      width: 87%;
      height: auto;
      max-height: ${f.barcodeMaxH};
      display: block;
    }
    /* ── número do código ── */
    .et-codigo {
      font-weight: bold;
      text-align: center;
      font-family: Courier New, monospace;
      letter-spacing: 0.3px;
      overflow: hidden;
      white-space: nowrap;
      color: #000;
      flex-shrink: 0;
      margin-top: 0.1mm;
    }
  </style>
</head>
<body>
${paginasHTML}
</body>
</html>`;
}

// ─── MINI COMPONENTS ─────────────────────────────────────────────────────────

function MmInput({
  label,
  value,
  onChange,
  min = 0,
  max = 500,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] text-zinc-500 leading-none truncate">{label}</span>
      <div className="flex items-center h-7 border border-zinc-200 rounded bg-white focus-within:border-indigo-400 focus-within:ring-1 focus-within:ring-indigo-400/30 transition-all">
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={0.5}
          onChange={(e) => {
            const n = parseFloat(e.target.value);
            if (!isNaN(n)) onChange(Math.max(min, Math.min(max, n)));
          }}
          className="w-full h-full px-1.5 text-xs text-zinc-800 bg-transparent focus:outline-none tabular-nums"
        />
        <span className="text-[9px] text-zinc-400 pr-1 font-mono shrink-0 select-none">mm</span>
      </div>
    </div>
  );
}

function FolhaPreview({
  papel,
  etiqueta,
  colunas,
  linhas,
  posicaoInicial,
  totalEtiquetas,
  previewWidth = 200,
}: {
  papel: ConfigPapel;
  etiqueta: ConfigEtiqueta;
  colunas: number;
  linhas: number;
  posicaoInicial: number;
  totalEtiquetas: number;
  previewWidth?: number;
}) {
  const escala = previewWidth / papel.largura;
  const paperH = Math.round(papel.altura * escala);
  const marginL = papel.margemEsquerda * escala;
  const marginT = papel.margemSuperior * escala;
  const marginR = papel.margemDireita * escala;
  const marginB = papel.margemInferior * escala;
  const labelW = etiqueta.largura * escala;
  const labelH = etiqueta.altura * escala;
  const gapHpx = etiqueta.gapHorizontal * escala;
  const gapVpx = etiqueta.gapVertical * escala;
  const safeH = etiqueta.paddingH * escala;
  const safeV = etiqueta.paddingV * escala;
  const total = colunas * linhas;
  // Centraliza a grade dentro da área entre as margens
  const contentW = previewWidth - marginL - marginR;
  const gridW = colunas * labelW + Math.max(0, colunas - 1) * gapHpx;
  const centeredLeft = marginL + Math.max(0, (contentW - gridW) / 2);

  return (
    <div
      style={{
        width: previewWidth,
        height: paperH,
        background: "white",
        border: "1px solid #d4d4d8",
        borderRadius: 3,
        position: "relative",
        overflow: "hidden",
        flexShrink: 0,
        boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
      }}
    >
      {/* Área de margem — overlay visual */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderLeft: `${marginL}px solid rgba(99,102,241,0.06)`,
          borderRight: `${marginR}px solid rgba(99,102,241,0.06)`,
          borderTop: `${marginT}px solid rgba(99,102,241,0.06)`,
          borderBottom: `${marginB}px solid rgba(99,102,241,0.06)`,
          pointerEvents: "none",
          zIndex: 2,
        }}
      />
      {/* Grade de etiquetas */}
      <div
        style={{
          position: "absolute",
          top: marginT,
          left: centeredLeft,
          display: "grid",
          gridTemplateColumns: `repeat(${colunas}, ${labelW}px)`,
          gridTemplateRows: `repeat(${linhas}, ${labelH}px)`,
          gap: `${gapVpx}px ${gapHpx}px`,
        }}
      >
        {Array.from({ length: total }, (_, i) => {
          const pos = i + 1;
          const skipped = pos < posicaoInicial;
          const filled =
            pos >= posicaoInicial && pos < posicaoInicial + totalEtiquetas;
          return (
            <div
              key={i}
              style={{
                width: labelW,
                height: labelH,
                background: filled ? "#eff6ff" : skipped ? "#f4f4f5" : "#fafafa",
                border: `${filled ? 0.8 : 0.3}px solid ${filled ? "#93c5fd" : "#e4e4e7"}`,
                borderRadius: 0.5,
                boxSizing: "border-box",
                padding: `${safeV}px ${safeH}px`,
              }}
            >
              {/* safe area interna — só visível quando há respiração */}
              {(safeH > 0.5 || safeV > 0.5) && (
                <div style={{
                  width: "100%", height: "100%",
                  background: filled ? "rgba(147,197,253,0.35)" : "rgba(0,0,0,0.04)",
                  borderRadius: 0.5,
                }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── MAIN MODAL ──────────────────────────────────────────────────────────────

export default function ImpressaoEtiquetasModal({
  aberto,
  onClose,
  produtoInicial,
}: Props) {
  const [items, setItems] = useState<PrintItem[]>([]);
  const [posicaoInicial, setPosicaoInicial] = useState(1);
  const [busca, setBusca] = useState("");
  const buscaDebounced = useDebounce(busca, 300);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [produtosResultado, setProdutosResultado] = useState<any[]>([]);
  const [carregandoProdutos, setCarregandoProdutos] = useState(false);
  const [mostrarBusca, setMostrarBusca] = useState(false);
  const [scanCodigo, setScanCodigo] = useState("");
  const [scanCarregando, setScanCarregando] = useState(false);
  const [scanErro, setScanErro] = useState("");
  const scanInputRef = useRef<HTMLInputElement>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [presetId, setPresetId] = useState("colacril-ca4348");
  const [papel, setPapel] = useState<ConfigPapel>({ ...PRESETS[0].papel });
  const [etiqueta, setEtiqueta] = useState<ConfigEtiqueta>({ ...PRESETS[0].etiqueta });

  const { colunas, linhas, total: porPagina } = useMemo(
    () => calcularGrade(papel, etiqueta),
    [papel, etiqueta]
  );

  // Inicializa produto e reseta ao fechar
  useEffect(() => {
    if (aberto && produtoInicial) {
      setItems([
        {
          id: produtoInicial.sku || Date.now().toString(),
          nome: produtoInicial.nome,
          sku: produtoInicial.sku,
          codigoBarras: produtoInicial.codigoBarras,
          tamanho: produtoInicial.tamanho,
          preco: produtoInicial.preco,
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
      setProdutosResultado([]);
      setScanCodigo("");
      setScanErro("");
    }
  }, [aberto, produtoInicial]);

  // Busca server-side com ilike a cada keystroke (debounced)
  useEffect(() => {
    if (!mostrarBusca) return;
    setCarregandoProdutos(true);
    listarProdutosPaginado(1, 10, buscaDebounced.trim() || undefined, true)
      .then(({ produtos }) => setProdutosResultado(produtos))
      .catch(() => setProdutosResultado([]))
      .finally(() => setCarregandoProdutos(false));
  }, [buscaDebounced, mostrarBusca]);

  // Reseta posição quando a grade muda de tamanho
  useEffect(() => {
    setPosicaoInicial(1);
  }, [porPagina]);

  if (!aberto) return null;

  const totalEtiquetas = items.reduce((s, i) => s + i.quantidade, 0);
  const totalComOffset = posicaoInicial - 1 + totalEtiquetas;
  const folhasNecessarias =
    totalEtiquetas > 0 ? Math.ceil(totalComOffset / porPagina) : 0;


  const aplicarPreset = (id: string) => {
    setPresetId(id);
    const preset = PRESETS.find((p) => p.id === id);
    if (preset) {
      setPapel({ ...preset.papel });
      setEtiqueta({ ...preset.etiqueta });
    }
  };

  const atualizarPapel = (field: keyof ConfigPapel, val: number) => {
    setPresetId("custom");
    setPapel((prev) => ({ ...prev, [field]: val }));
  };

  const atualizarEtiqueta = (field: keyof ConfigEtiqueta, val: number) => {
    setPresetId("custom");
    setEtiqueta((prev) => ({ ...prev, [field]: val }));
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adicionarProduto = (p: any) => {
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
          preco: p.price ? Number(p.price) : undefined,
          quantidade: 1,
        },
      ]);
    }
    setBusca("");
    setMostrarBusca(false);
  };

  const handleScan = async (codigo: string) => {
    const cod = codigo.trim();
    if (!cod) return;
    setScanCarregando(true);
    setScanErro("");
    try {
      const p = await buscarProdutoPorBarcodeOuSKU(cod);
      if (!p) {
        setScanErro("Produto não encontrado");
        return;
      }
      adicionarProduto(p);
      setScanCodigo("");
      scanInputRef.current?.focus();
    } catch {
      setScanErro("Erro ao buscar produto");
    } finally {
      setScanCarregando(false);
    }
  };

  const removerItem = (id: string) =>
    setItems((prev) => prev.filter((i) => i.id !== id));

  const alterarQuantidade = (id: string, delta: number) => {
    setItems((prev) =>
      prev.map((i) =>
        i.id !== id
          ? i
          : { ...i, quantidade: Math.max(1, i.quantidade + delta) }
      )
    );
  };

  const setQtdDigitada = (id: string, valor: string) => {
    const n = parseInt(valor);
    if (!isNaN(n))
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, quantidade: Math.max(1, n) } : i))
      );
  };

  const imprimir = () => {
    if (items.length === 0) return;
    setIsPrinting(true);
    try {
      const html = gerarHTMLImpressao(items, posicaoInicial, papel, etiqueta);
      const win = window.open("", "_blank");
      if (!win) {
        alert("Por favor, permita popups neste site para imprimir.");
        setIsPrinting(false);
        return;
      }
      win.document.open();
      win.document.write(html);
      win.document.close();
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

  const presetAtual = PRESETS.find((p) => p.id === presetId);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white w-full max-w-5xl rounded-xl shadow-2xl flex flex-col overflow-hidden" style={{ maxHeight: "92vh" }}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="px-6 py-3.5 border-b border-zinc-200 flex justify-between items-center bg-zinc-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 p-2 rounded-lg">
              <Printer className="text-indigo-600" size={17} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-900">
                Impressão de Etiquetas
              </h2>
              <p className="text-[11px] text-zinc-500">
                {presetAtual?.nome ?? "Configuração personalizada"} ·{" "}
                <span className="font-medium text-zinc-700">
                  {colunas}×{linhas} = {porPagina} por folha
                </span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200 rounded-full transition-colors"
          >
            <X size={17} />
          </button>
        </div>

        {/* ── Body — 3 painéis ────────────────────────────────────────────── */}
        <div className="flex-1 flex overflow-hidden min-h-0">

          {/* ── PAINEL 1: Produtos ──────────────────────────────────────── */}
          <div className="w-72 shrink-0 flex flex-col overflow-hidden border-r border-zinc-200">
            <div className="px-4 py-2.5 border-b border-zinc-100 bg-zinc-50 flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-700">Produtos</span>
              {totalEtiquetas > 0 && (
                <span className="text-[10px] font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded-full">
                  {totalEtiquetas} etiq.
                </span>
              )}
            </div>

            {/* ── Campo de scan ── */}
            <div className="px-3 py-2 border-b border-zinc-100 bg-white">
              <div className="relative">
                <ScanBarcode size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                <input
                  ref={scanInputRef}
                  type="text"
                  inputMode="numeric"
                  placeholder="Bipe ou digite o código de barras…"
                  value={scanCodigo}
                  onChange={(e) => { setScanCodigo(e.target.value); setScanErro(""); }}
                  onKeyDown={(e) => { if (e.key === "Enter") handleScan(scanCodigo); }}
                  disabled={scanCarregando}
                  className="w-full h-8 pl-8 pr-8 border border-zinc-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400 disabled:opacity-50 placeholder:text-zinc-300"
                />
                {scanCarregando && (
                  <Loader2 size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-indigo-500 animate-spin" />
                )}
              </div>
              {scanErro && (
                <p className="text-[10px] text-red-500 mt-1 px-0.5">{scanErro}</p>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {items.length === 0 && (
                <div className="flex flex-col items-center justify-center gap-2 py-7 border border-dashed border-zinc-200 rounded-xl text-zinc-400">
                  <Package size={22} strokeWidth={1.5} />
                  <p className="text-xs">Nenhum produto adicionado</p>
                </div>
              )}

              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 px-2.5 py-2 border border-zinc-200 rounded-lg bg-white hover:border-zinc-300 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-zinc-800 truncate">
                      {item.nome || "—"}
                    </p>
                    <p className="text-[10px] text-zinc-500 truncate">
                      {item.sku}
                      {item.tamanho && ` · ${item.tamanho}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      onClick={() => alterarQuantidade(item.id, -1)}
                      className="w-5 h-5 flex items-center justify-center border border-zinc-300 rounded text-zinc-600 hover:bg-zinc-100 transition-colors"
                    >
                      <Minus size={9} />
                    </button>
                    <input
                      type="number"
                      min={1}
                      value={item.quantidade}
                      onChange={(e) => setQtdDigitada(item.id, e.target.value)}
                      className="w-9 h-5 text-center text-[11px] border border-zinc-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-400 tabular-nums"
                    />
                    <button
                      onClick={() => alterarQuantidade(item.id, 1)}
                      className="w-5 h-5 flex items-center justify-center border border-zinc-300 rounded text-zinc-600 hover:bg-zinc-100 transition-colors"
                    >
                      <Plus size={9} />
                    </button>
                  </div>
                  <button
                    onClick={() => removerItem(item.id)}
                    className="p-0.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors shrink-0"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}

              {/* Adicionar produto */}
              {!mostrarBusca ? (
                <button
                  onClick={() => setMostrarBusca(true)}
                  className="w-full h-8 flex items-center justify-center gap-1.5 border border-dashed border-zinc-300 rounded-lg text-xs text-zinc-500 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                >
                  <Plus size={11} />
                  Adicionar produto
                </button>
              ) : (
                <div className="space-y-1">
                  <div className="relative">
                    <Search
                      size={12}
                      className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"
                    />
                    <input
                      autoFocus
                      placeholder="Buscar por nome ou SKU..."
                      value={busca}
                      onChange={(e) => setBusca(e.target.value)}
                      className="w-full h-8 pl-7 pr-7 border border-zinc-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400"
                    />
                    <button
                      onClick={() => {
                        setMostrarBusca(false);
                        setBusca("");
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                    >
                      <X size={12} />
                    </button>
                  </div>
                  <div className="border border-zinc-200 rounded-lg overflow-hidden max-h-40 overflow-y-auto">
                    {carregandoProdutos ? (
                      <div className="flex items-center gap-2 p-2 text-xs text-zinc-500">
                        <Loader2 size={12} className="animate-spin" />
                        Carregando...
                      </div>
                    ) : produtosResultado.length === 0 ? (
                      <p className="text-xs text-zinc-400 p-2 text-center">
                        Nenhum produto encontrado
                      </p>
                    ) : (
                      produtosResultado.map((p) => (
                        <button
                          key={p.sku}
                          onClick={() => adicionarProduto(p)}
                          className="w-full text-left px-2.5 py-1.5 hover:bg-indigo-50 border-b border-zinc-100 last:border-0 transition-colors"
                        >
                          <p className="text-xs font-medium text-zinc-800 truncate">
                            {p.name}
                          </p>
                          <p className="text-[10px] text-zinc-500">
                            SKU-{p.sku}
                            {p.size ? ` · ${p.size}` : ""}
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Mini preview das etiquetas */}
              {items.length > 0 && (
                <div className="pt-1">
                  <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">
                    Preview
                  </p>
                  <div className="p-2 bg-zinc-50 rounded-lg border border-zinc-200 overflow-y-auto max-h-32">
                    <div className="flex flex-wrap gap-1">
                      {items.flatMap((item) =>
                        Array.from(
                          { length: Math.min(item.quantidade, 2) },
                          (_, qi) => (
                            <EtiquetaColacril
                              key={`${item.id}-${qi}`}
                              nome={item.nome}
                              codigoBarras={item.codigoBarras}
                              tamanho={item.tamanho}
                              preco={item.preco}
                            />
                          )
                        )
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── PAINEL 2: Configurações ──────────────────────────────────── */}
          <div className="w-64 shrink-0 flex flex-col overflow-hidden border-r border-zinc-200">
            <div className="px-4 py-2.5 border-b border-zinc-100 bg-zinc-50 flex items-center gap-2">
              <Settings2 size={13} className="text-zinc-500" />
              <span className="text-xs font-semibold text-zinc-700">Configurações</span>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-4">

              {/* Preset */}
              <div>
                <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide block mb-1.5">
                  Modelo de papel
                </label>
                <select
                  value={presetId}
                  onChange={(e) => aplicarPreset(e.target.value)}
                  className="w-full h-8 px-2 border border-zinc-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400 text-zinc-800"
                >
                  {PRESETS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome}
                    </option>
                  ))}
                </select>
              </div>

              {/* Folha */}
              <div>
                <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide block mb-2">
                  Folha
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <MmInput
                    label="Largura"
                    value={papel.largura}
                    onChange={(v) => atualizarPapel("largura", v)}
                    min={20}
                    max={500}
                  />
                  <MmInput
                    label="Altura"
                    value={papel.altura}
                    onChange={(v) => atualizarPapel("altura", v)}
                    min={20}
                    max={1200}
                  />
                  <MmInput
                    label="Marg. esq."
                    value={papel.margemEsquerda}
                    onChange={(v) => atualizarPapel("margemEsquerda", v)}
                  />
                  <MmInput
                    label="Marg. dir."
                    value={papel.margemDireita}
                    onChange={(v) => atualizarPapel("margemDireita", v)}
                  />
                  <MmInput
                    label="Marg. sup."
                    value={papel.margemSuperior}
                    onChange={(v) => atualizarPapel("margemSuperior", v)}
                  />
                  <MmInput
                    label="Marg. inf."
                    value={papel.margemInferior}
                    onChange={(v) => atualizarPapel("margemInferior", v)}
                  />
                </div>
              </div>

              {/* Etiqueta */}
              <div>
                <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide block mb-2">
                  Etiqueta
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <MmInput
                    label="Largura"
                    value={etiqueta.largura}
                    onChange={(v) => atualizarEtiqueta("largura", v)}
                    min={5}
                    max={250}
                  />
                  <MmInput
                    label="Altura"
                    value={etiqueta.altura}
                    onChange={(v) => atualizarEtiqueta("altura", v)}
                    min={5}
                    max={200}
                  />
                  <MmInput
                    label="Resp. H"
                    value={etiqueta.gapHorizontal}
                    onChange={(v) => atualizarEtiqueta("gapHorizontal", v)}
                  />
                  <MmInput
                    label="Resp. V"
                    value={etiqueta.gapVertical}
                    onChange={(v) => atualizarEtiqueta("gapVertical", v)}
                  />
                  <MmInput
                    label="Padding H"
                    value={etiqueta.paddingH}
                    onChange={(v) => atualizarEtiqueta("paddingH", v)}
                    max={50}
                  />
                  <MmInput
                    label="Padding V"
                    value={etiqueta.paddingV}
                    onChange={(v) => atualizarEtiqueta("paddingV", v)}
                    max={50}
                  />
                </div>
              </div>

              {/* Cálculo automático */}
              <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3">
                <p className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wide flex items-center gap-1 mb-2">
                  <LayoutGrid size={10} />
                  Cálculo automático
                </p>
                <div className="grid grid-cols-3 gap-1 text-center">
                  {[
                    { label: "Colunas", val: colunas },
                    { label: "Linhas", val: linhas },
                    { label: "Total", val: porPagina, accent: true },
                  ].map(({ label, val, accent }) => (
                    <div key={label} className="bg-white rounded py-1.5 px-1 border border-indigo-100">
                      <p className="text-[9px] text-zinc-500">{label}</p>
                      <p
                        className={`text-base font-bold leading-tight ${
                          accent ? "text-indigo-600" : "text-zinc-900"
                        }`}
                      >
                        {val}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── PAINEL 3: Preview & Posição ─────────────────────────────── */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="px-4 py-2.5 border-b border-zinc-100 bg-zinc-50">
              <span className="text-xs font-semibold text-zinc-700">
                Preview & Posição
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">

              {/* Resumo rápido */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Etiquetas", val: totalEtiquetas || "—" },
                  { label: "Folhas", val: folhasNecessarias || "—" },
                  { label: "Posição inicial", val: posicaoInicial },
                  { label: "Livres (1ª folha)", val: porPagina - (posicaoInicial - 1) },
                ].map(({ label, val }) => (
                  <div
                    key={label}
                    className="bg-zinc-50 border border-zinc-100 rounded-lg px-3 py-2"
                  >
                    <p className="text-[9px] text-zinc-500 uppercase tracking-wide">
                      {label}
                    </p>
                    <p className="text-lg font-bold text-zinc-900 leading-tight tabular-nums">
                      {val}
                    </p>
                  </div>
                ))}
              </div>

              {/* Visualização da folha */}
              <div>
                <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide mb-2">
                  Visualização da grade
                </p>
                <div className="flex justify-center items-start">
                  <FolhaPreview
                    papel={papel}
                    etiqueta={etiqueta}
                    colunas={colunas}
                    linhas={linhas}
                    posicaoInicial={posicaoInicial}
                    totalEtiquetas={totalEtiquetas}
                    previewWidth={210}
                  />
                </div>
                <div className="flex items-center gap-3 mt-1.5 justify-center">
                  {[
                    { color: "#f4f4f5", border: "#e4e4e7", label: "Ignorado" },
                    { color: "#eff6ff", border: "#93c5fd", label: "A imprimir" },
                    { color: "#fafafa", border: "#e4e4e7", label: "Vazio" },
                  ].map(({ color, border, label }) => (
                    <div key={label} className="flex items-center gap-1">
                      <div
                        style={{
                          width: 12, height: 8,
                          background: color,
                          border: `0.8px solid ${border}`,
                          borderRadius: 1,
                        }}
                      />
                      <span className="text-[9px] text-zinc-400">{label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Seletor de posição inicial */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide">
                    Posição inicial
                  </p>
                  <span className="text-[10px] text-zinc-400">
                    Para folhas parcialmente usadas
                  </span>
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <button
                    onClick={() => setPosicaoInicial((p) => Math.max(1, p - 1))}
                    className="w-7 h-7 flex items-center justify-center border border-zinc-300 rounded hover:bg-zinc-100 transition-colors"
                  >
                    <ChevronLeft size={13} />
                  </button>
                  <div className="flex-1 text-center">
                    <span className="text-2xl font-bold text-zinc-900 tabular-nums">
                      {posicaoInicial}
                    </span>
                    <span className="text-xs text-zinc-400"> / {porPagina}</span>
                  </div>
                  <button
                    onClick={() =>
                      setPosicaoInicial((p) => Math.min(porPagina, p + 1))
                    }
                    className="w-7 h-7 flex items-center justify-center border border-zinc-300 rounded hover:bg-zinc-100 transition-colors"
                  >
                    <ChevronRight size={13} />
                  </button>
                </div>

                <div className="border border-zinc-200 rounded-lg p-2 bg-white">
                  <p className="text-[9px] text-zinc-400 text-center mb-1.5">
                    Clique para selecionar
                  </p>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: `repeat(${colunas}, 1fr)`,
                      gap: "2px",
                    }}
                  >
                    {Array.from({ length: porPagina }, (_, i) => {
                      const pos = i + 1;
                      const isSelected = pos === posicaoInicial;
                      const isUsed = pos < posicaoInicial;
                      return (
                        <button
                          key={i}
                          title={`Posição ${pos}`}
                          onClick={() => setPosicaoInicial(pos)}
                          className={`h-[8px] rounded-[1.5px] transition-colors ${
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
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <div className="px-5 py-3 border-t border-zinc-200 flex justify-between items-center bg-zinc-50 shrink-0">
          <p className="text-xs text-zinc-500">
            {totalEtiquetas > 0
              ? `${totalEtiquetas} etiqueta${totalEtiquetas !== 1 ? "s" : ""} · ${folhasNecessarias} folha${folhasNecessarias !== 1 ? "s" : ""} · posição ${posicaoInicial} · ${porPagina} por folha`
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

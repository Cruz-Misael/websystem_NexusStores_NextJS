"use client";

import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

interface Props {
  nome: string;
  sku: string;
  codigo: string;
  preco?: number;
  logoUrl?: string;
  empresa?: string;
  tamanho?: string;
}

export default function EtiquetaProduto({
  nome,
  sku,
  codigo,
  preco,
  empresa = "Minha Empresa",
  logoUrl,
  tamanho,
}: Props) {
  const barcodeRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!codigo || !barcodeRef.current) return;
    try {
      JsBarcode(barcodeRef.current, codigo, {
        format: "CODE128",
        width: 1.4,
        height: 38,
        displayValue: false,
        margin: 0,
        background: "#ffffff",
        lineColor: "#000000",
      });
    } catch {
      // código inválido ainda em digitação
    }
  }, [codigo]);

  const nomeTruncado = nome.length > 28 ? nome.slice(0, 26) + "…" : nome;
  const precoFormatado =
    preco !== undefined
      ? preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
      : null;
  const nomeLoja = (empresa || "Minha Empresa").toUpperCase();

  return (
    /*
     * Dimensões: 50 mm × 55 mm — tag/pendão compacto para peças de roupa
     * Sem gradientes — compatível com impressão térmica e jato de tinta
     */
    <div
      style={{
        width: "50mm",
        height: "55mm",
        fontFamily: "Arial, Helvetica, sans-serif",
        background: "#ffffff",
        color: "#000000",
        display: "flex",
        flexDirection: "column",
        border: "0.5pt solid #000",
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      {/* ── LINHA 1: Cabeçalho — logo + nome da loja ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "3px",
          padding: "2mm 2mm 1.5mm",
          borderBottom: "0.5pt solid #bbb",
          background: "#111",
          minHeight: "7mm",
          maxHeight: "7mm",
        }}
      >
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt=""
            style={{ width: "16px", height: "16px", objectFit: "contain", flexShrink: 0, filter: "brightness(0) invert(1)" }}
          />
        ) : (
          <div
            style={{
              width: "16px",
              height: "16px",
              background: "#fff",
              borderRadius: "2px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: "7pt", color: "#111", fontWeight: "bold", lineHeight: 1 }}>N</span>
          </div>
        )}
        <span
          style={{
            fontSize: "7pt",
            fontWeight: "bold",
            letterSpacing: "0.8px",
            color: "#fff",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            maxWidth: "36mm",
          }}
        >
          {nomeLoja}
        </span>
      </div>

      {/* ── LINHA 2: Nome do produto ── */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1.5mm 3mm",
          borderBottom: "0.5pt solid #ddd",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: "9pt",
            fontWeight: "bold",
            textAlign: "center",
            lineHeight: 1.3,
            wordBreak: "break-word",
          }}
        >
          {nomeTruncado || "Nome do Produto"}
        </p>
      </div>

      {/* ── LINHA 3: Código de barras ── */}
      <div
        style={{
          padding: "1.5mm 2mm 0",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "13mm",
          maxHeight: "13mm",
        }}
      >
        {codigo ? (
          <svg ref={barcodeRef} style={{ width: "100%", height: "11mm" }} />
        ) : (
          <span style={{ fontSize: "6pt", color: "#aaa" }}>Sem código de barras</span>
        )}
      </div>

      {/* ── LINHA 4: Número do código ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          padding: "0 2mm 1.5mm",
          minHeight: "5mm",
          maxHeight: "5mm",
        }}
      >
        <span
          style={{
            fontSize: "5.5pt",
            fontFamily: "Courier New, monospace",
            color: "#444",
            letterSpacing: "0.8px",
          }}
        >
          {codigo || "—"}
        </span>
      </div>

      {/* ── LINHA 6: Tamanho + Preço ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: tamanho && precoFormatado ? "space-between" : "center",
          padding: "1.5mm 3mm 2mm",
          borderTop: "0.5pt solid #ddd",
          minHeight: "9mm",
          maxHeight: "9mm",
          background: "#f8f8f8",
        }}
      >
        {tamanho && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "5pt", color: "#888", letterSpacing: "0.5px", marginBottom: "0.5mm" }}>
              TAMANHO
            </div>
            <span
              style={{
                fontSize: "10pt",
                fontWeight: "bold",
                border: "0.8pt solid #000",
                padding: "0 2mm",
                borderRadius: "1mm",
                lineHeight: 1.4,
                display: "inline-block",
              }}
            >
              {tamanho.toUpperCase()}
            </span>
          </div>
        )}
        {precoFormatado && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "5pt", color: "#888", letterSpacing: "0.5px", marginBottom: "0.5mm" }}>
              PREÇO
            </div>
            <span
              style={{
                fontSize: "11pt",
                fontWeight: "bold",
                letterSpacing: "-0.3px",
                lineHeight: 1,
              }}
            >
              {precoFormatado}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

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
}

export default function EtiquetaProduto({
  nome,
  sku,
  codigo,
  preco,
  empresa = "Minha Empresa",
  logoUrl,
}: Props) {
  const barcodeRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!codigo || !barcodeRef.current) return;
    try {
      JsBarcode(barcodeRef.current, codigo, {
        format: "CODE128",
        width: 1.5,
        height: 32,
        displayValue: false,
        margin: 0,
        background: "#ffffff",
        lineColor: "#000000",
      });
    } catch {
      // código inválido ainda em digitação
    }
  }, [codigo]);

  const nomeTruncado =
    nome.length > 36 ? nome.slice(0, 34) + "…" : nome;

  const precoFormatado =
    preco !== undefined
      ? preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
      : null;

  const nomeLoja = (empresa || "Minha Empresa").toUpperCase();

  return (
    /*
     * Dimensões: 50 mm × 30 mm — padrão Zebra ZD220/ZD421
     * Sem gradientes, sem cores — impressão térmica direta (DTH)
     */
    <div
      style={{
        width: "50mm",
        height: "30mm",
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
      {/* ── LINHA 1: Cabeçalho — logo + nome da loja + SKU ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "1.2mm 2mm 1mm",
          borderBottom: "0.5pt solid #999",
          background: "#f0f0f0",
          minHeight: "7mm",
          maxHeight: "7mm",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "2px", overflow: "hidden" }}>
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt=""
              style={{
                width: "14px",
                height: "14px",
                objectFit: "contain",
                flexShrink: 0,
              }}
            />
          ) : (
            <div
              style={{
                width: "14px",
                height: "14px",
                background: "#222",
                borderRadius: "2px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <span style={{ fontSize: "7pt", color: "#fff", fontWeight: "bold", lineHeight: 1 }}>N</span>
            </div>
          )}
          <span
            style={{
              fontSize: "6.5pt",
              fontWeight: "bold",
              letterSpacing: "0.4px",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: "26mm",
            }}
          >
            {nomeLoja}
          </span>
        </div>

        <span
          style={{
            fontSize: "5pt",
            fontFamily: "Courier New, monospace",
            color: "#444",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          {sku}
        </span>
      </div>

      {/* ── LINHA 2: Nome do produto ── */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 2.5mm",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: "8pt",
            fontWeight: "bold",
            textAlign: "center",
            lineHeight: 1.25,
            wordBreak: "break-word",
          }}
        >
          {nomeTruncado || "Nome do Produto"}
        </p>
      </div>

      {/* ── LINHA 3: Código de barras (full-width) ── */}
      <div
        style={{
          padding: "0 2mm",
          borderTop: "0.5pt solid #ddd",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "9mm",
          maxHeight: "9mm",
        }}
      >
        {codigo ? (
          <svg ref={barcodeRef} style={{ width: "100%", height: "9mm" }} />
        ) : (
          <span style={{ fontSize: "6pt", color: "#aaa" }}>Sem código de barras</span>
        )}
      </div>

      {/* ── LINHA 4: Número do código + preço ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0.5mm 2.5mm 1mm",
          borderTop: "0.5pt solid #ddd",
          minHeight: "5mm",
          maxHeight: "5mm",
          background: "#f8f8f8",
        }}
      >
        <span
          style={{
            fontSize: "5.5pt",
            fontFamily: "Courier New, monospace",
            color: "#444",
            letterSpacing: "0.5px",
          }}
        >
          {codigo || "—"}
        </span>

        {precoFormatado && (
          <span
            style={{
              fontSize: "8pt",
              fontWeight: "bold",
              letterSpacing: "-0.2px",
            }}
          >
            {precoFormatado}
          </span>
        )}
      </div>
    </div>
  );
}

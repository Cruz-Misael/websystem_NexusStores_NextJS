"use client";

import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

interface Props {
  nome: string;
  codigoBarras: string;
  tamanho?: string;
  preco?: number;
  /** @deprecated não exibido no novo layout */
  sku?: string;
  vazia?: boolean;
}

function formatarPreco(preco?: number): string {
  if (!preco || preco <= 0) return "";
  return preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function EtiquetaColacril({
  nome,
  codigoBarras,
  tamanho,
  preco,
  vazia = false,
}: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!codigoBarras || !svgRef.current || vazia) return;
    try {
      JsBarcode(svgRef.current, codigoBarras, {
        format: "CODE128",
        width: 1.0,
        height: 16,
        displayValue: false,
        margin: 0,
        background: "transparent",
        lineColor: "#000000",
      });
    } catch {
      // código inválido
    }
  }, [codigoBarras, vazia]);

  if (vazia) {
    return (
      <div
        style={{
          width: "31mm",
          height: "17mm",
          boxSizing: "border-box",
          background: "white",
        }}
      />
    );
  }

  const precoStr = formatarPreco(preco);
  const maxNomeLen = 30;
  const nomeDisplay =
    nome.length > maxNomeLen ? nome.slice(0, maxNomeLen - 1) + "…" : nome;

  return (
    <div
      style={{
        width: "31mm",
        height: "17mm",
        boxSizing: "border-box",
        overflow: "hidden",
        fontFamily: "Arial, Helvetica, sans-serif",
        background: "white",
        display: "flex",
        flexDirection: "column",
        padding: "0.4mm 0.6mm",
        border: "0.3pt solid #ccc",
      }}
    >
      {/* ── Linha 1: Nome (largura total) ── */}
      <div
        style={{
          height: "3.8mm",
          overflow: "hidden",
          flexShrink: 0,
          lineHeight: 1.15,
        }}
      >
        <span
          style={{
            fontSize: "5.5pt",
            fontWeight: "bold",
            color: "#000",
            overflow: "hidden",
            whiteSpace: "nowrap",
            textOverflow: "ellipsis",
            display: "block",
          }}
        >
          {nomeDisplay || "—"}
        </span>
      </div>

      {/* ── Linha 2: Tamanho + Preço ── */}
      {(tamanho || precoStr) && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
            height: "2.8mm",
            lineHeight: 1,
            overflow: "hidden",
            marginTop: "0.1mm",
          }}
        >
          {tamanho && (
            <span
              style={{
                fontSize: "5.5pt",
                fontWeight: "bold",
                color: "#000",
              }}
            >
              TAM: {tamanho.toUpperCase()}
            </span>
          )}
          {precoStr && (
            <span
              style={{
                fontSize: "5.5pt",
                fontWeight: "bold",
                color: "#000",
                whiteSpace: "nowrap",
                marginLeft: "auto",
                marginRight: "1.5mm",
              }}
            >
              {precoStr}
            </span>
          )}
        </div>
      )}

      {/* ── Linha 3: Código de barras ── */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          minHeight: 0,
          marginTop: "0.2mm",
        }}
      >
        {codigoBarras ? (
          <svg
            ref={svgRef}
            style={{ width: "27mm", height: "100%", display: "block" }}
          />
        ) : (
          <span style={{ fontSize: "3pt", color: "#bbb" }}>
            Sem código de barras
          </span>
        )}
      </div>

      {/* ── Linha 4: Número do código ── */}
      {codigoBarras && (
        <div
          style={{
            fontSize: "5.5pt",
            fontWeight: "bold",
            textAlign: "center",
            fontFamily: "Courier New, monospace",
            letterSpacing: "0.3px",
            flexShrink: 0,
            lineHeight: 1,
            height: "2.8mm",
            overflow: "hidden",
            color: "#000",
            marginTop: "0.1mm",
          }}
        >
          {codigoBarras}
        </div>
      )}
    </div>
  );
}

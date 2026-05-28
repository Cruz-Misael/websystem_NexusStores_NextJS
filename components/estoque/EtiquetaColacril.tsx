"use client";

import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

interface Props {
  nome: string;
  sku: string;
  codigoBarras: string;
  tamanho?: string;
  vazia?: boolean;
}

export default function EtiquetaColacril({ nome, sku, codigoBarras, tamanho, vazia = false }: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!codigoBarras || !svgRef.current || vazia) return;
    try {
      JsBarcode(svgRef.current, codigoBarras, {
        format: "CODE128",
        width: 1.0,
        height: 25,
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

  const nomeDisplay = nome.length > 32 ? nome.slice(0, 30) + "…" : nome;

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
        padding: "0.4mm 0.5mm",
        border: "0.3pt solid #ccc",
      }}
    >
      <div
        style={{
          fontSize: "5.5pt",
          fontWeight: "bold",
          lineHeight: 1.2,
          overflow: "hidden",
          whiteSpace: "nowrap",
          textOverflow: "ellipsis",
          height: "3mm",
          color: "#000",
          flexShrink: 0,
        }}
      >
        {nomeDisplay || "—"}
      </div>

      <div
        style={{
          fontSize: "4pt",
          lineHeight: 1,
          height: "2.2mm",
          display: "flex",
          justifyContent: "space-between",
          overflow: "hidden",
          color: "#333",
          flexShrink: 0,
          marginTop: "0.2mm",
        }}
      >
        <span>{sku}</span>
        {tamanho && (
          <span style={{ fontWeight: "bold" }}>
            TAM: {tamanho.toUpperCase()}
          </span>
        )}
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          minHeight: 0,
        }}
      >
        {codigoBarras ? (
          <svg ref={svgRef} style={{ width: "29mm", height: "8mm" }} />
        ) : (
          <span style={{ fontSize: "3.5pt", color: "#aaa" }}>Sem código</span>
        )}
      </div>

      <div
        style={{
          fontSize: "3.5pt",
          textAlign: "center",
          fontFamily: "Courier New, monospace",
          letterSpacing: "0.2px",
          height: "2mm",
          overflow: "hidden",
          whiteSpace: "nowrap",
          color: "#444",
          flexShrink: 0,
        }}
      >
        {codigoBarras}
      </div>
    </div>
  );
}

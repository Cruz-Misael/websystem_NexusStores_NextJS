"use client";

import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

interface Props {
  codigo: string;
  height?: number;
  width?: number;
}

export default function BarcodeEtiqueta({
  codigo,
  height = 40,
  width = 1.6,
}: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!codigo || !svgRef.current) return;

    JsBarcode(svgRef.current, codigo, {
      format: "CODE128",
      width,
      height,
      displayValue: true,
      fontSize: 10,
      margin: 0,
    });
  }, [codigo, height, width]);

  return <svg ref={svgRef} />;
}

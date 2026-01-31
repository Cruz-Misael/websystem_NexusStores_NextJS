import BarcodeEtiqueta from "./BarcodeEtiqueta";
import Image from "next/image";

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
  logoUrl = "/logo.png",
}: Props) {
  return (
    <div
      style={{
        width: "50mm",
        height: "30mm",
        padding: "3mm",
        fontFamily: "Arial, Helvetica, sans-serif",
        border: "1px solid #000",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      {/* Cabeçalho */}
      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
        <Image src={logoUrl} alt="Logo" width={30} height={16} />
        <span style={{ fontSize: "6px", fontWeight: "bold" }}>
          {empresa}
        </span>
      </div>

      {/* Nome Produto */}
      <div>
        <p
          style={{
            fontSize: "7px",
            fontWeight: "bold",
            textAlign: "center",
            lineHeight: "1.1",
          }}
        >
          {nome || "Produto"}
        </p>
      </div>

      {/* Preço + SKU */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: "6px",
        }}
      >
        <span>SKU: {sku}</span>
        {preco !== undefined && (
          <span style={{ fontWeight: "bold" }}>
            R$ {preco.toFixed(2)}
          </span>
        )}
      </div>

      {/* Código de barras */}
      <div style={{ textAlign: "center" }}>
        <BarcodeEtiqueta codigo={codigo} height={28} />
      </div>
    </div>
  );
}

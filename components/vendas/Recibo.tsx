"use client";

import { useEffect, useState } from "react";
import { X, Printer } from "lucide-react";
import { CompanyService } from "@/services/company.service";
import { Sale, ConsignadoItemBreakdown } from "@/types/sales";
import { buscarPessoaPorId } from "@/src/services/people.service";

interface Props {
  venda: Sale;
  onClose: () => void;
  consignadoBreakdown?: ConsignadoItemBreakdown;
}

const paymentLabel: Record<string, string> = {
  credit_card: "Cartão de Crédito",
  debit: "Cartão de Débito",
  pix: "PIX",
  cash: "Dinheiro",
  consignado: "Consignado",
};

export default function Recibo({ venda, onClose, consignadoBreakdown }: Props) {
  const [empresa, setEmpresa] = useState<any>(null);
  const [clienteCompleto, setClienteCompleto] = useState<any>(null);

  useEffect(() => {
    CompanyService.getCompany().then(setEmpresa).catch(() => {});
  }, []);

  useEffect(() => {
    if (venda.customer_id) {
      buscarPessoaPorId(venda.customer_id).then(setClienteCompleto).catch(() => {});
    }
  }, [venda.customer_id]);

  const money = (val: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

  const formatarCPF = (cpf: string | number | null | undefined) => {
    if (!cpf) return null;
    const s = cpf.toString().replace(/\D/g, "").padStart(11, "0");
    return s.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  };

  const formatarCEP = (cep: string | number | null | undefined) => {
    if (!cep) return null;
    const s = cep.toString().replace(/\D/g, "").padStart(8, "0");
    return s.replace(/(\d{5})(\d{3})/, "$1-$2");
  };

  // Extrai a data prevista da observação
  const dataPrevistaRaw = venda.observation?.match(/Pagamento previsto: (\d{4}-\d{2}-\d{2})/)?.[1];
  const dataPrevistaFormatada = dataPrevistaRaw
    ? new Date(dataPrevistaRaw + "T12:00:00").toLocaleDateString("pt-BR")
    : null;

  // Remove o prefixo "Venda consignada - Pagamento previsto: YYYY-MM-DD" da observação
  const observacaoLimpa = venda.observation
    ?.replace(/^Venda consignada - Pagamento previsto: \d{4}-\d{2}-\d{2}( - )?/, "")
    .trim() || null;

  const isConsig =
    venda.consignado_net_before_commission !== null &&
    venda.consignado_net_before_commission !== undefined;
  const itens = venda.items?.filter((i) => i.quantity > 0) ?? [];
  const totalItens = itens.reduce((acc, i) => acc + i.quantity, 0);

  // Mapa nome → barcode para lookup no breakdown
  const barcodeMap = new Map<string, string>();
  itens.forEach((item) => {
    const nome = item.product?.name || item.product_name || "";
    if (nome && item.product_barcode) barcodeMap.set(nome, item.product_barcode);
  });

  // Endereço completo do cliente
  const enderecoCliente = clienteCompleto
    ? [
        [clienteCompleto.address_street, clienteCompleto.address_number]
          .filter(Boolean)
          .join(", "),
        clienteCompleto.address_complement,
        clienteCompleto.neighbourhood,
        [clienteCompleto.city, clienteCompleto.state].filter(Boolean).join(" - "),
        formatarCEP(clienteCompleto.cep),
      ]
        .filter(Boolean)
        .join(" | ")
    : null;

  // Endereço da loja
  const enderecoLoja = empresa
    ? [
        [empresa.address_street, empresa.address_number].filter(Boolean).join(", "),
        empresa.address_complement,
        empresa.neighbourhood,
        [empresa.city, empresa.state].filter(Boolean).join(" - "),
        empresa.cep ? formatarCEP(empresa.cep) : null,
      ]
        .filter(Boolean)
        .join(" | ")
    : null;

  /* ────────────────────────────────────────────────────────
     IMPRESSÃO / PDF
  ──────────────────────────────────────────────────────── */
  const imprimir = () => {
    const win = window.open("", "_blank", "width=880,height=1200");
    if (!win) return;

    const saldo = venda.consignado_net_before_commission ?? 0;
    const pct = venda.consignado_commission_percent ?? 0;

    const sec = (title: string) =>
      `<div style="font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:2px;
                   color:#9ca3af;margin:18px 0 8px">${title}</div>`;

    const kv = (label: string, value: string, bold = false) =>
      `<div style="display:flex;justify-content:space-between;align-items:baseline;
                   padding:4px 0;font-size:13px;color:#374151;border-bottom:1px solid #f3f4f6">
         <span style="color:#6b7280;font-size:12px">${label}</span>
         <span style="font-weight:${bold ? "800" : "600"};color:#111827">${value}</span>
       </div>`;

    /* Itens */
    const thS = `font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1px;
                 color:#6b7280;padding:7px 0;border-bottom:2px solid #e5e7eb;`;
    const tdS = `padding:8px 0 4px;font-size:13px;border-bottom:1px solid #f3f4f6;
                 vertical-align:top;break-inside:avoid;page-break-inside:avoid;`;

    let itensHtml: string;
    if (consignadoBreakdown) {
      itensHtml = `
        <table style="width:100%;border-collapse:collapse">
          <thead><tr>
            <th style="${thS}text-align:left">Produto / Cód. Barras</th>
            <th style="${thS}text-align:center;width:64px">Saiu</th>
            <th style="${thS}text-align:center;width:64px">Devolveu</th>
            <th style="${thS}text-align:center;width:64px;color:#059669">Ficou</th>
          </tr></thead>
          <tbody>
            ${consignadoBreakdown.itensOriginais
              .map((item) => {
                const dev =
                  consignadoBreakdown.itensDevolvidos.find((d) => d.nome === item.nome)
                    ?.quantidade ?? 0;
                const fica = item.quantidade - dev;
                const bc = barcodeMap.get(item.nome);
                return `<tr style="break-inside:avoid;page-break-inside:avoid">
                  <td style="${tdS}color:#111827;font-weight:700">
                    ${item.nome}
                    ${bc ? `<div style="font-size:10px;color:#9ca3af;font-weight:400;margin-top:1px">▪ ${bc}</div>` : ""}
                  </td>
                  <td style="${tdS}text-align:center;color:#374151;font-weight:600">${item.quantidade}</td>
                  <td style="${tdS}text-align:center;color:#374151">${dev > 0 ? dev : "—"}</td>
                  <td style="${tdS}text-align:center;color:#059669;font-weight:800">${fica > 0 ? fica : "—"}</td>
                </tr>`;
              })
              .join("")}
          </tbody>
        </table>`;
    } else {
      itensHtml = `
        <table style="width:100%;border-collapse:collapse">
          <thead><tr>
            <th style="${thS}text-align:left">Produto / Cód. Barras</th>
            <th style="${thS}text-align:center;width:40px">Qtd</th>
            <th style="${thS}text-align:right;width:100px">Unit.</th>
            <th style="${thS}text-align:right;width:110px">Total</th>
          </tr></thead>
          <tbody>
            ${itens
              .map(
                (item) => `<tr style="break-inside:avoid;page-break-inside:avoid">
              <td style="${tdS}color:#111827;font-weight:700">
                ${item.product?.name || item.product_name || "Produto"}
                ${item.product_barcode ? `<div style="font-size:10px;color:#9ca3af;font-weight:400;margin-top:1px">▪ ${item.product_barcode}</div>` : ""}
              </td>
              <td style="${tdS}text-align:center;color:#6b7280;font-weight:600">${item.quantity}</td>
              <td style="${tdS}text-align:right;color:#6b7280">${money(item.unit_price)}</td>
              <td style="${tdS}text-align:right;font-weight:800;color:#111827">${money(item.total_price)}</td>
            </tr>`
              )
              .join("")}
          </tbody>
        </table>`;
    }

    /* Totais */
    let totaisHtml: string;
    if (isConsig) {
      totaisHtml =
        kv("Saldo do consignado", money(saldo)) +
        (pct > 0 ? kv(`Comissão (${pct}%)`, `− ${money((saldo * pct) / 100)}`) : "") +
        `<div style="display:flex;justify-content:space-between;align-items:baseline;
                     padding:12px 0 4px;margin-top:8px;border-top:2px solid #111827;
                     font-size:24px;font-weight:900;color:#111827">
           <span>COBRADO</span><span>${money(venda.final_amount)}</span>
         </div>`;
    } else {
      totaisHtml =
        kv("Subtotal", money(venda.total_amount || 0)) +
        ((venda.discount_amount ?? 0) > 0
          ? kv("Desconto", `− ${money(venda.discount_amount)}`)
          : "") +
        `<div style="display:flex;justify-content:space-between;align-items:baseline;
                     padding:12px 0 4px;margin-top:8px;border-top:2px solid #111827;
                     font-size:24px;font-weight:900;color:#111827">
           <span>TOTAL</span><span>${money(venda.final_amount)}</span>
         </div>`;
    }

    win.document.open();
    win.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${isConsig ? "Consignado" : "Comprovante"} #${venda.id}</title>
  <style>
    @page { size: A4; margin: 15mm 18mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      background: #fff; color: #111827;
      -webkit-print-color-adjust: exact; print-color-adjust: exact;
      font-size: 13px; line-height: 1.45;
    }
    @media print {
      tr { break-inside: avoid; page-break-inside: avoid; }
      .no-break { break-inside: avoid; page-break-inside: avoid; }
      .footer { break-before: avoid; }
    }
  </style>
</head>
<body>

  <!-- CABEÇALHO -->
  <div style="display:flex;align-items:flex-start;justify-content:space-between;
              padding-bottom:14px;border-bottom:3px solid #111827;margin-bottom:18px">
    <div style="display:flex;align-items:center;gap:14px">
      ${
        empresa?.logo_url
          ? `<img src="${empresa.logo_url}" alt="" style="height:52px;object-fit:contain">`
          : `<div style="width:52px;height:52px;background:#111827;border-radius:10px;
                         display:flex;align-items:center;justify-content:center;
                         color:#fff;font-weight:900;font-size:18px">N</div>`
      }
      <div>
        <div style="font-size:24px;font-weight:900;letter-spacing:-0.5px;line-height:1">
          ${empresa?.fantasy_name || empresa?.name || "Minha Loja"}
        </div>
        ${empresa?.cnpj ? `<div style="font-size:11px;color:#6b7280;margin-top:3px;font-weight:600">CNPJ: ${empresa.cnpj}</div>` : ""}
        ${enderecoLoja ? `<div style="font-size:11px;color:#6b7280;margin-top:2px">${enderecoLoja}</div>` : ""}
      </div>
    </div>
    <div style="text-align:right;font-size:11px;color:#6b7280;line-height:1.8">
      ${empresa?.phone ? `<div style="font-weight:600">${empresa.phone}</div>` : ""}
      ${empresa?.email ? `<div>${empresa.email}</div>` : ""}
      ${empresa?.website ? `<div>${empresa.website}</div>` : ""}
    </div>
  </div>

  <!-- TÍTULO -->
  <div style="font-size:11px;font-weight:800;text-transform:uppercase;
              letter-spacing:2.5px;color:#9ca3af;margin-bottom:14px">
    ${consignadoBreakdown ? "Acerto de Consignado" : isConsig ? "Recibo de Venda Consignada" : "Comprovante de Venda"}
  </div>

  <!-- DATA PREVISTA (destaque para consignado) -->
  ${
    dataPrevistaFormatada && !consignadoBreakdown
      ? `<div class="no-break" style="margin-bottom:16px;padding:14px 18px;
              background:#fff7ed;border:2px solid #f97316;border-radius:10px;
              display:flex;align-items:center;justify-content:space-between">
           <div>
             <div style="font-size:9px;font-weight:800;text-transform:uppercase;
                         letter-spacing:2px;color:#ea580c;margin-bottom:4px">
               Data Prevista de Devolução / Pagamento
             </div>
             <div style="font-size:22px;font-weight:900;color:#c2410c">
               ${dataPrevistaFormatada}
             </div>
           </div>
         </div>`
      : ""
  }

  <!-- VENDA + CLIENTE (grid) -->
  <div class="no-break" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:18px">

    <!-- Dados da venda -->
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:14px 16px">
      <div style="font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:2px;
                  color:#9ca3af;margin-bottom:10px">Dados da Venda</div>
      ${kv("Nº", `#${venda.id}`)}
      ${kv("Data", new Date(venda.sale_date).toLocaleDateString("pt-BR"))}
      ${kv("Pagamento", paymentLabel[venda.payment_method ?? ""] || venda.payment_method?.toUpperCase() || "—")}
    </div>

    <!-- Dados do cliente -->
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:14px 16px">
      <div style="font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:2px;
                  color:#9ca3af;margin-bottom:10px">Dados do Cliente</div>
      ${kv("Nome", venda.customer?.name || "Consumidor Final")}
      ${clienteCompleto?.identity_number ? kv("CPF", formatarCPF(clienteCompleto.identity_number) || "—") : ""}
      ${clienteCompleto?.phone || venda.customer?.phone ? kv("Telefone", clienteCompleto?.phone || venda.customer?.phone || "—") : ""}
      ${enderecoCliente ? `<div style="padding:4px 0;font-size:12px;color:#374151;border-bottom:1px solid #f3f4f6">
        <span style="color:#6b7280;font-size:11px">Endereço</span><br>
        <span style="font-weight:600;color:#111827">${enderecoCliente}</span>
      </div>` : ""}
    </div>
  </div>

  <!-- ITENS -->
  <div style="font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:2px;
              color:#9ca3af;margin-bottom:8px">
    ${consignadoBreakdown ? "Itens do Consignado" : "Itens"} — ${totalItens} ${totalItens === 1 ? "unidade" : "unidades"}
  </div>
  ${itensHtml}

  <!-- TOTAIS -->
  <div style="margin-top:16px;padding-top:10px;border-top:2px solid #111827">
    ${totaisHtml}
  </div>

  <!-- TOTAL DE ITENS -->
  <div style="margin-top:6px;text-align:right;font-size:11px;color:#6b7280;font-weight:600">
    Total de itens: ${totalItens} ${totalItens === 1 ? "unidade" : "unidades"}
  </div>

  <!-- OBSERVAÇÃO (somente na venda inicial, não no acerto) -->
  ${
    !consignadoBreakdown && observacaoLimpa
      ? `<div class="no-break" style="margin-top:18px;padding:14px 16px;
              background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px">
           <div style="font-size:9px;font-weight:800;text-transform:uppercase;
                       letter-spacing:1.5px;color:#9ca3af;margin-bottom:8px">Observações / Termos</div>
           <div style="font-size:12px;color:#374151;line-height:1.65;white-space:pre-wrap">${observacaoLimpa}</div>
         </div>`
      : ""
  }

  <!-- RODAPÉ -->
  <div class="footer no-break" style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;
              display:flex;align-items:center;justify-content:space-between;font-size:10px;color:#9ca3af">
    <div>
      <div style="display:inline-block;background:#f3f4f6;padding:3px 12px;border-radius:4px;
                  font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;
                  color:#6b7280;margin-bottom:4px">Não é documento fiscal</div>
      <div>Obrigado pela preferência! ${empresa?.website ? "· " + empresa.website : ""}</div>
    </div>
    ${
      isConsig && !consignadoBreakdown
        ? `<div style="text-align:right">
             <div style="font-size:10px;color:#6b7280;margin-bottom:20px">Assinatura do Cliente</div>
             <div style="border-top:1px solid #9ca3af;width:180px;padding-top:4px;
                         font-size:10px;color:#9ca3af;text-align:center">
               ${venda.customer?.name || "Cliente"}
             </div>
           </div>`
        : ""
    }
  </div>

</body>
<script>window.onload=function(){window.print();setTimeout(()=>window.close(),1200);}</script>
</html>`);
    win.document.close();
  };

  /* ────────────────────────────────────────────────────────
     PREVIEW NO MODAL
  ──────────────────────────────────────────────────────── */
  const isConsignado = isConsig;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-sm rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">

        {/* Toolbar */}
        <div className={`px-4 py-3 flex justify-between items-center shrink-0 ${isConsignado ? "bg-violet-900" : "bg-zinc-900"}`}>
          <span className="text-white font-bold text-sm">
            {consignadoBreakdown ? "Acerto de Consignado" : isConsignado ? "Consignado" : "Recibo"} #{venda.id}
          </span>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Preview scrollável */}
        <div className="overflow-y-auto flex-1 bg-white">
          <div className="p-5 font-mono text-xs text-zinc-800 leading-snug space-y-3">

            {/* Logo + Empresa */}
            <div className="text-center pb-3 border-b-2 border-dashed border-zinc-300">
              {empresa?.logo_url && (
                <img src={empresa.logo_url} alt="logo" className="h-10 mx-auto mb-2 object-contain" />
              )}
              <p className="font-black text-sm uppercase tracking-widest">
                {empresa?.fantasy_name || empresa?.name || "Minha Loja"}
              </p>
              {empresa?.cnpj && <p className="text-[10px] text-zinc-500 font-bold">CNPJ: {empresa.cnpj}</p>}
              {enderecoLoja && <p className="text-[10px] text-zinc-400">{enderecoLoja}</p>}
              {empresa?.phone && <p className="text-[10px] text-zinc-500">{empresa.phone}</p>}
            </div>

            {/* Título */}
            <p className="text-center text-[9px] font-black uppercase tracking-widest text-zinc-400">
              {consignadoBreakdown ? "Acerto de Consignado" : isConsignado ? "Venda Consignada" : "Comprovante de Venda"}
            </p>

            {/* Data prevista — destaque */}
            {dataPrevistaFormatada && !consignadoBreakdown && (
              <div className="bg-orange-50 border-2 border-orange-400 rounded-lg p-3 text-center">
                <p className="text-[9px] font-black uppercase tracking-widest text-orange-500">
                  Devolução / Pagamento Previsto
                </p>
                <p className="text-xl font-black text-orange-700 mt-1">{dataPrevistaFormatada}</p>
              </div>
            )}

            {/* Dados da venda */}
            <div className="pb-2 border-b border-dashed border-zinc-200 space-y-0.5">
              <div className="flex justify-between">
                <span className="text-zinc-400 font-semibold">Venda</span>
                <span className="font-black">#{venda.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400 font-semibold">Data</span>
                <span className="font-bold">{new Date(venda.sale_date).toLocaleDateString("pt-BR")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400 font-semibold">Pagamento</span>
                <span className="font-bold">{paymentLabel[venda.payment_method ?? ""] || venda.payment_method?.toUpperCase() || "—"}</span>
              </div>
            </div>

            {/* Dados do cliente */}
            {(venda.customer || clienteCompleto) && (
              <div className="pb-2 border-b border-dashed border-zinc-200 space-y-0.5">
                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1">Cliente</p>
                <div className="flex justify-between">
                  <span className="text-zinc-400 font-semibold">Nome</span>
                  <span className="font-bold truncate max-w-[170px]">{venda.customer?.name || "—"}</span>
                </div>
                {clienteCompleto?.identity_number && (
                  <div className="flex justify-between">
                    <span className="text-zinc-400 font-semibold">CPF</span>
                    <span className="font-bold">{formatarCPF(clienteCompleto.identity_number)}</span>
                  </div>
                )}
                {(clienteCompleto?.phone || venda.customer?.phone) && (
                  <div className="flex justify-between">
                    <span className="text-zinc-400 font-semibold">Telefone</span>
                    <span className="font-bold">{clienteCompleto?.phone || venda.customer?.phone}</span>
                  </div>
                )}
                {enderecoCliente && (
                  <div className="mt-1">
                    <span className="text-zinc-400 font-semibold">Endereço</span>
                    <p className="font-bold text-[10px] mt-0.5 leading-snug">{enderecoCliente}</p>
                  </div>
                )}
              </div>
            )}

            {/* Itens */}
            <div className="pb-2 border-b border-dashed border-zinc-200">
              <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-2">
                {consignadoBreakdown ? "Itens" : "Itens"} — {totalItens} un.
              </p>

              {consignadoBreakdown ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-[9px] font-black uppercase text-zinc-400 mb-1">Saiu da loja</p>
                    {consignadoBreakdown.itensOriginais.map((item, i) => {
                      const bc = barcodeMap.get(item.nome);
                      return (
                        <div key={i} className="mb-1">
                          <div className="flex justify-between">
                            <span className="font-bold truncate max-w-[170px]">{item.nome}</span>
                            <span className="text-zinc-500 shrink-0 ml-1">× {item.quantidade}</span>
                          </div>
                          {bc && <p className="text-[9px] text-zinc-400">▪ {bc}</p>}
                        </div>
                      );
                    })}
                  </div>
                  {consignadoBreakdown.itensDevolvidos.length > 0 && (
                    <div>
                      <p className="text-[9px] font-black uppercase text-zinc-400 mb-1">↩ Devolvidas</p>
                      {consignadoBreakdown.itensDevolvidos.map((item, i) => (
                        <div key={i} className="flex justify-between text-zinc-400 line-through text-[10px]">
                          <span className="truncate max-w-[170px]">{item.nome}</span>
                          <span className="shrink-0 ml-1">× {item.quantidade}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {consignadoBreakdown.itensFicaram.length > 0 && (
                    <div>
                      <p className="text-[9px] font-black uppercase text-zinc-400 mb-1">✓ Ficou com o cliente</p>
                      {consignadoBreakdown.itensFicaram.map((item, i) => (
                        <div key={i} className="flex justify-between font-black text-zinc-900">
                          <span className="truncate max-w-[170px]">{item.nome}</span>
                          <span className="shrink-0 ml-1">× {item.quantidade}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {itens.map((item) => (
                    <div key={item.id}>
                      <p className="font-black leading-tight">
                        {item.product?.name || item.product_name || "Produto"}
                      </p>
                      {item.product_barcode && (
                        <p className="text-[9px] text-zinc-400">▪ {item.product_barcode}</p>
                      )}
                      <div className="flex justify-between text-zinc-500 text-[11px] mt-0.5">
                        <span>{money(item.unit_price)} × {item.quantity}</span>
                        <span className="font-black text-zinc-800">{money(item.total_price)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Totais */}
            <div className="pb-2 border-b border-dashed border-zinc-200 space-y-0.5">
              <div className="flex justify-between text-[11px] text-zinc-500">
                <span className="font-semibold">Total de itens</span>
                <span className="font-bold">{totalItens} un.</span>
              </div>

              {isConsignado ? (
                <>
                  <div className="flex justify-between text-zinc-500">
                    <span className="font-semibold">Saldo consignado</span>
                    <span className="font-bold">{money(venda.consignado_net_before_commission!)}</span>
                  </div>
                  {(venda.consignado_commission_percent ?? 0) > 0 && (
                    <div className="flex justify-between text-zinc-500">
                      <span className="font-semibold">Comissão ({venda.consignado_commission_percent}%)</span>
                      <span className="font-bold">− {money(venda.consignado_net_before_commission! * ((venda.consignado_commission_percent ?? 0) / 100))}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-black text-base mt-1 pt-1 border-t border-zinc-300">
                    <span>COBRADO</span>
                    <span>{money(venda.final_amount)}</span>
                  </div>
                </>
              ) : (
                <>
                  {(venda.discount_amount ?? 0) > 0 && (
                    <div className="flex justify-between text-emerald-600 font-semibold">
                      <span>Desconto</span>
                      <span>− {money(venda.discount_amount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-black text-base mt-1 pt-1 border-t border-zinc-300">
                    <span>TOTAL</span>
                    <span>{money(venda.final_amount)}</span>
                  </div>
                </>
              )}
            </div>

            {/* Observação (somente na venda inicial, não no acerto) */}
            {!consignadoBreakdown && observacaoLimpa && (
              <div className="pb-2 border-b border-dashed border-zinc-200">
                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1">Observações / Termos</p>
                <p className="text-[10px] text-zinc-600 leading-relaxed whitespace-pre-wrap">{observacaoLimpa}</p>
              </div>
            )}

            {/* Rodapé */}
            <div className="text-center text-[10px] text-zinc-400 space-y-0.5 pt-1">
              <p className="font-black text-[9px] uppercase tracking-widest">*** Não é documento fiscal ***</p>
              <p>Obrigado pela preferência!</p>
              {empresa?.website && <p>{empresa.website}</p>}
              {isConsignado && !consignadoBreakdown && (
                <div className="mt-3 pt-3 border-t border-dashed border-zinc-300">
                  <p className="text-[9px] text-zinc-400 mb-4">Assinatura do Cliente</p>
                  <div className="border-t border-zinc-400 w-40 mx-auto pt-1">
                    <p className="text-[9px] text-zinc-400">{venda.customer?.name || "Cliente"}</p>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Actions */}
        <div className="px-4 pb-4 pt-3 flex gap-2 border-t border-zinc-100 shrink-0">
          <button
            onClick={imprimir}
            className="flex-1 flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white py-2.5 rounded-lg text-sm font-bold transition-colors"
          >
            <Printer size={16} />
            Imprimir / PDF
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-lg text-sm font-bold transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

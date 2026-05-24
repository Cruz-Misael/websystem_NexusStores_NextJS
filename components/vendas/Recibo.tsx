"use client";

import { useEffect, useState } from "react";
import { X, Printer } from "lucide-react";
import { CompanyService } from "@/services/company.service";
import { Sale, ConsignadoItemBreakdown } from "@/types/sales";

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

  useEffect(() => {
    CompanyService.getCompany().then(setEmpresa).catch(() => {});
  }, []);

  const money = (val: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

  const imprimir = () => {
    const win = window.open("", "_blank", "width=850,height=1100");
    if (!win) return;

    const isConsig = venda.consignado_net_before_commission !== null &&
                     venda.consignado_net_before_commission !== undefined;
    const saldo    = venda.consignado_net_before_commission ?? 0;
    const pct      = venda.consignado_commission_percent ?? 0;
    const itens    = venda.items?.filter((i) => i.quantity > 0) ?? [];

    /* ── helpers de geração de HTML ── */
    const row = (label: string, value: string, color = "#4b5563") =>
      `<div style="display:flex;justify-content:space-between;align-items:baseline;padding:5px 0;font-size:13px;color:${color}">
         <span>${label}</span><span style="font-weight:600">${value}</span>
       </div>`;

    const infoCell = (label: string, value: string) =>
      `<div>
         <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:#9ca3af;margin-bottom:3px">${label}</div>
         <div style="font-size:13px;font-weight:500;color:#111827">${value}</div>
       </div>`;

    /* ── bloco de itens ── */
    const thStyle = `font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;
                     color:#6b7280;padding:8px 0;border-bottom:1.5px solid #e5e7eb;`;
    const tdStyle = `padding:10px 0;font-size:13px;border-bottom:1px solid #f3f4f6;vertical-align:top;`;

    let itensHtml: string;
    if (consignadoBreakdown) {
      itensHtml = `
        <table style="width:100%;border-collapse:collapse">
          <thead><tr>
            <th style="${thStyle}text-align:left">Produto</th>
            <th style="${thStyle}text-align:center;width:72px">Saiu</th>
            <th style="${thStyle}text-align:center;width:72px">Devolveu</th>
            <th style="${thStyle}text-align:center;width:72px;color:#059669">Ficou</th>
          </tr></thead>
          <tbody>
            ${consignadoBreakdown.itensOriginais.map((item) => {
              const dev  = consignadoBreakdown.itensDevolvidos.find(d => d.nome === item.nome)?.quantidade ?? 0;
              const fica = item.quantidade - dev;
              return `<tr>
                <td style="${tdStyle}color:#111827;font-weight:500">${item.nome}</td>
                <td style="${tdStyle}text-align:center;color:#4b5563">${item.quantidade}</td>
                <td style="${tdStyle}text-align:center;color:#4b5563">${dev > 0 ? dev : "—"}</td>
                <td style="${tdStyle}text-align:center;color:#059669;font-weight:700">${fica > 0 ? fica : "—"}</td>
              </tr>`;
            }).join("")}
          </tbody>
        </table>`;
    } else {
      itensHtml = `
        <table style="width:100%;border-collapse:collapse">
          <thead><tr>
            <th style="${thStyle}text-align:left">Produto</th>
            <th style="${thStyle}text-align:right;width:40px">Qtd</th>
            <th style="${thStyle}text-align:right;width:100px">Unit.</th>
            <th style="${thStyle}text-align:right;width:110px">Total</th>
          </tr></thead>
          <tbody>
            ${itens.map(item => `<tr>
              <td style="${tdStyle}color:#111827;font-weight:500">
                ${item.product?.name || item.product_name || "Produto"}
              </td>
              <td style="${tdStyle}text-align:right;color:#6b7280">${item.quantity}</td>
              <td style="${tdStyle}text-align:right;color:#6b7280">${money(item.unit_price)}</td>
              <td style="${tdStyle}text-align:right;font-weight:700;color:#111827">${money(item.total_price)}</td>
            </tr>`).join("")}
          </tbody>
        </table>`;
    }

    /* ── bloco de totais ── */
    let totaisHtml: string;
    if (isConsig) {
      totaisHtml =
        row("Saldo do consignado", money(saldo)) +
        (pct > 0 ? row(`Desconto de lucro (${pct}%)`, `− ${money(saldo * pct / 100)}`, "#059669") : "") +
        `<div style="display:flex;justify-content:space-between;align-items:baseline;
                     padding:14px 0 6px;margin-top:6px;border-top:1px solid #e5e7eb;
                     font-size:22px;font-weight:800;color:#111827">
           <span>COBRADO</span><span>${money(venda.final_amount)}</span>
         </div>`;
    } else {
      totaisHtml =
        row("Subtotal", money(venda.total_amount || 0)) +
        ((venda.discount_amount ?? 0) > 0
          ? row("Desconto", `− ${money(venda.discount_amount)}`, "#059669")
          : "") +
        `<div style="display:flex;justify-content:space-between;align-items:baseline;
                     padding:14px 0 6px;margin-top:6px;border-top:1px solid #e5e7eb;
                     font-size:22px;font-weight:800;color:#111827">
           <span>TOTAL</span><span>${money(venda.final_amount)}</span>
         </div>`;
    }

    win.document.open();
    win.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Comprovante #${venda.id}</title>
  <style>
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
      background: #fff;
      color: #111827;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
  </style>
</head>
<body>
<div style="width:210mm;min-height:297mm;padding:18mm 22mm;position:relative">

  <!-- Cabeçalho -->
  <div style="display:flex;align-items:center;justify-content:space-between;
              padding-bottom:18px;border-bottom:2px solid #111827;margin-bottom:24px">
    <div style="display:flex;align-items:center;gap:14px">
      ${empresa?.logo_url
        ? `<img src="${empresa.logo_url}" alt="" style="height:44px;object-fit:contain">`
        : `<div style="width:44px;height:44px;background:#111827;border-radius:8px;
                       display:flex;align-items:center;justify-content:center;
                       color:#fff;font-weight:900;font-size:14px">N</div>`}
      <div>
        <div style="font-size:22px;font-weight:800;letter-spacing:-0.5px;line-height:1">
          ${empresa?.fantasy_name || empresa?.name || "Minha Loja"}
        </div>
        ${empresa?.cnpj ? `<div style="font-size:11px;color:#6b7280;margin-top:3px">CNPJ: ${empresa.cnpj}</div>` : ""}
      </div>
    </div>
    <div style="text-align:right;font-size:11px;color:#6b7280;line-height:1.9">
      ${empresa?.phone  ? `<div>${empresa.phone}</div>`   : ""}
      ${empresa?.email  ? `<div>${empresa.email}</div>`   : ""}
      ${empresa?.website? `<div>${empresa.website}</div>` : ""}
    </div>
  </div>

  <!-- Tipo do documento -->
  <div style="font-size:10px;font-weight:700;text-transform:uppercase;
              letter-spacing:2px;color:#9ca3af;margin-bottom:16px">
    ${isConsig ? "Acerto de Consignado" : "Comprovante de Venda"}
  </div>

  <!-- Grid de informações -->
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:16px;
              background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;
              padding:16px 20px;margin-bottom:28px">
    ${infoCell("Nº da venda", `#${venda.id}`)}
    ${infoCell("Data", new Date(venda.sale_date).toLocaleString("pt-BR"))}
    ${infoCell("Cliente", venda.customer?.name || "Consumidor Final")}
    ${infoCell("Pagamento", paymentLabel[venda.payment_method ?? ""] || venda.payment_method?.toUpperCase() || "—")}
  </div>

  <!-- Itens -->
  <div style="margin-bottom:4px">
    <div style="font-size:10px;font-weight:700;text-transform:uppercase;
                letter-spacing:1.5px;color:#9ca3af;margin-bottom:10px">Itens</div>
    ${itensHtml}
  </div>

  <!-- Totais -->
  <div style="margin-top:16px;border-top:2px solid #111827;padding-top:12px">
    ${totaisHtml}
  </div>

  <!-- Rodapé -->
  <div style="margin-top:48px;padding-top:20px;border-top:1px solid #e5e7eb;
              text-align:center;font-size:11px;color:#9ca3af;line-height:2">
    <div style="display:inline-block;background:#f3f4f6;padding:3px 14px;border-radius:4px;
                font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;
                color:#6b7280;margin-bottom:6px">
      Não é documento fiscal
    </div>
    <div>Obrigado pela preferência!</div>
    ${empresa?.website ? `<div style="margin-top:2px">${empresa.website}</div>` : ""}
  </div>

</div>
<script>window.onload=function(){window.print();setTimeout(()=>window.close(),1200);}</script>
</body>
</html>`);
    win.document.close();
  };

  const itens = venda.items?.filter((i) => i.quantity > 0) ?? [];
  const isConsignado = venda.consignado_net_before_commission !== null && venda.consignado_net_before_commission !== undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-xs rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* Toolbar */}
        <div className={`px-4 py-3 flex justify-between items-center shrink-0 ${isConsignado ? 'bg-violet-900' : 'bg-zinc-900'}`}>
          <span className="text-white font-bold text-sm">
            {isConsignado ? 'Acerto de Consignado' : 'Recibo'} #{venda.id}
          </span>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Scrollable preview */}
        <div className="overflow-y-auto flex-1">
          {/* This div is both the preview and the print source */}
          <div
            id="recibo-print-content"
            className="p-5 font-mono text-[11px] text-zinc-800 bg-white leading-relaxed"
          >
            {/* Cabeçalho empresa */}
            <div className="center text-center mb-3 pb-3 border-b border-dashed border-zinc-300">
              {empresa?.logo_url && (
                <img
                  src={empresa.logo_url}
                  alt="logo"
                  className="h-10 mx-auto mb-2 object-contain"
                />
              )}
              <p className="bold font-bold text-sm uppercase tracking-widest">
                {empresa?.fantasy_name || empresa?.name || "Minha Loja"}
              </p>
              {empresa?.cnpj && (
                <p className="small text-[10px] text-zinc-500">CNPJ: {empresa.cnpj}</p>
              )}
              {empresa?.phone && (
                <p className="small text-[10px] text-zinc-500">{empresa.phone}</p>
              )}
              {empresa?.email && (
                <p className="small text-[10px] text-zinc-500">{empresa.email}</p>
              )}
            </div>

            {/* Label consignado */}
            {isConsignado && (
              <div className="text-center mb-3">
                <span className="text-[9px] font-black uppercase tracking-widest bg-violet-100 text-violet-700 px-3 py-0.5 rounded-full">
                  Acerto de Consignado
                </span>
              </div>
            )}

            {/* Dados da venda */}
            <div className="mb-3 pb-3 border-b border-dashed border-zinc-300 space-y-0.5">
              <div className="row flex justify-between">
                <span className="text-zinc-500">Venda</span>
                <span className="font-bold">#{venda.id}</span>
              </div>
              <div className="row flex justify-between">
                <span className="text-zinc-500">Data</span>
                <span>{new Date(venda.sale_date).toLocaleString("pt-BR")}</span>
              </div>
              <div className="row flex justify-between">
                <span className="text-zinc-500">Cliente</span>
                <span className="text-right max-w-[160px] truncate">
                  {venda.customer?.name || "Consumidor Final"}
                </span>
              </div>
              <div className="row flex justify-between">
                <span className="text-zinc-500">Pagamento</span>
                <span>
                  {paymentLabel[venda.payment_method ?? ""] ||
                    venda.payment_method?.toUpperCase() ||
                    "—"}
                </span>
              </div>
            </div>

            {/* Itens */}
            {consignadoBreakdown ? (
              <div className="mb-3 pb-3 border-b border-dashed border-zinc-300 space-y-3">
                {/* Saiu da loja */}
                <div>
                  <div className="text-[9px] uppercase font-bold text-zinc-400 mb-1">Saiu da loja</div>
                  {consignadoBreakdown.itensOriginais.map((item, i) => (
                    <div key={i} className="flex justify-between text-xs">
                      <span className="font-medium truncate max-w-[160px]">{item.nome}</span>
                      <span className="text-zinc-500 shrink-0 ml-1">× {item.quantidade}</span>
                    </div>
                  ))}
                </div>

                {/* Devolvidas */}
                {consignadoBreakdown.itensDevolvidos.length > 0 && (
                  <div>
                    <div className="text-[9px] uppercase font-bold text-amber-500 mb-1">↩ Devolvidas</div>
                    {consignadoBreakdown.itensDevolvidos.map((item, i) => (
                      <div key={i} className="flex justify-between text-xs text-amber-700">
                        <span className="truncate max-w-[160px]">{item.nome}</span>
                        <span className="shrink-0 ml-1">× {item.quantidade}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Ficou com o cliente */}
                {consignadoBreakdown.itensFicaram.length > 0 && (
                  <div>
                    <div className="text-[9px] uppercase font-bold text-emerald-600 mb-1">✓ Ficou com o cliente</div>
                    {consignadoBreakdown.itensFicaram.map((item, i) => (
                      <div key={i} className="flex justify-between text-xs text-emerald-700 font-medium">
                        <span className="truncate max-w-[160px]">{item.nome}</span>
                        <span className="shrink-0 ml-1">× {item.quantidade}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="mb-3 pb-3 border-b border-dashed border-zinc-300">
                <div className="flex justify-between text-[9px] uppercase font-bold text-zinc-400 mb-2">
                  <span>Item</span>
                  <span>Total</span>
                </div>
                {itens.map((item) => (
                  <div key={item.id} className="mb-2">
                    <p className="item-name font-bold leading-none truncate">
                      {item.product?.name || item.product_name || "Produto"}
                    </p>
                    <div className="item-sub flex justify-between text-zinc-500 mt-0.5">
                      <span>
                        {money(item.unit_price)} × {item.quantity}
                      </span>
                      <span className="font-bold text-zinc-700">{money(item.total_price)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Totais */}
            <div className="mb-4 pb-3 border-b border-dashed border-zinc-300 space-y-1">
              {isConsignado ? (
                <>
                  <div className="row flex justify-between text-zinc-500">
                    <span>Saldo do consignado</span>
                    <span>{money(venda.consignado_net_before_commission!)}</span>
                  </div>
                  {(venda.consignado_commission_percent ?? 0) > 0 && (
                    <div className="row flex justify-between text-emerald-600">
                      <span>Desconto ({venda.consignado_commission_percent}%)</span>
                      <span>- {money(venda.consignado_net_before_commission! * ((venda.consignado_commission_percent ?? 0) / 100))}</span>
                    </div>
                  )}
                  <div className="total-row flex justify-between font-bold text-sm mt-1">
                    <span>COBRADO</span>
                    <span>{money(venda.final_amount)}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="row flex justify-between text-zinc-500">
                    <span>Subtotal</span>
                    <span>{money(venda.total_amount || 0)}</span>
                  </div>
                  {(venda.discount_amount ?? 0) > 0 && (
                    <div className="row flex justify-between text-emerald-600">
                      <span>Desconto</span>
                      <span>- {money(venda.discount_amount)}</span>
                    </div>
                  )}
                  <div className="total-row flex justify-between font-bold text-sm mt-1">
                    <span>TOTAL</span>
                    <span>{money(venda.final_amount)}</span>
                  </div>
                </>
              )}
            </div>

            {/* Rodapé */}
            <div className="text-center text-[10px] text-zinc-400 space-y-0.5">
              <p>*** NÃO É DOCUMENTO FISCAL ***</p>
              <p>Obrigado pela preferência!</p>
              {empresa?.website && <p>{empresa.website}</p>}
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

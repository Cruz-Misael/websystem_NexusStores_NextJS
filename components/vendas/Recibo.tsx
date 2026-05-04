"use client";

import { useEffect, useState } from "react";
import { X, Printer } from "lucide-react";
import { CompanyService } from "@/services/company.service";
import { Sale } from "@/types/sales";

interface Props {
  venda: Sale;
  onClose: () => void;
}

const paymentLabel: Record<string, string> = {
  credit_card: "Cartão de Crédito",
  debit: "Cartão de Débito",
  pix: "PIX",
  cash: "Dinheiro",
};

export default function Recibo({ venda, onClose }: Props) {
  const [empresa, setEmpresa] = useState<any>(null);

  useEffect(() => {
    CompanyService.getCompany().then(setEmpresa).catch(() => {});
  }, []);

  const money = (val: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

  const imprimir = () => {
    const conteudo = document.getElementById("recibo-print-content");
    if (!conteudo) return;

    const win = window.open("", "_blank", "width=420,height=700");
    if (!win) return;

    win.document.open();
    win.document.write(`
      <html>
        <head>
          <title>Recibo #${venda.id}</title>
          <style>
            @page { margin: 0; size: 80mm auto; }
            body {
              font-family: 'Courier New', monospace;
              font-size: 11px;
              margin: 0;
              padding: 16px;
              background: white;
              color: #18181b;
            }
            * { box-sizing: border-box; }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .small { font-size: 9px; color: #71717a; }
            .divider { border-top: 1px dashed #d4d4d8; margin: 8px 0; }
            .row { display: flex; justify-content: space-between; margin-bottom: 2px; }
            .item-name { font-weight: bold; }
            .item-sub { color: #71717a; display: flex; justify-content: space-between; }
            .total-row { display: flex; justify-content: space-between; font-weight: bold; font-size: 13px; margin-top: 4px; }
          </style>
        </head>
        <body>
          ${conteudo.innerHTML}
          <script>
            window.onload = function() { window.print(); setTimeout(() => window.close(), 1200); };
          </script>
        </body>
      </html>
    `);
    win.document.close();
  };

  const itens = venda.items?.filter((i) => i.quantity > 0) ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-xs rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* Toolbar */}
        <div className="px-4 py-3 bg-zinc-900 flex justify-between items-center shrink-0">
          <span className="text-white font-bold text-sm">Recibo #{venda.id}</span>
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

            {/* Totais */}
            <div className="mb-4 pb-3 border-b border-dashed border-zinc-300 space-y-1">
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

// components/vendas/LinhaPecaConsignado.tsx
// Uma peça no histórico do consignado (saiu / devolveu / ficou).
// O nome sozinho não identifica a peça quando a loja tem a mesma modelagem em
// vários tamanhos — três linhas "PIJAMA SUEDE" só se distinguem pelo tamanho e
// pelo SKU, que é o que a conferência física precisa.
import { LinhaConsignado } from "@/types/sales";

interface Props {
  item: LinhaConsignado;
  /** Classe de cor do texto, para a lista combinar com a coluna. */
  cor: string;
}

export default function LinhaPecaConsignado({ item, cor }: Props) {
  return (
    <div className={`text-xs ${cor} mb-1 last:mb-0`}>
      <div className="flex justify-between gap-1">
        <span className="flex items-center gap-1 min-w-0">
          <span className="truncate">{item.nome}</span>
          {item.tamanho && (
            <span className="shrink-0 text-[9px] font-black uppercase bg-indigo-50 text-indigo-600 px-1 py-px rounded">
              {item.tamanho}
            </span>
          )}
        </span>
        <span className="shrink-0 font-medium">× {item.quantidade}</span>
      </div>
      {item.sku !== undefined && item.sku !== null && item.sku !== "" && (
        <p className="font-mono text-[9px] text-zinc-400 leading-tight">{item.sku}</p>
      )}
    </div>
  );
}

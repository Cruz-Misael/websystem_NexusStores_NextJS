// components/ui/Tamanho.tsx
// A etiqueta do tamanho, igual em toda tela que lista peça.
//
// O nome sozinho não identifica a peça: a loja tem a mesma modelagem em P, M e
// G, e três linhas "PIJAMA SUEDE" só se distinguem pelo tamanho e pelo SKU —
// que é justamente o que a conferência física procura primeiro.

interface Props {
  valor?: string | null;
  /** "sm" para listas densas, onde a etiqueta não pode roubar a linha. */
  tamanho?: "sm" | "md";
}

export default function Tamanho({ valor, tamanho = "md" }: Props) {
  const texto = valor?.trim();
  if (!texto) return null;
  const classe =
    tamanho === "sm"
      ? "text-[9px] bg-indigo-50 text-indigo-600 px-1 py-px"
      : "text-[11px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5";
  return (
    <span className={`shrink-0 font-black uppercase rounded ${classe}`}>{texto}</span>
  );
}

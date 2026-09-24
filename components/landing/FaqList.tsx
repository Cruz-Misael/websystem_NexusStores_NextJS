'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { LandingFaqItem } from '@/src/services/website.service';

/** Sanfona das perguntas frequentes. Só uma aberta por vez: a lista é para ser
 *  varrida com o olho, não lida inteira. */
export default function FaqList({ itens, color }: { itens: LandingFaqItem[]; color: string }) {
  const [aberta, setAberta] = useState<number | null>(0);

  return (
    <div className="space-y-3">
      {itens.map((item, i) => {
        const estaAberta = aberta === i;
        return (
          <div
            key={i}
            className="bg-white rounded-2xl border transition-colors overflow-hidden"
            style={{ borderColor: estaAberta ? `${color}55` : 'rgb(228 228 231)' }}
          >
            <button
              onClick={() => setAberta(estaAberta ? null : i)}
              aria-expanded={estaAberta}
              className="w-full flex items-center justify-between gap-4 text-left px-5 py-4 hover:bg-zinc-50/70 transition-colors"
            >
              <span className="text-sm font-bold text-zinc-800">{item.q}</span>
              <ChevronDown
                size={18}
                className="shrink-0 transition-transform duration-300"
                style={{
                  color: estaAberta ? color : 'rgb(161 161 170)',
                  transform: estaAberta ? 'rotate(180deg)' : undefined,
                }}
              />
            </button>

            {/* grid-rows 0fr → 1fr anima altura sem precisar medir o conteúdo */}
            <div
              className="grid transition-all duration-300 ease-out"
              style={{ gridTemplateRows: estaAberta ? '1fr' : '0fr' }}
            >
              <div className="overflow-hidden">
                <p className="px-5 pb-5 text-sm leading-relaxed text-zinc-500">{item.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

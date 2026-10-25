// components/demo/FaixaDemo.tsx
// Aviso fixo no topo do painel enquanto o deploy for o ambiente de demonstração.
'use client';

import { FlaskConical } from 'lucide-react';
import { DEMO_ATIVO, DEMO_HORA_RECARGA, DEMO_PIN_GERENTE } from '@/src/lib/demo';

export default function FaixaDemo() {
  if (!DEMO_ATIVO) return null;
  return (
    <div className="shrink-0 bg-amber-50 border-b border-amber-200 text-amber-900 text-xs px-4 py-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
      <span className="flex items-center gap-1.5 font-bold">
        <FlaskConical className="w-3.5 h-3.5" />
        Demonstração
      </span>
      <span>Dados fictícios — tudo volta ao exemplo todo dia às {DEMO_HORA_RECARGA}.</span>
      <span>
        PIN de gerente: <strong className="font-mono tracking-wider">{DEMO_PIN_GERENTE}</strong>
      </span>
    </div>
  );
}

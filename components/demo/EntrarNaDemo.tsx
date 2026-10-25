// components/demo/EntrarNaDemo.tsx
// Botão "Testar a demonstração". É um formulário POST, não um link: link seria
// seguido por robô e por prefetch, abrindo sessão sem ninguém clicar.
'use client';

import { useState } from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';

export function EntrarNaDemo({ className, children }: { className: string; children: React.ReactNode }) {
  const [enviando, setEnviando] = useState(false);
  return (
    <form method="post" action="/api/demo/entrar" onSubmit={() => setEnviando(true)}>
      <button type="submit" disabled={enviando} className={className}>
        {children}
        {enviando
          ? <Loader2 className="w-4 h-4 animate-spin" />
          : <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
      </button>
    </form>
  );
}

'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

/**
 * Registra, de forma anônima, cada página aberta na loja pública.
 * Dispara um POST leve para /api/loja/track a cada mudança de rota.
 * Nunca bloqueia a navegação (erros são silenciados).
 */
export default function StoreTracker() {
  const pathname = usePathname();
  const ultimoPath = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || !pathname.startsWith('/loja')) return;
    // Evita registro duplicado ao re-renderizar na mesma rota
    if (ultimoPath.current === pathname) return;
    ultimoPath.current = pathname;

    try {
      fetch('/api/loja/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: pathname,
          referrer: typeof document !== 'undefined' ? document.referrer : '',
        }),
        keepalive: true,
      }).catch(() => {});
    } catch {
      /* silencioso */
    }
  }, [pathname]);

  return null;
}

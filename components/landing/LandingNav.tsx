'use client';

import { useEffect, useState } from 'react';
import { Instagram, Menu, X } from 'lucide-react';

interface Props {
  storeName: string;
  logoUrl: string | null;
  color: string;
  instagramUrl: string;
  ctaHref: string;
  ctaLabel: string;
  /** Só entram no menu as seções que têm conteúdo — ver a landing. */
  secoes: { id: string; label: string }[];
}

export default function LandingNav({
  storeName, logoUrl, color, instagramUrl, ctaHref, ctaLabel, secoes,
}: Props) {
  const [comSombra, setComSombra] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);

  useEffect(() => {
    const aoRolar = () => setComSombra(window.scrollY > 10);
    aoRolar();
    window.addEventListener('scroll', aoRolar, { passive: true });
    return () => window.removeEventListener('scroll', aoRolar);
  }, []);

  // Menu aberto com a página rolando por baixo dá a impressão de que o toque
  // não pegou. Trava o corpo enquanto ele estiver aberto.
  useEffect(() => {
    document.body.style.overflow = menuAberto ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuAberto]);

  const inicial = storeName.charAt(0).toUpperCase();

  return (
    <header
      className="sticky top-0 z-50 bg-white/85 backdrop-blur-xl transition-shadow duration-300"
      style={comSombra ? { boxShadow: '0 4px 24px rgba(0,0,0,0.07)' } : undefined}
    >
      <div
        className="absolute inset-x-0 bottom-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${color}55, transparent)` }}
      />

      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Logo de marca costuma já trazer o nome escrito dentro dela. Quando
            existe logo, ela fala sozinha; repetir o nome ao lado só duplicaria
            a palavra. `object-contain` porque a arte pode ser larga, e recortar
            uma marca horizontal num quadrado a torna ilegível. */}
        <a href="#topo" className="flex items-center gap-2.5 shrink-0 min-w-0">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={storeName} className="h-11 w-auto max-w-[180px] object-contain" />
          ) : (
            <>
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-md"
                style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}
              >
                {inicial}
              </div>
              <span className="font-black text-zinc-900 text-[15px] tracking-tight truncate">{storeName}</span>
            </>
          )}
        </a>

        <nav className="hidden md:flex items-center gap-7">
          {secoes.map(s => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="text-[13px] font-semibold text-zinc-500 hover:text-zinc-900 transition-colors"
            >
              {s.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {instagramUrl && (
            <a
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram da loja"
              className="w-9 h-9 hidden sm:flex items-center justify-center rounded-xl text-zinc-400 hover:text-pink-500 hover:bg-pink-50 transition-all"
            >
              <Instagram size={18} />
            </a>
          )}

          {ctaHref && (
            <a
              href={ctaHref}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center text-[13px] font-bold text-white px-4 py-2 rounded-xl shadow-sm hover:opacity-90 active:scale-95 transition-all"
              style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}
            >
              {ctaLabel}
            </a>
          )}

          <button
            onClick={() => setMenuAberto(v => !v)}
            aria-label={menuAberto ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={menuAberto}
            className="md:hidden w-9 h-9 flex items-center justify-center rounded-xl text-zinc-600 hover:bg-zinc-100 transition-colors"
          >
            {menuAberto ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {menuAberto && (
        <div className="md:hidden border-t border-zinc-100 bg-white px-4 py-4 space-y-1">
          {secoes.map(s => (
            <a
              key={s.id}
              href={`#${s.id}`}
              onClick={() => setMenuAberto(false)}
              className="block px-3 py-3 rounded-xl text-sm font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors"
            >
              {s.label}
            </a>
          ))}
          {ctaHref && (
            <a
              href={ctaHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMenuAberto(false)}
              className="mt-2 flex items-center justify-center text-sm font-bold text-white px-4 py-3 rounded-xl shadow-sm"
              style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}
            >
              {ctaLabel}
            </a>
          )}
        </div>
      )}
    </header>
  );
}

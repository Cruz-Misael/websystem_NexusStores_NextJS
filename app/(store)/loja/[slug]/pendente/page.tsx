'use client';
import { useEffect, useState } from 'react';
import { Clock, ShoppingBag } from 'lucide-react';

export default function PendentePage({ params }: { params: Promise<{ slug: string }> }) {
  const [slug, setSlug] = useState('');
  const [color, setColor] = useState('#6366f1');

  useEffect(() => {
    params.then(p => {
      setSlug(p.slug);
      fetch(`/api/loja/${p.slug}`).then(r => r.json()).then(d => { if (d.config) setColor(d.config.primary_color); });
    });
  }, [params]);

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-6 text-center gap-6">
      <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center">
        <Clock size={40} className="text-amber-600" />
      </div>
      <div>
        <h1 className="text-2xl font-black text-zinc-900">Pagamento em processamento</h1>
        <p className="text-zinc-500 mt-2 text-sm">Seu pagamento está sendo processado. Você receberá uma confirmação em breve.</p>
      </div>
      {slug && (
        <a href={`/loja/${slug}`} style={{ backgroundColor: color }} className="px-8 py-3 rounded-xl text-white font-bold text-sm hover:opacity-90 transition-opacity flex items-center gap-2">
          <ShoppingBag size={16} />
          Voltar à loja
        </a>
      )}
    </div>
  );
}

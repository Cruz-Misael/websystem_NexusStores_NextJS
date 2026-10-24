'use client';
import { useEffect, useState } from 'react';
import { XCircle, RotateCcw } from 'lucide-react';

export default function ErroPage({ params }: { params: Promise<{ slug: string }> }) {
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
      <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
        <XCircle size={40} className="text-red-500" />
      </div>
      <div>
        <h1 className="text-2xl font-black text-zinc-900">Pagamento não concluído</h1>
        <p className="text-zinc-500 mt-2 text-sm">Houve um problema com o pagamento. Tente novamente ou entre em contato com a loja.</p>
      </div>
      {slug && (
        <a href={`/loja/${slug}/checkout`} style={{ backgroundColor: color }} className="px-8 py-3 rounded-xl text-white font-bold text-sm hover:opacity-90 transition-opacity flex items-center gap-2">
          <RotateCcw size={16} />
          Tentar novamente
        </a>
      )}
    </div>
  );
}

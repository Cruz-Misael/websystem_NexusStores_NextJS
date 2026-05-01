'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { toast } from 'react-hot-toast';

// Este componente isola a lógica que depende do `useSearchParams`
export function LoginClientLogic() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const error = searchParams.get('error');
    if (error === 'access_denied') {
      toast.error('Acesso negado. Faça login para continuar.');
    }
  }, [searchParams]);

  // Ele não renderiza nada na tela, apenas executa a lógica.
  return null;
}

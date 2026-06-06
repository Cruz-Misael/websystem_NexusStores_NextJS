'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabase/client';

// Este componente isola a lógica que depende do `useSearchParams`
export function LoginClientLogic() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const error = searchParams.get('error');
    if (error === 'access_denied') {
      // Limpa a sessão no cliente (o middleware não consegue fazer isso pelo redirect)
      supabase.auth.signOut();
      toast.error('Seu acesso foi revogado. Entre em contato com o administrador.');
    }
  }, [searchParams]);

  // Ele não renderiza nada na tela, apenas executa a lógica.
  return null;
}

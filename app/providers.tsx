// app/providers.tsx
'use client';

import { ReactNode } from 'react';
import { Toaster } from 'react-hot-toast';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#18181b',
            color: '#fff',
            borderRadius: '12px',
            padding: '16px',
            fontSize: '14px',
            fontWeight: '500',
            border: '1px solid #27272a',
          },
          success: {
            style: {
              background: '#059669',
              border: '1px solid #10b981',
            },
            iconTheme: {
              primary: '#fff',
              secondary: '#059669',
            },
          },
          error: {
            style: {
              background: '#dc2626',
              border: '1px solid #ef4444',
            },
          },
        }}
      />
      {children}
    </>
  );
}
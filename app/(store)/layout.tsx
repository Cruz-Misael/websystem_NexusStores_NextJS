import StoreTracker from '@/components/loja/StoreTracker';

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <StoreTracker />
      {children}
    </>
  );
}

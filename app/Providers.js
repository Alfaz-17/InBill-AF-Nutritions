'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { Toaster } from "@/components/ui/sonner";
import ToastProvider from './components/ToastProvider';

export default function Providers({ children }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        {children}
        <Toaster position="top-right" richColors closeButton />
      </ToastProvider>
    </QueryClientProvider>
  );
}

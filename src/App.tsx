import { QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { createQueryClient } from '@/core/api/queryClient';
import { ThemeProvider } from '@/core/theme/ThemeProvider';
import { FoundationPage } from '@/pages/FoundationPage';

/** Providers globais. A fase 1b acrescenta AuthProvider, Snackbar, Realtime e o Router. */
export function App() {
  const [queryClient] = useState(createQueryClient);
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <FoundationPage />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

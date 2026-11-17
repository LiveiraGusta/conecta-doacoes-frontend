import { QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { RouterProvider } from 'react-router';
import { createQueryClient } from '@/core/api/queryClient';
import { ThemeProvider } from '@/core/theme/ThemeProvider';
import { createAppRouter } from '@/routes';

/** Providers que não dependem do router; os que dependem ficam no RootLayout. */
export function App() {
  const [queryClient] = useState(createQueryClient);
  const [router] = useState(createAppRouter);
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <RouterProvider router={router} />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

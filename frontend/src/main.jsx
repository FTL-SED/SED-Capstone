import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App.jsx'

// The cache lives here, above every page, so it survives page unmounts.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0 * 60 * 1000,    // after x min: revisits within this window use cache, no refetch
      refetchOnWindowFocus: false, // don't refetch just from clicking back into the tab
    },
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)

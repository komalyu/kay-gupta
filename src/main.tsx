import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/shared/ErrorBoundary.tsx';
import { ThemeProvider } from './components/shared/ThemeProvider.tsx';
import { ToastProvider } from './components/shared/ToastProvider.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <ThemeProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </ThemeProvider>
  </ErrorBoundary>
);

import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || 'An unexpected interface error occurred.',
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('HostelCare UI Error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#f4f6f9] p-6 dark:bg-[#060b14]">
          <div className="max-w-md rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm dark:border-slate-800 dark:bg-[#0c1322]">
            <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-amber-600 dark:text-amber-400" />
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">
              Something went wrong in HostelCare
            </h1>
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
              {this.state.message}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-navy-900 px-4 py-2 text-xs font-semibold text-white hover:bg-navy-800 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Reload Application</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

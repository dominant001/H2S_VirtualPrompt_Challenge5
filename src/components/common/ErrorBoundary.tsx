import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Utsav AI ErrorBoundary caught an error]:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleResetState = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (_) {}
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-[#FAF7F2] text-[#231530] flex items-center justify-center p-4 font-sans">
          <div className="bg-white border border-[#231530]/15 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-xl space-y-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mx-auto shadow-xs">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl sm:text-2xl font-bold font-display text-[#231530]">
                Application Recovery
              </h1>
              <p className="text-xs sm:text-sm text-[#231530]/70 leading-relaxed">
                Utsav AI encountered an unexpected rendering issue. You can reload the page or reset the local cache to restore standard defaults.
              </p>
            </div>

            {this.state.error && (
              <div className="text-left bg-[#FAF7F2] border border-[#231530]/10 rounded-2xl p-3.5 text-xs font-mono text-rose-800 break-all max-h-36 overflow-y-auto">
                <div className="font-bold mb-1 text-[11px] uppercase tracking-wider text-rose-900">
                  {this.state.error.name}:
                </div>
                {this.state.error.message}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                onClick={this.handleReload}
                className="w-full sm:w-auto px-5 py-2.5 bg-[#E06D28] hover:bg-[#C4551D] text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reload Page</span>
              </button>

              <button
                onClick={this.handleResetState}
                className="w-full sm:w-auto px-5 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-[#231530] rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
                title="Clears corrupted local cache and restores baseline Jaipur wedding"
              >
                <Trash2 className="w-3.5 h-3.5 text-neutral-500" />
                <span>Reset Local Cache</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

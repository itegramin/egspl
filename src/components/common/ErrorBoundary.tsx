import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ShieldAlert, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  errorReferenceId: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorReferenceId: null,
  };

  public static getDerivedStateFromError(_: Error): State {
    // Generate a sanitized reference ID for tracking without exposing stack trace
    const refId = 'ERR-' + Math.random().toString(36).substring(2, 9).toUpperCase();
    return { hasError: true, errorReferenceId: refId };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // In production, log to Azure Monitor / App Insights securely rather than dumping to DOM
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, errorReferenceId: null });
    window.location.href = '/';
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-800/80 backdrop-blur-xl border border-slate-700/60 rounded-3xl p-8 shadow-2xl text-center">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-6 shadow-inner">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-white mb-2">
              Something went wrong
            </h1>

            <p className="text-sm text-slate-400 mb-6 leading-relaxed">
              An unexpected error occurred while processing your request. For security reasons, detailed technical traces are restricted.
            </p>

            {this.state.errorReferenceId && (
              <div className="bg-slate-900/80 rounded-xl px-4 py-2.5 mb-6 border border-slate-700/50 inline-block">
                <span className="text-xs text-slate-400">Incident Reference: </span>
                <code className="text-xs font-mono font-bold text-amber-400">
                  {this.state.errorReferenceId}
                </code>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={this.handleReload}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload Page</span>
              </button>

              <button
                onClick={this.handleReset}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-700/60 hover:bg-slate-700 text-slate-200 text-sm font-semibold transition-all flex items-center justify-center gap-2 border border-slate-600/50"
              >
                <Home className="w-4 h-4" />
                <span>Return Home</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

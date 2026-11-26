import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button, cx, tone } from './admin/ui';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          role="alert"
          className={cx(
            'flex min-h-[300px] items-center justify-center p-6',
            'bg-white dark:bg-[#100e18] border',
            tone.border
          )}
        >
          <div className={cx('w-full max-w-md rounded-2xl border p-6 text-center shadow-xl', tone.border, tone.surface)}>
            <div className={cx('w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4', tone.sunken)}>
              <AlertTriangle className="w-7 h-7 text-amber-500" />
            </div>
            <h2 className={cx('font-display font-bold text-lg', tone.strong)}>
              Er is iets misgegaan
            </h2>
            <p className={cx('mt-2 text-sm leading-relaxed', tone.muted)}>
              Onverwachte fout: {this.state.error?.message ?? 'Onbekende fout'}
            </p>
            <details className="mt-4 text-left">
              <summary className={cx('text-xs font-mono cursor-pointer', tone.faint)}>
                Stack trace (voor debugging)
              </summary>
              <pre className={cx('mt-2 p-3 text-[10px] overflow-auto rounded bg-black/5 dark:bg-white/[0.03]', tone.border)}>
                {this.state.error?.stack ?? 'Geen stack trace beschikbaar'}
              </pre>
            </details>
            <div className="mt-5 flex items-center justify-center gap-2">
              <Button icon={RefreshCw} onClick={this.handleRetry}>
                Opnieuw proberen
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
/**
 * ErrorBoundary — graceful failure, Soft-Track Protocol
 * ─────────────────────────────────────────────────────────────────────────────
 * Catches render errors. No red. Plain-language description. Recovery action.
 * Per §11.3 error pattern: soft icon + description + recovery action.
 *
 * @example
 *   <ErrorBoundary>
 *     <SomethingThatMightBreak />
 *   </ErrorBoundary>
 */
'use client';

import React, { Component } from 'react';

interface Props {
  children: React.ReactNode;
  /** Custom fallback — defaults to the soft error UI */
  fallback?: React.ReactNode;
  /** Called when an error is caught */
  onError?: (error: Error, info: { componentStack: string }) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, info: React.ErrorInfo) {
    this.props.onError?.(error, { componentStack: info.componentStack ?? '' });
    console.error('[ErrorBoundary]', error, info);
  }

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div
          role="alert"
          className="flex flex-col items-center justify-center text-center py-10 px-6 space-y-4"
        >
          <div className="text-3xl" aria-hidden="true">🌙</div>
          <div className="space-y-2 max-w-prose">
            <p className="text-base font-medium text-text-primary">
              Something went sideways here.
            </p>
            <p className="text-sm text-text-secondary">
              Your work is safe. Try refreshing this section.
            </p>
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 text-sm rounded bg-bg-elevated text-text-primary
                       hover:brightness-110 transition-colors
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

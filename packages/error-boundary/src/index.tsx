import React, { Component, createContext, useContext, useState, useEffect } from 'react';
import * as Sentry from '@sentry/react';

interface ErrorInfo {
  componentStack: string;
}

interface ErrorBoundaryState {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorCount: number;
  lastError: number;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode | ((error: Error, reset: () => void) => React.ReactNode);
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onReset?: () => void;
  maxErrors?: number;
  resetTimeout?: number;
  withRefresh?: boolean;
  captureAnalytics?: boolean;
}

interface ErrorContextType {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  reset: () => void;
  clearError: () => void;
}

const ErrorContext = createContext<ErrorContextType>({
  error: null,
  errorInfo: null,
  reset: () => {},
  clearError: () => {},
});

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private resetTimeout: NodeJS.Timeout | null = null;

  static defaultProps = {
    maxErrors: 3,
    resetTimeout: 5000,
    withRefresh: true,
    captureAnalytics: true,
  };

  state: ErrorBoundaryState = {
    error: null,
    errorInfo: null,
    errorCount: 0,
    lastError: 0,
  };

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError, captureAnalytics, maxErrors } = this.props;
    const { errorCount, lastError } = this.state;

    // Check if we should reset error count
    const now = Date.now();
    const newErrorCount = now - lastError > 60000 ? 1 : errorCount + 1;

    this.setState({
      error,
      errorInfo,
      errorCount: newErrorCount,
      lastError: now,
    });

    // Call onError callback
    if (onError) {
      onError(error, errorInfo);
    }

    // Capture analytics
    if (captureAnalytics) {
      this.captureError(error, errorInfo);
    }

    // Auto-reset if under max errors
    if (newErrorCount < maxErrors!) {
      this.scheduleReset();
    }
  }

  componentWillUnmount() {
    if (this.resetTimeout) {
      clearTimeout(this.resetTimeout);
    }
  }

  private captureError(error: Error, errorInfo: ErrorInfo) {
    // Send to Sentry
    Sentry.withScope((scope) => {
      scope.setExtras({
        componentStack: errorInfo.componentStack,
        errorCount: this.state.errorCount,
      });
      Sentry.captureException(error);
    });

    // Send to analytics
    if (window.gtag) {
      window.gtag('event', 'error', {
        error_name: error.name,
        error_message: error.message,
        error_stack: error.stack,
      });
    }
  }

  private scheduleReset() {
    const { resetTimeout } = this.props;

    if (this.resetTimeout) {
      clearTimeout(this.resetTimeout);
    }

    this.resetTimeout = setTimeout(() => {
      this.reset();
    }, resetTimeout);
  }

  reset = () => {
    const { onReset } = this.props;

    this.setState({
      error: null,
      errorInfo: null,
    });

    if (onReset) {
      onReset();
    }
  };

  clearError = () => {
    this.setState({
      error: null,
      errorInfo: null,
      errorCount: 0,
      lastError: 0,
    });
  };

  render() {
    const { children, fallback, withRefresh } = this.props;
    const { error, errorInfo, errorCount } = this.state;

    if (error) {
      // If we've hit max errors, show refresh button
      if (errorCount >= (this.props.maxErrors || 3) && withRefresh) {
        return (
          <div className="error-boundary-refresh">
            <h2>Something went wrong</h2>
            <p>Please refresh the page to continue.</p>
            <button onClick={() => window.location.reload()}>
              Refresh Page
            </button>
          </div>
        );
      }

      // Show custom fallback
      if (fallback) {
        if (typeof fallback === 'function') {
          return fallback(error, this.reset);
        }
        return fallback;
      }

      // Show default fallback
      return (
        <div className="error-boundary">
          <h2>Something went wrong</h2>
          <details>
            <summary>Error Details</summary>
            <pre>{error.toString()}</pre>
            <pre>{errorInfo?.componentStack}</pre>
          </details>
          <button onClick={this.reset}>Try Again</button>
        </div>
      );
    }

    return (
      <ErrorContext.Provider
        value={{
          error,
          errorInfo,
          reset: this.reset,
          clearError: this.clearError,
        }}
      >
        {children}
      </ErrorContext.Provider>
    );
  }
}

// React Hook
export function useErrorBoundary() {
  return useContext(ErrorContext);
}

// Higher Order Component
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps: Omit<ErrorBoundaryProps, 'children'> = {}
) {
  return function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary {...errorBoundaryProps}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}

// Suspense integration
export function SuspenseErrorBoundary({
  children,
  fallback,
  ...props
}: ErrorBoundaryProps & { fallback?: React.ReactNode }) {
  return (
    <ErrorBoundary {...props}>
      <React.Suspense fallback={fallback}>
        {children}
      </React.Suspense>
    </ErrorBoundary>
  );
}

// Error Boundary Group
export function ErrorBoundaryGroup({
  children,
  ...props
}: ErrorBoundaryProps) {
  const [key, setKey] = useState(0);

  const reset = () => {
    setKey(k => k + 1);
  };

  return (
    <ErrorBoundary key={key} {...props} onReset={reset}>
      {children}
    </ErrorBoundary>
  );
}

// Route Error Boundary
export function RouteErrorBoundary({
  children,
  ...props
}: ErrorBoundaryProps) {
  useEffect(() => {
    return () => {
      // Clear errors when route changes
      const context = useErrorBoundary();
      context.clearError();
    };
  }, []);

  return <ErrorBoundary {...props}>{children}</ErrorBoundary>;
}

export default ErrorBoundary;

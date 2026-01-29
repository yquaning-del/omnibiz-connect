import { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Props {
  children: ReactNode;
  pageName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

// Wrapper component for using hooks with class component
function ErrorFallback({ error, pageName, onRetry }: { error: Error | null; pageName?: string; onRetry: () => void }) {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center min-h-[400px] p-4">
      <Card className="w-full max-w-lg border-border/50 bg-card/50 backdrop-blur">
        <CardHeader className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-destructive/10 mx-auto mb-2">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle className="text-xl">
            {pageName ? `Error loading ${pageName}` : 'Something went wrong'}
          </CardTitle>
          <CardDescription>
            An error occurred while loading this page. This has been logged for review.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {process.env.NODE_ENV === 'development' && error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 max-h-32 overflow-auto">
              <p className="text-xs font-mono text-destructive break-all">
                {error.message}
              </p>
            </div>
          )}
          
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={() => navigate(-1)}
            >
              <ChevronLeft className="h-4 w-4" />
              Go Back
            </Button>
            <Button
              className="flex-1 gap-2"
              onClick={onRetry}
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export class PageErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`PageErrorBoundary caught error in ${this.props.pageName || 'page'}:`, error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback
          error={this.state.error}
          pageName={this.props.pageName}
          onRetry={this.handleRetry}
        />
      );
    }

    return this.props.children;
  }
}

// HOC for wrapping pages with error boundary
export function withPageErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  pageName: string
) {
  return function WithErrorBoundary(props: P) {
    return (
      <PageErrorBoundary pageName={pageName}>
        <WrappedComponent {...props} />
      </PageErrorBoundary>
    );
  };
}

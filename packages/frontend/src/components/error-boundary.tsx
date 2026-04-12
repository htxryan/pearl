import { Component, type ReactNode, type ErrorInfo } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  /** Compact inline fallback instead of full-page centered layout */
  inline?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
}

type ErrorCategory = "network" | "not_found" | "unexpected";

function categorizeError(error: Error): ErrorCategory {
  const msg = error.message.toLowerCase();
  const name = error.name.toLowerCase();

  if (
    msg.includes("fetch") ||
    msg.includes("network") ||
    msg.includes("failed to fetch") ||
    msg.includes("timeout") ||
    msg.includes("econnrefused") ||
    name === "typeerror" && msg.includes("fetch")
  ) {
    return "network";
  }

  if (msg.includes("not found") || msg.includes("404")) {
    return "not_found";
  }

  return "unexpected";
}

const categoryConfig: Record<ErrorCategory, { icon: string; title: string; suggestion: string }> = {
  network: {
    icon: "!",
    title: "Connection problem",
    suggestion: "Check your network connection or try again in a moment.",
  },
  not_found: {
    icon: "?",
    title: "Not found",
    suggestion: "The resource you're looking for couldn't be found.",
  },
  unexpected: {
    icon: "!",
    title: "Something went wrong",
    suggestion: "An unexpected error occurred. Try refreshing the page.",
  },
};

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, retryCount: 0 };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  private handleRetry = () => {
    this.setState((prev) => ({
      hasError: false,
      error: null,
      retryCount: prev.retryCount + 1,
    }));
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      const error = this.state.error;
      const category = error ? categorizeError(error) : "unexpected";
      const config = categoryConfig[category];

      if (this.props.inline) {
        return (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
            <p className="text-sm font-medium text-destructive">{config.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{config.suggestion}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={this.handleRetry}
            >
              Try Again
            </Button>
          </div>
        );
      }

      return (
        <div className="flex h-full items-center justify-center p-8">
          <div className="max-w-md text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <span className="text-2xl font-bold text-destructive">{config.icon}</span>
            </div>
            <h2 className="text-xl font-semibold">{config.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {config.suggestion}
            </p>
            {error && category === "unexpected" && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                  Error details
                </summary>
                <pre className="mt-2 max-h-32 overflow-auto rounded bg-muted p-3 text-xs whitespace-pre-wrap">
                  {error.message}
                </pre>
              </details>
            )}
            <div className="mt-6 flex items-center justify-center gap-3">
              <Button onClick={this.handleRetry}>
                Try Again
              </Button>
              <Button variant="outline" onClick={() => window.location.reload()}>
                Reload Page
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

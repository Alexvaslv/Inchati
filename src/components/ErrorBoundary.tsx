import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State;
  props: Props;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
    this.props = props;
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    const { hasError, error } = this.state;
    if (hasError) {
      let errorDetails = "";
      try {
        if (error?.message) {
          const parsed = JSON.parse(error.message);
          errorDetails = JSON.stringify(parsed, null, 2);
        }
      } catch {
        errorDetails = error?.message || "An unknown error occurred";
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border border-red-100 space-y-6">
            <div className="flex justify-center">
              <div className="p-3 bg-red-50 rounded-full">
                <AlertTriangle className="w-10 h-10 text-red-500" />
              </div>
            </div>
            <div className="text-center space-y-2">
              <h1 className="text-xl font-bold text-gray-900">Something went wrong</h1>
              <p className="text-gray-500 text-sm">
                We encountered an error while processing your request.
              </p>
            </div>
            {errorDetails && (
              <pre className="bg-gray-900 text-pink-400 p-4 rounded-lg text-xs overflow-auto max-h-48 font-mono">
                {errorDetails}
              </pre>
            )}
            <button
              onClick={() => window.location.reload()}
              className="w-full flex items-center justify-center gap-2 py-3 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 transition-colors"
            >
              <RefreshCcw className="w-4 h-4" />
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

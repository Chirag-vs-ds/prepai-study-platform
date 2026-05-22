"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error inside PrepAI dashboard component:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-center shadow-sm transition-all duration-300">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-4 animate-bounce">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h3 className="text-base font-semibold text-foreground mb-1">Component Failed</h3>
          <p className="text-xs text-muted-foreground max-w-sm mb-4">
            An unexpected error occurred while rendering this feature. Try reloading or resetting.
          </p>
          {this.state.error && (
            <pre className="mb-4 max-h-24 w-full overflow-y-auto rounded bg-secondary/50 p-2.5 text-left font-mono text-[10px] text-muted-foreground border border-border">
              {this.state.error.message}
            </pre>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={this.handleReset}
            className="text-xs border-destructive/25 text-destructive hover:bg-destructive/10 transition-colors"
          >
            <RefreshCw className="mr-2 h-3.5 w-3.5" />
            Reset Section
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

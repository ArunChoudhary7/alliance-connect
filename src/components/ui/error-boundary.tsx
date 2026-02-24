
import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "./button";
import { AlertTriangle, RotateCcw } from "lucide-react";

interface Props {
    children?: ReactNode;
    /** If true, shows a compact inline error instead of full-screen */
    inline?: boolean;
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
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    private handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    public render() {
        if (this.state.hasError) {
            // Inline (page-level) error — doesn't nuke the whole app
            if (this.props.inline) {
                return (
                    <div className="w-full flex flex-col items-center justify-center py-20 px-4 text-center">
                        <div className="bg-red-500/10 p-4 rounded-full mb-4">
                            <AlertTriangle className="h-8 w-8 text-red-500" />
                        </div>
                        <h2 className="text-lg font-black uppercase italic tracking-tighter mb-2">
                            Something Went Wrong
                        </h2>
                        <p className="text-muted-foreground text-xs max-w-xs mb-6 font-medium">
                            This section ran into an issue. Try again.
                        </p>
                        <Button
                            onClick={this.handleReset}
                            variant="secondary"
                            className="h-10 px-6 rounded-xl font-black uppercase text-[10px] tracking-widest gap-2"
                        >
                            <RotateCcw className="h-3 w-3" /> Retry
                        </Button>
                    </div>
                );
            }

            // Full-screen (app-level) error
            return (
                <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4 text-center">
                    <div className="bg-red-500/10 p-6 rounded-full mb-6 animate-pulse">
                        <AlertTriangle className="h-16 w-16 text-red-500" />
                    </div>
                    <h1 className="text-4xl font-black italic uppercase tracking-tighter mb-4 text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500">
                        System Malfunction
                    </h1>
                    <p className="text-white/60 max-w-md mb-8 font-medium">
                        A critical error has occurred in the Alliance network.
                        <br />
                        <span className="text-xs opacity-40 mt-2 block font-mono">{this.state.error?.message}</span>
                    </p>
                    <div className="flex gap-3">
                        <Button
                            onClick={this.handleReset}
                            variant="secondary"
                            className="h-12 px-6 rounded-xl font-black uppercase tracking-widest bg-white/10 text-white hover:bg-white/20"
                        >
                            <RotateCcw className="h-4 w-4 mr-2" /> Try Again
                        </Button>
                        <Button
                            onClick={() => window.location.reload()}
                            className="h-12 px-8 rounded-xl font-black uppercase tracking-widest bg-white text-black hover:bg-white/90"
                        >
                            Reboot System
                        </Button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

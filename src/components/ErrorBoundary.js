import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service
    console.error("ErrorBoundary caught an uncaught rendering error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    // Proactively clear query strings or reload page components if needed
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      // Custom localized card styled with the AGASTHYA brand aesthetics
      return (
        <div className="flex items-center justify-center p-6 sm:p-12 w-full min-h-[60vh] bg-transparent font-sans">
          <div className="bg-white border-2 border-red-100 rounded-[2rem] p-8 sm:p-10 shadow-[0_20px_50px_rgba(22,34,63,0.05)] w-full max-w-2xl text-center transform hover:scale-[1.01] transition-transform duration-300">
            {/* Warning Icon Badge */}
            <div className="w-16 h-16 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
              <span className="text-3xl">⚠️</span>
            </div>

            {/* Error Messages */}
            <h2 className="text-2xl font-black text-[#16223F] tracking-tight mb-3">
              Module Temporarily Unavailable
            </h2>
            <p className="text-slate-500 text-sm max-w-md mx-auto mb-8 leading-relaxed">
              We encountered a rendering or rendering hydration error while loading this workspace. The rest of your session and sidebar are completely functional.
            </p>

            {/* Actions */}
            <div className="flex flex-wrap justify-center gap-4 mb-8">
              <button
                onClick={this.handleReset}
                className="px-6 py-3 bg-[#16223F] hover:bg-[#16223F]/90 text-white text-sm font-bold rounded-xl shadow-lg shadow-[#16223F]/10 transform active:scale-95 transition-all cursor-pointer"
              >
                🔄 Refresh Module
              </button>
              
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl transform active:scale-95 transition-all cursor-pointer"
              >
                💻 Reload Application
              </button>
            </div>

            {/* Technical Details Drawer */}
            <details className="text-left bg-slate-50 border border-slate-200/60 rounded-2xl p-4 cursor-pointer group transition-all">
              <summary className="text-xs font-bold text-slate-500 hover:text-slate-800 list-none flex justify-between items-center outline-none select-none">
                <span>🛠️ View Technical Diagnostic Logs</span>
                <span className="transform group-open:rotate-180 transition-transform duration-200 text-[10px]">▼</span>
              </summary>
              <div className="mt-4 pt-4 border-t border-slate-200/60 text-left overflow-x-auto">
                <p className="text-xs font-bold text-red-600 mb-2">
                  Error: {this.state.error?.toString() || "Unknown rendering exception"}
                </p>
                {this.state.errorInfo && (
                  <pre className="text-[10px] text-slate-600 bg-slate-900 text-slate-200 p-4 rounded-xl font-mono overflow-auto max-h-48 leading-relaxed">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            </details>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

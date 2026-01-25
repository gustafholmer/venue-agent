'use client'

import { Component, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    // Ready for future Sentry integration:
    // Sentry.captureException(error, { extra: errorInfo })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
          <div className="w-16 h-16 mb-6 rounded-full bg-[#f5f3f0] flex items-center justify-center">
            <svg
              className="w-8 h-8 text-[#78716c]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-[#1a1a1a] mb-2">
            Något gick fel
          </h2>
          <p className="text-[#78716c] mb-6 max-w-md">
            Ett oväntat fel uppstod. Försök att ladda om sidan.
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="inline-flex items-center justify-center gap-2 font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 bg-[#1a1a1a] text-white hover:bg-[#333] focus-visible:ring-[#1a1a1a] h-10 px-5 text-sm"
          >
            Försök igen
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

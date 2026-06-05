'use client'

import { Component, ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  message: string
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error?.message ?? 'Erro desconhecido' }
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[ErrorBoundary]', error, info)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="flex flex-col items-center justify-center h-full min-h-64 gap-4 p-8">
          <div className="flex items-center justify-center h-12 w-12 rounded-full bg-red-500/10">
            <AlertTriangle size={22} className="text-red-400" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-white">Erro ao renderizar esta seção</p>
            <p className="text-xs text-gray-400 mt-1 max-w-sm">{this.state.message}</p>
          </div>
          <button
            onClick={() => {
              this.setState({ hasError: false, message: '' })
              window.location.reload()
            }}
            className="flex items-center gap-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 px-3 py-1.5 text-xs text-gray-300 transition-colors"
          >
            <RefreshCw size={12} /> Tentar novamente
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

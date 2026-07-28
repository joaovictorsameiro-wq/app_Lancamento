'use client'

import { useState } from 'react'
import Sidebar from '../../components/sidebar'
import ErrorBoundary from '../../components/error-boundary'
import { Menu, X } from 'lucide-react'
import { Zap } from 'lucide-react'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-gray-950">

      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/60 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — sempre visível no desktop, slide no mobile */}
      <div className={`
        fixed inset-y-0 left-0 z-30 transition-transform duration-200
        md:relative md:translate-x-0 md:flex
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Conteúdo principal */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">

        {/* Header mobile */}
        <div className="flex items-center gap-3 border-b border-gray-800 bg-gray-950 px-4 py-3 md:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-800 text-gray-400"
          >
            <Menu size={16} />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md" style={{ background: 'var(--primary-tint)' }}>
              <Zap size={12} style={{ color: 'var(--primary)' }} />
            </div>
            <span className="text-sm font-bold text-white">Launch Analytics</span>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}

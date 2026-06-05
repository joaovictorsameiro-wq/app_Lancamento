'use client'

import { AlertTriangle, X, Info, CheckCircle } from 'lucide-react'
import { useState } from 'react'

export type AlertType = 'warning' | 'error' | 'info' | 'success'

interface AlertBannerProps {
  type: AlertType
  title: string
  message: string
  dismissible?: boolean
}

const STYLES = {
  warning: { border: 'border-amber-500/30', bg: 'bg-amber-500/10', text: 'text-amber-400', Icon: AlertTriangle },
  error:   { border: 'border-red-500/30',   bg: 'bg-red-500/10',   text: 'text-red-400',   Icon: AlertTriangle },
  info:    { border: 'border-blue-500/30',  bg: 'bg-blue-500/10',  text: 'text-blue-400',  Icon: Info },
  success: { border: 'border-emerald-500/30', bg: 'bg-emerald-500/10', text: 'text-emerald-400', Icon: CheckCircle },
}

export default function AlertBanner({ type, title, message, dismissible = true }: AlertBannerProps) {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null

  const { border, bg, text, Icon } = STYLES[type]

  return (
    <div className={`flex items-start gap-3 rounded-xl border ${border} ${bg} p-3`}>
      <Icon size={15} className={`shrink-0 mt-0.5 ${text}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-semibold ${text}`}>{title}</p>
        <p className="text-xs text-gray-400 mt-0.5">{message}</p>
      </div>
      {dismissible && (
        <button onClick={() => setDismissed(true)} className="text-gray-500 hover:text-gray-300">
          <X size={13} />
        </button>
      )}
    </div>
  )
}

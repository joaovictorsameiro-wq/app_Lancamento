'use client'

import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface KpiCardProps {
  title: string
  value: string
  subtitle?: string
  trend?: number
  trendLabel?: string
  higherIsBetter?: boolean
  icon?: LucideIcon
  accent?: 'emerald' | 'blue' | 'amber' | 'red' | 'purple'
  loading?: boolean
}

const ACCENT_MAP = {
  emerald: 'from-emerald-500/10 border-emerald-500/20 text-emerald-400',
  blue:    'from-blue-500/10 border-blue-500/20 text-blue-400',
  amber:   'from-amber-500/10 border-amber-500/20 text-amber-400',
  red:     'from-red-500/10 border-red-500/20 text-red-400',
  purple:  'from-purple-500/10 border-purple-500/20 text-purple-400',
}

export default function KpiCard({
  title,
  value,
  subtitle,
  trend,
  trendLabel,
  higherIsBetter = true,
  icon: Icon,
  accent = 'emerald',
  loading = false,
}: KpiCardProps) {
  const accentClass = ACCENT_MAP[accent]
  const isPositive = trend != null && trend > 0
  const isNegative = trend != null && trend < 0

  const trendColor =
    trend == null ? ''
    : (isPositive && higherIsBetter) || (isNegative && !higherIsBetter)
      ? 'text-emerald-400'
      : 'text-red-400'

  const TrendIcon =
    trend == null ? Minus
    : isPositive ? TrendingUp
    : TrendingDown

  return (
    <div
      className={`
        relative overflow-hidden rounded-xl border bg-gradient-to-br from-gray-900/80 to-gray-900/40
        ${accentClass.split(' ')[1]} p-5 transition-all hover:border-opacity-60
      `}
    >
      {/* Glow accent */}
      <div className={`absolute -top-6 -right-6 h-24 w-24 rounded-full bg-gradient-to-br ${accentClass.split(' ')[0]} blur-2xl opacity-60`} />

      <div className="relative">
        <div className="flex items-start justify-between mb-3">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-400">{title}</p>
          {Icon && (
            <div className={`rounded-lg bg-gray-800 p-1.5 ${accentClass.split(' ')[2]}`}>
              <Icon size={14} />
            </div>
          )}
        </div>

        {loading ? (
          <div className="h-8 w-24 animate-pulse rounded bg-gray-800" />
        ) : (
          <p className="text-2xl font-bold tracking-tight text-white">{value}</p>
        )}

        {(subtitle || trend != null) && (
          <div className="mt-2 flex items-center gap-2">
            {trend != null && (
              <span className={`flex items-center gap-0.5 text-xs font-medium ${trendColor}`}>
                <TrendIcon size={11} />
                {Math.abs(trend).toFixed(1)}%
              </span>
            )}
            {trendLabel && (
              <span className="text-xs text-gray-500">{trendLabel}</span>
            )}
            {subtitle && !trendLabel && (
              <span className="text-xs text-gray-500">{subtitle}</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

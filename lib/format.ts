export function fmt_currency(value: number | null | undefined, compact = false): string {
  if (value == null) return '—'
  const opts: Intl.NumberFormatOptions = {
    style: 'currency',
    currency: 'BRL',
    notation: compact ? 'compact' : 'standard',
    maximumFractionDigits: compact ? 1 : 2,
  }
  return new Intl.NumberFormat('pt-BR', opts).format(value)
}

export function fmt_number(value: number | null | undefined, decimals = 0): string {
  if (value == null) return '—'
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: decimals }).format(value)
}

export function fmt_pct(value: number | null | undefined, decimals = 1): string {
  if (value == null) return '—'
  return `${value.toFixed(decimals)}%`
}

export function fmt_date(value: string | Date | null | undefined): string {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('pt-BR')
}

export function trend_class(value: number, higherIsBetter = true): string {
  if (value > 0) return higherIsBetter ? 'text-emerald-400' : 'text-red-400'
  if (value < 0) return higherIsBetter ? 'text-red-400' : 'text-emerald-400'
  return 'text-gray-400'
}

export function fmt_currency(value: number | string | null | undefined, compact = false): string {
  if (value == null || value === '') return '—'
  const n = Number(value)
  if (isNaN(n)) return '—'
  const opts: Intl.NumberFormatOptions = {
    style: 'currency',
    currency: 'BRL',
    notation: compact ? 'compact' : 'standard',
    maximumFractionDigits: compact ? 1 : 2,
  }
  return new Intl.NumberFormat('pt-BR', opts).format(n)
}

export function fmt_number(value: number | string | null | undefined, decimals = 0): string {
  if (value == null || value === '') return '—'
  const n = Number(value)
  if (isNaN(n)) return '—'
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: decimals }).format(n)
}

export function fmt_pct(value: number | string | null | undefined, decimals = 1): string {
  if (value == null || value === '') return '—'
  const n = Number(value)
  if (isNaN(n)) return '—'
  return `${n.toFixed(decimals)}%`
}

export function fmt_date(value: string | Date | null | undefined): string {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('pt-BR')
}

export function trend_class(value: number | string | null | undefined, higherIsBetter = true): string {
  const n = Number(value)
  if (n > 0) return higherIsBetter ? 'text-emerald-400' : 'text-red-400'
  if (n < 0) return higherIsBetter ? 'text-red-400' : 'text-emerald-400'
  return 'text-gray-400'
}

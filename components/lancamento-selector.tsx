'use client'

import { useEffect, useState } from 'react'
import { ChevronDown, Loader2, AlertCircle } from 'lucide-react'

interface Lancamento {
  codigo: string
  nome: string
  status: string | null
}

interface Props {
  value: string
  onChange: (codigo: string) => void
}

// Ordena: LC (numérico desc) → LS → LR → RENOVA → SEM_LANCAMENTO
function sortLancamentos(list: Lancamento[]): Lancamento[] {
  const rank = (codigo: string) => {
    if (codigo.startsWith('LC')) return 0
    if (codigo.startsWith('LS')) return 1
    if (codigo.startsWith('LR')) return 2
    if (codigo === 'RENOVA')     return 3
    return 4 // SEM_LANCAMENTO e outros
  }
  return [...list].sort((a, b) => {
    const ra = rank(a.codigo), rb = rank(b.codigo)
    if (ra !== rb) return ra - rb
    // Dentro do mesmo grupo: numérico desc (LC25 > LC24 > ...)
    const na = parseInt(a.codigo.replace(/\D/g, '')) || 0
    const nb = parseInt(b.codigo.replace(/\D/g, '')) || 0
    return nb - na
  })
}

export default function LancamentoSelector({ value, onChange }: Props) {
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/lancamentos')
      .then(r => r.json())
      .then(data => {
        if (!Array.isArray(data)) {
          setError('Erro ao carregar lançamentos')
          return
        }
        const sorted = sortLancamentos(data)
        setLancamentos(sorted)
        if (!value) {
          // Seleciona o lançamento ativo; se não houver, o primeiro LC
          const ativo = sorted.find(l => l.status === 'ativo')
          const defaultLC = ativo ?? sorted.find(l => l.codigo.startsWith('LC')) ?? sorted[0]
          if (defaultLC) onChange(defaultLC.codigo)
        }
      })
      .catch(() => setError('Falha na conexão com o banco'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-gray-800 px-3 py-2 text-sm text-gray-400">
        <Loader2 size={14} className="animate-spin" />
        Carregando...
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
        <AlertCircle size={14} />
        {error}
      </div>
    )
  }

  const selected = lancamentos.find(l => l.codigo === value)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800/80 px-3 py-2 text-sm text-white hover:border-gray-600 transition-colors"
      >
        {selected ? (
          <>
            <span className={`h-1.5 w-1.5 rounded-full ${selected.status === 'ativo' ? 'bg-emerald-400' : 'bg-gray-600'}`} />
            <span className="font-medium">{selected.codigo}</span>
            <span className="text-gray-400">·</span>
            <span className="text-gray-300 text-xs">{selected.nome}</span>
          </>
        ) : (
          <span className="text-gray-400">Selecionar lançamento</span>
        )}
        <ChevronDown size={14} className="text-gray-400 ml-1" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-20 mt-1 w-72 rounded-xl border border-gray-700 bg-gray-900 shadow-2xl overflow-hidden">
            <div className="p-1.5 space-y-0.5 max-h-64 overflow-y-auto">
              {lancamentos.map(l => (
                <button
                  key={l.codigo}
                  onClick={() => { onChange(l.codigo); setOpen(false) }}
                  className={`w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-gray-800
                    ${value === l.codigo ? 'bg-emerald-500/10 text-emerald-400' : 'text-gray-200'}
                  `}
                >
                  <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${l.status === 'ativo' ? 'bg-emerald-400' : 'bg-gray-600'}`} />
                  <span className="font-medium w-12 shrink-0">{l.codigo}</span>
                  <span className="truncate text-xs text-gray-400">{l.nome}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

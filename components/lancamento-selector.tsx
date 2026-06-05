'use client'

import { useEffect, useState } from 'react'
import { ChevronDown, Loader2 } from 'lucide-react'

interface Lancamento {
  codigo: string
  nome: string
  status: string | null
}

interface Props {
  value: string
  onChange: (codigo: string) => void
}

export default function LancamentoSelector({ value, onChange }: Props) {
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/lancamentos')
      .then(r => r.json())
      .then(data => {
        setLancamentos(data)
        if (!value && data.length > 0) onChange(data[0].codigo)
      })
      .finally(() => setLoading(false))
  }, [])

  const selected = lancamentos.find(l => l.codigo === value)

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-gray-800 px-3 py-2 text-sm text-gray-400">
        <Loader2 size={14} className="animate-spin" />
        Carregando...
      </div>
    )
  }

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

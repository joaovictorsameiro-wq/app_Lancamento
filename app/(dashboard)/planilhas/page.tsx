'use client'

import { useEffect, useState, useCallback } from 'react'
import { Sheet, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react'

type Lancamento = { codigo: string; nome: string; status: string | null }
type PlanilhaConfig = {
  id: string
  id_lancamento: string
  tipo: 'avatar' | 'aluno'
  spreadsheet_id: string
  ultima_sincronizacao: string | null
  linhas_importadas: number
  ultimo_erro: string | null
}

const TIPOS: { tipo: 'avatar' | 'aluno'; label: string }[] = [
  { tipo: 'avatar', label: 'Pesquisa de Avatar' },
  { tipo: 'aluno',  label: 'Pesquisa de Alunos' },
]

export default function PlanilhasPage() {
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([])
  const [planilhas, setPlanilhas] = useState<PlanilhaConfig[]>([])
  const [inputs, setInputs] = useState<Record<string, string>>({}) // key: `${lc}_${tipo}`
  const [syncing, setSyncing] = useState<string | null>(null)
  const [mensagem, setMensagem] = useState<Record<string, string>>({})

  const carregar = useCallback(async () => {
    const [ls, ps] = await Promise.all([
      fetch('/api/lancamentos').then(r => r.json()),
      fetch('/api/planilhas').then(r => r.json()),
    ])
    setLancamentos(Array.isArray(ls) ? ls : [])
    setPlanilhas(Array.isArray(ps) ? ps : [])
  }, [])

  useEffect(() => { carregar() }, [carregar])

  const configDe = (lc: string, tipo: string) => planilhas.find(p => p.id_lancamento === lc && p.tipo === tipo)

  async function salvar(lc: string, tipo: 'avatar' | 'aluno') {
    const key = `${lc}_${tipo}`
    const url = inputs[key]
    if (!url) return
    await fetch('/api/planilhas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idLancamento: lc, tipo, url }),
    })
    setInputs(prev => ({ ...prev, [key]: '' }))
    await carregar()
  }

  async function sincronizar(lc: string, tipo: 'avatar' | 'aluno') {
    const key = `${lc}_${tipo}`
    setSyncing(key)
    setMensagem(prev => ({ ...prev, [key]: '' }))
    try {
      const r = await fetch('/api/planilhas/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idLancamento: lc, tipo }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Erro ao sincronizar')
      setMensagem(prev => ({ ...prev, [key]: `${d.novosImportados} nova(s) resposta(s) importada(s) de ${d.totalNaPlanilha} na planilha` }))
    } catch (err) {
      setMensagem(prev => ({ ...prev, [key]: err instanceof Error ? err.message : 'Erro ao sincronizar' }))
    } finally {
      setSyncing(null)
      await carregar()
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-lg font-bold text-white flex items-center gap-2">
          <Sheet size={18} className="text-emerald-400" />
          Planilhas de Pesquisa
        </h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Cole o link (ou ID) da planilha do Google Sheets que o Google Forms alimenta, por lançamento.
          A planilha precisa estar compartilhada com <code className="text-emerald-400">{process.env.NEXT_PUBLIC_GOOGLE_SA_EMAIL ?? 'a conta de serviço configurada'}</code>.
        </p>
      </div>

      <div className="space-y-4">
        {lancamentos.filter(l => l.codigo.startsWith('LC')).map(lc => (
          <div key={lc.codigo} className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
            <p className="text-sm font-semibold text-white mb-3">{lc.codigo} · {lc.nome}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {TIPOS.map(({ tipo, label }) => {
                const key = `${lc.codigo}_${tipo}`
                const cfg = configDe(lc.codigo, tipo)
                return (
                  <div key={tipo} className="space-y-2">
                    <p className="text-xs text-gray-400">{label}</p>
                    <div className="flex gap-2">
                      <input
                        value={inputs[key] ?? cfg?.spreadsheet_id ?? ''}
                        onChange={e => setInputs(prev => ({ ...prev, [key]: e.target.value }))}
                        placeholder="Cole o link ou ID da planilha"
                        className="flex-1 rounded-lg border border-gray-700 bg-gray-800/80 px-3 py-2 text-xs text-gray-200"
                      />
                      <button
                        onClick={() => salvar(lc.codigo, tipo)}
                        className="text-xs px-3 py-2 rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800"
                      >
                        Salvar
                      </button>
                      {cfg && (
                        <button
                          onClick={() => sincronizar(lc.codigo, tipo)}
                          disabled={syncing === key}
                          className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-50"
                        >
                          <RefreshCw size={12} className={syncing === key ? 'animate-spin' : ''} />
                          Sincronizar
                        </button>
                      )}
                    </div>
                    {cfg && (
                      <p className="text-[10px] text-gray-600">
                        {cfg.ultima_sincronizacao
                          ? `Última sync: ${new Date(cfg.ultima_sincronizacao).toLocaleString('pt-BR')} · ${cfg.linhas_importadas} importadas no total`
                          : 'Ainda não sincronizado'}
                      </p>
                    )}
                    {mensagem[key] && (
                      <p className={`text-[10px] flex items-center gap-1 ${mensagem[key].includes('nova') ? 'text-emerald-400' : 'text-red-400'}`}>
                        {mensagem[key].includes('nova') ? <CheckCircle2 size={11} /> : <AlertCircle size={11} />}
                        {mensagem[key]}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

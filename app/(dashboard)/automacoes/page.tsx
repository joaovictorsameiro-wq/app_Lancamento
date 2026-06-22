'use client'

import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Check, X, Copy, RefreshCw, Zap, AlertTriangle, CheckCircle, Clock } from 'lucide-react'

type Automacao = {
  id: string
  nome: string
  descricao: string | null
  intervalo_minutos: number
  ultimo_ping: string | null
  ativo: boolean
}

type Status = 'ok' | 'alerta' | 'morta' | 'nunca'

function getStatus(a: Automacao): Status {
  if (!a.ultimo_ping) return 'nunca'
  const diff = (Date.now() - new Date(a.ultimo_ping).getTime()) / 60000
  if (diff <= a.intervalo_minutos) return 'ok'
  if (diff <= a.intervalo_minutos * 2) return 'alerta'
  return 'morta'
}

function fmtDiff(ping: string | null): string {
  if (!ping) return '—'
  const diff = Math.floor((Date.now() - new Date(ping).getTime()) / 60000)
  if (diff < 1) return 'agora mesmo'
  if (diff < 60) return `${diff} min atrás`
  const h = Math.floor(diff / 60)
  if (h < 24) return `${h}h atrás`
  return `${Math.floor(h / 24)}d atrás`
}

function fmtData(ping: string | null): string {
  if (!ping) return '—'
  return new Date(ping).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const STATUS_CONFIG = {
  ok:     { label: 'Ativo',    icon: CheckCircle,    cls: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  alerta: { label: 'Atrasado', icon: AlertTriangle,  cls: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/20' },
  morta:  { label: 'Parado',   icon: AlertTriangle,  cls: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/20' },
  nunca:  { label: 'Sem ping', icon: Clock,          cls: 'text-gray-500',    bg: 'bg-gray-800/50 border-gray-700' },
}

type FormAuto = { nome: string; descricao: string; intervalo_minutos: string }

function FormModal({ inicial, onSalvar, onFechar }: {
  inicial?: Partial<FormAuto>
  onSalvar: (f: FormAuto) => Promise<void>
  onFechar: () => void
}) {
  const [form, setForm] = useState<FormAuto>({
    nome: inicial?.nome ?? '',
    descricao: inicial?.descricao ?? '',
    intervalo_minutos: inicial?.intervalo_minutos ?? '60',
  })
  const [salvando, setSalvando] = useState(false)

  async function salvar() {
    if (!form.nome.trim()) return
    setSalvando(true)
    await onSalvar(form)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-700 bg-gray-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-white">{inicial?.nome ? 'Editar automação' : 'Nova automação'}</h2>
          <button onClick={onFechar} className="rounded-lg p-1.5 text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors"><X size={16} /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Nome *</label>
            <input autoFocus value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })}
              className="w-full rounded-lg bg-gray-800 border border-gray-600 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
              placeholder="ex: Extração Meta Ads" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Descrição</label>
            <textarea value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })}
              rows={2} className="w-full rounded-lg bg-gray-800 border border-gray-600 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none resize-none"
              placeholder="O que esta automação faz?" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Intervalo esperado entre pings <span className="text-gray-600 font-normal">(minutos)</span>
            </label>
            <input type="number" value={form.intervalo_minutos} onChange={e => setForm({ ...form, intervalo_minutos: e.target.value })}
              className="w-32 rounded-lg bg-gray-800 border border-gray-600 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
              placeholder="60" min="1" />
            <p className="text-xs text-gray-600 mt-1">Amarelo se passar desse tempo, vermelho se passar do dobro</p>
          </div>
        </div>
        <div className="flex gap-2 justify-end mt-5">
          <button onClick={onFechar} className="rounded-lg px-4 py-2 text-sm text-gray-400 hover:bg-gray-800 transition-colors">Cancelar</button>
          <button onClick={salvar} disabled={salvando || !form.nome.trim()}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors">
            <Check size={14} />{salvando ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}

function copiar(texto: string) {
  navigator.clipboard.writeText(texto)
}

export default function AutomacoesPage() {
  const [automacoes, setAutomacoes] = useState<Automacao[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<'novo' | Automacao | null>(null)
  const [copiado, setCopiado] = useState<string | null>(null)

  function carregar() {
    setLoading(true)
    fetch('/api/automacoes').then(r => r.json()).then(d => { setAutomacoes(d); setLoading(false) })
  }

  useEffect(() => { carregar() }, [])

  // Auto-refresh a cada 30s
  useEffect(() => {
    const t = setInterval(carregar, 30000)
    return () => clearInterval(t)
  }, [])

  async function salvarNovo(form: FormAuto) {
    const res = await fetch('/api/automacoes', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: form.nome, descricao: form.descricao || null, intervalo_minutos: parseInt(form.intervalo_minutos) || 60 }),
    })
    const nova = await res.json()
    setAutomacoes(prev => [...prev, nova])
    setModal(null)
  }

  async function salvarEdicao(form: FormAuto) {
    if (typeof modal !== 'object' || modal === null || !('id' in modal)) return
    const res = await fetch(`/api/automacoes/${modal.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: form.nome, descricao: form.descricao || null, intervalo_minutos: parseInt(form.intervalo_minutos) || 60 }),
    })
    const updated = await res.json()
    setAutomacoes(prev => prev.map(a => a.id === updated.id ? updated : a))
    setModal(null)
  }

  async function toggleAtivo(a: Automacao) {
    const res = await fetch(`/api/automacoes/${a.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ativo: !a.ativo }),
    })
    const updated = await res.json()
    setAutomacoes(prev => prev.map(x => x.id === updated.id ? updated : x))
  }

  async function deletar(id: string) {
    if (!confirm('Deletar esta automação?')) return
    await fetch(`/api/automacoes/${id}`, { method: 'DELETE' })
    setAutomacoes(prev => prev.filter(a => a.id !== id))
  }

  function copiarPingUrl(id: string) {
    const url = `${window.location.origin}/api/automacoes/ping`
    const payload = JSON.stringify({ id })
    copiar(payload)
    setCopiado(id)
    setTimeout(() => setCopiado(null), 2000)
  }

  const ok = automacoes.filter(a => a.ativo && getStatus(a) === 'ok').length
  const alerta = automacoes.filter(a => a.ativo && getStatus(a) === 'alerta').length
  const mortas = automacoes.filter(a => a.ativo && getStatus(a) === 'morta').length
  const nunca = automacoes.filter(a => a.ativo && getStatus(a) === 'nunca').length

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-app)' }}>
      {modal === 'novo' && <FormModal onSalvar={salvarNovo} onFechar={() => setModal(null)} />}
      {modal && typeof modal === 'object' && 'id' in modal && (
        <FormModal
          inicial={{ nome: modal.nome, descricao: modal.descricao ?? '', intervalo_minutos: String(modal.intervalo_minutos) }}
          onSalvar={salvarEdicao} onFechar={() => setModal(null)}
        />
      )}

      <div className="mx-auto max-w-full px-6 py-6 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold" style={{ color: 'var(--text-1)' }}>Monitor de Automações</h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-4)' }}>
              Cada automação N8N envia um ping ao concluir — aqui você vê se está viva
            </p>
          </div>
          <button onClick={carregar} className="rounded-xl p-2 text-gray-500 hover:bg-gray-800 hover:text-gray-300 transition-colors">
            <RefreshCw size={16} />
          </button>
          <button onClick={() => setModal('novo')}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition-colors">
            <Plus size={15} /> Nova automação
          </button>
        </div>

        {/* Resumo */}
        {automacoes.length > 0 && (
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Ativas', val: ok,     cls: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
              { label: 'Atrasadas', val: alerta, cls: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/20' },
              { label: 'Paradas', val: mortas, cls: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/20' },
              { label: 'Sem ping', val: nunca,  cls: 'text-gray-400',    bg: 'bg-gray-800/50 border-gray-700' },
            ].map(s => (
              <div key={s.label} className={`rounded-xl border p-4 ${s.bg}`}>
                <p className="text-xs text-gray-500">{s.label}</p>
                <p className={`text-2xl font-bold mt-1 ${s.cls}`}>{s.val}</p>
              </div>
            ))}
          </div>
        )}

        {/* Como usar */}
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Zap size={14} className="text-blue-400" />
            <p className="text-sm font-medium text-blue-400">Como integrar com N8N</p>
          </div>
          <p className="text-xs text-gray-400">
            No final de cada workflow, adicione um nó <strong className="text-gray-200">HTTP Request</strong> com:
          </p>
          <div className="rounded-lg bg-gray-900 p-3 font-mono text-xs text-gray-300 space-y-1">
            <p><span className="text-emerald-400">POST</span> {typeof window !== 'undefined' ? window.location.origin : 'https://seu-app.com'}/api/automacoes/ping</p>
            <p><span className="text-gray-500">Body:</span> {'{ "id": "ID_DA_AUTOMACAO" }'}</p>
          </div>
          <p className="text-xs text-gray-500">Clique em <strong className="text-gray-400">Copiar payload</strong> em cada automação para pegar o JSON pronto.</p>
        </div>

        {/* Lista */}
        {loading ? (
          <div className="flex items-center justify-center py-16 text-sm" style={{ color: 'var(--text-4)' }}>Carregando…</div>
        ) : automacoes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-3 text-center">
            <div className="rounded-full bg-gray-800 p-4"><Zap size={24} className="text-gray-600" /></div>
            <p className="text-sm text-gray-400">Nenhuma automação cadastrada</p>
            <p className="text-xs text-gray-600">Cadastre suas automações N8N e monitore se estão rodando</p>
          </div>
        ) : (
          <div className="space-y-3">
            {automacoes.map(a => {
              const st = getStatus(a)
              const stCfg = STATUS_CONFIG[st]
              const Icon = stCfg.icon

              return (
                <div key={a.id} className={`rounded-xl border p-4 transition-all ${!a.ativo ? 'opacity-40 border-gray-800 bg-gray-900/30' : stCfg.bg}`}>
                  <div className="flex items-start gap-3">
                    {/* Ícone de status */}
                    <div className="mt-0.5 shrink-0">
                      <Icon size={18} className={stCfg.cls} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{a.nome}</p>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${stCfg.cls} bg-current/10`}>
                          {stCfg.label}
                        </span>
                        {!a.ativo && <span className="text-xs text-gray-600 bg-gray-800 px-2 py-0.5 rounded-full">desativada</span>}
                      </div>
                      {a.descricao && <p className="text-xs mt-0.5" style={{ color: 'var(--text-4)' }}>{a.descricao}</p>}
                      <div className="mt-2 flex items-center gap-4 flex-wrap">
                        <span className="text-xs" style={{ color: 'var(--text-3)' }}>
                          Último ping: <strong>{fmtDiff(a.ultimo_ping)}</strong>
                          {a.ultimo_ping && <span className="text-gray-600"> — {fmtData(a.ultimo_ping)}</span>}
                        </span>
                        <span className="text-xs text-gray-600">Intervalo esperado: {a.intervalo_minutos} min</span>
                      </div>
                    </div>

                    {/* Ações */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => copiarPingUrl(a.id)} title="Copiar payload do ping"
                        className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
                          copiado === a.id ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-gray-200 hover:bg-gray-700'
                        }`}>
                        {copiado === a.id ? <><Check size={11} /> Copiado</> : <><Copy size={11} /> Copiar payload</>}
                      </button>
                      <button onClick={() => toggleAtivo(a)} title={a.ativo ? 'Desativar' : 'Ativar'}
                        className="rounded-lg p-1.5 text-gray-600 hover:text-amber-400 hover:bg-gray-700 transition-colors">
                        <Zap size={14} />
                      </button>
                      <button onClick={() => setModal(a)} className="rounded-lg p-1.5 text-gray-600 hover:text-blue-400 hover:bg-gray-700 transition-colors">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => deletar(a.id)} className="rounded-lg p-1.5 text-gray-600 hover:text-red-400 hover:bg-gray-700 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

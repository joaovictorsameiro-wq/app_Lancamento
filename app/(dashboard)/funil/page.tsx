'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import {
  GitFork, Plus, Save, Trash2, Layers, Type,
  RefreshCw, Loader2, Check, X,
  BarChart2, Link2,
} from 'lucide-react'
import LancamentoSelector from '../../../components/lancamento-selector'

// ─── Types ─────────────────────────────────────────────────────
interface FunnelNode {
  id: string
  type: 'etapa' | 'anotacao'
  titulo: string
  metrica?: number
  unidade?: string
  cor: string
  x: number
  y: number
  width: number
  height: number
  notas?: string
  fonte?: 'manual' | 'banco'
}
type EdgeFormula = 'target_por_source' | 'source_por_target'
type EdgeFormato = 'percent' | 'moeda' | 'numero' | 'x'
interface FunnelEdge {
  id: string; sourceId: string; targetId: string
  taxaConversao?: number // legado — mantido só pra funis antigos que não têm `formato`
  label?: string; formula?: EdgeFormula; multiplicador?: number; formato?: EdgeFormato
}
interface FunnelRecord { id: string; lancamento: string | null; nome: string; status: string; nodes: FunnelNode[]; edges: FunnelEdge[]; updated_at: string }
interface Metrica { categoria: string; key: string; label: string; valor: number; unidade: string; cor: string }

// Calcula o valor exibido numa ligação entre dois nós
function calcularEdge(edge: FunnelEdge, nodes: FunnelNode[]): { valor: number | null; label: string; formato: EdgeFormato } {
  const src = nodes.find(n => n.id === edge.sourceId)
  const tgt = nodes.find(n => n.id === edge.targetId)
  if (!src || !tgt || src.metrica == null || tgt.metrica == null) {
    return { valor: null, label: edge.label || 'Taxa', formato: edge.formato ?? 'percent' }
  }

  // Modo legado: ligações antigas sem `formato` definido mantêm o comportamento original
  if (!edge.formato) {
    if (src.metrica > 0 && src.unidade !== 'R$' && tgt.unidade !== 'R$') {
      return { valor: +((tgt.metrica / src.metrica) * 100).toFixed(2), label: edge.label || 'Taxa', formato: 'percent' }
    }
    return { valor: null, label: edge.label || 'Taxa', formato: 'percent' }
  }

  const formula = edge.formula ?? 'target_por_source'
  const mult = edge.multiplicador ?? 1
  const numerador = formula === 'source_por_target' ? src.metrica : tgt.metrica
  const denominador = formula === 'source_por_target' ? tgt.metrica : src.metrica
  if (!denominador) return { valor: null, label: edge.label || 'Taxa', formato: edge.formato }
  return { valor: (numerador / denominador) * mult, label: edge.label || 'Taxa', formato: edge.formato }
}

function formatarEdgeValor(valor: number | null, formato: EdgeFormato) {
  if (valor == null) return '—'
  if (formato === 'moeda') return `R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  if (formato === 'x') return `${valor.toFixed(2)}x`
  if (formato === 'numero') return valor.toLocaleString('pt-BR', { maximumFractionDigits: 1 })
  return `${valor.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`
}

const FORMULA_OPTIONS: { value: EdgeFormula; label: string }[] = [
  { value: 'target_por_source', label: 'Destino ÷ Origem' },
  { value: 'source_por_target', label: 'Origem ÷ Destino' },
]
const FORMATO_OPTIONS: { value: EdgeFormato; label: string }[] = [
  { value: 'percent', label: 'Percentual (%)' },
  { value: 'moeda', label: 'Moeda (R$)' },
  { value: 'numero', label: 'Número' },
  { value: 'x', label: 'Multiplicador (x)' },
]
const PRESETS_EDGE: { label: string; formula: EdgeFormula; multiplicador: number; formato: EdgeFormato }[] = [
  { label: 'CTR',          formula: 'target_por_source', multiplicador: 100,  formato: 'percent' },
  { label: 'Connect Rate', formula: 'target_por_source', multiplicador: 100,  formato: 'percent' },
  { label: 'Tx Conversão', formula: 'target_por_source', multiplicador: 100,  formato: 'percent' },
  { label: 'CPM',          formula: 'source_por_target', multiplicador: 1000, formato: 'moeda' },
  { label: 'CPL',          formula: 'source_por_target', multiplicador: 1,    formato: 'moeda' },
  { label: 'Ticket Médio', formula: 'source_por_target', multiplicador: 1,    formato: 'moeda' },
]

// ─── Toast ─────────────────────────────────────────────────────
function useToast() {
  const [msg, setMsg] = useState<{ text: string; type: 'ok' | 'err' } | null>(null)
  const show = (text: string, type: 'ok' | 'err' = 'ok') => {
    setMsg({ text, type })
    setTimeout(() => setMsg(null), 3000)
  }
  return { msg, show }
}

// ─── Canvas Node ───────────────────────────────────────────────
function CanvasNode({ node, selected, onSelect, onDrag, onStartConnect }: {
  node: FunnelNode; selected: boolean
  onSelect: (id: string) => void; onDrag: (id: string, x: number, y: number) => void
  onStartConnect: (id: string, clientX: number, clientY: number) => void
}) {
  const dragStart = useRef<{ mx: number; my: number; nx: number; ny: number } | null>(null)
  const didDrag = useRef(false)

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation()
    didDrag.current = false
    dragStart.current = { mx: e.clientX, my: e.clientY, nx: node.x, ny: node.y }
    const onMove = (ev: MouseEvent) => {
      if (!dragStart.current) return
      didDrag.current = true
      onDrag(node.id,
        Math.max(0, dragStart.current.nx + ev.clientX - dragStart.current.mx),
        Math.max(0, dragStart.current.ny + ev.clientY - dragStart.current.my),
      )
    }
    const onUp = () => {
      dragStart.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!didDrag.current) onSelect(node.id)
  }

  if (node.type === 'anotacao') {
    return (
      <div
        className={`absolute rounded-lg border-2 border-dashed p-3 cursor-grab select-none
          ${selected ? 'border-purple-500 bg-purple-500/10' : 'border-gray-600 bg-gray-800/60'}`}
        style={{ left: node.x, top: node.y, width: node.width, minHeight: node.height }}
        onMouseDown={handleMouseDown}
        onClick={handleClick}
      >
        <p className="text-xs text-gray-400 pointer-events-none">{node.notas || 'Anotação'}</p>
      </div>
    )
  }

  const fmt = (v?: number) => {
    if (v == null || v === 0) return '—'
    if (node.unidade === 'R$') return `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
    if (node.unidade === '%') return `${v.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`
    if (node.unidade === 'x') return `${v.toFixed(2)}x`
    return v.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
  }

  return (
    <div
      data-node-id={node.id}
      className={`group absolute rounded-xl border-2 flex flex-col overflow-visible cursor-grab select-none transition-shadow
        ${selected ? 'border-purple-500 shadow-lg shadow-purple-500/20' : 'border-gray-700 hover:border-gray-500'}`}
      style={{ left: node.x, top: node.y, width: node.width, height: node.height, background: '#151b2d' }}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
    >
      <div className="h-1 w-full shrink-0 rounded-t-[10px] overflow-hidden" style={{ backgroundColor: node.cor }} />
      <div className="flex-1 px-3 py-2 flex flex-col justify-between min-h-0">
        <div className="flex items-center justify-between gap-1">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider truncate">{node.titulo}</p>
          {node.fonte === 'banco' && (
            <span className="text-[8px] text-emerald-500 border border-emerald-500/30 rounded px-1 shrink-0">ao vivo</span>
          )}
        </div>
        <div>
          <p className="text-lg font-bold text-white tabular-nums leading-tight">{fmt(node.metrica)}</p>
          {node.unidade && node.unidade !== 'R$' && node.unidade !== '%' && node.unidade !== 'x' && (
            <p className="text-[10px] text-gray-500">{node.unidade}</p>
          )}
        </div>
      </div>

      {/* Handle de conexão — arraste até outro card pra criar uma ligação */}
      <div
        title="Arraste para conectar a outro card"
        className="absolute -right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 border-gray-600 bg-gray-900
          opacity-0 group-hover:opacity-100 hover:!border-purple-400 hover:bg-purple-500/20 transition-all cursor-crosshair
          flex items-center justify-center z-10"
        onMouseDown={e => { e.stopPropagation(); onStartConnect(node.id, e.clientX, e.clientY) }}
        onClick={e => e.stopPropagation()}
      >
        <div className="w-1.5 h-1.5 rounded-full bg-gray-500" />
      </div>
    </div>
  )
}

// ─── Painel de Métricas ────────────────────────────────────────
function MetricasPicker({ lancamentoId, onAdd, onClose }: {
  lancamentoId: string; onAdd: (m: Metrica) => void; onClose: () => void
}) {
  const [metricas, setMetricas] = useState<Metrica[]>([])
  const [loading, setLoading] = useState(true)
  const [catAtiva, setCatAtiva] = useState('Todos')
  const [adicionadas, setAdicionadas] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!lancamentoId) return
    setLoading(true)
    fetch(`/api/metricas-funil?id=${lancamentoId}`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setMetricas(data) })
      .finally(() => setLoading(false))
  }, [lancamentoId])

  const categorias = ['Todos', ...Array.from(new Set(metricas.map(m => m.categoria)))]
  const filtradas = catAtiva === 'Todos' ? metricas : metricas.filter(m => m.categoria === catAtiva)

  const fmt = (m: Metrica) => {
    if (m.unidade === 'R$') return `R$ ${m.valor.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`
    if (m.unidade === '%') return `${m.valor}%`
    if (m.unidade === 'x') return `${m.valor}x`
    return `${m.valor.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} ${m.unidade}`
  }

  const handleAdd = (m: Metrica) => {
    onAdd(m)
    setAdicionadas(prev => new Set([...prev, m.key]))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-[560px] max-h-[80vh] rounded-2xl border border-gray-700 bg-gray-900 shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <BarChart2 size={14} className="text-purple-400" /> Métricas disponíveis
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">Clique para adicionar como etapa no canvas — {lancamentoId}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300"><X size={16} /></button>
        </div>

        {/* Filtro categorias */}
        <div className="flex gap-1.5 p-3 border-b border-gray-800 flex-wrap">
          {categorias.map(cat => (
            <button
              key={cat}
              onClick={() => setCatAtiva(cat)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors
                ${catAtiva === cat
                  ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                  : 'border-gray-700 text-gray-500 hover:text-gray-300 hover:border-gray-600'}`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 gap-2 content-start">
          {loading ? (
            <div className="col-span-2 flex items-center justify-center py-10 text-gray-500 gap-2">
              <Loader2 size={14} className="animate-spin" /> Carregando métricas...
            </div>
          ) : filtradas.length === 0 ? (
            <p className="col-span-2 text-center text-xs text-gray-600 py-10">Sem métricas nessa categoria</p>
          ) : filtradas.map(m => {
            const adicionada = adicionadas.has(m.key)
            return (
              <button
                key={m.key}
                onClick={() => !adicionada && handleAdd(m)}
                className={`flex items-center justify-between rounded-xl border p-3 text-left transition-all
                  ${adicionada
                    ? 'border-emerald-500/30 bg-emerald-500/5 cursor-default'
                    : 'border-gray-700 bg-gray-800/60 hover:border-purple-500/40 hover:bg-purple-500/5 cursor-pointer'}`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: m.cor }} />
                  <div className="min-w-0">
                    <p className="text-xs text-gray-400 truncate">{m.categoria}</p>
                    <p className="text-xs font-medium text-white truncate">{m.label}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-2 shrink-0">
                  <span className="text-xs font-bold text-white tabular-nums">{fmt(m)}</span>
                  {adicionada
                    ? <Check size={12} className="text-emerald-400" />
                    : <Plus size={12} className="text-gray-500" />}
                </div>
              </button>
            )
          })}
        </div>

        <div className="p-3 border-t border-gray-800">
          <button onClick={onClose} className="w-full text-xs text-gray-400 hover:text-gray-200 py-2 transition-colors">
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Editor de Ligação ─────────────────────────────────────────
function EdgeEditor({ edge, srcNome, tgtNome, onUpdate, onDelete, onClose }: {
  edge: FunnelEdge; srcNome: string; tgtNome: string
  onUpdate: (id: string, data: Partial<FunnelEdge>) => void
  onDelete: (id: string) => void
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-[360px] rounded-2xl border border-gray-700 bg-gray-900 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Link2 size={14} className="text-purple-400" /> Editar ligação
            </h3>
            <p className="text-xs text-gray-500 mt-0.5 truncate">{srcNome} → {tgtNome}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300"><X size={16} /></button>
        </div>

        <div className="p-4 space-y-3">
          <div>
            <label className="text-[10px] text-gray-500 block mb-1">Atalhos</label>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS_EDGE.map(p => (
                <button
                  key={p.label}
                  onClick={() => onUpdate(edge.id, { label: p.label, formula: p.formula, multiplicador: p.multiplicador, formato: p.formato })}
                  className="text-[10px] px-2 py-1 rounded-full border border-gray-700 text-gray-400 hover:border-purple-500/50 hover:text-purple-300 transition-colors"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] text-gray-500 block mb-1">Rótulo</label>
            <input
              value={edge.label ?? ''}
              onChange={e => onUpdate(edge.id, { label: e.target.value })}
              placeholder="Ex: CTR, CPM, Connect Rate..."
              className="w-full rounded bg-gray-800 border border-gray-700 px-2 py-1.5 text-xs text-gray-200 outline-none focus:border-purple-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-gray-500 block mb-1">Fórmula</label>
              <select
                value={edge.formula ?? 'target_por_source'}
                onChange={e => onUpdate(edge.id, { formula: e.target.value as EdgeFormula })}
                className="w-full rounded bg-gray-800 border border-gray-700 px-2 py-1.5 text-xs text-gray-200 outline-none focus:border-purple-500"
              >
                {FORMULA_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-gray-500 block mb-1">Formato</label>
              <select
                value={edge.formato ?? 'percent'}
                onChange={e => onUpdate(edge.id, { formato: e.target.value as EdgeFormato })}
                className="w-full rounded bg-gray-800 border border-gray-700 px-2 py-1.5 text-xs text-gray-200 outline-none focus:border-purple-500"
              >
                {FORMATO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] text-gray-500 block mb-1">Multiplicador</label>
            <input
              type="number"
              value={edge.multiplicador ?? 1}
              onChange={e => onUpdate(edge.id, { multiplicador: Number(e.target.value) })}
              className="w-full rounded bg-gray-800 border border-gray-700 px-2 py-1.5 text-xs text-gray-200 outline-none focus:border-purple-500"
            />
            <p className="text-[10px] text-gray-600 mt-1">100 pra %, 1000 pra CPM, 1 pra valores diretos (CPL, ticket médio...)</p>
          </div>

          <button
            onClick={() => { onDelete(edge.id); onClose() }}
            className="w-full flex items-center justify-center gap-1.5 rounded-lg text-xs text-red-400 hover:bg-red-500/10 py-2 transition-colors border border-red-500/20"
          >
            <Trash2 size={11} /> Remover ligação
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────
export default function FunilPage() {
  const [funnels, setFunnels] = useState<FunnelRecord[]>([])
  const [activeFunnel, setActiveFunnel] = useState<FunnelRecord | null>(null)
  const [nodes, setNodes] = useState<FunnelNode[]>([])
  const [edges, setEdges] = useState<FunnelEdge[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [lancamentoId, setLancamentoId] = useState('')
  const [loadingFunnels, setLoadingFunnels] = useState(true)
  const [loadingDados, setLoadingDados] = useState(false)
  const [saving, setSaving] = useState(false)
  const [novoNome, setNovoNome] = useState('')
  const [criando, setCriando] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const [connecting, setConnecting] = useState<{ sourceId: string; x: number; y: number } | null>(null)
  const [edgePopoverId, setEdgePopoverId] = useState<string | null>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const { msg: toast, show: showToast } = useToast()

  const toCanvasCoords = (clientX: number, clientY: number) => {
    const el = canvasRef.current
    if (!el) return { x: 0, y: 0 }
    const rect = el.getBoundingClientRect()
    return { x: clientX - rect.left + el.scrollLeft, y: clientY - rect.top + el.scrollTop }
  }

  const criarEdge = useCallback((sourceId: string, targetId: string) => {
    setEdges(prev => {
      if (prev.some(e => e.sourceId === sourceId && e.targetId === targetId)) return prev
      const id = `e${Date.now()}`
      setTimeout(() => setEdgePopoverId(id), 0)
      return [...prev, { id, sourceId, targetId, label: 'Taxa', formula: 'target_por_source', multiplicador: 100, formato: 'percent' }]
    })
  }, [])

  const handleStartConnect = useCallback((sourceId: string, clientX: number, clientY: number) => {
    setConnecting({ sourceId, ...toCanvasCoords(clientX, clientY) })
    const onMove = (ev: MouseEvent) => {
      setConnecting(prev => prev ? { ...prev, ...toCanvasCoords(ev.clientX, ev.clientY) } : prev)
    }
    const onUp = (ev: MouseEvent) => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      const el = document.elementFromPoint(ev.clientX, ev.clientY)
      const targetEl = el?.closest('[data-node-id]') as HTMLElement | null
      const targetId = targetEl?.dataset.nodeId
      setConnecting(null)
      if (targetId && targetId !== sourceId) criarEdge(sourceId, targetId)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [criarEdge])

  const atualizarEdge = useCallback((id: string, data: Partial<FunnelEdge>) => {
    setEdges(prev => prev.map(e => e.id === id ? { ...e, ...data } : e))
  }, [])

  const removerEdge = useCallback((id: string) => {
    setEdges(prev => prev.filter(e => e.id !== id))
  }, [])

  const carregarFunnels = useCallback(async () => {
    setLoadingFunnels(true)
    try {
      const res = await fetch('/api/funnels')
      const data = await res.json()
      if (Array.isArray(data)) {
        setFunnels(data)
        if (data.length > 0 && !activeFunnel) abrirFunil(data[0])
      }
    } finally { setLoadingFunnels(false) }
  }, [])

  useEffect(() => { carregarFunnels() }, [carregarFunnels])

  const abrirFunil = (f: FunnelRecord) => {
    setActiveFunnel(f); setNodes(f.nodes ?? []); setEdges(f.edges ?? []); setSelectedId(null)
  }

  const criarFunil = async () => {
    const nome = novoNome.trim() || 'Novo Funil'
    const res = await fetch('/api/funnels', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, lancamento: lancamentoId || null }),
    })
    const data = await res.json()
    if (data.id) { await carregarFunnels(); setCriando(false); setNovoNome(''); showToast('Funil criado!') }
  }

  const salvar = async () => {
    if (!activeFunnel) return
    setSaving(true)
    try {
      await fetch(`/api/funnels/${activeFunnel.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes, edges }),
      })
      showToast('Salvo!')
      setFunnels(prev => prev.map(f => f.id === activeFunnel.id ? { ...f, nodes, edges } : f))
    } catch { showToast('Erro ao salvar', 'err') }
    finally { setSaving(false) }
  }

  const deletarFunil = async (id: string) => {
    await fetch(`/api/funnels/${id}`, { method: 'DELETE' })
    const remaining = funnels.filter(f => f.id !== id)
    setFunnels(remaining)
    if (activeFunnel?.id === id) {
      if (remaining.length > 0) abrirFunil(remaining[0])
      else { setActiveFunnel(null); setNodes([]); setEdges([]) }
    }
    showToast('Funil removido')
  }

  // Puxar funil padrão do lançamento (5 nós principais)
  const puxarFunilPadrao = useCallback(async () => {
    if (!lancamentoId) return
    setLoadingDados(true)
    try {
      const res = await fetch(`/api/funil?id=${lancamentoId}`)
      const data = await res.json()
      const f = data[0]
      if (!f) { showToast('Sem dados para esse lançamento', 'err'); return }
      const inv = Number(f.investimento_total); const leads = Number(f.total_leads)
      const vendas = Number(f.total_vendas); const fat = Number(f.faturamento_bruto)
      const cpl = Number(f.cpl); const conv = Number(f.taxa_conversao_pct)
      const ticket = vendas > 0 ? fat / vendas : 0

      const newNodes: FunnelNode[] = [
        { id: 'n1', type: 'etapa', titulo: 'Investimento',    metrica: inv,    unidade: 'R$',     cor: '#3b82f6', x: 60,  y: 200, width: 180, height: 100, fonte: 'banco' },
        { id: 'n2', type: 'etapa', titulo: 'Leads',           metrica: leads,  unidade: 'leads',  cor: '#8b5cf6', x: 300, y: 200, width: 180, height: 100, fonte: 'banco' },
        { id: 'n3', type: 'etapa', titulo: 'Vendas',          metrica: vendas, unidade: 'alunos', cor: '#10b981', x: 540, y: 200, width: 180, height: 100, fonte: 'banco' },
        { id: 'n4', type: 'etapa', titulo: 'Faturamento',     metrica: fat,    unidade: 'R$',     cor: '#06b6d4', x: 780, y: 200, width: 180, height: 100, fonte: 'banco' },
        { id: 'n5', type: 'etapa', titulo: 'CPL',             metrica: cpl,    unidade: 'R$',     cor: '#8b5cf6', x: 60,  y: 60,  width: 180, height: 100, fonte: 'banco' },
        { id: 'n6', type: 'etapa', titulo: 'Conversão',       metrica: conv,   unidade: '%',      cor: '#10b981', x: 300, y: 60,  width: 180, height: 100, fonte: 'banco' },
        { id: 'n7', type: 'etapa', titulo: 'Ticket Médio',    metrica: ticket, unidade: 'R$',     cor: '#f59e0b', x: 540, y: 60,  width: 180, height: 100, fonte: 'banco' },
      ]
      const newEdges: FunnelEdge[] = [
        { id: 'e1', sourceId: 'n1', targetId: 'n2' },
        { id: 'e2', sourceId: 'n2', targetId: 'n3' },
        { id: 'e3', sourceId: 'n3', targetId: 'n4' },
      ]
      setNodes(newNodes); setEdges(newEdges)
      showToast(`Funil do ${lancamentoId} carregado!`)
    } catch { showToast('Erro ao buscar dados', 'err') }
    finally { setLoadingDados(false) }
  }, [lancamentoId])

  // Adicionar métrica do picker como nó
  const addMetricaNode = (m: Metrica) => {
    const id = `m${Date.now()}`
    const xBase = 60 + (nodes.length % 5) * 210
    const yBase = 350 + Math.floor(nodes.length / 5) * 130
    setNodes(prev => [...prev, {
      id, type: 'etapa', titulo: m.label, metrica: m.valor,
      unidade: m.unidade, cor: m.cor,
      x: xBase, y: yBase, width: 180, height: 100, fonte: 'banco',
    }])
  }

  const handleDrag = useCallback((id: string, x: number, y: number) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, x, y } : n))
  }, [])

  const handleUpdate = useCallback((id: string, data: Partial<FunnelNode>) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, ...data } : n))
  }, [])

  const addNode = (type: FunnelNode['type']) => {
    const id = `n${Date.now()}`
    setNodes(prev => [...prev, {
      id, type,
      titulo: type === 'anotacao' ? 'Anotação' : 'Nova Etapa',
      metrica: 0, unidade: 'leads', cor: '#6366f1',
      x: 80 + (prev.length % 6) * 30, y: 200 + Math.floor(prev.length / 6) * 30,
      width: type === 'anotacao' ? 220 : 180,
      height: type === 'anotacao' ? 80 : 100,
      notas: type === 'anotacao' ? 'Digite sua anotação aqui' : undefined,
    }])
  }

  const removerSelecionado = () => {
    if (!selectedId) return
    setNodes(prev => prev.filter(n => n.id !== selectedId))
    setEdges(prev => prev.filter(e => e.sourceId !== selectedId && e.targetId !== selectedId))
    setSelectedId(null)
  }

  const edgesComCalculo = edges.map(edge => ({ edge, ...calcularEdge(edge, nodes) }))
  const edgePopover = edgePopoverId ? edges.find(e => e.id === edgePopoverId) : null

  const selectedNode = nodes.find(n => n.id === selectedId)

  return (
    <div className="flex h-screen overflow-hidden">

      {/* ── Sidebar ── */}
      <aside className="w-56 bg-gray-950 border-r border-gray-800 flex flex-col shrink-0 overflow-y-auto">
        <div className="p-3 border-b border-gray-800">
          <h2 className="text-xs font-bold text-white flex items-center gap-1.5 mb-3">
            <GitFork size={13} className="text-purple-400" /> Canvas de Funis
          </h2>
          {criando ? (
            <div className="space-y-2">
              <input
                autoFocus value={novoNome} onChange={e => setNovoNome(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') criarFunil(); if (e.key === 'Escape') setCriando(false) }}
                placeholder="Nome do funil..."
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-2 py-1.5 text-xs text-white outline-none focus:border-purple-500"
              />
              <div className="flex gap-1">
                <button onClick={criarFunil} className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs py-1.5 transition-colors">
                  <Check size={10} /> Criar
                </button>
                <button onClick={() => setCriando(false)} className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-gray-800 text-gray-400 text-xs py-1.5 transition-colors">
                  <X size={10} /> Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setCriando(true)} className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs py-2 transition-colors">
              <Plus size={11} /> Novo Funil
            </button>
          )}
        </div>

        {/* Lista de funis */}
        <div className="p-2 border-b border-gray-800">
          {loadingFunnels ? (
            <div className="flex items-center gap-2 px-2 py-3 text-xs text-gray-500"><Loader2 size={11} className="animate-spin" /> Carregando...</div>
          ) : funnels.length === 0 ? (
            <p className="px-2 py-3 text-xs text-gray-600">Nenhum funil ainda</p>
          ) : funnels.map(f => (
            <div key={f.id}
              className={`group flex items-center justify-between rounded-lg px-2 py-1.5 mb-0.5 cursor-pointer transition-colors
                ${activeFunnel?.id === f.id ? 'bg-purple-500/10 text-purple-400' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'}`}
              onClick={() => abrirFunil(f)}
            >
              <span className="text-xs truncate flex-1">{f.nome}</span>
              <button onClick={e => { e.stopPropagation(); deletarFunil(f.id) }}
                className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all ml-1 shrink-0">
                <Trash2 size={10} />
              </button>
            </div>
          ))}
        </div>

        {/* Componentes */}
        <div className="p-3 border-b border-gray-800 space-y-1.5">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Adicionar</p>
          <button onClick={() => addNode('etapa')}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs text-gray-300 transition-colors border border-gray-700">
            <Layers size={12} className="text-gray-500" /> Etapa do Funil
          </button>
          <button
            onClick={() => { if (!lancamentoId) { showToast('Selecione um lançamento primeiro', 'err'); return }; setShowPicker(true) }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs text-gray-300 transition-colors border border-gray-700"
          >
            <BarChart2 size={12} className="text-purple-400" /> Métrica de Lançamento
          </button>
          <button onClick={() => addNode('anotacao')}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs text-gray-300 transition-colors border border-gray-700">
            <Type size={12} className="text-gray-500" /> Anotação
          </button>
        </div>

        {/* Propriedades do nó selecionado */}
        {selectedNode && (
          <div className="p-3 border-b border-gray-800 space-y-2.5">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Propriedades</p>

            <div>
              <label className="text-[10px] text-gray-500 block mb-1">Título</label>
              <input
                value={selectedNode.titulo}
                onChange={e => handleUpdate(selectedNode.id, { titulo: e.target.value })}
                className="w-full rounded bg-gray-800 border border-gray-700 px-2 py-1 text-xs text-gray-200 outline-none focus:border-purple-500"
              />
            </div>

            {selectedNode.type === 'anotacao' ? (
              <div>
                <label className="text-[10px] text-gray-500 block mb-1">Texto</label>
                <textarea
                  value={selectedNode.notas ?? ''}
                  onChange={e => handleUpdate(selectedNode.id, { notas: e.target.value })}
                  rows={3}
                  className="w-full rounded bg-gray-800 border border-gray-700 px-2 py-1 text-xs text-gray-200 outline-none focus:border-purple-500 resize-none"
                />
              </div>
            ) : (
              <>
                <div>
                  <label className="text-[10px] text-gray-500 block mb-1">Valor</label>
                  <input
                    type="number"
                    value={selectedNode.metrica ?? 0}
                    onChange={e => handleUpdate(selectedNode.id, { metrica: Number(e.target.value), fonte: 'manual' })}
                    className="w-full rounded bg-gray-800 border border-gray-700 px-2 py-1 text-xs text-gray-200 outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 block mb-1">Unidade</label>
                  <select
                    value={selectedNode.unidade ?? 'leads'}
                    onChange={e => handleUpdate(selectedNode.id, { unidade: e.target.value })}
                    className="w-full rounded bg-gray-800 border border-gray-700 px-2 py-1 text-xs text-gray-200 outline-none focus:border-purple-500"
                  >
                    {['leads', 'alunos', 'cliques', 'visitantes', 'R$', '%', 'x', 'presentes', 'impr.', 'resp.'].map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 block mb-1">Cor</label>
                  <input type="color" value={selectedNode.cor}
                    onChange={e => handleUpdate(selectedNode.id, { cor: e.target.value })}
                    className="w-full h-7 rounded cursor-pointer bg-gray-800 border border-gray-700" />
                </div>
              </>
            )}

            <button onClick={removerSelecionado}
              className="w-full flex items-center justify-center gap-1.5 rounded-lg text-xs text-red-400 hover:bg-red-500/10 py-1.5 transition-colors">
              <Trash2 size={11} /> Remover
            </button>
          </div>
        )}

        {/* Simulação rápida */}
        {nodes.some(n => n.unidade === 'leads') && nodes.some(n => n.unidade === 'alunos') && (
          <div className="p-3 mt-auto">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Simulação</p>
            {(() => {
              const totalLeads  = nodes.find(n => n.unidade === 'leads')?.metrica ?? 0
              const totalVendas = nodes.find(n => n.unidade === 'alunos')?.metrica ?? 0
              const taxa = totalLeads > 0 ? (totalVendas / totalLeads * 100) : 0
              return (
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Conversão</span>
                    <span className="text-purple-400 font-medium">{taxa.toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Leads</span>
                    <span className="text-white">{totalLeads.toLocaleString('pt-BR')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Vendas</span>
                    <span className="text-emerald-400">{totalVendas}</span>
                  </div>
                </div>
              )
            })()}
          </div>
        )}
      </aside>

      {/* ── Canvas ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="h-12 bg-gray-950 border-b border-gray-800 flex items-center justify-between px-4 shrink-0 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-medium text-gray-200 truncate">{activeFunnel?.nome ?? 'Selecione um funil'}</span>
            {activeFunnel && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 shrink-0">
                {activeFunnel.status}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <LancamentoSelector value={lancamentoId} onChange={setLancamentoId} />

            <button
              onClick={puxarFunilPadrao}
              disabled={!lancamentoId || loadingDados}
              className="flex items-center gap-1.5 text-xs font-medium text-emerald-300 hover:text-emerald-200 border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loadingDados ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
              Funil padrão
            </button>

            {activeFunnel && (
              <button onClick={salvar} disabled={saving}
                className="flex items-center gap-1.5 text-xs font-medium text-white bg-purple-600 hover:bg-purple-500 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50">
                {saving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
                Salvar
              </button>
            )}
          </div>
        </div>

        {/* Canvas area */}
        <div
          ref={canvasRef}
          className="flex-1 relative overflow-auto bg-[#0c1018] cursor-default"
          style={{ backgroundImage: 'radial-gradient(circle, #1e2535 1px, transparent 1px)', backgroundSize: '24px 24px' }}
          onClick={() => setSelectedId(null)}
        >
          <svg className="absolute inset-0 pointer-events-none" style={{ width: '100%', height: '100%', minWidth: 1400, minHeight: 700 }}>
            <defs>
              <marker id="arrow" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="#4b5563" />
              </marker>
            </defs>
            {edgesComCalculo.map(({ edge }) => {
              const src = nodes.find(n => n.id === edge.sourceId)
              const tgt = nodes.find(n => n.id === edge.targetId)
              if (!src || !tgt) return null
              const x1 = src.x + src.width; const y1 = src.y + src.height / 2
              const x2 = tgt.x;             const y2 = tgt.y + tgt.height / 2
              const mx = (x1 + x2) / 2
              return (
                <path key={edge.id} d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`}
                  stroke="#374151" strokeWidth="1.5" fill="none" markerEnd="url(#arrow)" />
              )
            })}
            {connecting && (() => {
              const src = nodes.find(n => n.id === connecting.sourceId)
              if (!src) return null
              const x1 = src.x + src.width; const y1 = src.y + src.height / 2
              return (
                <path d={`M ${x1} ${y1} L ${connecting.x} ${connecting.y}`}
                  stroke="#a855f7" strokeWidth="1.5" strokeDasharray="4 3" fill="none" />
              )
            })()}
          </svg>

          <div className="absolute inset-0" style={{ minWidth: 1400, minHeight: 700 }}>
            {nodes.map(node => (
              <CanvasNode key={node.id} node={node} selected={selectedId === node.id}
                onSelect={setSelectedId} onDrag={handleDrag} onStartConnect={handleStartConnect} />
            ))}

            {/* Chips com o valor calculado de cada ligação (CTR, CPM, Connect Rate...) */}
            {edgesComCalculo.map(({ edge, valor, label, formato }) => {
              const src = nodes.find(n => n.id === edge.sourceId)
              const tgt = nodes.find(n => n.id === edge.targetId)
              if (!src || !tgt) return null
              const x1 = src.x + src.width; const y1 = src.y + src.height / 2
              const x2 = tgt.x;             const y2 = tgt.y + tgt.height / 2
              const mx = (x1 + x2) / 2; const my = (y1 + y2) / 2
              return (
                <button
                  key={edge.id}
                  onClick={e => { e.stopPropagation(); setEdgePopoverId(edge.id) }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 z-10 flex items-center gap-1.5 rounded-full border border-gray-700 bg-gray-900/95 px-2.5 py-1 text-[10px] hover:border-purple-500/60 transition-colors shadow"
                  style={{ left: mx, top: my }}
                >
                  <span className="text-gray-500 uppercase tracking-wide">{label}</span>
                  <span className="text-white font-semibold tabular-nums">{formatarEdgeValor(valor, formato)}</span>
                </button>
              )
            })}

            {nodes.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                <GitFork size={32} className="text-gray-700 mb-3" />
                <p className="text-sm font-medium text-gray-500">Canvas vazio</p>
                <p className="text-xs text-gray-600 mt-1">
                  Clique em <span className="text-emerald-500">Funil padrão</span> para carregar automaticamente,
                  <br />ou em <span className="text-emerald-500">Métricas</span> para escolher individualmente
                </p>
              </div>
            )}
            {nodes.length > 1 && (
              <p className="absolute bottom-3 left-3 text-[10px] text-gray-600 pointer-events-none">
                Passe o mouse na borda direita de um card e arraste até outro pra ligar — clique na ligação pra configurar o rótulo (CPM, CTR, Connect Rate...)
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Editor de ligação */}
      {edgePopover && (
        <EdgeEditor
          edge={edgePopover}
          srcNome={nodes.find(n => n.id === edgePopover.sourceId)?.titulo ?? '?'}
          tgtNome={nodes.find(n => n.id === edgePopover.targetId)?.titulo ?? '?'}
          onUpdate={atualizarEdge}
          onDelete={removerEdge}
          onClose={() => setEdgePopoverId(null)}
        />
      )}

      {/* Modal picker de métricas */}
      {showPicker && (
        <MetricasPicker
          lancamentoId={lancamentoId}
          onAdd={addMetricaNode}
          onClose={() => setShowPicker(false)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm shadow-2xl
          ${toast.type === 'ok' ? 'bg-gray-900 border-emerald-500/30 text-emerald-300' : 'bg-gray-900 border-red-500/30 text-red-300'}`}>
          {toast.type === 'ok' ? <Check size={14} /> : <X size={14} />}
          {toast.text}
        </div>
      )}
    </div>
  )
}

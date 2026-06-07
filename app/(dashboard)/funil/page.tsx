'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import {
  GitFork, Plus, Save, Trash2, Layers, Type,
  RefreshCw, Loader2, Check, X, Download,
} from 'lucide-react'
import LancamentoSelector from '../../../components/lancamento-selector'
import type { FunilRow } from '../../../lib/db/lancamentos'

// ─── Types ────────────────────────────────────────────────────
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
  fonte?: 'manual' | 'banco' // origem do dado
}

interface FunnelEdge {
  id: string
  sourceId: string
  targetId: string
  taxaConversao?: number
}

interface FunnelRecord {
  id: string
  lancamento: string | null
  nome: string
  status: string
  nodes: FunnelNode[]
  edges: FunnelEdge[]
  updated_at: string
}

// ─── Cores padrão por etapa ───────────────────────────────────
const ETAPA_CORES: Record<string, string> = {
  visitantes:  '#3b82f6',
  leads:       '#8b5cf6',
  presentes:   '#f59e0b',
  vendas:      '#10b981',
  faturamento: '#06b6d4',
}

// ─── Toast simples ────────────────────────────────────────────
function useToast() {
  const [msg, setMsg] = useState<{ text: string; type: 'ok' | 'err' } | null>(null)
  const show = (text: string, type: 'ok' | 'err' = 'ok') => {
    setMsg({ text, type })
    setTimeout(() => setMsg(null), 3000)
  }
  return { msg, show }
}

// ─── Canvas Node ──────────────────────────────────────────────
function CanvasNode({
  node, selected, onSelect, onUpdate, onDrag,
}: {
  node: FunnelNode
  selected: boolean
  onSelect: (id: string) => void
  onUpdate: (id: string, data: Partial<FunnelNode>) => void
  onDrag: (id: string, x: number, y: number) => void
}) {
  const dragStart = useRef<{ mx: number; my: number; nx: number; ny: number } | null>(null)

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation()
    onSelect(node.id)
    dragStart.current = { mx: e.clientX, my: e.clientY, nx: node.x, ny: node.y }
    const onMove = (ev: MouseEvent) => {
      if (!dragStart.current) return
      onDrag(node.id,
        dragStart.current.nx + ev.clientX - dragStart.current.mx,
        dragStart.current.ny + ev.clientY - dragStart.current.my,
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

  if (node.type === 'anotacao') {
    return (
      <div
        className={`absolute rounded-lg border-2 border-dashed p-3 cursor-grab select-none
          ${selected ? 'border-purple-500 bg-purple-500/10' : 'border-gray-600 bg-gray-800/60'}`}
        style={{ left: node.x, top: node.y, width: node.width }}
        onMouseDown={handleMouseDown}
      >
        <p className="text-xs text-gray-400">{node.notas || 'Anotação'}</p>
      </div>
    )
  }

  const fmt = (v?: number) => {
    if (v == null || v === 0) return '—'
    if (node.unidade === 'R$') return `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
    return v.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
  }

  return (
    <div
      className={`absolute rounded-xl border-2 flex flex-col overflow-hidden cursor-grab select-none transition-shadow
        ${selected ? 'border-purple-500 shadow-lg shadow-purple-500/20' : 'border-gray-700 hover:border-gray-500'}`}
      style={{ left: node.x, top: node.y, width: node.width, height: node.height, background: '#151b2d' }}
      onMouseDown={handleMouseDown}
    >
      <div className="h-1 w-full shrink-0" style={{ backgroundColor: node.cor }} />
      <div className="flex-1 p-3 flex flex-col justify-between min-h-0">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider truncate">{node.titulo}</p>
        <div>
          <p className="text-xl font-bold text-white tabular-nums leading-tight">{fmt(node.metrica)}</p>
          {node.unidade && node.unidade !== 'R$' && (
            <p className="text-[10px] text-gray-500 mt-0.5">{node.unidade}</p>
          )}
          {node.fonte === 'banco' && (
            <span className="inline-block mt-1 text-[9px] text-emerald-500 border border-emerald-500/30 rounded px-1">ao vivo</span>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────
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
  const canvasRef = useRef<HTMLDivElement>(null)
  const { msg: toast, show: showToast } = useToast()

  // Carregar lista de funis
  const carregarFunnels = useCallback(async () => {
    setLoadingFunnels(true)
    try {
      const res = await fetch('/api/funnels')
      const data = await res.json()
      if (Array.isArray(data)) {
        setFunnels(data)
        if (!activeFunnel && data.length > 0) {
          abrirFunil(data[0])
        }
      }
    } finally {
      setLoadingFunnels(false)
    }
  }, [])

  useEffect(() => { carregarFunnels() }, [carregarFunnels])

  const abrirFunil = (f: FunnelRecord) => {
    setActiveFunnel(f)
    setNodes(f.nodes ?? [])
    setEdges(f.edges ?? [])
    setSelectedId(null)
  }

  // Criar novo funil
  const criarFunil = async () => {
    const nome = novoNome.trim() || 'Novo Funil'
    const res = await fetch('/api/funnels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, lancamento: lancamentoId || null }),
    })
    const data = await res.json()
    if (data.id) {
      await carregarFunnels()
      setCriando(false)
      setNovoNome('')
      showToast('Funil criado!')
    }
  }

  // Salvar funil atual
  const salvar = async () => {
    if (!activeFunnel) return
    setSaving(true)
    try {
      await fetch(`/api/funnels/${activeFunnel.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes, edges }),
      })
      showToast('Salvo com sucesso!')
      setFunnels(prev => prev.map(f => f.id === activeFunnel.id ? { ...f, nodes, edges } : f))
    } catch {
      showToast('Erro ao salvar', 'err')
    } finally {
      setSaving(false)
    }
  }

  // Deletar funil
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

  // Puxar dados reais do lançamento selecionado
  const puxarDados = useCallback(async () => {
    if (!lancamentoId) return
    setLoadingDados(true)
    try {
      const res = await fetch(`/api/funil?id=${lancamentoId}`)
      const data: FunilRow[] = await res.json()
      const f = data[0]
      if (!f) { showToast('Sem dados para esse lançamento', 'err'); return }

      const inv    = Number(f.investimento_total)
      const leads  = Number(f.total_leads)
      const vendas = Number(f.total_vendas)
      const fat    = Number(f.faturamento_bruto)
      const ticket = vendas > 0 ? fat / vendas : 0

      const newNodes: FunnelNode[] = [
        { id: 'n1', type: 'etapa', titulo: 'Investimento', metrica: inv,    unidade: 'R$',       cor: '#3b82f6', x: 60,  y: 180, width: 180, height: 100, fonte: 'banco' },
        { id: 'n2', type: 'etapa', titulo: 'Leads',        metrica: leads,  unidade: 'leads',     cor: '#8b5cf6', x: 300, y: 180, width: 180, height: 100, fonte: 'banco' },
        { id: 'n3', type: 'etapa', titulo: 'Vendas',       metrica: vendas, unidade: 'alunos',    cor: '#10b981', x: 540, y: 180, width: 180, height: 100, fonte: 'banco' },
        { id: 'n4', type: 'etapa', titulo: 'Faturamento',  metrica: fat,    unidade: 'R$',        cor: '#06b6d4', x: 780, y: 180, width: 180, height: 100, fonte: 'banco' },
        { id: 'n5', type: 'etapa', titulo: 'Ticket Médio', metrica: ticket, unidade: 'R$',        cor: '#f59e0b', x: 780, y: 60,  width: 180, height: 80,  fonte: 'banco' },
      ]
      const newEdges: FunnelEdge[] = [
        { id: 'e1', sourceId: 'n1', targetId: 'n2' },
        { id: 'e2', sourceId: 'n2', targetId: 'n3' },
        { id: 'e3', sourceId: 'n3', targetId: 'n4' },
      ]
      setNodes(newNodes)
      setEdges(newEdges)
      showToast(`Dados do ${lancamentoId} aplicados!`)
    } catch {
      showToast('Erro ao buscar dados', 'err')
    } finally {
      setLoadingDados(false)
    }
  }, [lancamentoId])

  // Drag
  const handleDrag = useCallback((id: string, x: number, y: number) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, x: Math.max(0, x), y: Math.max(0, y) } : n))
  }, [])

  const handleUpdate = useCallback((id: string, data: Partial<FunnelNode>) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, ...data } : n))
  }, [])

  // Adicionar nó
  const addNode = (type: FunnelNode['type']) => {
    const id = `n${Date.now()}`
    setNodes(prev => [...prev, {
      id, type,
      titulo: type === 'anotacao' ? 'Anotação' : 'Nova Etapa',
      metrica: 0, unidade: 'leads', cor: '#6366f1',
      x: 80 + prev.length * 20, y: 200,
      width: type === 'anotacao' ? 200 : 180,
      height: type === 'anotacao' ? 60 : 100,
      notas: type === 'anotacao' ? 'Digite sua nota aqui' : undefined,
    }])
  }

  // Remover selecionado
  const removerSelecionado = () => {
    if (!selectedId) return
    setNodes(prev => prev.filter(n => n.id !== selectedId))
    setEdges(prev => prev.filter(e => e.sourceId !== selectedId && e.targetId !== selectedId))
    setSelectedId(null)
  }

  // Calcular taxas de conversão nas arestas
  const edgesComTaxa = edges.map(edge => {
    const src = nodes.find(n => n.id === edge.sourceId)
    const tgt = nodes.find(n => n.id === edge.targetId)
    if (src?.metrica && tgt?.metrica && src.metrica > 0 && src.unidade !== 'R$' && tgt.unidade !== 'R$') {
      return { ...edge, taxaConversao: +((tgt.metrica / src.metrica) * 100).toFixed(1) }
    }
    return edge
  })

  const selectedNode = nodes.find(n => n.id === selectedId)

  return (
    <div className="flex h-screen overflow-hidden">

      {/* ── Sidebar esquerda ── */}
      <aside className="w-56 bg-gray-950 border-r border-gray-800 flex flex-col shrink-0">
        {/* Header */}
        <div className="p-4 border-b border-gray-800">
          <h2 className="text-xs font-bold text-white flex items-center gap-1.5 mb-3">
            <GitFork size={13} className="text-purple-400" /> Canvas de Funis
          </h2>
          {criando ? (
            <div className="space-y-2">
              <input
                autoFocus
                value={novoNome}
                onChange={e => setNovoNome(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') criarFunil(); if (e.key === 'Escape') setCriando(false) }}
                placeholder="Nome do funil..."
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-2 py-1.5 text-xs text-white outline-none focus:border-purple-500"
              />
              <div className="flex gap-1">
                <button onClick={criarFunil} className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs py-1.5">
                  <Check size={10} /> Criar
                </button>
                <button onClick={() => setCriando(false)} className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 text-xs py-1.5">
                  <X size={10} /> Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setCriando(true)}
              className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs py-2 transition-colors"
            >
              <Plus size={11} /> Novo Funil
            </button>
          )}
        </div>

        {/* Lista de funis */}
        <div className="p-2 border-b border-gray-800 overflow-y-auto" style={{ maxHeight: 200 }}>
          {loadingFunnels ? (
            <div className="flex items-center gap-2 px-2 py-3 text-xs text-gray-500">
              <Loader2 size={11} className="animate-spin" /> Carregando...
            </div>
          ) : funnels.length === 0 ? (
            <p className="px-2 py-3 text-xs text-gray-600">Nenhum funil ainda</p>
          ) : (
            funnels.map(f => (
              <div
                key={f.id}
                className={`group flex items-center justify-between rounded-lg px-2 py-1.5 mb-0.5 cursor-pointer transition-colors
                  ${activeFunnel?.id === f.id ? 'bg-purple-500/10 text-purple-400' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'}`}
                onClick={() => abrirFunil(f)}
              >
                <span className="text-xs truncate flex-1">{f.nome}</span>
                <button
                  onClick={e => { e.stopPropagation(); deletarFunil(f.id) }}
                  className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all ml-1"
                >
                  <Trash2 size={10} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Componentes */}
        <div className="p-3 border-b border-gray-800 space-y-1.5">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Componentes</p>
          {[
            { type: 'etapa' as const, icon: Layers, label: 'Etapa do Funil' },
            { type: 'anotacao' as const, icon: Type, label: 'Anotação' },
          ].map(({ type, icon: Icon, label }) => (
            <button
              key={type}
              onClick={() => addNode(type)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs text-gray-300 transition-colors border border-gray-700"
            >
              <Icon size={12} className="text-gray-500" /> {label}
            </button>
          ))}
        </div>

        {/* Propriedades do nó selecionado */}
        {selectedNode && selectedNode.type === 'etapa' && (
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
                {['leads', 'alunos', 'cliques', 'visitantes', 'R$', 'presentes'].map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-gray-500 block mb-1">Cor</label>
              <input
                type="color"
                value={selectedNode.cor}
                onChange={e => handleUpdate(selectedNode.id, { cor: e.target.value })}
                className="w-full h-7 rounded cursor-pointer bg-gray-800 border border-gray-700"
              />
            </div>
            <button
              onClick={removerSelecionado}
              className="w-full flex items-center justify-center gap-1.5 rounded-lg text-xs text-red-400 hover:bg-red-500/10 py-1.5 transition-colors"
            >
              <Trash2 size={11} /> Remover
            </button>
          </div>
        )}

        {/* Simulador rápido */}
        {nodes.some(n => n.unidade === 'leads') && nodes.some(n => n.unidade === 'alunos') && (
          <div className="p-3 mt-auto border-t border-gray-800">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Simulação</p>
            {(() => {
              const totalLeads  = nodes.find(n => n.unidade === 'leads')?.metrica ?? 0
              const totalVendas = nodes.find(n => n.unidade === 'alunos')?.metrica ?? 0
              const taxa = totalLeads > 0 ? (totalVendas / totalLeads * 100) : 0
              const ticket = nodes.find(n => n.titulo === 'Ticket Médio' || n.titulo === 'Faturamento')?.metrica ?? 0
              return (
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Conversão real</span>
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
                  {ticket > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Ticket</span>
                      <span className="text-cyan-400">R${ticket.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
                    </div>
                  )}
                </div>
              )
            })()}
          </div>
        )}
      </aside>

      {/* ── Área principal ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Toolbar topo */}
        <div className="h-12 bg-gray-950 border-b border-gray-800 flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-200">
              {activeFunnel?.nome ?? 'Selecione um funil'}
            </span>
            {activeFunnel && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                {activeFunnel.status}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Seletor de lançamento + puxar dados */}
            <LancamentoSelector value={lancamentoId} onChange={setLancamentoId} />
            <button
              onClick={puxarDados}
              disabled={!lancamentoId || loadingDados}
              className="flex items-center gap-1.5 text-xs font-medium text-emerald-300 hover:text-emerald-200 border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loadingDados ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
              Puxar dados
            </button>
            {/* Salvar */}
            {activeFunnel && (
              <button
                onClick={salvar}
                disabled={saving}
                className="flex items-center gap-1.5 text-xs font-medium text-white bg-purple-600 hover:bg-purple-500 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
                Salvar
              </button>
            )}
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-200 border border-gray-700 rounded-lg px-3 py-1.5 transition-colors"
            >
              <Download size={11} /> Exportar
            </button>
          </div>
        </div>

        {/* Canvas */}
        <div
          ref={canvasRef}
          className="flex-1 relative overflow-auto bg-[#0c1018] cursor-default"
          style={{
            backgroundImage: 'radial-gradient(circle, #1e2535 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
          onClick={() => setSelectedId(null)}
        >
          {/* SVG arestas */}
          <svg
            className="absolute inset-0 pointer-events-none"
            style={{ width: '100%', height: '100%', minWidth: 1400, minHeight: 700 }}
          >
            <defs>
              <marker id="arrow" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="#4b5563" />
              </marker>
            </defs>
            {edgesComTaxa.map(edge => {
              const src = nodes.find(n => n.id === edge.sourceId)
              const tgt = nodes.find(n => n.id === edge.targetId)
              if (!src || !tgt) return null
              const x1 = src.x + src.width
              const y1 = src.y + src.height / 2
              const x2 = tgt.x
              const y2 = tgt.y + tgt.height / 2
              const mx = (x1 + x2) / 2
              return (
                <g key={edge.id}>
                  <path
                    d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`}
                    stroke="#374151"
                    strokeWidth="1.5"
                    fill="none"
                    markerEnd="url(#arrow)"
                  />
                  {edge.taxaConversao != null && (
                    <text x={mx} y={Math.min(y1, y2) - 6} fill="#6b7280" fontSize="11" textAnchor="middle" fontFamily="monospace">
                      {edge.taxaConversao.toFixed(1)}%
                    </text>
                  )}
                </g>
              )
            })}
          </svg>

          {/* Nós */}
          <div className="absolute inset-0" style={{ minWidth: 1400, minHeight: 700 }}>
            {nodes.map(node => (
              <CanvasNode
                key={node.id}
                node={node}
                selected={selectedId === node.id}
                onSelect={setSelectedId}
                onUpdate={handleUpdate}
                onDrag={handleDrag}
              />
            ))}

            {nodes.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                <div className="w-14 h-14 rounded-2xl bg-gray-800/60 flex items-center justify-center mb-4">
                  <GitFork size={28} className="text-gray-600" />
                </div>
                <p className="text-sm font-medium text-gray-500">Canvas vazio</p>
                <p className="text-xs text-gray-600 mt-1">
                  Selecione um lançamento e clique em <span className="text-emerald-500">Puxar dados</span>,<br />
                  ou adicione etapas manualmente na barra lateral
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm shadow-2xl transition-all
          ${toast.type === 'ok'
            ? 'bg-gray-900 border-emerald-500/30 text-emerald-300'
            : 'bg-gray-900 border-red-500/30 text-red-300'}`}
        >
          {toast.type === 'ok' ? <Check size={14} /> : <X size={14} />}
          {toast.text}
        </div>
      )}
    </div>
  )
}

'use client'

import { useEffect, useState, useCallback } from 'react'
import { BarChart2, TrendingDown, Users, Zap, Target, Bell, ShoppingCart, Eye, MousePointerClick } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar
} from 'recharts'
import { useLancamento } from '../../../components/lancamento-context'
import { fmt_currency, fmt_pct } from '../../../lib/format'

type Breakdown = {
  tipo: string
  gasto: number
  leads: number
  impressoes: number
  cliques: number
}

type Campanha = {
  campanha: string
  tipo: string
  gasto: number
  leads: number
  impressoes: number
  cliques: number
  ctr: number
  cpm: number
  cpl: number | null
}

type DiarioDado = {
  dia: string
  gasto: number
  gasto_captacao: number
  leads: number
  cpl: number
}

const TIPO_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  captacao_pq: { label: 'Captação Quente',  color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20',   icon: Zap },
  captacao_pf: { label: 'Captação Fria',    color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20', icon: Users },
  captacao:    { label: 'Captação',         color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20',   icon: Users },
  aquecimento: { label: 'Aquecimento',      color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20', icon: TrendingDown },
  distribuicao:{ label: 'Distribuição',     color: 'text-teal-400',   bg: 'bg-teal-500/10 border-teal-500/20',   icon: BarChart2 },
  lembrete:    { label: 'Lembrete Evento',  color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20', icon: Bell },
  remarketing: { label: 'Remarketing',      color: 'text-pink-400',   bg: 'bg-pink-500/10 border-pink-500/20',   icon: Target },
  venda:       { label: 'Venda/Carrinho',   color: 'text-emerald-400',bg: 'bg-emerald-500/10 border-emerald-500/20', icon: ShoppingCart },
  outros:      { label: 'Outros',           color: 'text-gray-400',   bg: 'bg-gray-500/10 border-gray-500/20',   icon: BarChart2 },
}

function tipoLabel(tipo: string) {
  return TIPO_CONFIG[tipo]?.label ?? tipo
}
function tipoBadgeClass(tipo: string) {
  const cfg = TIPO_CONFIG[tipo]
  if (!cfg) return 'bg-gray-500/10 text-gray-400 border border-gray-500/20'
  return `${cfg.bg} ${cfg.color} border text-xs px-2 py-0.5 rounded-full`
}

const CHART_COLORS = {
  gasto: '#f59e0b',
  gasto_captacao: '#60a5fa',
  leads: '#34d399',
}

export default function TrafegoPage() {
  const { lancamentoId } = useLancamento()
  const [breakdown, setBreakdown] = useState<Breakdown[]>([])
  const [campanhas, setCampanhas] = useState<Campanha[]>([])
  const [diario, setDiario]       = useState<DiarioDado[]>([])
  const [loading, setLoading]     = useState(false)
  const [filtroCampanha, setFiltro] = useState<string>('todos')

  const fetchAll = useCallback(async () => {
    if (!lancamentoId) return
    setLoading(true)
    try {
      const [b, c, d] = await Promise.all([
        fetch(`/api/trafego?id=${lancamentoId}&view=breakdown`).then(r => r.json()),
        fetch(`/api/trafego?id=${lancamentoId}&view=campanhas`).then(r => r.json()),
        fetch(`/api/trafego?id=${lancamentoId}&view=diario`).then(r => r.json()),
      ])
      setBreakdown(Array.isArray(b) ? b : [])
      setCampanhas(Array.isArray(c) ? c : [])
      setDiario(Array.isArray(d) ? d : [])
    } finally {
      setLoading(false)
    }
  }, [lancamentoId])

  useEffect(() => { fetchAll() }, [fetchAll])

  // Derivados
  const totalGasto    = breakdown.reduce((s, r) => s + r.gasto, 0)
  const captacaoRows  = breakdown.filter(r => r.tipo.startsWith('captacao'))
  const gastoCaptacao = captacaoRows.reduce((s, r) => s + r.gasto, 0)
  const totalLeads    = captacaoRows.reduce((s, r) => s + r.leads, 0)
  const cplReal       = totalLeads > 0 ? gastoCaptacao / totalLeads : 0

  const rowPQ  = breakdown.find(r => r.tipo === 'captacao_pq')
  const rowPF  = breakdown.find(r => r.tipo === 'captacao_pf')
  const leadsPQ   = rowPQ?.leads ?? 0
  const leadsPF   = rowPF?.leads ?? 0
  const gastoPQ   = rowPQ?.gasto ?? 0
  const gastoPF   = rowPF?.gasto ?? 0
  const cplPQ     = leadsPQ > 0 ? gastoPQ / leadsPQ : 0
  const cplPF     = leadsPF > 0 ? gastoPF / leadsPF : 0

  const tiposSecundarios = ['aquecimento', 'distribuicao', 'lembrete', 'remarketing', 'venda', 'outros']
  const secundarios = tiposSecundarios
    .map(t => ({ tipo: t, ...((breakdown.find(r => r.tipo === t)) ?? { gasto: 0, leads: 0, impressoes: 0, cliques: 0 }) }))
    .filter(r => r.gasto > 0)

  // Filtro de campanhas
  const tiposUnicos = ['todos', ...Array.from(new Set(campanhas.map(c => c.tipo)))]
  const campanhasFiltradas = filtroCampanha === 'todos'
    ? campanhas
    : campanhas.filter(c => c.tipo === filtroCampanha)

  const chartData = diario.map(d => ({
    dia: d.dia?.slice(5), // MM-DD
    'Gasto Total': Number(d.gasto?.toFixed(0)),
    'Gasto Captação': Number(d.gasto_captacao?.toFixed(0)),
    'Leads': d.leads,
  }))

  if (!lancamentoId) {
    return (
      <div className="flex h-full items-center justify-center text-gray-500">
        Selecione um lançamento
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <BarChart2 size={18} className="text-emerald-400" />
            Tráfego Meta Ads
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">Breakdown por tipo de campanha · CPL real baseado só em captação</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Investimento Total</p>
          <p className="text-xl font-bold text-white">{fmt_currency(totalGasto)}</p>
        </div>
      </div>

      {/* CAPTAÇÃO — seção principal */}
      <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 space-y-4">
        <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Captação de Leads</p>

        {/* KPI row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-gray-500">Total Leads</p>
            <p className="text-2xl font-bold text-white">{totalLeads.toLocaleString('pt-BR')}</p>
            <p className="text-xs text-gray-600">Invest.: {fmt_currency(gastoCaptacao)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-gray-500">CPL Real (só captação)</p>
            <p className="text-2xl font-bold text-blue-400">{fmt_currency(cplReal)}</p>
            <p className="text-xs text-gray-600">por lead</p>
          </div>

          {/* PQ */}
          <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-3 space-y-1">
            <p className="text-xs text-blue-400 font-medium">🔥 Público Quente (PQ)</p>
            <p className="text-lg font-bold text-white">{leadsPQ.toLocaleString('pt-BR')} leads</p>
            <p className="text-xs text-gray-400">CPL: <span className="text-blue-300">{fmt_currency(cplPQ)}</span> · Invest: {fmt_currency(gastoPQ)}</p>
          </div>

          {/* PF */}
          <div className="rounded-lg bg-violet-500/10 border border-violet-500/20 p-3 space-y-1">
            <p className="text-xs text-violet-400 font-medium">❄️ Público Frio (PF)</p>
            <p className="text-lg font-bold text-white">{leadsPF.toLocaleString('pt-BR')} leads</p>
            <p className="text-xs text-gray-400">CPL: <span className="text-violet-300">{fmt_currency(cplPF)}</span> · Invest: {fmt_currency(gastoPF)}</p>
          </div>
        </div>
      </div>

      {/* Outros tipos de campanha */}
      {secundarios.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {secundarios.map(r => {
            const cfg = TIPO_CONFIG[r.tipo] ?? TIPO_CONFIG['outros']
            const Icon = cfg.icon
            return (
              <div key={r.tipo} className={`rounded-xl border p-3 space-y-2 ${cfg.bg}`}>
                <div className="flex items-center gap-1.5">
                  <Icon size={13} className={cfg.color} />
                  <p className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</p>
                </div>
                <p className="text-lg font-bold text-white">{fmt_currency(r.gasto)}</p>
                <p className="text-xs text-gray-500">
                  {r.impressoes > 0 ? `${(r.impressoes / 1000).toFixed(0)}k impr.` : '—'}
                  {r.cliques > 0 ? ` · ${r.cliques.toLocaleString('pt-BR')} cliques` : ''}
                </p>
              </div>
            )
          })}
        </div>
      )}

      {/* Gráfico diário */}
      {chartData.length > 0 && (
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
            Evolução Diária — Leads × Investimento
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="dia" tick={{ fontSize: 10, fill: '#6b7280' }} />
              <YAxis yAxisId="leads" orientation="left"  tick={{ fontSize: 10, fill: '#6b7280' }} />
              <YAxis yAxisId="gasto" orientation="right" tick={{ fontSize: 10, fill: '#6b7280' }}
                tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8 }}
                labelStyle={{ color: '#9ca3af', fontSize: 11 }}
                formatter={(val: number, name: string) =>
                  name === 'Leads' ? [val, name] : [fmt_currency(val), name]
                }
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line yAxisId="leads" type="monotone" dataKey="Leads"
                stroke={CHART_COLORS.leads} strokeWidth={2} dot={false} />
              <Line yAxisId="gasto" type="monotone" dataKey="Gasto Total"
                stroke={CHART_COLORS.gasto} strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
              <Line yAxisId="gasto" type="monotone" dataKey="Gasto Captação"
                stroke={CHART_COLORS.gasto_captacao} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tabela de campanhas */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Campanhas · {campanhasFiltradas.length} de {campanhas.length}
          </p>
          {/* Filtro por tipo */}
          <div className="flex gap-1.5 flex-wrap">
            {tiposUnicos.map(t => (
              <button
                key={t}
                onClick={() => setFiltro(t)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  filtroCampanha === t
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                    : 'border-gray-700 text-gray-500 hover:text-gray-300'
                }`}
              >
                {t === 'todos' ? 'Todas' : tipoLabel(t)}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="pb-2 text-left text-gray-400 font-medium">Campanha</th>
                <th className="pb-2 text-left text-gray-400 font-medium">Tipo</th>
                <th className="pb-2 text-right text-gray-400 font-medium">Gasto</th>
                <th className="pb-2 text-right text-gray-400 font-medium">Leads</th>
                <th className="pb-2 text-right text-gray-400 font-medium">CPL</th>
                <th className="pb-2 text-right text-gray-400 font-medium">CTR</th>
                <th className="pb-2 text-right text-gray-400 font-medium">CPM</th>
                <th className="pb-2 text-right text-gray-400 font-medium">Impr.</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={8} className="py-8 text-center text-gray-500">Carregando...</td></tr>
              )}
              {!loading && campanhasFiltradas.length === 0 && (
                <tr><td colSpan={8} className="py-8 text-center text-gray-500">Nenhuma campanha encontrada</td></tr>
              )}
              {campanhasFiltradas.map((c, i) => (
                <tr key={i} className="border-b border-gray-800/60 hover:bg-gray-800/20">
                  <td className="py-2.5 pr-4">
                    <span
                      className="text-gray-200 max-w-xs truncate block cursor-help"
                      title={c.campanha}
                    >
                      {c.campanha}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4">
                    <span className={tipoBadgeClass(c.tipo)}>{tipoLabel(c.tipo)}</span>
                  </td>
                  <td className="py-2.5 text-right text-gray-200 tabular-nums">{fmt_currency(c.gasto)}</td>
                  <td className="py-2.5 text-right tabular-nums">
                    {c.leads > 0
                      ? <span className="text-emerald-400 font-medium">{c.leads.toLocaleString('pt-BR')}</span>
                      : <span className="text-gray-600">—</span>}
                  </td>
                  <td className="py-2.5 text-right tabular-nums">
                    {c.cpl != null
                      ? <span className="text-blue-400">{fmt_currency(c.cpl)}</span>
                      : <span className="text-gray-600">—</span>}
                  </td>
                  <td className="py-2.5 text-right text-gray-400 tabular-nums">
                    {c.ctr ? `${Number(c.ctr).toFixed(2)}%` : '—'}
                  </td>
                  <td className="py-2.5 text-right text-gray-400 tabular-nums">
                    {c.cpm ? fmt_currency(c.cpm) : '—'}
                  </td>
                  <td className="py-2.5 text-right text-gray-500 tabular-nums">
                    {c.impressoes > 0 ? `${(c.impressoes / 1000).toFixed(0)}k` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
            {campanhasFiltradas.length > 0 && (
              <tfoot>
                <tr className="border-t border-gray-700">
                  <td className="pt-2 text-gray-400 font-medium" colSpan={2}>Total filtrado</td>
                  <td className="pt-2 text-right text-white font-medium tabular-nums">
                    {fmt_currency(campanhasFiltradas.reduce((s, c) => s + c.gasto, 0))}
                  </td>
                  <td className="pt-2 text-right text-emerald-400 font-medium tabular-nums">
                    {campanhasFiltradas.reduce((s, c) => s + c.leads, 0).toLocaleString('pt-BR')}
                  </td>
                  <td colSpan={4} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  )
}

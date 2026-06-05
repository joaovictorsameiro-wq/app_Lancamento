'use client'

import { useEffect, useState, useCallback } from 'react'
import { Activity, RefreshCw, AlertTriangle, Zap } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar
} from 'recharts'
import KpiCard from '../../../components/kpi-card'
import DataTable from '../../../components/data-table'
import LancamentoSelector from '../../../components/lancamento-selector'
import AlertBanner from '../../../components/alert-banner'
import { fmt_currency, fmt_number, fmt_pct } from '../../../lib/format'
import type { TrafegoDiario, AnuncioScore } from '../../../lib/db/trafego'
import type { FunilRow } from '../../../lib/db/lancamentos'

const CPL_META = 25 // R$ — alerta se CPL > este valor
const CONVERSAO_META = 1.5 // % — alerta se conversão < este valor

type Alert = { type: 'warning' | 'error'; title: string; message: string }

export default function TempoRealPage() {
  const [lancamentoId, setLancamentoId] = useState('')
  const [funil, setFunil] = useState<FunilRow | null>(null)
  const [diario, setDiario] = useState<TrafegoDiario[]>([])
  const [anuncios, setAnuncios] = useState<AnuncioScore[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const fetchData = useCallback(async () => {
    if (!lancamentoId) return
    setLoading(true)
    try {
      const [funilData, diarioData, anunciosData] = await Promise.all([
        fetch(`/api/funil?id=${lancamentoId}`).then(r => r.json()),
        fetch(`/api/trafego?id=${lancamentoId}&view=diario`).then(r => r.json()),
        fetch(`/api/trafego?id=${lancamentoId}&view=anuncios`).then(r => r.json()),
      ])
      const f: FunilRow | null = Array.isArray(funilData) && funilData.length > 0 ? funilData[0] : null
      setFunil(f)
      setDiario(Array.isArray(diarioData) ? diarioData : [])
      setAnuncios(Array.isArray(anunciosData) ? anunciosData : [])
      setLastUpdate(new Date())

      // Calcular alertas
      const newAlerts: Alert[] = []
      if (f) {
        if (f.cpl > CPL_META) {
          newAlerts.push({
            type: 'warning',
            title: `CPL acima da meta`,
            message: `CPL atual de ${fmt_currency(f.cpl)} está acima do limite de ${fmt_currency(CPL_META)}.`,
          })
        }
        if (f.taxa_conversao_pct < CONVERSAO_META) {
          newAlerts.push({
            type: 'warning',
            title: 'Taxa de conversão baixa',
            message: `Conversão atual de ${fmt_pct(f.taxa_conversao_pct, 2)} está abaixo da meta de ${fmt_pct(CONVERSAO_META, 1)}.`,
          })
        }
        if (f.roi < 1) {
          newAlerts.push({
            type: 'error',
            title: 'ROI negativo',
            message: `ROI de ${fmt_pct(f.roi * 100, 1)} — faturamento menor que investimento.`,
          })
        }
      }
      setAlerts(newAlerts)
    } finally {
      setLoading(false)
    }
  }, [lancamentoId])

  useEffect(() => { fetchData() }, [fetchData])

  // Auto-refresh a cada 5 minutos
  useEffect(() => {
    const interval = setInterval(fetchData, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchData])

  // KPIs calculados direto do tráfego quando a view funil não tem o LC
  const totalLeads = funil?.total_leads ?? diario.reduce((s, d) => s + (d.leads ?? 0), 0)
  const totalGasto = funil?.investimento_total ?? diario.reduce((s, d) => s + (d.gasto ?? 0), 0)
  const cplCalculado = funil?.cpl ?? (totalLeads > 0 ? totalGasto / totalLeads : 0)
  const totalVendas = funil?.total_vendas ?? null
  const taxaConversao = funil?.taxa_conversao_pct ?? null

  // Score de anúncios (baseado em CTR × leads / CPL)
  const anunciosComScore = anuncios.map(a => ({
    ...a,
    score: a.leads > 0 && a.cpl > 0
      ? Math.round((a.ctr_medio * (a.leads / a.cpl)) * 10)
      : 0,
  })).sort((a, b) => b.score - a.score)

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Zap size={18} className="text-emerald-400" />
            Monitoramento em Tempo Real
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">Funil ao vivo · tráfego · alertas automáticos</p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdate && (
            <button
              onClick={fetchData}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
              {lastUpdate.toLocaleTimeString('pt-BR')}
            </button>
          )}
          <LancamentoSelector value={lancamentoId} onChange={setLancamentoId} />
        </div>
      </div>

      {/* Alertas */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((a, i) => (
            <AlertBanner key={i} type={a.type} title={a.title} message={a.message} />
          ))}
        </div>
      )}

      {/* KPIs em tempo real */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard title="Leads Captados" value={totalLeads > 0 ? fmt_number(totalLeads) : '—'} icon={Activity} accent="blue" loading={loading} />
        <KpiCard title="CPL Atual" value={cplCalculado > 0 ? fmt_currency(cplCalculado) : '—'} icon={AlertTriangle} accent={cplCalculado > CPL_META ? 'red' : 'emerald'} loading={loading} />
        <KpiCard title="Compradores" value={totalVendas != null ? fmt_number(totalVendas) : '—'} icon={Activity} accent="emerald" loading={loading} />
        <KpiCard title="Conversão" value={taxaConversao != null ? fmt_pct(taxaConversao, 2) : '—'} icon={Activity} accent={taxaConversao != null && taxaConversao < CONVERSAO_META ? 'amber' : 'emerald'} loading={loading} />
      </div>

      {/* Gráfico diário de leads + gasto */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-5">
        <h2 className="text-sm font-semibold text-white mb-4">Evolução Diária — Leads × Investimento</h2>
        {diario.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={diario} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="dia" tick={{ fontSize: 10 }} tickFormatter={v => {
                if (!v) return ''
                const d = new Date(v)
                return isNaN(d.getTime()) ? v : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
              }} />
              <YAxis yAxisId="leads" orientation="left" tick={{ fontSize: 10 }} />
              <YAxis yAxisId="gasto" orientation="right" tick={{ fontSize: 10 }} tickFormatter={v => `R$${v}`} />
              <Tooltip
                contentStyle={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 8 }}
                labelStyle={{ color: '#9ca3af', fontSize: 11 }}
                itemStyle={{ fontSize: 11 }}
                labelFormatter={(label: string) => {
                  const d = new Date(label)
                  return isNaN(d.getTime()) ? label : d.toLocaleDateString('pt-BR')
                }}
                formatter={(v: number, name: string) =>
                  name === 'Gasto (R$)' ? [fmt_currency(v), 'Gasto'] : [fmt_number(v), 'Leads']
                }
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line yAxisId="leads" type="monotone" dataKey="leads" stroke="#3b82f6" strokeWidth={2} dot={false} name="Leads" />
              <Line yAxisId="gasto" type="monotone" dataKey="gasto" stroke="#f59e0b" strokeWidth={2} dot={false} name="Gasto (R$)" />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-gray-500 text-center py-8">{loading ? 'Carregando...' : 'Selecione um lançamento'}</p>
        )}
      </div>

      {/* Score de anúncios */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-5">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-semibold text-white">Score de Anúncios</h2>
          <span className="text-xs text-gray-500">{anunciosComScore.length} anúncios</span>
        </div>
        <p className="text-xs text-gray-500 mb-4">Ranking por CTR × Leads / CPL — quanto maior, melhor o anúncio</p>
        <div className="max-h-96 overflow-y-auto pr-1">
          <DataTable
            loading={loading}
            columns={[
              {
                key: 'anuncio', label: 'Anúncio', render: r => (
                  <span className="text-xs text-gray-200 truncate block max-w-48" title={r.anuncio as string}>
                    {(r.anuncio as string)?.slice(0, 40) || '—'}
                  </span>
                )
              },
              { key: 'leads', label: 'Leads', align: 'right', sortable: true, render: r => fmt_number(r.leads as number) },
              { key: 'ctr_medio', label: 'CTR', align: 'right', sortable: true, render: r => fmt_pct(r.ctr_medio as number, 2) },
              { key: 'cpc_medio', label: 'CPC', align: 'right', sortable: true, render: r => fmt_currency(r.cpc_medio as number) },
              { key: 'cpl', label: 'CPL', align: 'right', sortable: true, render: r => fmt_currency(r.cpl as number) },
              {
                key: 'score', label: 'Score', align: 'right', sortable: true,
                render: r => (
                  <span className={`font-bold tabular-nums ${(r.score as number) > 50 ? 'text-emerald-400' : (r.score as number) > 20 ? 'text-amber-400' : 'text-red-400'}`}>
                    {fmt_number(r.score as number)}
                  </span>
                )
              },
            ]}
            data={anunciosComScore as unknown as Record<string, unknown>[]}
          />
        </div>
      </div>
    </div>
  )
}

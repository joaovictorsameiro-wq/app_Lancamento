'use client'

import { useEffect, useState } from 'react'
import {
  DollarSign, Users, ShoppingCart, TrendingUp,
  Target, BarChart2, Activity, RefreshCw
} from 'lucide-react'
import KpiCard from '../../../components/kpi-card'
import FunilChart from '../../../components/funil-chart'
import LancamentoSelector from '../../../components/lancamento-selector'
import { fmt_currency, fmt_number, fmt_pct } from '../../../lib/format'
import type { FunilRow } from '../../../lib/db/lancamentos'

type Lancamento = {
  codigo: string
  nome: string
  status: string | null
  meta_faturamento: number | null
}

export default function OverviewPage() {
  const [lancamentoId, setLancamentoId] = useState('')
  const [funil, setFunil] = useState<FunilRow | null>(null)
  const [lancamento, setLancamento] = useState<Lancamento | null>(null)
  const [historico, setHistorico] = useState<FunilRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  useEffect(() => {
    if (!lancamentoId) return
    setLoading(true)
    setError(null)
    Promise.all([
      fetch(`/api/funil?id=${lancamentoId}`).then(r => r.json()),
      fetch('/api/lancamentos').then(r => r.json()),
      fetch('/api/funil').then(r => r.json()),
    ]).then(([funilData, lancs, hist]) => {
      // Se algum retornou erro da API, exibir mensagem
      const apiError = [funilData, lancs, hist].find(d => d && typeof d === 'object' && !Array.isArray(d) && d.error)
      if (apiError) {
        setError(apiError.error)
        return
      }
      setFunil(Array.isArray(funilData) ? (funilData[0] ?? null) : null)
      setLancamento(Array.isArray(lancs) ? (lancs.find((l: Lancamento) => l.codigo === lancamentoId) ?? null) : null)
      setHistorico(Array.isArray(hist) ? hist.slice(0, 10) : [])
      setLastUpdate(new Date())
    }).catch(err => setError(err?.message ?? 'Erro de conexão')).finally(() => setLoading(false))
  }, [lancamentoId])

  // Calcular comparativo com lançamento anterior
  const anteriorIdx = historico.findIndex(h => h.lancamento === lancamentoId)
  const anterior = anteriorIdx >= 0 ? historico[anteriorIdx + 1] : null

  const trendFaturamento = anterior && funil
    ? ((funil.faturamento_bruto - anterior.faturamento_bruto) / anterior.faturamento_bruto) * 100
    : undefined

  const metaPct = lancamento?.meta_faturamento && funil
    ? (funil.faturamento_bruto / lancamento.meta_faturamento) * 100
    : null

  return (
    <div className="p-6 space-y-6">
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 flex items-center gap-2 text-sm text-red-400">
          <span className="font-semibold">Erro ao carregar dados:</span>
          <span className="text-red-300">{error}</span>
        </div>
      )}
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Visão Geral</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Consolidado executivo do lançamento selecionado
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdate && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <RefreshCw size={11} />
              {lastUpdate.toLocaleTimeString('pt-BR')}
            </div>
          )}
          <LancamentoSelector value={lancamentoId} onChange={setLancamentoId} />
        </div>
      </div>

      {/* Meta progress */}
      {metaPct != null && lancamento?.meta_faturamento && (
        <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Target size={14} className="text-emerald-400" />
              <p className="text-xs font-medium text-gray-300">Progresso da Meta</p>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm font-bold text-white">{fmt_pct(metaPct, 1)}</span>
              <span className="text-xs text-gray-500">de {fmt_currency(lancamento.meta_faturamento, true)}</span>
            </div>
          </div>
          <div className="h-2 rounded-full bg-gray-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${metaPct >= 100 ? 'bg-emerald-400' : metaPct >= 70 ? 'bg-amber-400' : 'bg-red-400'}`}
              style={{ width: `${Math.min(metaPct, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          title="Faturamento Bruto"
          value={funil ? fmt_currency(funil.faturamento_bruto, true) : '—'}
          trend={trendFaturamento}
          trendLabel="vs anterior"
          icon={DollarSign}
          accent="emerald"
          loading={loading}
        />
        <KpiCard
          title="Total de Leads"
          value={funil ? fmt_number(funil.total_leads) : '—'}
          subtitle={funil ? `CPL: ${fmt_currency(funil.cpl)}` : undefined}
          icon={Users}
          accent="blue"
          loading={loading}
        />
        <KpiCard
          title="Vendas Aprovadas"
          value={funil ? fmt_number(funil.total_vendas) : '—'}
          subtitle={funil ? `Conv: ${fmt_pct(funil.taxa_conversao_pct, 2)}` : undefined}
          icon={ShoppingCart}
          accent="purple"
          loading={loading}
        />
        <KpiCard
          title="ROI"
          value={funil ? fmt_pct(funil.roi * 100, 1) : '—'}
          subtitle={funil ? `Investido: ${fmt_currency(funil.investimento_total, true)}` : undefined}
          higherIsBetter={true}
          icon={TrendingUp}
          accent={funil && funil.roi > 1 ? 'emerald' : 'red'}
          loading={loading}
        />
      </div>

      {/* Funil + Histórico */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        {/* Funil visual */}
        <div className="lg:col-span-2 rounded-xl border border-gray-800 bg-gray-900/60 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={15} className="text-blue-400" />
            <h2 className="text-sm font-semibold text-white">Funil do Lançamento</h2>
          </div>
          {funil ? (
            <FunilChart
              investimento={funil.investimento_total}
              leads={funil.total_leads}
              avatar={funil.respostas_avatar}
              compradores={funil.total_vendas}
              faturamento={funil.faturamento_bruto}
            />
          ) : (
            <p className="text-sm text-gray-500 text-center py-8">
              {loading ? 'Carregando...' : 'Selecione um lançamento'}
            </p>
          )}
        </div>

        {/* Histórico comparativo */}
        <div className="lg:col-span-3 rounded-xl border border-gray-800 bg-gray-900/60 p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 size={15} className="text-purple-400" />
            <h2 className="text-sm font-semibold text-white">Histórico de Lançamentos</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-800">
                  {['LC', 'Investido', 'Leads', 'CPL', 'Vendas', 'Faturamento', 'ROI', 'Conv.'].map(h => (
                    <th key={h} className="pb-2 pt-1 text-left font-medium text-gray-500 uppercase tracking-wider pr-3">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {historico.map(row => (
                  <tr
                    key={row.lancamento}
                    className={`border-b border-gray-800/60 transition-colors
                      ${row.lancamento === lancamentoId
                        ? 'bg-emerald-500/5 text-emerald-300'
                        : 'text-gray-300 hover:bg-gray-800/30'
                      }
                    `}
                  >
                    <td className="py-2 pr-3 font-bold">{row.lancamento}</td>
                    <td className="py-2 pr-3 tabular-nums">{fmt_currency(row.investimento_total, true)}</td>
                    <td className="py-2 pr-3 tabular-nums">{fmt_number(row.total_leads)}</td>
                    <td className="py-2 pr-3 tabular-nums">{fmt_currency(row.cpl)}</td>
                    <td className="py-2 pr-3 tabular-nums">{fmt_number(row.total_vendas)}</td>
                    <td className="py-2 pr-3 tabular-nums">{fmt_currency(row.faturamento_bruto, true)}</td>
                    <td className={`py-2 pr-3 tabular-nums font-medium ${row.roi > 1 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {fmt_pct(row.roi * 100, 0)}
                    </td>
                    <td className="py-2 tabular-nums">{fmt_pct(row.taxa_conversao_pct, 2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

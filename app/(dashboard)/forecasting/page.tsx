'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, Target, BarChart2, Users } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import KpiCard from '../../../components/kpi-card'
import LancamentoSelector from '../../../components/lancamento-selector'
import DataTable from '../../../components/data-table'
import { fmt_currency, fmt_number, fmt_pct } from '../../../lib/format'
import type { FunilRow } from '../../../lib/db/lancamentos'
import type { UtmAnalysis } from '../../../lib/db/leads'
import type { AvatarConversao } from '../../../lib/db/avatar'

type Lancamento = {
  codigo: string
  nome: string
  status: string | null
  data_inicio: string | null
  data_fim: string | null
  meta_faturamento: number | null
}

function calcularProjecao(funil: FunilRow, lancamento: Lancamento | null) {
  if (!funil || !lancamento?.data_inicio || !lancamento?.data_fim) return null

  const inicio = new Date(lancamento.data_inicio)
  const fim = new Date(lancamento.data_fim)
  const hoje = new Date()

  const diasTotais = Math.max((fim.getTime() - inicio.getTime()) / 86400000, 1)
  const diasPassados = Math.max((hoje.getTime() - inicio.getTime()) / 86400000, 1)
  const diasRestantes = Math.max(diasTotais - diasPassados, 0)

  const totalLeads = Number(funil.total_leads)
  const totalVendas = Number(funil.total_vendas)
  const investimentoTotal = Number(funil.investimento_total)
  const faturamentoBruto = Number(funil.faturamento_bruto)
  const taxaConversao = Number(funil.taxa_conversao_pct)

  const velocidadeLeadsDia = totalLeads / diasPassados
  const velocidadeVendasDia = totalVendas / diasPassados
  const velocidadeGastoDia = investimentoTotal / diasPassados

  const leadsProjetados = totalLeads + velocidadeLeadsDia * diasRestantes
  const vendasProjetadas = totalVendas + velocidadeVendasDia * diasRestantes
  const gastoProjetado = investimentoTotal + velocidadeGastoDia * diasRestantes

  const ticketMedio = totalVendas > 0 ? faturamentoBruto / totalVendas : 0
  const faturamentoProjetado = vendasProjetadas * ticketMedio

  const leadsParaMeta = lancamento.meta_faturamento && ticketMedio > 0
    ? (lancamento.meta_faturamento / ticketMedio) / taxaConversao * 100
    : null

  return {
    leadsProjetados: Math.round(leadsProjetados),
    vendasProjetadas: Math.round(vendasProjetadas),
    faturamentoProjetado,
    gastoProjetado,
    roiProjetado: gastoProjetado > 0 ? faturamentoProjetado / gastoProjetado : 0,
    diasRestantes: Math.round(diasRestantes),
    velocidadeLeadsDia: Math.round(velocidadeLeadsDia * 10) / 10,
    leadsParaMeta,
    ticketMedio,
    pctConcluido: Math.min((diasPassados / diasTotais) * 100, 100),
  }
}

export default function ForecastingPage() {
  const [lancamentoId, setLancamentoId] = useState('')
  const [funil, setFunil] = useState<FunilRow | null>(null)
  const [lancamento, setLancamento] = useState<Lancamento | null>(null)
  const [comparativos, setComparativos] = useState<FunilRow[]>([])
  const [utmData, setUtmData] = useState<UtmAnalysis[]>([])
  const [avatarConversao, setAvatarConversao] = useState<AvatarConversao[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!lancamentoId) return
    setLoading(true)
    Promise.all([
      fetch(`/api/funil?id=${lancamentoId}`).then(r => r.json()),
      fetch('/api/lancamentos').then(r => r.json()),
      fetch('/api/funil').then(r => r.json()),
      fetch(`/api/leads?id=${lancamentoId}&view=utm`).then(r => r.json()),
      fetch(`/api/avatar?id=${lancamentoId}&view=conversao`).then(r => r.json()),
    ]).then(([funilData, lancs, hist, utm, avatar]) => {
      setFunil(Array.isArray(funilData) ? (funilData[0] ?? null) : null)
      setLancamento(Array.isArray(lancs) ? (lancs.find((l: Lancamento) => l.codigo === lancamentoId) ?? null) : null)
      setComparativos(Array.isArray(hist) ? hist.slice(0, 6) : [])
      setUtmData(Array.isArray(utm) ? utm : [])
      setAvatarConversao(Array.isArray(avatar) ? avatar : [])
    }).finally(() => setLoading(false))
  }, [lancamentoId])

  const projecao = funil && lancamento ? calcularProjecao(funil, lancamento) : null

  // Dados para gráfico comparativo
  const chartData = comparativos.map(c => ({
    lc: c.lancamento,
    faturamento: Math.round(Number(c.faturamento_bruto)),
    investimento: Math.round(Number(c.investimento_total)),
    leads: Number(c.total_leads),
  })).reverse()

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <TrendingUp size={18} className="text-blue-400" />
            Forecasting & Comparativos
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">Projeção algorítmica · análise de safras · perfil de conversão</p>
        </div>
        <LancamentoSelector value={lancamentoId} onChange={setLancamentoId} />
      </div>

      {/* Projeção */}
      {projecao && (
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Target size={15} className="text-blue-400" />
            <h2 className="text-sm font-semibold text-white">Projeção até o Fim do Lançamento</h2>
            <span className="ml-auto text-xs text-gray-500">{projecao.diasRestantes} dias restantes · {fmt_pct(projecao.pctConcluido, 0)} concluído</span>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiCard title="Faturamento Projetado" value={fmt_currency(projecao.faturamentoProjetado, true)} subtitle={`Meta: ${fmt_currency(lancamento?.meta_faturamento ?? 0, true)}`} accent="blue" />
            <KpiCard title="Leads Projetados" value={fmt_number(projecao.leadsProjetados)} subtitle={`${projecao.velocidadeLeadsDia}/dia`} accent="blue" />
            <KpiCard title="Vendas Projetadas" value={fmt_number(projecao.vendasProjetadas)} subtitle={`Ticket: ${fmt_currency(projecao.ticketMedio)}`} accent="blue" />
            <KpiCard title="ROI Projetado" value={fmt_pct((projecao.roiProjetado - 1) * 100, 1)} accent={projecao.roiProjetado > 1 ? 'emerald' : 'red'} />
          </div>
          {projecao.leadsParaMeta && (
            <p className="mt-3 text-xs text-gray-400">
              <span className="text-blue-400 font-medium">Leads necessários para meta:</span>{' '}
              {fmt_number(projecao.leadsParaMeta)} leads totais
              {' '}({fmt_number(Math.max(projecao.leadsParaMeta - (funil?.total_leads ?? 0), 0))} faltam)
            </p>
          )}
        </div>
      )}

      {/* Gráfico comparativo de safras */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-5">
        <div className="flex items-center gap-2 mb-4">
          <BarChart2 size={15} className="text-purple-400" />
          <h2 className="text-sm font-semibold text-white">Comparativo de Safras — Faturamento vs Investimento</h2>
        </div>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="lc" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 8 }}
                formatter={(v: number, name: string) => [fmt_currency(v, true), name === 'faturamento' ? 'Faturamento' : 'Investimento']}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="faturamento" name="Faturamento" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="investimento" name="Investimento" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-gray-500 text-center py-8">{loading ? 'Carregando...' : 'Selecione um lançamento'}</p>
        )}
      </div>

      {/* UTM × Conversão + Avatar × Conversão */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Users size={15} className="text-amber-400" />
            <h2 className="text-sm font-semibold text-white">UTM Source × Conversão</h2>
          </div>
          <DataTable
            loading={loading}
            columns={[
              { key: 'utm_source', label: 'Fonte', render: r => <span className="text-xs">{r.utm_source as string}</span> },
              { key: 'total_leads', label: 'Leads', align: 'right', sortable: true, render: r => fmt_number(r.total_leads as number) },
              { key: 'compradores', label: 'Vendas', align: 'right', sortable: true, render: r => fmt_number(r.compradores as number) },
              {
                key: 'taxa_conversao', label: 'Conv.', align: 'right', sortable: true,
                render: r => (
                  <span className={`font-medium ${(r.taxa_conversao as number) > 2 ? 'text-emerald-400' : 'text-gray-300'}`}>
                    {fmt_pct(r.taxa_conversao as number, 2)}
                  </span>
                )
              },
            ]}
            data={utmData as unknown as Record<string, unknown>[]}
          />
        </div>

        <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Target size={15} className="text-emerald-400" />
            <h2 className="text-sm font-semibold text-white">Perfil de Avatar × Conversão</h2>
          </div>
          <DataTable
            loading={loading}
            columns={[
              { key: 'sexo', label: 'Sexo', render: r => <span className="text-xs">{r.sexo as string || '—'}</span> },
              { key: 'faixa_etaria', label: 'Faixa', render: r => <span className="text-xs">{r.faixa_etaria as string}</span> },
              { key: 'formacao', label: 'Formação', render: r => <span className="text-xs truncate block max-w-28">{(r.formacao as string)?.slice(0, 20) || '—'}</span> },
              { key: 'compradores', label: 'Vendas', align: 'right', sortable: true, render: r => fmt_number(r.compradores as number) },
              {
                key: 'taxa_conversao', label: 'Conv.', align: 'right', sortable: true,
                render: r => (
                  <span className={`font-medium ${(r.taxa_conversao as number) > 2 ? 'text-emerald-400' : 'text-gray-300'}`}>
                    {fmt_pct(r.taxa_conversao as number, 1)}
                  </span>
                )
              },
            ]}
            data={avatarConversao as unknown as Record<string, unknown>[]}
            maxRows={8}
          />
        </div>
      </div>
    </div>
  )
}

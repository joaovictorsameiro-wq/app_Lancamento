'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, Target, BarChart2, Users, EyeOff } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import KpiCard from '../../../components/kpi-card'
import LancamentoSelector from '../../../components/lancamento-selector'
import DataTable from '../../../components/data-table'
import { fmt_currency, fmt_number, fmt_pct } from '../../../lib/format'
import type { FunilRow } from '../../../lib/db/lancamentos'
import type { AvatarConversao, AvatarDimensao } from '../../../lib/db/avatar'
import { AVATAR_DIMENSAO_LABELS } from '../../../lib/db/avatar'

type Lancamento = {
  codigo: string
  nome: string
  status: string | null
  data_inicio: string | null
  data_fim: string | null
  meta_faturamento: number | null
}

type UtmNivel = 'source' | 'campanha' | 'conjunto' | 'anuncio'

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

// Colunas contextuais por nível de UTM
function utmColumns(nivel: UtmNivel) {
  const base = [
    { key: 'total_leads', label: 'Leads', align: 'right' as const, sortable: true, render: (r: Record<string, unknown>) => fmt_number(r.total_leads as number) },
    { key: 'compradores', label: 'Vendas', align: 'right' as const, sortable: true, render: (r: Record<string, unknown>) => fmt_number(r.compradores as number) },
    {
      key: 'taxa_conversao', label: 'Conv.', align: 'right' as const, sortable: true,
      render: (r: Record<string, unknown>) => (
        <span className={`font-medium ${Number(r.taxa_conversao) > 2 ? 'text-emerald-400' : 'text-gray-300'}`}>
          {fmt_pct(r.taxa_conversao as number, 2)}
        </span>
      )
    },
  ]

  if (nivel === 'source') return [
    { key: 'utm_source', label: 'Source', render: (r: Record<string, unknown>) => <span className="text-xs font-mono">{r.utm_source as string}</span> },
    ...base,
  ]

  if (nivel === 'campanha') return [
    { key: 'utm_campaign', label: 'Campanha', render: (r: Record<string, unknown>) => (
      <span className="text-xs" title={r.utm_campaign as string}>{r.utm_campaign as string}</span>
    )},
    { key: 'utm_source', label: 'Source', render: (r: Record<string, unknown>) => <span className="text-xs text-gray-500">{r.utm_source as string}</span> },
    ...base,
  ]

  if (nivel === 'conjunto') return [
    { key: 'utm_medium', label: 'Conjunto', render: (r: Record<string, unknown>) => (
      <span className="text-xs font-medium">{r.utm_medium as string}</span>
    )},
    { key: 'utm_source', label: 'Source', render: (r: Record<string, unknown>) => <span className="text-xs text-gray-500">{r.utm_source as string}</span> },
    { key: 'utm_campaign', label: 'Campanha', render: (r: Record<string, unknown>) => (
      <span className="text-xs text-gray-500 truncate block max-w-36 cursor-help" title={r.utm_campaign as string}>
        {r.utm_campaign as string}
      </span>
    )},
    ...base,
  ]

  // anuncio
  return [
    { key: 'utm_content', label: 'Anúncio', render: (r: Record<string, unknown>) => (
      <span className="text-xs font-medium" title={r.utm_content as string}>{r.utm_content as string}</span>
    )},
    { key: 'utm_medium', label: 'Conjunto', render: (r: Record<string, unknown>) => (
      <span className="text-xs text-gray-400" title={r.utm_medium as string}>{r.utm_medium as string}</span>
    )},
    { key: 'utm_campaign', label: 'Campanha', render: (r: Record<string, unknown>) => (
      <span className="text-xs text-gray-500 truncate block max-w-36 cursor-help" title={r.utm_campaign as string}>
        {r.utm_campaign as string}
      </span>
    )},
    ...base,
  ]
}

export default function ForecastingPage() {
  const [lancamentoId, setLancamentoId] = useState('')
  const [funil, setFunil] = useState<FunilRow | null>(null)
  const [lancamento, setLancamento] = useState<Lancamento | null>(null)
  const [comparativos, setComparativos] = useState<FunilRow[]>([])
  const [utmData, setUtmData] = useState<Record<string, unknown>[]>([])
  const [avatarConversao, setAvatarConversao] = useState<AvatarConversao[]>([])
  const [loading, setLoading] = useState(false)
  const [utmNivel, setUtmNivel] = useState<UtmNivel>('source')
  const [ocultarSemLanc, setOcultarSemLanc] = useState(true)
  const [avatarDimensao, setAvatarDimensao] = useState<AvatarDimensao>('formacao')

  useEffect(() => {
    if (!lancamentoId) return
    setLoading(true)
    Promise.all([
      fetch(`/api/funil?id=${lancamentoId}`).then(r => r.json()),
      fetch('/api/lancamentos').then(r => r.json()),
      fetch('/api/funil').then(r => r.json()),
      fetch(`/api/avatar?id=${lancamentoId}&view=conversao&dimensao=${avatarDimensao}`).then(r => r.json()),
    ]).then(([funilData, lancs, hist, avatar]) => {
      setFunil(Array.isArray(funilData) ? (funilData[0] ?? null) : null)
      setLancamento(Array.isArray(lancs) ? (lancs.find((l: Lancamento) => l.codigo === lancamentoId) ?? null) : null)
      setComparativos(Array.isArray(hist) ? hist : [])
      setAvatarConversao(Array.isArray(avatar) ? avatar : [])
    }).finally(() => setLoading(false))
  }, [lancamentoId])

  // Recarregar UTM quando nível ou lançamento muda — limpa dados antigos imediatamente
  useEffect(() => {
    if (!lancamentoId) return
    setUtmData([])   // limpa dados antigos para não mostrar colunas erradas
    const viewMap: Record<UtmNivel, string> = {
      source: 'utm', campanha: 'campanha', conjunto: 'conjunto', anuncio: 'anuncio'
    }
    const controller = new AbortController()
    fetch(`/api/leads?id=${lancamentoId}&view=${viewMap[utmNivel]}`, { signal: controller.signal })
      .then(r => r.json())
      .then(d => setUtmData(Array.isArray(d) ? d : []))
      .catch(() => {}) // ignora AbortError
    return () => controller.abort()
  }, [lancamentoId, utmNivel])

  // Recarregar avatar quando dimensão muda
  useEffect(() => {
    if (!lancamentoId) return
    fetch(`/api/avatar?id=${lancamentoId}&view=conversao&dimensao=${avatarDimensao}`)
      .then(r => r.json())
      .then(d => setAvatarConversao(Array.isArray(d) ? d : []))
  }, [lancamentoId, avatarDimensao])

  const projecao = funil && lancamento ? calcularProjecao(funil, lancamento) : null

  // Filtrar SEM_LANCAMENTO
  const comparativosFiltrados = (ocultarSemLanc
    ? comparativos.filter(c => c.lancamento !== 'SEM_LANCAMENTO')
    : comparativos
  ).slice(0, 8)

  const chartData = comparativosFiltrados.map(c => ({
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
        <div className="flex items-center gap-2">
          {/* Toggle SEM_LANCAMENTO */}
          <button
            onClick={() => setOcultarSemLanc(v => !v)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs border transition-colors ${
              ocultarSemLanc
                ? 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
            }`}
            title="Mostrar/ocultar vendas sem lançamento identificado nos comparativos"
          >
            <EyeOff size={12} />
            {ocultarSemLanc ? 'Sem Lançamento oculto' : 'Sem Lançamento visível'}
          </button>
          <LancamentoSelector value={lancamentoId} onChange={setLancamentoId} />
        </div>
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
              {' '}({fmt_number(Math.max(projecao.leadsParaMeta - (funil ? Number(funil.total_leads) : 0), 0))} faltam)
            </p>
          )}
        </div>
      )}

      {/* Gráfico comparativo */}
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
            <h2 className="text-sm font-semibold text-white flex-1">UTM × Conversão</h2>
            {/* Seletor de nível */}
            <div className="flex rounded-lg overflow-hidden border border-gray-700 text-xs">
              {(['source', 'campanha', 'conjunto', 'anuncio'] as UtmNivel[]).map(n => (
                <button
                  key={n}
                  onClick={() => setUtmNivel(n)}
                  className={`px-2 py-1 capitalize transition-colors ${
                    utmNivel === n
                      ? 'bg-amber-500/20 text-amber-300 font-medium'
                      : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <DataTable
            loading={loading}
            columns={utmColumns(utmNivel)}
            data={utmData}
          />
          {/* Totalizador: vendas rastreadas vs total do lançamento */}
          {funil && utmData.length > 0 && (() => {
            const vendasRastreadas = utmData.reduce((s, r) => s + Number(r.compradores ?? 0), 0)
            const totalVendas = Number(funil.total_vendas)
            const semUtm = totalVendas - vendasRastreadas
            return semUtm > 0 ? (
              <div className="mt-3 pt-3 border-t border-gray-800 flex items-center justify-between text-xs">
                <span className="text-gray-500">
                  {vendasRastreadas}/{totalVendas} vendas com UTM rastreado
                </span>
                <span className="text-amber-400">{semUtm} sem UTM</span>
              </div>
            ) : null
          })()}
        </div>

        <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Target size={15} className="text-emerald-400" />
            <h2 className="text-sm font-semibold text-white flex-1">Avatar × Conversão</h2>
            {/* Seletor de dimensão */}
            <select
              value={avatarDimensao}
              onChange={e => setAvatarDimensao(e.target.value as AvatarDimensao)}
              className="rounded-lg bg-gray-800 border border-gray-700 px-2 py-1 text-xs text-gray-300"
            >
              {(Object.entries(AVATAR_DIMENSAO_LABELS) as [AvatarDimensao, string][]).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <DataTable
            loading={loading}
            columns={[
              {
                key: 'dimensao_valor',
                label: AVATAR_DIMENSAO_LABELS[avatarDimensao],
                render: r => <span className="text-xs truncate block max-w-40">{(r.dimensao_valor as string) || '—'}</span>
              },
              { key: 'total_respostas', label: 'Respostas', align: 'right' as const, sortable: true, render: r => fmt_number(r.total_respostas as number) },
              { key: 'compradores', label: 'Vendas', align: 'right' as const, sortable: true, render: r => fmt_number(r.compradores as number) },
              {
                key: 'taxa_conversao', label: 'Conv.', align: 'right' as const, sortable: true,
                render: r => (
                  <span className={`font-medium ${Number(r.taxa_conversao) > 2 ? 'text-emerald-400' : 'text-gray-300'}`}>
                    {fmt_pct(r.taxa_conversao as number, 1)}
                  </span>
                )
              },
            ]}
            data={avatarConversao as unknown as Record<string, unknown>[]}
            maxRows={12}
          />
        </div>
      </div>
    </div>
  )
}

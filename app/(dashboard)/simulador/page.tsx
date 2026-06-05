'use client'

import { useEffect, useState } from 'react'
import { Calculator, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react'
import LancamentoSelector from '../../../components/lancamento-selector'
import { fmt_currency, fmt_number, fmt_pct } from '../../../lib/format'
import type { FunilRow } from '../../../lib/db/lancamentos'

interface Premissa {
  id: string
  label: string
  param: keyof Cenario
  unit: '%' | 'R$' | 'x'
  min: number
  max: number
  step: number
}

interface Cenario {
  cpm_delta: number          // % variação no CPM
  conversao_pagina_delta: number  // % variação na conversão da página
  taxa_compra_delta: number  // % variação na taxa de compra
  ticket_medio_delta: number // % variação no ticket médio
  budget_delta: number       // % variação no budget
  taxa_hotmart: number       // % taxa plataforma
  imposto: number            // % imposto
}

const PREMISSAS: Premissa[] = [
  { id: 'cpm', label: 'Variação CPM', param: 'cpm_delta', unit: '%', min: -50, max: 100, step: 5 },
  { id: 'conv', label: 'Variação Conv. Página', param: 'conversao_pagina_delta', unit: '%', min: -80, max: 100, step: 5 },
  { id: 'compra', label: 'Variação Taxa de Compra', param: 'taxa_compra_delta', unit: '%', min: -80, max: 100, step: 5 },
  { id: 'ticket', label: 'Variação Ticket Médio', param: 'ticket_medio_delta', unit: '%', min: -50, max: 100, step: 5 },
  { id: 'budget', label: 'Variação Budget', param: 'budget_delta', unit: '%', min: -50, max: 200, step: 10 },
  { id: 'taxa', label: 'Taxa Hotmart', param: 'taxa_hotmart', unit: '%', min: 0, max: 20, step: 0.5 },
  { id: 'imposto', label: 'Alíquota Imposto', param: 'imposto', unit: '%', min: 0, max: 30, step: 1 },
]

export default function SimuladorPage() {
  const [lancamentoId, setLancamentoId] = useState('')
  const [funil, setFunil] = useState<FunilRow | null>(null)
  const [loading, setLoading] = useState(false)
  const [cenario, setCenario] = useState<Cenario>({
    cpm_delta: 0,
    conversao_pagina_delta: 0,
    taxa_compra_delta: 0,
    ticket_medio_delta: 0,
    budget_delta: 0,
    taxa_hotmart: 9.9,
    imposto: 6,
  })

  useEffect(() => {
    if (!lancamentoId) return
    setLoading(true)
    fetch(`/api/funil?id=${lancamentoId}`)
      .then(r => r.json())
      .then(data => setFunil(data[0] ?? null))
      .finally(() => setLoading(false))
  }, [lancamentoId])

  const resetCenario = () => setCenario({
    cpm_delta: 0, conversao_pagina_delta: 0, taxa_compra_delta: 0,
    ticket_medio_delta: 0, budget_delta: 0, taxa_hotmart: 9.9, imposto: 6,
  })

  // Calcular cenário simulado
  const calcularResultado = () => {
    if (!funil) return null

    const budget = funil.investimento_total * (1 + cenario.budget_delta / 100)
    const cpm = funil.total_leads > 0
      ? (funil.investimento_total / funil.total_leads) * 1000  // proxy de CPM via CPL
      : 0
    const cpmSimulado = cpm * (1 + cenario.cpm_delta / 100)

    // Leads simulados: budget / CPL simulado
    // CPL = CPM × (1000 / cliques_por_mil) / conversao_pagina
    // Simplificação: proporcional ao CPM e conversão de página
    const fatorCPM = cenario.cpm_delta !== 0 ? 1 / (1 + cenario.cpm_delta / 100) : 1
    const fatorConvPagina = 1 + cenario.conversao_pagina_delta / 100
    const fatorBudget = 1 + cenario.budget_delta / 100

    const leadsSimulados = funil.total_leads * fatorCPM * fatorConvPagina * fatorBudget
    const taxaCompra = (funil.taxa_conversao_pct / 100) * (1 + cenario.taxa_compra_delta / 100)
    const vendasSimuladas = leadsSimulados * taxaCompra

    const ticketMedio = funil.total_vendas > 0
      ? (funil.faturamento_bruto / funil.total_vendas) * (1 + cenario.ticket_medio_delta / 100)
      : 0

    const faturamentoBruto = vendasSimuladas * ticketMedio
    const taxaPlataforma = faturamentoBruto * (cenario.taxa_hotmart / 100)
    const impostoValor = faturamentoBruto * (cenario.imposto / 100)
    const lucroLiquido = faturamentoBruto - budget - taxaPlataforma - impostoValor
    const roi = budget > 0 ? faturamentoBruto / budget : 0
    const cplSimulado = leadsSimulados > 0 ? budget / leadsSimulados : 0
    const margemLiquida = faturamentoBruto > 0 ? (lucroLiquido / faturamentoBruto) * 100 : 0

    return {
      budget, leadsSimulados, vendasSimuladas, faturamentoBruto,
      lucroLiquido, roi, cplSimulado, margemLiquida, taxaCompra: taxaCompra * 100,
    }
  }

  const resultado = calcularResultado()

  const delta = (simVal: number, baseVal: number) =>
    baseVal > 0 ? ((simVal - baseVal) / Math.abs(baseVal)) * 100 : 0

  const DeltaBadge = ({ val, higherIsBetter = true }: { val: number; higherIsBetter?: boolean }) => {
    if (Math.abs(val) < 0.1) return <span className="text-xs text-gray-500">=</span>
    const positive = val > 0
    const good = higherIsBetter ? positive : !positive
    return (
      <span className={`flex items-center gap-0.5 text-xs font-medium ${good ? 'text-emerald-400' : 'text-red-400'}`}>
        {positive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
        {positive ? '+' : ''}{val.toFixed(1)}%
      </span>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Calculator size={18} className="text-purple-400" />
            Simulador de Cenários (What-If)
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">Analise o impacto de variações nas premissas estratégicas</p>
        </div>
        <LancamentoSelector value={lancamentoId} onChange={setLancamentoId} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        {/* Controles */}
        <div className="lg:col-span-2 rounded-xl border border-gray-800 bg-gray-900/60 p-5 space-y-4">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-semibold text-white">Premissas do Cenário</h2>
            <button
              onClick={resetCenario}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-200 transition-colors"
            >
              <RefreshCw size={11} /> Reset
            </button>
          </div>

          {PREMISSAS.map(p => {
            const val = cenario[p.param] as number
            const isChanged = p.param === 'taxa_hotmart' ? val !== 9.9 : p.param === 'imposto' ? val !== 6 : val !== 0
            return (
              <div key={p.id}>
                <div className="flex items-center justify-between mb-1">
                  <label className={`text-xs font-medium ${isChanged ? 'text-purple-300' : 'text-gray-400'}`}>
                    {p.label}
                  </label>
                  <span className={`text-xs tabular-nums font-bold ${isChanged ? 'text-purple-300' : 'text-gray-300'}`}>
                    {val > 0 && p.param !== 'taxa_hotmart' && p.param !== 'imposto' ? '+' : ''}{val.toFixed(1)}{p.unit}
                  </span>
                </div>
                <input
                  type="range"
                  min={p.min}
                  max={p.max}
                  step={p.step}
                  value={val}
                  onChange={e => setCenario(prev => ({ ...prev, [p.param]: parseFloat(e.target.value) }))}
                  className="w-full accent-purple-500 h-1.5 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-gray-600 mt-0.5">
                  <span>{p.min}{p.unit}</span>
                  <span>{p.max}{p.unit}</span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Resultado */}
        <div className="lg:col-span-3 space-y-4">
          {/* Cards comparativos */}
          {funil && resultado ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Faturamento Bruto', base: funil.faturamento_bruto, sim: resultado.faturamentoBruto, fmt: (v: number) => fmt_currency(v, true) },
                  { label: 'Leads Projetados', base: funil.total_leads, sim: resultado.leadsSimulados, fmt: (v: number) => fmt_number(v, 0) },
                  { label: 'CPL Simulado', base: funil.cpl, sim: resultado.cplSimulado, fmt: (v: number) => fmt_currency(v), higherIsBetter: false },
                  { label: 'Conversão', base: funil.taxa_conversao_pct, sim: resultado.taxaCompra, fmt: (v: number) => fmt_pct(v, 2) },
                  { label: 'Lucro Líquido', base: 0, sim: resultado.lucroLiquido, fmt: (v: number) => fmt_currency(v, true), hideBase: true },
                  { label: 'Margem Líquida', base: 0, sim: resultado.margemLiquida, fmt: (v: number) => fmt_pct(v, 1), hideBase: true },
                ].map(item => (
                  <div key={item.label} className="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
                    <p className="text-xs text-gray-400 mb-2">{item.label}</p>
                    <div className="flex items-end gap-3">
                      {!item.hideBase && (
                        <div>
                          <p className="text-[10px] text-gray-600">Atual</p>
                          <p className="text-sm text-gray-400 tabular-nums">{item.fmt(item.base)}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-[10px] text-gray-600">Simulado</p>
                        <p className={`text-lg font-bold tabular-nums ${resultado.lucroLiquido < 0 && item.label === 'Lucro Líquido' ? 'text-red-400' : 'text-white'}`}>
                          {item.fmt(item.sim)}
                        </p>
                      </div>
                      {!item.hideBase && (
                        <DeltaBadge val={delta(item.sim, item.base)} higherIsBetter={item.higherIsBetter !== false} />
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* ROI card */}
              <div className={`rounded-xl border p-4 ${resultado.roi > 1 ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-400">ROI Simulado</p>
                    <p className={`text-3xl font-bold mt-1 tabular-nums ${resultado.roi > 1 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {fmt_pct((resultado.roi - 1) * 100, 1)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Para cada R$1 investido, retorna{' '}
                      <span className="font-medium text-gray-300">{fmt_currency(resultado.roi)}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">vs. Atual</p>
                    <DeltaBadge val={delta(resultado.roi, funil.roi)} />
                  </div>
                </div>
              </div>

              {resultado.lucroLiquido < 0 && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
                  <strong>Atenção:</strong> Neste cenário o lançamento opera no prejuízo. Revise as premissas.
                </div>
              )}
            </>
          ) : (
            <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-8 text-center">
              <Calculator size={32} className="text-gray-700 mx-auto mb-3" />
              <p className="text-sm text-gray-500">
                {loading ? 'Carregando dados do lançamento...' : 'Selecione um lançamento para iniciar a simulação'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

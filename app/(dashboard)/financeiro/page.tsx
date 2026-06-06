'use client'

import { useEffect, useState } from 'react'
import { DollarSign, Plus, Trash2, Calculator } from 'lucide-react'
import KpiCard from '../../../components/kpi-card'
import LancamentoSelector from '../../../components/lancamento-selector'
import { fmt_currency, fmt_pct } from '../../../lib/format'
import type { FunilRow } from '../../../lib/db/lancamentos'
import type { StatusCount } from '../../../lib/db/compradores'

interface CustoManual {
  id: string
  descricao: string
  valor: number
  tipo: 'fixo' | 'variavel_pct'
}

const TAXA_HOTMART = 9.9
const TAXA_CARTAO = 3.49

export default function FinanceiroPage() {
  const [lancamentoId, setLancamentoId] = useState('')
  const [funil, setFunil] = useState<FunilRow | null>(null)
  const [statusPagamento, setStatusPagamento] = useState<StatusCount[]>([])
  const [loading, setLoading] = useState(false)
  const [custosFixos, setCustosFixos] = useState<CustoManual[]>([
    { id: '1', descricao: 'Equipe (fixo mês)', valor: 5000, tipo: 'fixo' },
    { id: '2', descricao: 'Infraestrutura', valor: 500, tipo: 'fixo' },
  ])
  const [novoDesc, setNovoDesc] = useState('')
  const [novoValor, setNovoValor] = useState('')
  const [novoTipo, setNovoTipo] = useState<'fixo' | 'variavel_pct'>('fixo')
  const [impostoIR, setImpostoIR] = useState(6) // % Simples Nacional padrão

  useEffect(() => {
    if (!lancamentoId) return
    setLoading(true)
    Promise.all([
      fetch(`/api/funil?id=${lancamentoId}`).then(r => r.json()),
      fetch(`/api/compradores?id=${lancamentoId}&view=status`).then(r => r.json()),
    ]).then(([funilData, statusData]) => {
      setFunil(funilData[0] ?? null)
      setStatusPagamento(statusData)
    }).finally(() => setLoading(false))
  }, [lancamentoId])

  const faturamentoBruto = Number(funil?.faturamento_bruto ?? 0)
  const investimentoTrafego = Number(funil?.investimento_total ?? 0)

  // Custos calculados
  const taxaHotmart = faturamentoBruto * (TAXA_HOTMART / 100)
  const taxaCartao = faturamentoBruto * (TAXA_CARTAO / 100)
  const imposto = faturamentoBruto * (impostoIR / 100)

  const custosFixosTotal = custosFixos
    .filter(c => c.tipo === 'fixo')
    .reduce((sum, c) => sum + c.valor, 0)

  const custosVariaveisTotal = custosFixos
    .filter(c => c.tipo === 'variavel_pct')
    .reduce((sum, c) => sum + faturamentoBruto * (c.valor / 100), 0)

  const totalCustos = investimentoTrafego + taxaHotmart + taxaCartao + imposto + custosFixosTotal + custosVariaveisTotal
  const lucroLiquido = faturamentoBruto - totalCustos
  const margemContribuicao = faturamentoBruto > 0 ? (lucroLiquido / faturamentoBruto) * 100 : 0

  // Faturamento por método de pagamento
  const porMetodo = statusPagamento.reduce<Record<string, { quantidade: number; valor: number }>>((acc, s) => {
    const key = s.metodo_pagamento || 'N/A'
    acc[key] = acc[key] || { quantidade: 0, valor: 0 }
    if (s.status === 'aprovado') {
      acc[key].quantidade += Number(s.quantidade)
      acc[key].valor += Number(s.valor_bruto_total)
    }
    return acc
  }, {})

  const addCusto = () => {
    if (!novoDesc || !novoValor) return
    setCustosFixos(prev => [...prev, {
      id: Date.now().toString(),
      descricao: novoDesc,
      valor: parseFloat(novoValor),
      tipo: novoTipo,
    }])
    setNovoDesc('')
    setNovoValor('')
  }

  const DRERow = ({ label, value, isNegative = false, indent = false, bold = false, highlight = false }: {
    label: string; value: number; isNegative?: boolean; indent?: boolean; bold?: boolean; highlight?: boolean
  }) => (
    <div className={`flex items-center justify-between py-2 ${highlight ? 'border-t-2 border-gray-700 mt-1 pt-3' : 'border-b border-gray-800/60'}`}>
      <span className={`text-sm ${indent ? 'pl-4 text-gray-400' : bold ? 'font-semibold text-white' : 'text-gray-300'}`}>
        {label}
      </span>
      <span className={`text-sm tabular-nums font-medium ${isNegative ? 'text-red-400' : highlight && value > 0 ? 'text-emerald-400' : 'text-white'}`}>
        {isNegative ? `(${fmt_currency(Math.abs(value))})` : fmt_currency(value)}
      </span>
    </div>
  )

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <DollarSign size={18} className="text-emerald-400" />
            DRE Dinâmico
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">Conciliação financeira real · margem de contribuição · lucro líquido</p>
        </div>
        <LancamentoSelector value={lancamentoId} onChange={setLancamentoId} />
      </div>

      {/* KPIs financeiros */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard title="Faturamento Bruto" value={fmt_currency(faturamentoBruto, true)} accent="emerald" icon={DollarSign} loading={loading} />
        <KpiCard title="Total Custos" value={fmt_currency(totalCustos, true)} accent="red" icon={Calculator} loading={loading} />
        <KpiCard title="Lucro Líquido" value={fmt_currency(lucroLiquido, true)} accent={lucroLiquido > 0 ? 'emerald' : 'red'} loading={loading} />
        <KpiCard title="Margem Contrib." value={fmt_pct(margemContribuicao, 1)} accent={margemContribuicao > 30 ? 'emerald' : margemContribuicao > 15 ? 'amber' : 'red'} loading={loading} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* DRE */}
        <div className="lg:col-span-2 rounded-xl border border-gray-800 bg-gray-900/60 p-5">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Calculator size={14} className="text-emerald-400" />
            Demonstrativo de Resultado (DRE)
          </h2>
          <div>
            <DRERow label="(+) Receita Bruta" value={faturamentoBruto} bold />
            <DRERow label="(-) Tráfego Meta Ads" value={investimentoTrafego} isNegative indent />
            <DRERow label={`(-) Taxa Hotmart (${TAXA_HOTMART}%)`} value={taxaHotmart} isNegative indent />
            <DRERow label={`(-) Taxa Cartão (${TAXA_CARTAO}%)`} value={taxaCartao} isNegative indent />
            <DRERow label={`(-) Impostos (${impostoIR}%)`} value={imposto} isNegative indent />
            {custosFixos.filter(c => c.tipo === 'fixo').map(c => (
              <DRERow key={c.id} label={`(-) ${c.descricao}`} value={c.valor} isNegative indent />
            ))}
            {custosFixos.filter(c => c.tipo === 'variavel_pct').map(c => (
              <DRERow key={c.id} label={`(-) ${c.descricao} (${c.valor}%)`} value={faturamentoBruto * c.valor / 100} isNegative indent />
            ))}
            <DRERow label="(=) Lucro Líquido" value={lucroLiquido} bold highlight />
            <div className="flex items-center justify-between py-2 border-b border-gray-800/60">
              <span className="text-sm font-semibold text-white">Margem de Contribuição</span>
              <span className={`text-sm tabular-nums font-medium ${margemContribuicao > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {fmt_pct(margemContribuicao, 1)}
              </span>
            </div>
          </div>
        </div>

        {/* Painel de custos manuais */}
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
            <h3 className="text-xs font-semibold text-white mb-3">Configurar Imposto</h3>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={impostoIR}
                onChange={e => setImpostoIR(parseFloat(e.target.value) || 0)}
                className="w-20 rounded-lg bg-gray-800 border border-gray-700 px-2 py-1.5 text-sm text-white text-center"
              />
              <span className="text-sm text-gray-400">% sobre receita</span>
            </div>
          </div>

          <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
            <h3 className="text-xs font-semibold text-white mb-3">Adicionar Custo</h3>
            <div className="space-y-2">
              <input
                placeholder="Descrição do custo"
                value={novoDesc}
                onChange={e => setNovoDesc(e.target.value)}
                className="w-full rounded-lg bg-gray-800 border border-gray-700 px-2 py-1.5 text-xs text-white"
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Valor"
                  value={novoValor}
                  onChange={e => setNovoValor(e.target.value)}
                  className="flex-1 rounded-lg bg-gray-800 border border-gray-700 px-2 py-1.5 text-xs text-white"
                />
                <select
                  value={novoTipo}
                  onChange={e => setNovoTipo(e.target.value as 'fixo' | 'variavel_pct')}
                  className="rounded-lg bg-gray-800 border border-gray-700 px-2 py-1.5 text-xs text-white"
                >
                  <option value="fixo">R$ fixo</option>
                  <option value="variavel_pct">% receita</option>
                </select>
              </div>
              <button
                onClick={addCusto}
                className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white transition-colors"
              >
                <Plus size={12} /> Adicionar
              </button>
            </div>

            <div className="mt-3 space-y-1.5">
              {custosFixos.map(c => (
                <div key={c.id} className="flex items-center gap-2 text-xs text-gray-300">
                  <span className="flex-1 truncate">{c.descricao}</span>
                  <span className="text-gray-400 shrink-0">
                    {c.tipo === 'fixo' ? fmt_currency(c.valor) : `${c.valor}%`}
                  </span>
                  <button
                    onClick={() => setCustosFixos(prev => prev.filter(x => x.id !== c.id))}
                    className="text-gray-600 hover:text-red-400 shrink-0"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Breakdown por método */}
          <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
            <h3 className="text-xs font-semibold text-white mb-3">Receita por Método</h3>
            <div className="space-y-1.5">
              {Object.entries(porMetodo).map(([metodo, dados]) => (
                <div key={metodo} className="flex items-center justify-between text-xs">
                  <span className="text-gray-400 capitalize">{metodo}</span>
                  <div className="text-right">
                    <span className="text-white font-medium tabular-nums">{fmt_currency(dados.valor, true)}</span>
                    <span className="text-gray-500 ml-1">({dados.quantidade}x)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { DollarSign, Plus, Trash2 } from 'lucide-react'
import LancamentoSelector from '../../../components/lancamento-selector'
import { fmt_currency, fmt_number, fmt_pct } from '../../../lib/format'
import type { FunilRow } from '../../../lib/db/lancamentos'

interface CustoManual {
  id: string
  descricao: string
  valor: number
}

export default function FinanceiroPage() {
  const [lancamentoId, setLancamentoId] = useState('')
  const [funil, setFunil] = useState<FunilRow | null>(null)
  const [loading, setLoading] = useState(false)

  // Custos manuais adicionais (ex: disparos WhatsApp, ferramentas)
  const [custosExtras, setCustosExtras] = useState<CustoManual[]>([
    { id: '1', descricao: 'Disparos API Wzap', valor: 0 },
  ])
  const [novoDesc, setNovoDesc] = useState('')
  const [novoValor, setNovoValor] = useState('')

  // Configuráveis
  const [simplespct, setSimplesNacional] = useState(12) // % Simples Nacional
  const [pixCC, setPixCC] = useState(0) // PIX recebido direto na C/C

  useEffect(() => {
    if (!lancamentoId) return
    setLoading(true)
    fetch(`/api/funil?id=${lancamentoId}`)
      .then(r => r.json())
      .then(data => setFunil(Array.isArray(data) ? (data[0] ?? null) : null))
      .finally(() => setLoading(false))
  }, [lancamentoId])

  // ── Dados base ──────────────────────────────────────────────────────────────
  const fatBruto      = Number(funil?.faturamento_bruto ?? 0)
  const fatLiquido    = Number(funil?.faturamento_liquido ?? 0)  // já descontado taxa Hotmart
  const numVendas     = Number(funil?.total_vendas ?? 0)
  const totalLeads    = Number(funil?.total_leads ?? 0)
  const trafego       = Number(funil?.investimento_total ?? 0)
  const cpl           = Number(funil?.cpl ?? 0)
  const taxaConv      = Number(funil?.taxa_conversao_pct ?? 0)

  // ── DRE ─────────────────────────────────────────────────────────────────────
  const taxaHotmart       = fatBruto - fatLiquido            // fee real calculado pelo Hotmart
  const fatLiqHotmart     = fatLiquido + pixCC               // + PIX direto na C/C
  const simples           = fatLiqHotmart * (simplespct / 100)
  const fatLiqImpostos    = fatLiqHotmart - simples
  const custosExtrasTotal = custosExtras.reduce((s, c) => s + c.valor, 0)
  const lucroTotal        = fatLiqImpostos - trafego - custosExtrasTotal

  // ── KPIs ────────────────────────────────────────────────────────────────────
  const roas = trafego > 0 ? fatLiqImpostos / trafego : 0
  const cac  = numVendas > 0 ? trafego / numVendas : 0
  const margemPct = fatBruto > 0 ? (lucroTotal / fatBruto) * 100 : 0

  const addCusto = () => {
    if (!novoDesc || !novoValor) return
    setCustosExtras(prev => [...prev, { id: Date.now().toString(), descricao: novoDesc, valor: parseFloat(novoValor) || 0 }])
    setNovoDesc('')
    setNovoValor('')
  }

  // ── Helpers de linha ────────────────────────────────────────────────────────
  const Row = ({ label, value, bold, negative, total, indent, pct }: {
    label: string; value: number; bold?: boolean; negative?: boolean
    total?: boolean; indent?: boolean; pct?: boolean
  }) => {
    const formatted = pct ? fmt_pct(value, 2) : fmt_currency(Math.abs(value))
    const colorClass = total
      ? value >= 0 ? 'text-emerald-400' : 'text-red-400'
      : negative ? 'text-red-400' : 'text-white'
    return (
      <div className={`flex justify-between py-1.5 ${total ? 'border-t border-gray-600 mt-1 pt-2.5' : 'border-b border-gray-800/40'}`}>
        <span className={`text-sm ${indent ? 'pl-5 text-gray-400' : bold || total ? 'font-semibold text-white' : 'text-gray-300'}`}>
          {label}
        </span>
        <span className={`text-sm tabular-nums font-medium ${colorClass}`}>
          {negative && value !== 0 ? `(${formatted})` : formatted}
        </span>
      </div>
    )
  }

  const KpiRow = ({ label, value }: { label: string; value: string }) => (
    <div className="flex justify-between py-1.5 border-b border-gray-800/40">
      <span className="text-sm text-gray-400">{label}</span>
      <span className="text-sm tabular-nums font-medium text-white">{value}</span>
    </div>
  )

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
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

      {/* KPI cards topo */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Faturamento Bruto',    value: fmt_currency(fatBruto, true),     color: 'border-emerald-500/30' },
          { label: 'Faturamento Líquido',  value: fmt_currency(fatLiqImpostos, true), color: 'border-blue-500/30' },
          { label: 'Lucro Bruto',          value: fmt_currency(lucroTotal, true),   color: lucroTotal >= 0 ? 'border-emerald-500/30' : 'border-red-500/30' },
          { label: 'Margem',               value: fmt_pct(margemPct, 1),            color: margemPct >= 30 ? 'border-emerald-500/30' : margemPct >= 15 ? 'border-amber-500/30' : 'border-red-500/30' },
        ].map(c => (
          <div key={c.label} className={`rounded-xl border ${c.color} bg-gray-900/60 p-4`}>
            <p className="text-xs text-gray-400 mb-1">{c.label}</p>
            <p className={`text-lg font-bold ${loading ? 'text-gray-600' : 'text-white'}`}>
              {loading ? '—' : c.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* DRE principal */}
        <div className="lg:col-span-2 rounded-xl border border-gray-800 bg-gray-900/60 p-5 space-y-0">

          {/* Bloco 1: Receita Hotmart */}
          <Row label="Faturamento Bruto - Principal"                value={fatBruto}     bold />
          <Row label="Faturamento Bruto - Order Bump"               value={0}            indent />
          <Row label="Faturamento Total Hotmart"                    value={fatBruto}     bold />
          <Row label={`Hotmart (taxa real)`}                        value={taxaHotmart}  indent negative />
          <Row label="Faturamento Líquido de Hotmart"               value={fatLiqHotmart - pixCC} bold />
          <Row label="PIX Recebido na C/C"                          value={pixCC}        indent />
          <Row label="Faturamento Líquido"                          value={fatLiqHotmart} bold />

          {/* Bloco 2: Impostos */}
          <div className="pt-2" />
          <Row label={`Simples Nacional (${simplespct}%)`}          value={simples}      indent negative />
          <Row label="Faturamento Líquido de Impostos"              value={fatLiqImpostos} bold total />

          {/* Bloco 3: Custos operacionais */}
          <div className="pt-2" />
          <Row label="Tráfego Meta Ads"                             value={trafego}      indent negative />
          {custosExtras.map(c => (
            <div key={c.id} className="flex justify-between py-1.5 border-b border-gray-800/40 group">
              <span className="text-sm pl-5 text-gray-400 flex items-center gap-1">
                {c.descricao}
                <button onClick={() => setCustosExtras(p => p.filter(x => x.id !== c.id))}
                  className="hidden group-hover:inline text-gray-600 hover:text-red-400 ml-1">
                  <Trash2 size={11} />
                </button>
              </span>
              <span className="text-sm tabular-nums font-medium text-red-400">
                {c.valor !== 0 ? `(${fmt_currency(c.valor)})` : '—'}
              </span>
            </div>
          ))}
          <Row label="Lucro Bruto"                                  value={lucroTotal}   bold total />

          {/* Bloco 4: KPIs de performance */}
          <div className="pt-4" />
          <div className="border-t border-gray-700 pt-3 space-y-0">
            <KpiRow label="Produto Principal (vendas)"  value={fmt_number(numVendas)} />
            <KpiRow label="Leads Totais"                value={fmt_number(totalLeads)} />
            <KpiRow label="% Conversão"                 value={fmt_pct(taxaConv, 2)} />
            <KpiRow label="Custo por Lead (CPL)"        value={fmt_currency(cpl)} />
            <KpiRow label="ROAS"                        value={fmt_number(roas, 2)} />
            <KpiRow label="CAC"                         value={fmt_currency(cac)} />
          </div>
        </div>

        {/* Painel de configuração */}
        <div className="space-y-4">
          {/* Simples Nacional */}
          <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
            <h3 className="text-xs font-semibold text-white mb-3">Simples Nacional</h3>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={simplespct}
                onChange={e => setSimplesNacional(parseFloat(e.target.value) || 0)}
                className="w-20 rounded-lg bg-gray-800 border border-gray-700 px-2 py-1.5 text-sm text-white text-center"
              />
              <span className="text-sm text-gray-400">% sobre faturamento líquido</span>
            </div>
          </div>

          {/* PIX C/C */}
          <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
            <h3 className="text-xs font-semibold text-white mb-3">PIX Recebido na C/C</h3>
            <input
              type="number"
              value={pixCC}
              onChange={e => setPixCC(parseFloat(e.target.value) || 0)}
              className="w-full rounded-lg bg-gray-800 border border-gray-700 px-2 py-1.5 text-sm text-white"
              placeholder="0,00"
            />
          </div>

          {/* Custos extras */}
          <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
            <h3 className="text-xs font-semibold text-white mb-3">Adicionar Custo</h3>
            <div className="space-y-2">
              <input
                placeholder="Descrição (ex: Disparos Wzap)"
                value={novoDesc}
                onChange={e => setNovoDesc(e.target.value)}
                className="w-full rounded-lg bg-gray-800 border border-gray-700 px-2 py-1.5 text-xs text-white"
              />
              <input
                type="number"
                placeholder="Valor R$"
                value={novoValor}
                onChange={e => setNovoValor(e.target.value)}
                className="w-full rounded-lg bg-gray-800 border border-gray-700 px-2 py-1.5 text-xs text-white"
              />
              <button
                onClick={addCusto}
                className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white transition-colors"
              >
                <Plus size={12} /> Adicionar
              </button>
            </div>

            {custosExtras.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {custosExtras.map(c => (
                  <div key={c.id} className="flex items-center gap-2 text-xs text-gray-300">
                    <span className="flex-1 truncate">{c.descricao}</span>
                    <span className="text-gray-400 shrink-0">{fmt_currency(c.valor)}</span>
                    <button
                      onClick={() => setCustosExtras(p => p.filter(x => x.id !== c.id))}
                      className="text-gray-600 hover:text-red-400 shrink-0"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

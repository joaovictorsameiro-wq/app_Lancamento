'use client'

import { useEffect, useState } from 'react'
import { DollarSign, Plus, Trash2, Settings } from 'lucide-react'
import LancamentoSelector from '../../../components/lancamento-selector'
import { fmt_currency, fmt_number, fmt_pct } from '../../../lib/format'
import type { FunilRow } from '../../../lib/db/lancamentos'

// Onde o custo entra no DRE
type NivelCusto = 'apos_hotmart' | 'apos_simples' | 'operacional'

interface CustoManual {
  id: string
  descricao: string
  valor: number
  nivel: NivelCusto
}

const NIVEL_LABELS: Record<NivelCusto, string> = {
  apos_hotmart: 'Após Hotmart (pré-imposto)',
  apos_simples: 'Após Simples (pré-tráfego)',
  operacional:  'Operacional (pós-tráfego)',
}

const PLATAFORMAS = [
  { nome: 'Hotmart (real)',  taxaPct: null,  taxaFixa: null  }, // usa o calculado do DB
  { nome: 'Hotmart (8.4%+R$1)', taxaPct: 8.4, taxaFixa: 1   },
  { nome: 'Kiwify (9.99%)', taxaPct: 9.99, taxaFixa: 0      },
  { nome: 'Eduzz (6.9%)',   taxaPct: 6.9,  taxaFixa: 0      },
  { nome: 'Braip (6.99%)',  taxaPct: 6.99, taxaFixa: 0      },
  { nome: 'Personalizada',  taxaPct: 0,    taxaFixa: 0       },
]

export default function FinanceiroPage() {
  const [lancamentoId, setLancamentoId] = useState('')
  const [funil, setFunil] = useState<FunilRow | null>(null)
  const [loading, setLoading] = useState(false)

  // Configurações de plataforma
  const [plataformaIdx, setPlataformaIdx] = useState(0)
  const [taxaCustomPct, setTaxaCustomPct] = useState(0)
  const [taxaCustomFixa, setTaxaCustomFixa] = useState(0)

  // Simples Nacional e PIX
  const [simplesNacionalPct, setSimplesNacional] = useState(12)
  const [pixCC, setPixCC] = useState(0)

  // Custos manuais com nível
  const [custos, setCustos] = useState<CustoManual[]>([
    { id: '1', descricao: 'Disparos API Wzap', valor: 0, nivel: 'operacional' },
  ])
  const [novoDesc, setNovoDesc] = useState('')
  const [novoValor, setNovoValor] = useState('')
  const [novoNivel, setNovoNivel] = useState<NivelCusto>('operacional')

  useEffect(() => {
    if (!lancamentoId) return
    setLoading(true)
    fetch(`/api/funil?id=${lancamentoId}`)
      .then(r => r.json())
      .then(d => setFunil(Array.isArray(d) ? (d[0] ?? null) : null))
      .finally(() => setLoading(false))
  }, [lancamentoId])

  // ── Dados base ──────────────────────────────────────────────────────────────
  const fatBruto   = Number(funil?.faturamento_bruto ?? 0)
  const fatLiqDB   = Number(funil?.faturamento_liquido ?? 0)   // após taxa real Hotmart
  const numVendas  = Number(funil?.total_vendas ?? 0)
  const totalLeads = Number(funil?.total_leads ?? 0)
  const trafego    = Number(funil?.investimento_total ?? 0)
  const cpl        = Number(funil?.cpl ?? 0)
  const taxaConv   = Number(funil?.taxa_conversao_pct ?? 0)

  // ── Taxa de plataforma ──────────────────────────────────────────────────────
  const plat = PLATAFORMAS[plataformaIdx]
  let taxaPlataforma: number
  if (plat.taxaPct === null) {
    // usa o valor real calculado pelo DB
    taxaPlataforma = fatBruto - fatLiqDB
  } else if (plataformaIdx === PLATAFORMAS.length - 1) {
    // personalizada
    taxaPlataforma = fatBruto * (taxaCustomPct / 100) + taxaCustomFixa * numVendas
  } else {
    taxaPlataforma = fatBruto * ((plat.taxaPct!) / 100) + (plat.taxaFixa! * numVendas)
  }

  const fatLiqPlat = fatBruto - taxaPlataforma

  // ── Custos por nível ────────────────────────────────────────────────────────
  const custosAposHotmart = custos.filter(c => c.nivel === 'apos_hotmart').reduce((s, c) => s + c.valor, 0)
  const custosAposSimples = custos.filter(c => c.nivel === 'apos_simples').reduce((s, c) => s + c.valor, 0)
  const custosOperacional = custos.filter(c => c.nivel === 'operacional').reduce((s, c) => s + c.valor, 0)

  // ── DRE cascata ─────────────────────────────────────────────────────────────
  const fatLiqHotmart  = fatLiqPlat + pixCC - custosAposHotmart
  const simples        = fatLiqHotmart * (simplesNacionalPct / 100)
  const fatLiqImpostos = fatLiqHotmart - simples - custosAposSimples
  const lucroTotal     = fatLiqImpostos - trafego - custosOperacional

  // ── KPIs ────────────────────────────────────────────────────────────────────
  const roas     = trafego > 0 ? fatLiqImpostos / trafego : 0
  const cac      = numVendas > 0 ? trafego / numVendas : 0
  const margemPct = fatBruto > 0 ? (lucroTotal / fatBruto) * 100 : 0

  const addCusto = () => {
    if (!novoDesc || !novoValor) return
    setCustos(prev => [...prev, { id: Date.now().toString(), descricao: novoDesc, valor: parseFloat(novoValor) || 0, nivel: novoNivel }])
    setNovoDesc('')
    setNovoValor('')
  }

  // ── Componentes de linha ────────────────────────────────────────────────────
  const Row = ({ label, value, bold, negative, total, indent }: {
    label: string; value: number; bold?: boolean; negative?: boolean; total?: boolean; indent?: boolean
  }) => (
    <div className={`flex justify-between py-1.5 ${total ? 'border-t border-gray-600 mt-1 pt-2.5' : 'border-b border-gray-800/40'}`}>
      <span className={`text-sm ${indent ? 'pl-5 text-gray-400' : bold || total ? 'font-semibold text-white' : 'text-gray-300'}`}>
        {label}
      </span>
      <span className={`text-sm tabular-nums font-medium ${
        total ? (value >= 0 ? 'text-emerald-400' : 'text-red-400')
        : negative ? 'text-red-400' : 'text-white'
      }`}>
        {negative && value !== 0 ? `(${fmt_currency(Math.abs(value))})` : fmt_currency(value)}
      </span>
    </div>
  )

  const CustoRow = ({ custo }: { custo: CustoManual }) => (
    <div className="flex justify-between py-1.5 border-b border-gray-800/40 group">
      <span className="text-sm pl-5 text-gray-400 flex items-center gap-1">
        {custo.descricao}
        <button onClick={() => setCustos(p => p.filter(x => x.id !== custo.id))}
          className="hidden group-hover:inline text-gray-600 hover:text-red-400 ml-1">
          <Trash2 size={11} />
        </button>
      </span>
      <span className="text-sm tabular-nums font-medium text-red-400">
        {custo.valor !== 0 ? `(${fmt_currency(custo.valor)})` : '—'}
      </span>
    </div>
  )

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

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Faturamento Bruto',     value: fmt_currency(fatBruto, true),      color: 'border-emerald-500/30' },
          { label: 'Líquido de Impostos',   value: fmt_currency(fatLiqImpostos, true), color: 'border-blue-500/30' },
          { label: 'Lucro Bruto',           value: fmt_currency(lucroTotal, true),    color: lucroTotal >= 0 ? 'border-emerald-500/30' : 'border-red-500/30' },
          { label: 'Margem',                value: fmt_pct(margemPct, 1),             color: margemPct >= 30 ? 'border-emerald-500/30' : margemPct >= 15 ? 'border-amber-500/30' : 'border-red-500/30' },
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
        {/* DRE */}
        <div className="lg:col-span-2 rounded-xl border border-gray-800 bg-gray-900/60 p-5">

          {/* Bloco 1: Receita */}
          <Row label="Faturamento Bruto - Principal" value={fatBruto} bold />
          <Row label="Faturamento Bruto - Order Bump" value={0} indent />
          <Row label="Faturamento Total" value={fatBruto} bold />
          <Row label={`${plat.nome}`} value={taxaPlataforma} indent negative />
          <Row label="Faturamento Líquido de Plataforma" value={fatLiqPlat} bold />
          {pixCC !== 0 && <Row label="PIX Recebido na C/C" value={pixCC} indent />}
          {custos.filter(c => c.nivel === 'apos_hotmart').map(c => <CustoRow key={c.id} custo={c} />)}
          <Row label="Faturamento Líquido" value={fatLiqHotmart} bold />

          {/* Bloco 2: Impostos */}
          <div className="pt-2" />
          <Row label={`Simples Nacional (${simplesNacionalPct}%)`} value={simples} indent negative />
          {custos.filter(c => c.nivel === 'apos_simples').map(c => <CustoRow key={c.id} custo={c} />)}
          <Row label="Faturamento Líquido de Impostos" value={fatLiqImpostos} bold total />

          {/* Bloco 3: Operacional */}
          <div className="pt-2" />
          <Row label="Tráfego Meta Ads" value={trafego} indent negative />
          {custos.filter(c => c.nivel === 'operacional').map(c => <CustoRow key={c.id} custo={c} />)}
          <Row label="Lucro Bruto" value={lucroTotal} bold total />

          {/* Bloco 4: KPIs */}
          <div className="pt-4" />
          <div className="border-t border-gray-700 pt-3">
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

          {/* Plataforma de pagamento */}
          <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
            <h3 className="text-xs font-semibold text-white mb-3 flex items-center gap-1.5">
              <Settings size={12} /> Plataforma de Pagamento
            </h3>
            <select
              value={plataformaIdx}
              onChange={e => setPlataformaIdx(Number(e.target.value))}
              className="w-full rounded-lg bg-gray-800 border border-gray-700 px-2 py-1.5 text-xs text-white mb-2"
            >
              {PLATAFORMAS.map((p, i) => (
                <option key={i} value={i}>{p.nome}</option>
              ))}
            </select>
            {/* Campos para plataforma personalizada */}
            {plataformaIdx === PLATAFORMAS.length - 1 && (
              <div className="space-y-2 mt-2">
                <div className="flex items-center gap-2">
                  <input type="number" value={taxaCustomPct}
                    onChange={e => setTaxaCustomPct(parseFloat(e.target.value) || 0)}
                    className="w-20 rounded-lg bg-gray-800 border border-gray-700 px-2 py-1.5 text-xs text-white text-center"
                  />
                  <span className="text-xs text-gray-400">% sobre bruto</span>
                </div>
                <div className="flex items-center gap-2">
                  <input type="number" value={taxaCustomFixa}
                    onChange={e => setTaxaCustomFixa(parseFloat(e.target.value) || 0)}
                    className="w-20 rounded-lg bg-gray-800 border border-gray-700 px-2 py-1.5 text-xs text-white text-center"
                  />
                  <span className="text-xs text-gray-400">R$ fixo por venda</span>
                </div>
              </div>
            )}
          </div>

          {/* Simples Nacional */}
          <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
            <h3 className="text-xs font-semibold text-white mb-3">Simples Nacional</h3>
            <div className="flex items-center gap-2">
              <input type="number" value={simplesNacionalPct}
                onChange={e => setSimplesNacional(parseFloat(e.target.value) || 0)}
                className="w-20 rounded-lg bg-gray-800 border border-gray-700 px-2 py-1.5 text-sm text-white text-center"
              />
              <span className="text-sm text-gray-400">% sobre faturamento líquido</span>
            </div>
          </div>

          {/* PIX C/C */}
          <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
            <h3 className="text-xs font-semibold text-white mb-3">PIX Recebido na C/C</h3>
            <input type="number" value={pixCC}
              onChange={e => setPixCC(parseFloat(e.target.value) || 0)}
              className="w-full rounded-lg bg-gray-800 border border-gray-700 px-2 py-1.5 text-sm text-white"
              placeholder="0,00"
            />
          </div>

          {/* Adicionar custo */}
          <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
            <h3 className="text-xs font-semibold text-white mb-3">Adicionar Custo</h3>
            <div className="space-y-2">
              <input
                placeholder="Descrição"
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
              <select
                value={novoNivel}
                onChange={e => setNovoNivel(e.target.value as NivelCusto)}
                className="w-full rounded-lg bg-gray-800 border border-gray-700 px-2 py-1.5 text-xs text-white"
              >
                {(Object.entries(NIVEL_LABELS) as [NivelCusto, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
              <button onClick={addCusto}
                className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white transition-colors"
              >
                <Plus size={12} /> Adicionar
              </button>
            </div>

            {custos.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {custos.map(c => (
                  <div key={c.id} className="flex items-start gap-2 text-xs text-gray-300">
                    <div className="flex-1 min-w-0">
                      <div className="truncate">{c.descricao}</div>
                      <div className="text-gray-600 text-[10px]">{NIVEL_LABELS[c.nivel]}</div>
                    </div>
                    <span className="text-gray-400 shrink-0">{fmt_currency(c.valor)}</span>
                    <button onClick={() => setCustos(p => p.filter(x => x.id !== c.id))}
                      className="text-gray-600 hover:text-red-400 shrink-0 mt-0.5">
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

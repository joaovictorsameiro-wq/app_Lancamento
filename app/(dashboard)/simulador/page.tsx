'use client'

import { useEffect, useState, useCallback } from 'react'
import { Calculator, RefreshCw, TrendingUp, TrendingDown, Info, History, Loader2 } from 'lucide-react'
import LancamentoSelector from '../../../components/lancamento-selector'
import { fmt_currency, fmt_number, fmt_pct } from '../../../lib/format'
import type { FunilRow } from '../../../lib/db/lancamentos'

interface Inputs {
  investimento: string
  cpl: string
  conversao: string
  ticket: string
  taxa_plataforma: string
  imposto: string
}

const DEFAULTS: Inputs = {
  investimento: '',
  cpl: '',
  conversao: '',
  ticket: '',
  taxa_plataforma: '9.9',
  imposto: '6',
}

function parseNum(v: string): number {
  const n = parseFloat(v.replace(',', '.'))
  return isNaN(n) ? 0 : n
}

function InputField({
  label,
  value,
  onChange,
  prefix,
  suffix,
  placeholder,
  hint,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  prefix?: string
  suffix?: string
  placeholder?: string
  hint?: string
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-400 mb-1.5">{label}</label>
      <div className="relative flex items-center">
        {prefix && (
          <span className="absolute left-3 text-xs text-gray-500 select-none">{prefix}</span>
        )}
        <input
          type="number"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder ?? '0'}
          className={`
            w-full rounded-lg border border-gray-700 bg-gray-800/60 py-2.5 text-sm text-white
            placeholder:text-gray-600 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500/40
            ${prefix ? 'pl-8' : 'pl-3'} ${suffix ? 'pr-10' : 'pr-3'}
          `}
        />
        {suffix && (
          <span className="absolute right-3 text-xs text-gray-500 select-none">{suffix}</span>
        )}
      </div>
      {hint && <p className="mt-1 text-[10px] text-gray-600">{hint}</p>}
    </div>
  )
}

export default function SimuladorPage() {
  const [lancamentoId, setLancamentoId] = useState('')
  const [inputs, setInputs] = useState<Inputs>(DEFAULTS)
  const [preenchido, setPreenchido] = useState(false)
  const [loadingMediana, setLoadingMediana] = useState(false)
  const [medianaInfo, setMedianaInfo] = useState<{ ids: string[]; cpl: number; conversao: number; ticket: number } | null>(null)

  const mediana = (arr: number[]) => {
    const s = [...arr].sort((a, b) => a - b)
    const m = Math.floor(s.length / 2)
    return s.length % 2 !== 0 ? s[m] : (s[m - 1] + s[m]) / 2
  }

  const puxarHistoricoMediano = useCallback(async () => {
    setLoadingMediana(true)
    try {
      // Busca os 3 últimos lançamentos com dados de tráfego (LC22, LC23, LC24)
      const IDS = ['LC24', 'LC23', 'LC22']
      const results = await Promise.all(
        IDS.map(id => fetch(`/api/funil?id=${id}`).then(r => r.json()))
      )
      const rows: FunilRow[] = results
        .map((r: FunilRow[]) => r[0])
        .filter((r): r is FunilRow => !!r && r.total_leads > 0)

      if (rows.length === 0) return

      const cpls      = rows.map(r => Number(r.cpl)).filter(v => v > 0)
      const conversoes = rows.map(r => Number(r.taxa_conversao_pct)).filter(v => v > 0)
      const tickets   = rows
        .filter(r => Number(r.total_vendas) > 0)
        .map(r => Number(r.faturamento_bruto) / Number(r.total_vendas))
        .filter(v => v > 0)

      const medCPL      = cpls.length      > 0 ? mediana(cpls)      : 0
      const medConversao = conversoes.length > 0 ? mediana(conversoes) : 0
      const medTicket   = tickets.length   > 0 ? mediana(tickets)   : 0

      const idsUsados = rows.map(r => r.lancamento)
      setMedianaInfo({ ids: idsUsados, cpl: medCPL, conversao: medConversao, ticket: medTicket })

      setInputs(prev => ({
        ...prev,
        cpl:      medCPL      > 0 ? medCPL.toFixed(2)      : prev.cpl,
        conversao: medConversao > 0 ? medConversao.toFixed(2) : prev.conversao,
        ticket:   medTicket   > 0 ? medTicket.toFixed(2)   : prev.ticket,
      }))
      setPreenchido(false) // limpa o banner de lançamento selecionado
    } finally {
      setLoadingMediana(false)
    }
  }, [])

  // Pré-preencher com dados reais do lançamento selecionado
  useEffect(() => {
    if (!lancamentoId) return
    fetch(`/api/funil?id=${lancamentoId}`)
      .then(r => r.json())
      .then((data: FunilRow[]) => {
        const f = data[0]
        if (!f) return
        const ticketMedio = f.total_vendas > 0 ? f.faturamento_bruto / f.total_vendas : 0
        setInputs({
          investimento: f.investimento_total > 0 ? f.investimento_total.toFixed(2) : '',
          cpl: f.cpl > 0 ? f.cpl.toFixed(2) : '',
          conversao: f.taxa_conversao_pct > 0 ? f.taxa_conversao_pct.toFixed(2) : '',
          ticket: ticketMedio > 0 ? ticketMedio.toFixed(2) : '',
          taxa_plataforma: inputs.taxa_plataforma,
          imposto: inputs.imposto,
        })
        setPreenchido(true)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lancamentoId])

  const set = (k: keyof Inputs) => (v: string) => setInputs(prev => ({ ...prev, [k]: v }))

  const resetInputs = () => {
    setInputs(DEFAULTS)
    setLancamentoId('')
    setPreenchido(false)
  }

  // Cálculo central
  const inv         = parseNum(inputs.investimento)
  const cpl         = parseNum(inputs.cpl)
  const conversao   = parseNum(inputs.conversao)
  const ticket      = parseNum(inputs.ticket)
  const taxaPlat    = parseNum(inputs.taxa_plataforma)
  const aliqImposto = parseNum(inputs.imposto)

  const leads           = cpl > 0 ? inv / cpl : 0
  const vendas          = leads * (conversao / 100)
  const fatBruto        = vendas * ticket
  const valorPlataforma = fatBruto * (taxaPlat / 100)
  const valorImposto    = fatBruto * (aliqImposto / 100)
  const lucroLiquido    = fatBruto - inv - valorPlataforma - valorImposto
  const roi             = inv > 0 ? (lucroLiquido / inv) * 100 : 0
  const margem          = fatBruto > 0 ? (lucroLiquido / fatBruto) * 100 : 0
  const roiMultiplo     = inv > 0 ? fatBruto / inv : 0

  const temDados = inv > 0 && cpl > 0 && conversao > 0 && ticket > 0

  const ResultCard = ({
    label,
    value,
    sub,
    color = 'white',
    big = false,
  }: {
    label: string
    value: string
    sub?: string
    color?: string
    big?: boolean
  }) => (
    <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className={`${big ? 'text-2xl' : 'text-xl'} font-bold tabular-nums ${color}`}>{value}</p>
      {sub && <p className="text-[10px] text-gray-500 mt-1">{sub}</p>}
    </div>
  )

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Calculator size={18} className="text-purple-400" />
            Forecasting Preditivo
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Projete seu próximo lançamento com valores absolutos — sem depender de dados históricos
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={puxarHistoricoMediano}
            disabled={loadingMediana}
            className="flex items-center gap-1.5 text-xs font-medium text-emerald-300 hover:text-emerald-200 transition-colors border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingMediana
              ? <Loader2 size={11} className="animate-spin" />
              : <History size={11} />}
            Puxar Histórico Mediano
          </button>
          <LancamentoSelector value={lancamentoId} onChange={setLancamentoId} />
          <button
            onClick={resetInputs}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-200 transition-colors border border-gray-700 rounded-lg px-3 py-2"
          >
            <RefreshCw size={11} /> Limpar
          </button>
        </div>
      </div>

      {preenchido && (
        <div className="flex items-center gap-2 rounded-lg border border-purple-500/20 bg-purple-500/5 px-4 py-2.5 text-xs text-purple-300">
          <Info size={13} />
          Campos pré-preenchidos com dados reais do lançamento selecionado. Edite à vontade.
        </div>
      )}

      {medianaInfo && !preenchido && (
        <div className="flex items-start gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-xs text-emerald-300">
          <History size={13} className="mt-0.5 shrink-0" />
          <div>
            <span className="font-semibold">Mediana histórica aplicada</span>
            {' '}com base em {medianaInfo.ids.join(', ')}.{' '}
            CPL: <span className="font-bold text-white">{fmt_currency(medianaInfo.cpl)}</span>
            {' · '}Conversão: <span className="font-bold text-white">{medianaInfo.conversao.toFixed(2)}%</span>
            {' · '}Ticket: <span className="font-bold text-white">{fmt_currency(medianaInfo.ticket)}</span>.
            {' '}Ajuste o investimento e simule.
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">

        {/* Inputs — coluna esquerda */}
        <div className="lg:col-span-2 space-y-4">

          {/* Investimento & CPL */}
          <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-5 space-y-4">
            <h2 className="text-xs font-semibold text-gray-300 uppercase tracking-wider">📡 Tráfego</h2>
            <InputField
              label="Investimento Pretendido"
              value={inputs.investimento}
              onChange={set('investimento')}
              prefix="R$"
              placeholder="Ex: 40000"
              hint="Total que será investido em anúncios"
            />
            <InputField
              label="CPL Estimado (Custo por Lead)"
              value={inputs.cpl}
              onChange={set('cpl')}
              prefix="R$"
              placeholder="Ex: 14.50"
              hint="Quanto você paga por cada lead captado"
            />
          </div>

          {/* Conversão & Ticket */}
          <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-5 space-y-4">
            <h2 className="text-xs font-semibold text-gray-300 uppercase tracking-wider">🛒 Vendas</h2>
            <InputField
              label="Taxa de Conversão Lead → Venda"
              value={inputs.conversao}
              onChange={set('conversao')}
              suffix="%"
              placeholder="Ex: 2.5"
              hint="% dos leads que se tornam compradores"
            />
            <InputField
              label="Ticket Médio do Produto"
              value={inputs.ticket}
              onChange={set('ticket')}
              prefix="R$"
              placeholder="Ex: 1637"
              hint="Valor médio de cada venda"
            />
          </div>

          {/* Custos */}
          <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-5 space-y-4">
            <h2 className="text-xs font-semibold text-gray-300 uppercase tracking-wider">💸 Custos & Impostos</h2>
            <InputField
              label="Taxa da Plataforma de Pagamento"
              value={inputs.taxa_plataforma}
              onChange={set('taxa_plataforma')}
              suffix="%"
              placeholder="9.9"
              hint="Hotmart, Kiwify, etc."
            />
            <InputField
              label="Alíquota de Imposto"
              value={inputs.imposto}
              onChange={set('imposto')}
              suffix="%"
              placeholder="6"
              hint="Simples Nacional, Lucro Presumido, etc."
            />
          </div>
        </div>

        {/* Resultados — coluna direita */}
        <div className="lg:col-span-3 space-y-4">

          {temDados ? (
            <>
              {/* Funil projetado */}
              <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-5">
                <h2 className="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-4">📊 Funil Projetado</h2>
                <div className="space-y-3">
                  {[
                    { label: 'Investimento', value: fmt_currency(inv, true), color: 'text-gray-200' },
                    { label: 'Total de Leads', value: fmt_number(leads, 0), color: 'text-blue-300', sub: `CPL real: ${fmt_currency(cpl)}` },
                    { label: 'Total de Vendas', value: fmt_number(vendas, 0), color: 'text-purple-300', sub: `Conversão: ${fmt_pct(conversao, 2)}` },
                    { label: 'Faturamento Bruto', value: fmt_currency(fatBruto, true), color: 'text-emerald-300', sub: `Ticket médio: ${fmt_currency(ticket)}` },
                  ].map((row, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                      <div>
                        <p className="text-xs text-gray-500">{row.label}</p>
                        {row.sub && <p className="text-[10px] text-gray-600 mt-0.5">{row.sub}</p>}
                      </div>
                      <p className={`text-base font-bold tabular-nums ${row.color}`}>{row.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Resultado financeiro */}
              <div className="grid grid-cols-2 gap-3">
                <ResultCard
                  label="Taxa Plataforma"
                  value={fmt_currency(valorPlataforma, true)}
                  sub={`${taxaPlat}% do faturamento`}
                  color="text-orange-300"
                />
                <ResultCard
                  label="Imposto"
                  value={fmt_currency(valorImposto, true)}
                  sub={`${aliqImposto}% do faturamento`}
                  color="text-orange-300"
                />
                <ResultCard
                  label="Lucro Líquido"
                  value={fmt_currency(lucroLiquido, true)}
                  sub={`Margem: ${fmt_pct(margem, 1)}`}
                  color={lucroLiquido >= 0 ? 'text-emerald-400' : 'text-red-400'}
                />
                <ResultCard
                  label="Margem Líquida"
                  value={fmt_pct(margem, 1)}
                  sub={`Lucro ÷ Faturamento`}
                  color={margem >= 20 ? 'text-emerald-400' : margem >= 0 ? 'text-yellow-400' : 'text-red-400'}
                />
              </div>

              {/* ROI destaque */}
              <div className={`rounded-xl border p-5 ${roi >= 0 ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">ROI do Lançamento</p>
                    <div className="flex items-baseline gap-2">
                      <p className={`text-4xl font-bold tabular-nums ${roi >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {roi >= 0 ? '+' : ''}{roi.toFixed(1)}%
                      </p>
                      {roi >= 0 ? (
                        <TrendingUp size={20} className="text-emerald-400 mb-0.5" />
                      ) : (
                        <TrendingDown size={20} className="text-red-400 mb-0.5" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1.5">
                      Para cada <span className="text-white font-medium">R$1,00</span> investido, retorna{' '}
                      <span className={`font-bold ${roiMultiplo >= 1 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {fmt_currency(roiMultiplo)}
                      </span>
                    </p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-[10px] text-gray-500">Faturamento / Investimento</p>
                    <p className="text-lg font-bold text-white tabular-nums">{roiMultiplo.toFixed(2)}x</p>
                  </div>
                </div>
              </div>

              {lucroLiquido < 0 && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
                  <strong>⚠️ Atenção:</strong> Com essas premissas o lançamento opera no prejuízo. Revise CPL, conversão ou ticket médio.
                </div>
              )}

              {/* Breakdown de custos */}
              <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-5">
                <h2 className="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-4">💡 Destino do Faturamento</h2>
                {[
                  { label: 'Investimento em Tráfego', valor: inv, pct: fatBruto > 0 ? (inv / fatBruto) * 100 : 0, color: 'bg-blue-500' },
                  { label: 'Taxa Plataforma', valor: valorPlataforma, pct: fatBruto > 0 ? (valorPlataforma / fatBruto) * 100 : 0, color: 'bg-orange-500' },
                  { label: 'Imposto', valor: valorImposto, pct: fatBruto > 0 ? (valorImposto / fatBruto) * 100 : 0, color: 'bg-yellow-500' },
                  { label: 'Lucro Líquido', valor: lucroLiquido, pct: margem, color: lucroLiquido >= 0 ? 'bg-emerald-500' : 'bg-red-500' },
                ].map((row, i) => (
                  <div key={i} className="mb-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400">{row.label}</span>
                      <span className="text-gray-300 tabular-nums">
                        {fmt_currency(row.valor, true)} <span className="text-gray-500">({row.pct.toFixed(1)}%)</span>
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-gray-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${row.color} transition-all duration-500`}
                        style={{ width: `${Math.max(0, Math.min(100, row.pct))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-12 text-center">
              <Calculator size={40} className="text-gray-700 mx-auto mb-4" />
              <p className="text-sm font-medium text-gray-400">Preencha os campos ao lado para ver a projeção</p>
              <p className="text-xs text-gray-600 mt-2">
                Ou selecione um lançamento acima para pré-preencher com dados reais
              </p>
              <div className="mt-6 grid grid-cols-2 gap-2 max-w-xs mx-auto text-left">
                {['Investimento', 'CPL Estimado', 'Taxa de Conversão', 'Ticket Médio'].map(f => (
                  <div key={f} className="flex items-center gap-1.5 text-xs text-gray-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-700" />
                    {f}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

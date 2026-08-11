'use client'

import { useEffect, useState, useCallback } from 'react'
import { BarChart2, TrendingDown, Users, Zap, Target, Bell, ShoppingCart, BadgeCheck, Sparkles, Loader2, RefreshCw, ArrowUp, ArrowDown, Minus } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import LancamentoSelector from '../../../components/lancamento-selector'
import { fmt_currency } from '../../../lib/format'

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

type Qualificacao = {
  tipo: string
  qualificados: number
  total: number
  pct_qualificado: number
}

type Anuncio = {
  anuncio: string
  conjunto_anuncio: string
  campanha: string
  total_gasto: number
  impressoes: number
  cliques: number
  leads: number
  ctr_medio: number
  cpc_medio: number
  cpl: number | null
}

type QualificacaoAnuncio = {
  anuncio: string
  qualificados: number
  total: number
  pct_qualificado: number
}

type CorredorPolonesDiaRow = {
  dia: string
  campanha: string
  hook_rate: number | null
  retencao_25_75: number | null
}

type CorredorPolonesRow = {
  campanha: string
  total_gasto: number
  thruplays: number
  custo_thruplay: number | null
  video_plays_3s: number
  video_p25: number
  video_p50: number
  video_p75: number
  video_p95: number
  video_p100: number
  video_plays: number
  custo_vv25: number | null
  custo_vv50: number | null
  custo_vv75: number | null
  custo_vv95: number | null
  hook_rate: number | null
  retencao_25_75: number | null
}

type PublicoResumoRow = {
  publico_nome: string
  data_atual: string
  atual: number | null
  semelhante: boolean
  anterior: number | null
}

type PublicoEvolucaoRow = {
  dia: string
  publico_nome: string
  tamanho_min: number | null
  semelhante: boolean
}

// Grupo é o primeiro segmento do nome ("Funil_Meio | VV | ..." -> "Funil_Meio")
function grupoPublico(nome: string) {
  return nome.split('|')[0]?.trim() ?? nome
}
function labelPublico(nome: string) {
  const partes = nome.split('|').map(p => p.trim())
  return partes.slice(1).join(' | ') || nome
}

// Formata uma data ISO ("2026-07-21" ou "2026-07-21T00:00:00.000Z") como "DD/MM"
function diaCurto(dia: string) {
  const [, mes, resto] = dia.slice(0, 10).split('-')
  const diaNum = resto?.slice(0, 2)
  return mes && diaNum ? `${diaNum}/${mes}` : dia
}

function hojeISO() {
  return new Date().toISOString().slice(0, 10)
}

type ColunaCorredor = Exclude<keyof CorredorPolonesRow, 'campanha'>

// Todas as métricas de vídeo disponíveis da extração Meta, na ordem em que aparecem na tabela.
const COLUNAS_CORREDOR: { campo: ColunaCorredor; label: string }[] = [
  { campo: 'total_gasto',     label: 'Gasto' },
  { campo: 'thruplays',       label: 'ThruPlays' },
  { campo: 'custo_thruplay',  label: 'Custo/ThruPlay' },
  { campo: 'video_plays_3s',  label: 'VV 3s' },
  { campo: 'video_p25',       label: 'VV 25%' },
  { campo: 'video_p50',       label: 'VV 50%' },
  { campo: 'video_p75',       label: 'VV 75%' },
  { campo: 'video_p95',       label: 'VV 95%' },
  { campo: 'video_p100',      label: 'VV 100%' },
  { campo: 'video_plays',     label: 'Total Plays' },
  { campo: 'custo_vv25',      label: 'Custo VV 25%' },
  { campo: 'custo_vv50',      label: 'Custo VV 50%' },
  { campo: 'custo_vv75',      label: 'Custo VV 75%' },
  { campo: 'custo_vv95',      label: 'Custo VV 95%' },
  { campo: 'hook_rate',       label: 'Hook Rate' },
  { campo: 'retencao_25_75',  label: 'Retenção 25→75%' },
]
const COLUNAS_PADRAO: ColunaCorredor[] = [
  'total_gasto', 'thruplays', 'custo_thruplay', 'video_p25', 'video_p50', 'video_p75', 'video_p95', 'hook_rate', 'retencao_25_75',
]
const COLUNAS_STORAGE_KEY = 'corredor-polones-colunas'

function carregarColunasVisiveis(): ColunaCorredor[] {
  if (typeof window === 'undefined') return COLUNAS_PADRAO
  try {
    const salvo = window.localStorage.getItem(COLUNAS_STORAGE_KEY)
    if (!salvo) return COLUNAS_PADRAO
    const lista = JSON.parse(salvo) as string[]
    const validas = lista.filter((c): c is ColunaCorredor => COLUNAS_CORREDOR.some(col => col.campo === c))
    return validas.length > 0 ? validas : COLUNAS_PADRAO
  } catch {
    return COLUNAS_PADRAO
  }
}

// Extrai um código curto de criativo (ex: "AT001") do nome da campanha, pra caber em legendas.
// O 1º segmento é sempre o código do lançamento (ex: LC26) — ignora ele e procura o código de criativo depois.
function criativoLabel(campanha: string) {
  const partes = campanha.split('_')
  const codigo = partes.slice(1).find(p => /^[A-Za-z]{1,4}\d{1,4}$/.test(p))
  return codigo ?? campanha.slice(0, 20)
}

const TIPO_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  captacao_pq: { label: 'Captação Quente',  color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20',   icon: Zap },
  captacao_pf: { label: 'Captação Fria',    color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20', icon: Users },
  captacao:    { label: 'Captação',         color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20',   icon: Users },
  aquecimento: { label: 'Aquecimento',      color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20', icon: TrendingDown },
  distribuicao:{ label: 'Distribuição',     color: 'text-teal-400',   bg: 'bg-teal-500/10 border-teal-500/20',   icon: BarChart2 },
  atracao:     { label: 'Atração',          color: 'text-cyan-400',   bg: 'bg-cyan-500/10 border-cyan-500/20',   icon: Zap },
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
  const [lancamentoId, setLancamentoId] = useState('LC26')
  const [breakdown, setBreakdown] = useState<Breakdown[]>([])
  const [campanhas, setCampanhas] = useState<Campanha[]>([])
  const [diario, setDiario]       = useState<DiarioDado[]>([])
  const [qualificacao, setQualificacao] = useState<Qualificacao[]>([])
  const [qualifPorAnuncio, setQualifPorAnuncio] = useState<QualificacaoAnuncio[]>([])
  const [anuncios, setAnuncios]   = useState<Anuncio[]>([])
  const [loading, setLoading]     = useState(false)
  const [filtroCampanha, setFiltro] = useState<string>('todos')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim]       = useState('')
  const [aba, setAba] = useState<'captacao' | 'corredor' | 'publicos'>('captacao')
  const [publicosResumo, setPublicosResumo] = useState<PublicoResumoRow[]>([])
  const [publicosEvolucao, setPublicosEvolucao] = useState<PublicoEvolucaoRow[]>([])
  const [carregandoPublicos, setCarregandoPublicos] = useState(false)
  const [grupoPublicos, setGrupoPublicos] = useState<string>('todos')
  const [mostrarSemelhantes, setMostrarSemelhantes] = useState(false)
  const [corredorTurbinamento, setCorredorTurbinamento] = useState<CorredorPolonesRow[]>([])
  const [corredorDistribuicao, setCorredorDistribuicao] = useState<CorredorPolonesRow[]>([])
  const [nivelDistribuicao, setNivelDistribuicao] = useState<'campanha' | 'conjunto' | 'anuncio'>('anuncio')
  const [corredorDiario, setCorredorDiario] = useState<CorredorPolonesDiaRow[]>([])
  const [categoriaGrafico, setCategoriaGrafico] = useState<'turbinamento' | 'distribuicao'>('turbinamento')
  const [carregandoCorredor, setCarregandoCorredor] = useState(false)
  const [ordenarPorT, setOrdenarPorT] = useState<keyof CorredorPolonesRow>('total_gasto')
  const [ordemAscT, setOrdemAscT] = useState(false)
  const [ordenarPorD, setOrdenarPorD] = useState<keyof CorredorPolonesRow>('total_gasto')
  const [ordemAscD, setOrdemAscD] = useState(false)
  const [colunasVisiveis, setColunasVisiveis] = useState<ColunaCorredor[]>(COLUNAS_PADRAO)
  const [seletorColunasAberto, setSeletorColunasAberto] = useState(false)
  const [analiseIA, setAnaliseIA] = useState<string>('')
  const [carregandoIA, setCarregandoIA] = useState(false)
  const [erroIA, setErroIA] = useState<string>('')
  const [escopoIA, setEscopoIA] = useState<'tudo' | 'turbinamento' | 'distribuicao'>('tudo')
  const [instrucaoIA, setInstrucaoIA] = useState('')

  useEffect(() => { setColunasVisiveis(carregarColunasVisiveis()) }, [])

  function alternarColuna(campo: ColunaCorredor) {
    setColunasVisiveis(atual => {
      const nova = atual.includes(campo) ? atual.filter(c => c !== campo) : [...atual, campo]
      window.localStorage.setItem(COLUNAS_STORAGE_KEY, JSON.stringify(nova))
      return nova
    })
  }

  async function analisarComIA() {
    if (!lancamentoId) return
    setCarregandoIA(true)
    setErroIA('')
    try {
      const res = await fetch('/api/trafego/analisar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: lancamentoId,
          categoria: escopoIA === 'tudo' ? undefined : escopoIA,
          nivel: escopoIA === 'distribuicao' ? nivelDistribuicao : undefined,
          instrucao: instrucaoIA,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Erro ao gerar análise')
      setAnaliseIA(json.analise)
    } catch (e) {
      setErroIA(e instanceof Error ? e.message : 'Erro ao gerar análise')
    } finally {
      setCarregandoIA(false)
    }
  }

  const fetchAll = useCallback(async () => {
    if (!lancamentoId) return
    setLoading(true)
    try {
      const periodo = new URLSearchParams()
      if (dataInicio) periodo.set('dataInicio', dataInicio)
      if (dataFim)    periodo.set('dataFim', dataFim)

      const [b, c, d, q, a, qa] = await Promise.all([
        fetch(`/api/trafego?id=${lancamentoId}&view=breakdown&${periodo}`).then(r => r.json()),
        fetch(`/api/trafego?id=${lancamentoId}&view=campanhas&${periodo}`).then(r => r.json()),
        fetch(`/api/trafego?id=${lancamentoId}&view=diario`).then(r => r.json()),
        fetch(`/api/trafego?id=${lancamentoId}&view=qualificacao`).then(r => r.json()),
        fetch(`/api/trafego?id=${lancamentoId}&view=anuncios&${periodo}`).then(r => r.json()),
        fetch(`/api/trafego?id=${lancamentoId}&view=qualificacao-anuncio`).then(r => r.json()),
      ])
      setBreakdown(Array.isArray(b) ? b : [])
      setCampanhas(Array.isArray(c) ? c : [])
      setDiario(Array.isArray(d) ? d : [])
      setQualificacao(Array.isArray(q) ? q : [])
      setAnuncios(Array.isArray(a) ? a : [])
      setQualifPorAnuncio(Array.isArray(qa) ? qa : [])
    } finally {
      setLoading(false)
    }
  }, [lancamentoId, dataInicio, dataFim])

  useEffect(() => { fetchAll() }, [fetchAll])

  const fetchCorredor = useCallback(async () => {
    if (!lancamentoId) return
    setCarregandoCorredor(true)
    try {
      const periodo = new URLSearchParams()
      if (dataInicio) periodo.set('dataInicio', dataInicio)
      if (dataFim)    periodo.set('dataFim', dataFim)

      const periodoDistribuicao = new URLSearchParams(periodo)
      periodoDistribuicao.set('categoria', 'distribuicao')
      periodoDistribuicao.set('nivel', nivelDistribuicao)

      const periodoTurbinamento = new URLSearchParams(periodo)
      periodoTurbinamento.set('categoria', 'turbinamento')

      const [t, dist, d] = await Promise.all([
        fetch(`/api/trafego?id=${lancamentoId}&view=corredor-polones&${periodoTurbinamento}`).then(r => r.json()),
        fetch(`/api/trafego?id=${lancamentoId}&view=corredor-polones&${periodoDistribuicao}`).then(r => r.json()),
        fetch(`/api/trafego?id=${lancamentoId}&view=corredor-polones-diario&categoria=${categoriaGrafico}`).then(r => r.json()),
      ])
      setCorredorTurbinamento(Array.isArray(t) ? t : [])
      setCorredorDistribuicao(Array.isArray(dist) ? dist : [])
      setCorredorDiario(Array.isArray(d) ? d : [])
    } finally {
      setCarregandoCorredor(false)
    }
  }, [lancamentoId, dataInicio, dataFim, nivelDistribuicao, categoriaGrafico])

  useEffect(() => {
    if (aba !== 'corredor') return
    fetchCorredor()
  }, [aba, fetchCorredor])

  const fetchPublicos = useCallback(async () => {
    if (!lancamentoId) return
    setCarregandoPublicos(true)
    try {
      const [r, e] = await Promise.all([
        fetch(`/api/publicos?id=${lancamentoId}&view=resumo`).then(r => r.json()),
        fetch(`/api/publicos?id=${lancamentoId}&view=evolucao`).then(r => r.json()),
      ])
      setPublicosResumo(Array.isArray(r) ? r : [])
      setPublicosEvolucao(Array.isArray(e) ? e : [])
    } finally {
      setCarregandoPublicos(false)
    }
  }, [lancamentoId])

  useEffect(() => {
    if (aba !== 'publicos') return
    fetchPublicos()
  }, [aba, fetchPublicos])

  function atualizarDados() {
    fetchAll()
    if (aba === 'corredor') fetchCorredor()
    if (aba === 'publicos') fetchPublicos()
  }

  function ordenarLinhas(linhas: CorredorPolonesRow[], campo: keyof CorredorPolonesRow, asc: boolean) {
    return [...linhas].sort((a, b) => {
      const va = a[campo] ?? -Infinity
      const vb = b[campo] ?? -Infinity
      if (typeof va === 'string' || typeof vb === 'string') return asc ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va))
      return asc ? (va as number) - (vb as number) : (vb as number) - (va as number)
    })
  }

  function rankearPorRetencao(linhas: CorredorPolonesRow[]) {
    return new Map(
      [...linhas]
        .sort((a, b) => (b.retencao_25_75 ?? -1) - (a.retencao_25_75 ?? -1))
        .map((c, i) => [c.campanha, i + 1])
    )
  }

  const turbinamentoOrdenado = ordenarLinhas(corredorTurbinamento, ordenarPorT, ordemAscT)
  const rankTurbinamento = rankearPorRetencao(corredorTurbinamento)
  const distribuicaoOrdenado = ordenarLinhas(corredorDistribuicao, ordenarPorD, ordemAscD)
  const rankDistribuicao = rankearPorRetencao(corredorDistribuicao)

  // Públicos: agrupa por prefixo (Funil_Meio, Funil_Topo, ...) e filtra semelhantes por padrão
  const gruposPublicos = ['todos', ...Array.from(new Set(publicosResumo.map(p => grupoPublico(p.publico_nome))))]
  const publicosVisiveis = publicosResumo
    .filter(p => mostrarSemelhantes || !p.semelhante)
    .filter(p => grupoPublicos === 'todos' ? true : grupoPublico(p.publico_nome) === grupoPublicos)
    .sort((a, b) => a.publico_nome.localeCompare(b.publico_nome))

  const evolucaoFiltrada = publicosEvolucao.filter(p =>
    (mostrarSemelhantes || !p.semelhante) && (grupoPublicos === 'todos' || grupoPublico(p.publico_nome) === grupoPublicos)
  )
  const publicosDiasUnicos = Array.from(new Set(evolucaoFiltrada.map(p => p.dia))).sort()
  const publicosNomesUnicos = Array.from(new Set(evolucaoFiltrada.map(p => p.publico_nome))).sort((a, b) => a.localeCompare(b))
  const chartPublicos = publicosDiasUnicos.map(dia => {
    const row: Record<string, string | number> = { dia: diaCurto(dia) }
    for (const nome of publicosNomesUnicos) {
      const p = evolucaoFiltrada.find(x => x.dia === dia && x.publico_nome === nome)
      if (p?.tamanho_min != null) row[nome] = p.tamanho_min
    }
    return row
  })
  const CORES_PUBLICOS = ['#10b981', '#6366f1', '#f59e0b', '#ec4899', '#14b8a6', '#f472b6', '#38bdf8', '#a3e635', '#fb923c', '#c084fc']

  function formatarValorColuna(campo: ColunaCorredor, valor: number | null) {
    if (valor == null) return '—'
    if (campo === 'hook_rate' || campo === 'retencao_25_75') return `${(valor * 100).toFixed(1)}%`
    if (campo === 'total_gasto' || campo.startsWith('custo')) return fmt_currency(valor)
    return valor.toLocaleString('pt-BR')
  }

  function corHookRate(v: number | null) {
    if (v == null) return 'text-gray-600'
    if (v >= 0.30) return 'text-emerald-400'
    if (v >= 0.20) return 'text-yellow-400'
    return 'text-red-400'
  }
  function corRetencao(v: number | null) {
    if (v == null) return 'text-gray-600'
    if (v >= 0.20) return 'text-emerald-400'
    if (v >= 0.10) return 'text-yellow-400'
    return 'text-red-400'
  }

  function corColuna(campo: ColunaCorredor, valor: number | null) {
    if (campo === 'hook_rate') return corHookRate(valor)
    if (campo === 'retencao_25_75') return corRetencao(valor)
    return 'text-gray-200'
  }

  function renderTabelaCorredor(
    rows: CorredorPolonesRow[],
    ordenado: CorredorPolonesRow[],
    ordenarPor: keyof CorredorPolonesRow,
    setOrdenarPor: (c: keyof CorredorPolonesRow) => void,
    ordemAsc: boolean,
    setOrdemAsc: React.Dispatch<React.SetStateAction<boolean>>,
    rank: Map<string, number>,
    colunaLabel: string,
  ) {
    function alternar(campo: keyof CorredorPolonesRow) {
      if (ordenarPor === campo) setOrdemAsc(v => !v)
      else { setOrdenarPor(campo); setOrdemAsc(false) }
    }
    const colunas = COLUNAS_CORREDOR.filter(c => colunasVisiveis.includes(c.campo))
    return (
      <>
        {rows.length === 0 && !carregandoCorredor && (
          <p className="py-8 text-center text-gray-500 text-xs">Nenhum dado de vídeo encontrado para essa categoria.</p>
        )}
        {rows.length > 0 && (
          <div className="space-y-3 md:hidden">
            {ordenado.map((c, i) => {
              const posicao = rank.get(c.campanha) ?? null
              const medalha = posicao === 1 ? '🥇' : posicao === 2 ? '🥈' : posicao === 3 ? '🥉' : `#${posicao}`
              return (
                <div key={i} className="rounded-lg border border-gray-800 bg-gray-950/50 p-3 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm text-gray-100 font-medium leading-snug">{criativoLabel(c.campanha)}</span>
                    <span className="text-xs text-gray-500 shrink-0">{medalha}</span>
                  </div>
                  <p className="text-[10px] text-gray-600 truncate" title={c.campanha}>{c.campanha}</p>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs pt-1 border-t border-gray-800/80">
                    {colunas.map(col => (
                      <div key={col.campo}>
                        <p className="text-gray-500">{col.label}</p>
                        <p className={`font-medium tabular-nums ${corColuna(col.campo, c[col.campo] as number | null)}`}>
                          {formatarValorColuna(col.campo, c[col.campo] as number | null)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
        {rows.length > 0 && (
          <div className="hidden md:block overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--border)' }}>
            <table className="w-full">
              <thead>
                <tr className="tbl-thead-row">
                  <th className="tbl-th w-10">#</th>
                  <th className="tbl-th">{colunaLabel}</th>
                  {colunas.map(col => (
                    <th key={col.campo} className="tbl-th tbl-th-right cursor-pointer select-none hover:text-[var(--text-1)] transition-colors"
                      onClick={() => alternar(col.campo)}>
                      {col.label}{ordenarPor === col.campo ? (ordemAsc ? ' ▲' : ' ▼') : ''}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ordenado.map((c, i) => {
                  const posicao = rank.get(c.campanha) ?? null
                  const medalha = posicao === 1 ? '🥇' : posicao === 2 ? '🥈' : posicao === 3 ? '🥉' : null
                  return (
                    <tr key={i} className="tbl-row">
                      <td className="tbl-td tabular-nums">{medalha ?? posicao}</td>
                      <td className="tbl-td tbl-td-strong">
                        <span className="max-w-xs truncate block" title={c.campanha}>{c.campanha}</span>
                      </td>
                      {colunas.map(col => (
                        <td key={col.campo} className={`tbl-td text-right tabular-nums font-medium ${corColuna(col.campo, c[col.campo] as number | null)}`}>
                          {formatarValorColuna(col.campo, c[col.campo] as number | null)}
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </>
    )
  }

  // Monta série diária: uma coluna por campanha, pra plotar várias linhas no mesmo gráfico
  const campanhasDiario = Array.from(new Set(corredorDiario.map(d => d.campanha)))
  const diasUnicos = Array.from(new Set(corredorDiario.map(d => d.dia))).sort()
  const chartHookRate = diasUnicos.map(dia => {
    const row: Record<string, string | number> = { dia: diaCurto(dia) }
    for (const camp of campanhasDiario) {
      const d = corredorDiario.find(x => x.dia === dia && x.campanha === camp)
      if (d?.hook_rate != null) row[camp] = Number((d.hook_rate * 100).toFixed(1))
    }
    return row
  })
  const chartRetencao = diasUnicos.map(dia => {
    const row: Record<string, string | number> = { dia: diaCurto(dia) }
    for (const camp of campanhasDiario) {
      const d = corredorDiario.find(x => x.dia === dia && x.campanha === camp)
      if (d?.retencao_25_75 != null) row[camp] = Number((d.retencao_25_75 * 100).toFixed(1))
    }
    return row
  })
  const CORES_CAMPANHA = ['#10b981', '#6366f1', '#f59e0b', '#ec4899', '#14b8a6']

  const qualifPorAnuncioMap = new Map(qualifPorAnuncio.map(q => [q.anuncio, q]))

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

  const tiposSecundarios = ['aquecimento', 'atracao', 'distribuicao', 'lembrete', 'remarketing', 'venda', 'outros']
  const secundarios = tiposSecundarios
    .map(t => {
      const row = breakdown.find(r => r.tipo === t)
      return { tipo: t, gasto: row?.gasto ?? 0, leads: row?.leads ?? 0, impressoes: row?.impressoes ?? 0, cliques: row?.cliques ?? 0 }
    })
    .filter(r => r.gasto > 0)

  // Filtro de campanhas
  const tiposUnicos = ['todos', ...Array.from(new Set(campanhas.map(c => c.tipo)))]
  const campanhasFiltradas = filtroCampanha === 'todos'
    ? campanhas
    : campanhas.filter(c => c.tipo === filtroCampanha)

  const chartData = diario.map(d => ({
    dia: d.dia ? diaCurto(d.dia) : d.dia,
    'Gasto Total': Number(d.gasto?.toFixed(0)),
    'Gasto Captação': Number(d.gasto_captacao?.toFixed(0)),
    'Leads': d.leads,
  }))

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
        <div className="flex items-center gap-4">
          {totalGasto > 0 && (
            <div className="text-right">
              <p className="text-xs text-gray-500">Investimento Total</p>
              <p className="text-xl font-bold text-white">{fmt_currency(totalGasto)}</p>
            </div>
          )}
          <LancamentoSelector value={lancamentoId} onChange={setLancamentoId} />
        </div>
      </div>

      {/* Abas */}
      <div className="flex items-center justify-between border-b border-gray-800 pb-px flex-wrap gap-2">
        <div className="flex gap-1.5">
          {(['captacao', 'corredor', 'publicos'] as const).map(a => (
            <button
              key={a}
              onClick={() => setAba(a)}
              className={`text-xs px-3 py-2 border-b-2 transition-colors ${
                aba === a
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              {a === 'captacao' ? 'Captação' : a === 'corredor' ? 'Corredor Polonês' : 'Públicos'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 pb-1.5">
          <input
            type="date"
            value={dataInicio}
            onChange={e => setDataInicio(e.target.value)}
            className="rounded-lg border border-gray-700 bg-gray-800/80 px-2 py-1 text-xs text-gray-200"
          />
          <span className="text-gray-600 text-xs">até</span>
          <input
            type="date"
            value={dataFim}
            onChange={e => setDataFim(e.target.value)}
            className="rounded-lg border border-gray-700 bg-gray-800/80 px-2 py-1 text-xs text-gray-200"
          />
          <button
            onClick={() => { const h = hojeISO(); setDataInicio(h); setDataFim(h) }}
            className="text-xs px-2.5 py-1 rounded-full border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"
          >
            Hoje
          </button>
          {(dataInicio || dataFim) && (
            <button
              onClick={() => { setDataInicio(''); setDataFim('') }}
              className="text-xs px-2.5 py-1 rounded-full border border-gray-700 text-gray-500 hover:text-gray-300"
            >
              Limpar
            </button>
          )}
          <button
            onClick={atualizarDados}
            disabled={loading || carregandoCorredor}
            title="Atualizar dados"
            className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-600 disabled:opacity-40 transition-colors"
          >
            <RefreshCw size={12} className={(loading || carregandoCorredor) ? 'animate-spin' : ''} />
            Atualizar
          </button>
        </div>
      </div>

      {!lancamentoId && (
        <div className="flex h-40 items-center justify-center text-gray-500 text-sm">
          Selecione um lançamento para ver os dados de tráfego
        </div>
      )}

      {lancamentoId && aba === 'captacao' && (<>

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

      {/* Qualificação de Lead */}
      {qualificacao.length > 0 && (
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
          <div className="flex items-center gap-1.5 mb-3">
            <BadgeCheck size={13} className="text-emerald-400" />
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Qualificação de Lead
            </p>
            <span className="text-[10px] text-gray-600">— formação (Admin/Contab/Econ) + renda ≥ R$5.000</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {qualificacao.map(q => (
              <div key={q.tipo} className="rounded-lg border border-gray-800 bg-gray-950/50 p-3 space-y-1">
                <p className="text-xs text-gray-500">{tipoLabel(q.tipo)}</p>
                <p className="text-lg font-bold text-white">{q.pct_qualificado ?? 0}%</p>
                <p className="text-xs text-gray-600">{q.qualificados} de {q.total} respostas</p>
              </div>
            ))}
          </div>
        </div>
      )}

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

        <div className="overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--border)' }}>
          <table className="w-full">
            <thead>
              <tr className="tbl-thead-row">
                <th className="tbl-th">Campanha</th>
                <th className="tbl-th">Tipo</th>
                <th className="tbl-th tbl-th-right">Gasto</th>
                <th className="tbl-th tbl-th-right">Leads</th>
                <th className="tbl-th tbl-th-right">CPL</th>
                <th className="tbl-th tbl-th-right">CTR</th>
                <th className="tbl-th tbl-th-right">CPM</th>
                <th className="tbl-th tbl-th-right">Impr.</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={8} className="tbl-td py-8 text-center">Carregando...</td></tr>
              )}
              {!loading && campanhasFiltradas.length === 0 && (
                <tr><td colSpan={8} className="tbl-td py-8 text-center">Nenhuma campanha encontrada</td></tr>
              )}
              {campanhasFiltradas.map((c, i) => (
                <tr key={i} className="tbl-row">
                  <td className="tbl-td tbl-td-strong">
                    <span className="max-w-xs truncate block cursor-help" title={c.campanha}>
                      {c.campanha}
                    </span>
                  </td>
                  <td className="tbl-td">
                    <span className={tipoBadgeClass(c.tipo)}>{tipoLabel(c.tipo)}</span>
                  </td>
                  <td className="tbl-td text-right tabular-nums tbl-td-strong">{fmt_currency(c.gasto)}</td>
                  <td className="tbl-td text-right tabular-nums">
                    {c.leads > 0
                      ? <span className="text-emerald-400 font-semibold">{c.leads.toLocaleString('pt-BR')}</span>
                      : <span className="text-gray-600">—</span>}
                  </td>
                  <td className="tbl-td text-right tabular-nums">
                    {c.cpl != null
                      ? <span className="text-blue-400 font-medium">{fmt_currency(c.cpl)}</span>
                      : <span className="text-gray-600">—</span>}
                  </td>
                  <td className="tbl-td text-right tabular-nums">
                    {c.ctr ? `${Number(c.ctr).toFixed(2)}%` : '—'}
                  </td>
                  <td className="tbl-td text-right tabular-nums">
                    {c.cpm ? fmt_currency(c.cpm) : '—'}
                  </td>
                  <td className="tbl-td text-right tabular-nums">
                    {c.impressoes > 0 ? `${(c.impressoes / 1000).toFixed(0)}k` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
            {campanhasFiltradas.length > 0 && (
              <tfoot>
                <tr className="tbl-foot-row">
                  <td className="tbl-foot-td" colSpan={2}>Total filtrado</td>
                  <td className="tbl-foot-td text-right tabular-nums" style={{ color: 'var(--text-1)' }}>
                    {fmt_currency(campanhasFiltradas.reduce((s, c) => s + c.gasto, 0))}
                  </td>
                  <td className="tbl-foot-td text-right tabular-nums text-emerald-600">
                    {campanhasFiltradas.reduce((s, c) => s + c.leads, 0).toLocaleString('pt-BR')}
                  </td>
                  <td colSpan={4} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Tabela de anúncios */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Performance por Anúncio · {anuncios.length}
          </p>
        </div>
        <div className="overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--border)' }}>
          <table className="w-full">
            <thead>
              <tr className="tbl-thead-row">
                <th className="tbl-th">Anúncio</th>
                <th className="tbl-th">Conjunto</th>
                <th className="tbl-th tbl-th-right">Gasto</th>
                <th className="tbl-th tbl-th-right">Leads</th>
                <th className="tbl-th tbl-th-right">CPL</th>
                <th className="tbl-th tbl-th-right">CTR</th>
                <th className="tbl-th tbl-th-right">Cliques</th>
                <th className="tbl-th tbl-th-right">% Qualif.</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={8} className="tbl-td py-8 text-center">Carregando...</td></tr>
              )}
              {!loading && anuncios.length === 0 && (
                <tr><td colSpan={8} className="tbl-td py-8 text-center">Nenhum anúncio encontrado no período</td></tr>
              )}
              {anuncios.slice(0, 20).map((a, i) => {
                const qa = qualifPorAnuncioMap.get(a.anuncio)
                return (
                <tr key={i} className="tbl-row">
                  <td className="tbl-td tbl-td-strong">
                    <span className="max-w-xs truncate block cursor-help" title={a.anuncio}>
                      {a.anuncio}
                    </span>
                  </td>
                  <td className="tbl-td">
                    <span className="max-w-xs truncate block cursor-help" style={{ color: 'var(--text-3)' }} title={a.conjunto_anuncio}>
                      {a.conjunto_anuncio}
                    </span>
                  </td>
                  <td className="tbl-td text-right tabular-nums tbl-td-strong">{fmt_currency(a.total_gasto)}</td>
                  <td className="tbl-td text-right tabular-nums">
                    {a.leads > 0
                      ? <span className="text-emerald-400 font-semibold">{a.leads.toLocaleString('pt-BR')}</span>
                      : <span className="text-gray-600">—</span>}
                  </td>
                  <td className="tbl-td text-right tabular-nums">
                    {a.cpl != null
                      ? <span className="text-blue-400 font-medium">{fmt_currency(a.cpl)}</span>
                      : <span className="text-gray-600">—</span>}
                  </td>
                  <td className="tbl-td text-right tabular-nums">
                    {a.ctr_medio ? `${Number(a.ctr_medio).toFixed(2)}%` : '—'}
                  </td>
                  <td className="tbl-td text-right tabular-nums">
                    {a.cliques > 0 ? a.cliques.toLocaleString('pt-BR') : '—'}
                  </td>
                  <td className="tbl-td text-right tabular-nums">
                    {qa
                      ? <span className="text-emerald-400 font-semibold" title={`${qa.qualificados} de ${qa.total} respostas de avatar`}>{qa.pct_qualificado}%</span>
                      : <span className="text-gray-600">—</span>}
                  </td>
                </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      </>)}

      {lancamentoId && aba === 'corredor' && (<>

      {/* Toggle de categoria + seletor de colunas */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-gray-500 uppercase tracking-wider mr-1">Gráficos:</span>
          {(['turbinamento', 'distribuicao'] as const).map(cat => (
            <button
              key={cat}
              onClick={() => setCategoriaGrafico(cat)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                categoriaGrafico === cat
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                  : 'border-gray-700 text-gray-500 hover:text-gray-300'
              }`}
            >
              {cat === 'turbinamento' ? 'Turbinamento' : 'Distribuição'}
            </button>
          ))}
        </div>

        <div className="relative">
          <button
            onClick={() => setSeletorColunasAberto(o => !o)}
            className="text-xs px-2.5 py-1 rounded-lg border border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-600 transition-colors"
          >
            Colunas ({colunasVisiveis.length})
          </button>
          {seletorColunasAberto && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setSeletorColunasAberto(false)} />
              <div className="absolute right-0 top-full z-20 mt-1 w-56 rounded-xl border border-gray-700 bg-gray-900 shadow-2xl p-1.5 space-y-0.5 max-h-80 overflow-y-auto">
                {COLUNAS_CORREDOR.map(col => (
                  <label key={col.campo} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-gray-200 hover:bg-gray-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={colunasVisiveis.includes(col.campo)}
                      onChange={() => alternarColuna(col.campo)}
                      className="accent-emerald-500"
                    />
                    {col.label}
                  </label>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Evolução diária */}
      {corredorDiario.length > 0 && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Hook Rate por dia</p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartHookRate} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="dia" tick={{ fontSize: 10, fill: '#6b7280' }} />
                <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} tickFormatter={v => `${v}%`} />
                <Tooltip
                  contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8 }}
                  labelStyle={{ color: '#9ca3af', fontSize: 11 }}
                  formatter={(val: number) => `${val}%`}
                />
                <Legend wrapperStyle={{ fontSize: 9 }} />
                {campanhasDiario.map((camp, i) => (
                  <Line key={camp} type="monotone" dataKey={camp} name={criativoLabel(camp)}
                    stroke={CORES_CAMPANHA[i % CORES_CAMPANHA.length]} strokeWidth={2} dot={false} connectNulls />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Retenção 25→75% por dia</p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartRetencao} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="dia" tick={{ fontSize: 10, fill: '#6b7280' }} />
                <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} tickFormatter={v => `${v}%`} />
                <Tooltip
                  contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8 }}
                  labelStyle={{ color: '#9ca3af', fontSize: 11 }}
                  formatter={(val: number) => `${val}%`}
                />
                <Legend wrapperStyle={{ fontSize: 9 }} />
                {campanhasDiario.map((camp, i) => (
                  <Line key={camp} type="monotone" dataKey={camp} name={criativoLabel(camp)}
                    stroke={CORES_CAMPANHA[i % CORES_CAMPANHA.length]} strokeWidth={2} dot={false} connectNulls />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4 space-y-3">
        <div className="flex items-center gap-1.5">
          <Sparkles size={13} className="text-violet-400" />
          <p className="text-xs font-semibold text-violet-400 uppercase tracking-wider">Análise com IA</p>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] text-gray-500 uppercase tracking-wider mr-1">Escopo:</span>
          {([
            ['tudo', 'Tudo'],
            ['turbinamento', 'Turbinamento'],
            ['distribuicao', `Distribuição (${nivelDistribuicao === 'campanha' ? 'Campanha' : nivelDistribuicao === 'conjunto' ? 'Conjunto' : 'Anúncio'})`],
          ] as const).map(([valor, label]) => (
            <button
              key={valor}
              onClick={() => setEscopoIA(valor)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                escopoIA === valor
                  ? 'bg-violet-500/20 border-violet-500/40 text-violet-300'
                  : 'border-gray-700 text-gray-500 hover:text-gray-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={instrucaoIA}
            onChange={e => setInstrucaoIA(e.target.value)}
            placeholder='O que você quer saber? Ex: "qual desses anúncios devo escalar primeiro?"'
            className="flex-1 rounded-lg border border-gray-700 bg-gray-800/80 px-3 py-1.5 text-xs text-gray-200 placeholder:text-gray-600"
          />
          <button
            onClick={analisarComIA}
            disabled={carregandoIA || (corredorTurbinamento.length === 0 && corredorDistribuicao.length === 0)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-violet-500/40 text-violet-300 hover:bg-violet-500/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
          >
            {carregandoIA ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            {carregandoIA ? 'Analisando...' : analiseIA ? 'Analisar novamente' : 'Analisar'}
          </button>
        </div>
        {erroIA && <p className="text-xs text-red-400">{erroIA}</p>}
        {analiseIA && (
          <div className="text-xs text-gray-300 leading-relaxed border-t border-violet-500/10 pt-3 space-y-2
            [&_h1]:text-sm [&_h1]:font-semibold [&_h1]:text-violet-300 [&_h1]:mt-3
            [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:text-violet-300 [&_h2]:mt-3
            [&_h3]:text-xs [&_h3]:font-semibold [&_h3]:text-violet-300 [&_h3]:uppercase [&_h3]:tracking-wide [&_h3]:mt-3
            [&_p]:mb-2
            [&_strong]:text-gray-100 [&_strong]:font-semibold
            [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:space-y-1 [&_ul]:mb-2
            [&_ol]:list-decimal [&_ol]:pl-4 [&_ol]:space-y-1 [&_ol]:mb-2
            [&_li]:marker:text-violet-500
            [&_hr]:border-violet-500/20 [&_hr]:my-3
            [&_code]:bg-gray-800 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-violet-300">
            <ReactMarkdown>{analiseIA}</ReactMarkdown>
          </div>
        )}
        {!analiseIA && !erroIA && !carregandoIA && (
          <p className="text-xs text-gray-500">Clique em "Analisar" para a IA avaliar os criativos deste lançamento e sugerir o que cortar, escalar e testar.</p>
        )}
      </div>

      {/* Tabela — Turbinamento */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Corredor Polonês — Turbinamento</p>
          <p className="text-[10px] text-gray-600 mt-0.5">
            Hook Rate = reproduções 3s ÷ impressões (<span className="text-emerald-400">≥30%</span> · <span className="text-yellow-400">20-30%</span> · <span className="text-red-400">&lt;20%</span>) · Retenção 25→75% = quem viu 75% dentre os que viram 25% (<span className="text-emerald-400">≥20%</span> · <span className="text-yellow-400">10-20%</span> · <span className="text-red-400">&lt;10%</span>)
          </p>
        </div>
        {carregandoCorredor && <p className="py-8 text-center text-gray-500 text-xs">Carregando...</p>}
        {!carregandoCorredor && renderTabelaCorredor(
          corredorTurbinamento, turbinamentoOrdenado, ordenarPorT, setOrdenarPorT, ordemAscT, setOrdemAscT, rankTurbinamento, 'Campanha',
        )}
      </div>

      {/* Tabela — Distribuição */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
        <div className="mb-4 flex items-start justify-between flex-wrap gap-2">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Corredor Polonês — Distribuição</p>
            <p className="text-[10px] text-gray-600 mt-0.5">
              Hook Rate = reproduções 3s ÷ impressões (<span className="text-emerald-400">≥30%</span> · <span className="text-yellow-400">20-30%</span> · <span className="text-red-400">&lt;20%</span>) · Retenção 25→75% = quem viu 75% dentre os que viram 25% (<span className="text-emerald-400">≥20%</span> · <span className="text-yellow-400">10-20%</span> · <span className="text-red-400">&lt;10%</span>)
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-gray-500 uppercase tracking-wider mr-1">Nível:</span>
            {(['campanha', 'conjunto', 'anuncio'] as const).map(n => (
              <button
                key={n}
                onClick={() => setNivelDistribuicao(n)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  nivelDistribuicao === n
                    ? 'bg-teal-500/20 border-teal-500/40 text-teal-400'
                    : 'border-gray-700 text-gray-500 hover:text-gray-300'
                }`}
              >
                {n === 'campanha' ? 'Campanha' : n === 'conjunto' ? 'Conjunto' : 'Anúncio'}
              </button>
            ))}
          </div>
        </div>
        {carregandoCorredor && <p className="py-8 text-center text-gray-500 text-xs">Carregando...</p>}
        {!carregandoCorredor && renderTabelaCorredor(
          corredorDistribuicao, distribuicaoOrdenado, ordenarPorD, setOrdenarPorD, ordemAscD, setOrdemAscD, rankDistribuicao,
          nivelDistribuicao === 'campanha' ? 'Campanha' : nivelDistribuicao === 'conjunto' ? 'Conjunto' : 'Anúncio',
        )}
      </div>

      </>)}

      {lancamentoId && aba === 'publicos' && (<>

      {/* Filtros de grupo e semelhantes */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {gruposPublicos.map(g => (
            <button
              key={g}
              onClick={() => setGrupoPublicos(g)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                grupoPublicos === g
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                  : 'border-gray-700 text-gray-500 hover:text-gray-300'
              }`}
            >
              {g === 'todos' ? 'Todos' : g}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer">
          <input
            type="checkbox"
            checked={mostrarSemelhantes}
            onChange={e => setMostrarSemelhantes(e.target.checked)}
            className="accent-emerald-500"
          />
          Mostrar públicos semelhantes
        </label>
      </div>

      {/* Evolução do tamanho dos públicos */}
      {chartPublicos.length > 0 && (
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Evolução do Tamanho dos Públicos</p>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartPublicos} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="dia" tick={{ fontSize: 10, fill: '#6b7280' }} />
              <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`} />
              <Tooltip
                contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8 }}
                labelStyle={{ color: '#9ca3af', fontSize: 11 }}
                formatter={(val: number) => val.toLocaleString('pt-BR')}
              />
              <Legend wrapperStyle={{ fontSize: 9 }} />
              {publicosNomesUnicos.map((nome, i) => (
                <Line key={nome} type="monotone" dataKey={nome} name={labelPublico(nome)}
                  stroke={CORES_PUBLICOS[i % CORES_PUBLICOS.length]} strokeWidth={2} dot={false} connectNulls />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tabela — histórico diário */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Tamanho dos Públicos por Dia</p>
          <p className="text-[10px] text-gray-600 mt-0.5">Tamanho mínimo estimado pela Meta · Atual/Anterior/Variação comparam as duas últimas capturas</p>
        </div>
        {carregandoPublicos && (
          <p className="py-8 text-center text-gray-500 text-xs">Carregando...</p>
        )}
        {!carregandoPublicos && publicosVisiveis.length === 0 && (
          <p className="py-8 text-center text-gray-500 text-xs">
            Nenhum público encontrado — verifique se a extração no n8n já está gravando em publicos_meta.
          </p>
        )}
        {!carregandoPublicos && publicosVisiveis.length > 0 && (
          <div className="overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--border)' }}>
            <table className="w-full">
              <thead>
                <tr className="tbl-thead-row">
                  <th className="tbl-th sticky left-0" style={{ background: 'var(--bg-app)' }}>Público</th>
                  {publicosDiasUnicos.map(dia => (
                    <th key={dia} className="tbl-th tbl-th-right whitespace-nowrap px-2">
                      {diaCurto(dia)}
                    </th>
                  ))}
                  <th className="tbl-th tbl-th-right pl-4">Atual</th>
                  <th className="tbl-th tbl-th-right">Anterior</th>
                  <th className="tbl-th tbl-th-right">Variação</th>
                </tr>
              </thead>
              <tbody>
                {publicosVisiveis.map((p, i) => {
                  const variacao = p.atual != null && p.anterior != null && p.anterior > 0
                    ? (p.atual - p.anterior) / p.anterior
                    : null
                  return (
                    <tr key={i} className="tbl-row">
                      <td className="tbl-td tbl-td-strong sticky left-0" style={{ background: 'var(--bg-surface)' }}>
                        <span className="max-w-md truncate block" title={p.publico_nome}>
                          {labelPublico(p.publico_nome)}
                          {p.semelhante && <span className="ml-1.5 text-[10px] text-gray-600">(semelhante)</span>}
                        </span>
                      </td>
                      {publicosDiasUnicos.map(dia => {
                        const valor = evolucaoFiltrada.find(x => x.dia === dia && x.publico_nome === p.publico_nome)?.tamanho_min
                        return (
                          <td key={dia} className="tbl-td text-right tabular-nums px-2 whitespace-nowrap">
                            {valor != null ? valor.toLocaleString('pt-BR') : '—'}
                          </td>
                        )
                      })}
                      <td className="tbl-td text-right tabular-nums tbl-td-strong pl-4">
                        {p.atual != null ? p.atual.toLocaleString('pt-BR') : '—'}
                      </td>
                      <td className="tbl-td text-right tabular-nums">
                        {p.anterior != null ? p.anterior.toLocaleString('pt-BR') : '—'}
                      </td>
                      <td className="tbl-td text-right tabular-nums">
                        {variacao == null ? (
                          <span className="text-gray-600">—</span>
                        ) : (
                          <span className={`flex items-center justify-end gap-1 font-semibold ${
                            variacao > 0 ? 'text-emerald-400' : variacao < 0 ? 'text-red-400' : 'text-gray-500'
                          }`}>
                            {variacao > 0 ? <ArrowUp size={11} /> : variacao < 0 ? <ArrowDown size={11} /> : <Minus size={11} />}
                            {Math.abs(variacao * 100).toFixed(1)}%
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      </>)}
    </div>
  )
}

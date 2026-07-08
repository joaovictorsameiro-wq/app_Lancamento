'use client'

import { useEffect, useState } from 'react'
import { Users, BookOpen, DollarSign, GraduationCap, BarChart2, Search, Loader2, ArrowLeftRight, Target } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import type { PesquisaResumo } from '../../../lib/db/pesquisa'
import type { OrigemRow } from '../../../lib/db/compradores'
import LancamentoSelector from '../../../components/lancamento-selector'
import { fmt_currency } from '../../../lib/format'

const RENDA_ORDEM = ['Ate R$3.000', 'R$3.001 a R$7.000', 'R$7.001 a R$10.000', 'R$10.001 a R$14.000', 'Acima de R$14.000']
const FORMACAO_ORDEM = ['Administração', 'Contabilidade', 'Direito', 'Economia', 'Engenharia', 'Outras áreas']

function ComparativoBar({ data }: { data: { name: string; Aluno: number; Lead: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ left: 8, right: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
        <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} unit="%" />
        <Tooltip
          contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8 }}
          labelStyle={{ color: '#9ca3af', fontSize: 11 }}
          formatter={(v: number) => `${v}%`}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="Aluno" fill="#10b981" radius={[4, 4, 0, 0]} />
        <Bar dataKey="Lead" fill="#6366f1" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

function OrigemBar({ dados, cor, mostrarValor = true }: { dados: OrigemRow[]; cor: string; mostrarValor?: boolean }) {
  const top = dados.slice(0, 8)
  const max = Math.max(...top.map(d => d.compradores), 1)
  return (
    <div className="space-y-2">
      {top.map((d, i) => (
        <div key={i} className="space-y-0.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-300 truncate max-w-[70%]" title={d.valor}>{d.valor}</span>
            <span className="text-gray-400 tabular-nums">{d.compradores}{mostrarValor ? ` · ${fmt_currency(d.faturamento ?? 0)}` : ''}</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-gray-800 overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${(d.compradores / max) * 100}%`, background: cor }} />
          </div>
        </div>
      ))}
      {top.length === 0 && <p className="text-xs text-gray-600">Sem dados</p>}
    </div>
  )
}

// ── Paleta ────────────────────────────────────────────────────────────────────
const COLORS = ['#10b981', '#6366f1', '#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6', '#14b8a6']

const RENDA_LABEL: Record<string, string> = {
  'Ate R$3.000':         'Até R$3k',
  'R$3.001 a R$7.000':   'R$3k–7k',
  'R$7.001 a R$10.000':  'R$7k–10k',
  'R$10.001 a R$14.000': 'R$10k–14k',
  'Acima de R$14.000':   'Acima R$14k',
}

const PROCURAVA_LABEL: Record<string, string> = {
  sim_financeira: 'Sim – Perícia Financeira',
  nao:            'Não procurava',
  sim_judicial:   'Sim – Perícia Judicial',
  sim_contabil:   'Sim – Perícia Contábil',
  sim_outro:      'Sim – Outro',
}

const NIVEL_LABEL: Record<number, string> = {
  0: '0 – Nenhum',
  1: '1 – Básico',
  2: '2 – Elementar',
  3: '3 – Intermediário',
  4: '4 – Avançado',
  5: '5 – Expert',
}

// ── Componentes auxiliares ────────────────────────────────────────────────────
function SectionTitle({ icon: Icon, title, sub }: { icon: React.ElementType; title: string; sub?: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon size={15} className="text-emerald-400 shrink-0" />
      <div>
        <p className="text-sm font-semibold text-white">{title}</p>
        {sub && <p className="text-[10px] text-gray-500">{sub}</p>}
      </div>
    </div>
  )
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4 text-center">
      <p className="text-2xl font-bold text-white tabular-nums">{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-gray-600 mt-0.5">{sub}</p>}
    </div>
  )
}

const pct = (v: number, total: number) => (total > 0 ? ((v / total) * 100).toFixed(1) : '0.0') + '%'

// ── Tooltip customizado ───────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { value: number; name: string }[] }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-xs text-white shadow-lg">
      {payload.map((p, i) => (
        <p key={i}><span className="text-gray-400">{p.name}: </span><span className="font-bold">{p.value}</span></p>
      ))}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function PerfilPage() {
  const [data, setData] = useState<PesquisaResumo | null>(null)
  const [loading, setLoading] = useState(true)
  const [lancamentoAluno, setLancamentoAluno] = useState('')  // filtro pesquisa_alunos ('' = todos)
  const [lancamentoAvatar, setLancamentoAvatar] = useState('') // filtro avatar ('' = todos)
  const [lancamentoOrigem, setLancamentoOrigem] = useState('') // filtro origem de compradores
  const [origem, setOrigem] = useState<{ porAnuncio: OrigemRow[]; porCampanha: OrigemRow[]; porPlataforma: OrigemRow[]; porMidia: OrigemRow[]; porTermo: OrigemRow[] } | null>(null)
  const [avatarCompradores, setAvatarCompradores] = useState<{
    total: number
    sexo: { sexo: string; count: number }[]
    faixa_etaria: { faixa: string; count: number }[]
    renda: { renda: string; count: number }[]
    formacao: { formacao: string; count: number }[]
    experiencia: { experiencia: string; count: number }[]
    mais_atrativo: { mais_atrativo: string; count: number }[]
    respostasAbertas: { pergunta_ao_claudio: string | null; desejos_desafios: string | null }[]
  } | null>(null)

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (lancamentoAluno) params.set('lancamento', lancamentoAluno)
    if (lancamentoAvatar) params.set('lancamentoAvatar', lancamentoAvatar)
    fetch(`/api/pesquisa?${params}`)
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [lancamentoAluno, lancamentoAvatar])

  useEffect(() => {
    if (!lancamentoOrigem) { setOrigem(null); setAvatarCompradores(null); return }
    fetch(`/api/compradores?id=${lancamentoOrigem}&view=origem`)
      .then(r => r.json())
      .then(setOrigem)
    fetch(`/api/avatar?id=${lancamentoOrigem}&view=compradores`)
      .then(r => r.json())
      .then(setAvatarCompradores)
  }, [lancamentoOrigem])

  if (loading && !data) {
    return (
      <div className="flex h-full items-center justify-center p-12">
        <Loader2 size={28} className="animate-spin text-emerald-400" />
      </div>
    )
  }
  if (!data) return null

  const total = data.totalRespostas
  const masculino = data.sexo.find(s => s.sexo === 'Masculino')?.total ?? 0
  const feminino  = data.sexo.find(s => s.sexo === 'Feminino')?.total ?? 0

  const excelData = data.excel.map(r => ({
    name: NIVEL_LABEL[r.nivel] ?? `Nível ${r.nivel}`,
    total: r.total,
    pct: total > 0 ? parseFloat(((r.total / total) * 100).toFixed(1)) : 0,
  }))

  const matData = data.mat.map(r => ({
    name: NIVEL_LABEL[r.nivel] ?? `Nível ${r.nivel}`,
    total: r.total,
    pct: total > 0 ? parseFloat(((r.total / total) * 100).toFixed(1)) : 0,
  }))

  const procuravaData = data.procurava.map(r => ({
    name: PROCURAVA_LABEL[r.tipo] ?? r.tipo,
    total: r.total,
  }))

  const rendaData = data.renda.map(r => ({
    name: RENDA_LABEL[r.renda] ?? r.renda,
    total: r.total,
    pct: total > 0 ? parseFloat(((r.total / total) * 100).toFixed(1)) : 0,
  }))

  const formacaoData = data.formacao.map(r => ({
    name: r.formacao,
    total: r.total,
    pct: total > 0 ? parseFloat(((r.total / total) * 100).toFixed(1)) : 0,
  }))

  const academicoData = data.academico.map(r => ({
    name: r.nivel_academico,
    total: r.total,
    pct: total > 0 ? parseFloat(((r.total / total) * 100).toFixed(1)) : 0,
  }))

  const sexoPie = [
    { name: 'Masculino', value: masculino },
    { name: 'Feminino',  value: feminino },
  ]

  const cursoPie = [
    { name: 'Nunca fez curso', value: data.curso.find(c => !c.fez)?.total ?? 0 },
    { name: 'Já fez curso',    value: data.curso.find(c => c.fez)?.total ?? 0 },
  ]

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Users size={18} className="text-emerald-400" />
            Perfil do Comprador
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Análise de {total.toLocaleString('pt-BR')} respostas
            {lancamentoAluno ? ` — ${lancamentoAluno}` : ' — todos os lançamentos'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div>
            <p className="text-[10px] text-gray-500 mb-1">Pesquisa de Alunos</p>
            <select
              value={lancamentoAluno}
              onChange={e => setLancamentoAluno(e.target.value)}
              className="rounded-lg border border-gray-700 bg-gray-800/80 px-3 py-2 text-sm text-white hover:border-gray-600"
            >
              <option value="">Todos os lançamentos</option>
              {(data.lancamentosDisponiveis ?? []).map(lc => (
                <option key={lc} value={lc}>{lc}</option>
              ))}
            </select>
          </div>
          <div>
            <p className="text-[10px] text-gray-500 mb-1">Pesquisa de Avatar</p>
            <LancamentoSelector value={lancamentoAvatar} onChange={setLancamentoAvatar} allowTodos />
          </div>
        </div>
      </div>

      {total === 0 && (
        <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4 text-sm text-yellow-300">
          Nenhuma resposta de pesquisa de aluno encontrada para {lancamentoAluno || 'este filtro'}.
        </div>
      )}

      {/* KPIs rápidos */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total de respostas"   value={total.toLocaleString('pt-BR')} />
        <StatCard label="Masculino"            value={pct(masculino, total)} sub={`${masculino} alunos`} />
        <StatCard label="Feminino"             value={pct(feminino,  total)} sub={`${feminino} alunos`} />
        <StatCard label="Pós-graduados ou +"   value={pct((data.academico.find(a => a.nivel_academico === 'Pós-graduação / MBA')?.total ?? 0) + (data.academico.find(a => a.nivel_academico === 'Mestrado')?.total ?? 0) + (data.academico.find(a => a.nivel_academico === 'Doutorado / Pós-doc')?.total ?? 0), total)} sub="MBA, Mestrado, Doutorado" />
      </div>

      {/* Origem dos Compradores */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <SectionTitle icon={Target} title="Origem dos Compradores" sub="As 5 UTMs — cruzando e-mail do comprador com a UTM do lead quando a Hotmart já apagou a da compra" />
          <LancamentoSelector value={lancamentoOrigem} onChange={setLancamentoOrigem} />
        </div>
        {!lancamentoOrigem && <p className="text-xs text-gray-600">Selecione um lançamento para ver a origem dos compradores.</p>}
        {lancamentoOrigem && !origem && <p className="text-xs text-gray-600">Carregando...</p>}
        {origem && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div>
              <p className="text-xs text-gray-400 mb-2">utm_content (anúncio)</p>
              <OrigemBar dados={origem.porAnuncio} cor="#10b981" />
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-2">utm_campaign (campanha)</p>
              <OrigemBar dados={origem.porCampanha} cor="#6366f1" />
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-2">utm_source (plataforma)</p>
              <OrigemBar dados={origem.porPlataforma} cor="#f59e0b" />
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-2">utm_medium</p>
              <OrigemBar dados={origem.porMidia} cor="#ec4899" />
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-2">utm_term (conjunto)</p>
              <OrigemBar dados={origem.porTermo} cor="#14b8a6" />
            </div>
          </div>
        )}
      </div>

      {/* Como pensa o comprador (avatar só de quem comprou) */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-5 space-y-4">
        <SectionTitle icon={Users} title="Como Pensa o Comprador" sub={`Respostas do avatar (pré-venda) só de quem virou comprador — mesmo lançamento selecionado acima${avatarCompradores ? ` · ${avatarCompradores.total} respostas` : ''}`} />
        {!lancamentoOrigem && <p className="text-xs text-gray-600">Selecione um lançamento acima.</p>}
        {lancamentoOrigem && !avatarCompradores && <p className="text-xs text-gray-600">Carregando...</p>}
        {avatarCompradores && avatarCompradores.total === 0 && (
          <p className="text-xs text-gray-600">Nenhum comprador desse lançamento respondeu a pesquisa de avatar.</p>
        )}
        {avatarCompradores && avatarCompradores.total > 0 && (<>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div>
              <p className="text-xs text-gray-400 mb-2">Faixa etária</p>
              <OrigemBar dados={avatarCompradores.faixa_etaria.map(r => ({ valor: r.faixa, compradores: r.count, faturamento: 0 }))} cor="#10b981" mostrarValor={false} />
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-2">Sexo</p>
              <OrigemBar dados={avatarCompradores.sexo.map(r => ({ valor: r.sexo, compradores: r.count, faturamento: 0 }))} cor="#6366f1" mostrarValor={false} />
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-2">Renda familiar</p>
              <OrigemBar dados={avatarCompradores.renda.map(r => ({ valor: r.renda, compradores: r.count, faturamento: 0 }))} cor="#f59e0b" mostrarValor={false} />
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-2">Formação</p>
              <OrigemBar dados={avatarCompradores.formacao.map(r => ({ valor: r.formacao, compradores: r.count, faturamento: 0 }))} cor="#ec4899" mostrarValor={false} />
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-2">Experiência profissional</p>
              <OrigemBar dados={avatarCompradores.experiencia.map(r => ({ valor: r.experiencia, compradores: r.count, faturamento: 0 }))} cor="#14b8a6" mostrarValor={false} />
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-2">O que mais atrai no curso</p>
              <OrigemBar dados={avatarCompradores.mais_atrativo.map(r => ({ valor: r.mais_atrativo, compradores: r.count, faturamento: 0 }))} cor="#8b5cf6" mostrarValor={false} />
            </div>
          </div>
          {avatarCompradores.respostasAbertas.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 mb-2">O que dizem (respostas abertas)</p>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {avatarCompradores.respostasAbertas.map((r, i) => (
                  <div key={i} className="rounded-lg bg-gray-950/50 border border-gray-800 p-2.5 text-xs text-gray-400 space-y-1">
                    {r.desejos_desafios && <p><span className="text-gray-600">Desejo/desafio: </span>{r.desejos_desafios}</p>}
                    {r.pergunta_ao_claudio && <p><span className="text-gray-600">Pergunta: </span>{r.pergunta_ao_claudio}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>)}
      </div>

      {/* Comparativo Aluno x Lead */}
      {data.comparativoLead && (() => {
        const lead = data.comparativoLead
        const leadSexoTotal = lead.sexo.filter(s => s.sexo === 'Masculino' || s.sexo === 'Feminino').reduce((a, b) => a + b.total, 0)
        const sexoComp = ['Masculino', 'Feminino'].map(name => ({
          name,
          Aluno: parseFloat(pct(name === 'Masculino' ? masculino : feminino, total)),
          Lead: leadSexoTotal > 0 ? parseFloat(pct(lead.sexo.find(s => s.sexo === name)?.total ?? 0, leadSexoTotal)) : 0,
        }))

        const leadRendaTotal = lead.renda.filter(r => r.renda !== 'N/A').reduce((a, b) => a + b.total, 0)
        const rendaComp = RENDA_ORDEM.map(name => ({
          name: RENDA_LABEL[name] ?? name,
          Aluno: parseFloat(pct(data.renda.find(r => r.renda === name)?.total ?? 0, total)),
          Lead: leadRendaTotal > 0 ? parseFloat(pct(lead.renda.find(r => r.renda === name)?.total ?? 0, leadRendaTotal)) : 0,
        }))

        const leadFormacaoTotal = lead.formacao.reduce((a, b) => a + b.total, 0)
        const formacaoComp = FORMACAO_ORDEM.map(name => ({
          name,
          Aluno: parseFloat(pct(data.formacao.find(f => f.formacao === name)?.total ?? 0, total)),
          Lead: leadFormacaoTotal > 0 ? parseFloat(pct(lead.formacao.find(f => f.formacao === name)?.total ?? 0, leadFormacaoTotal)) : 0,
        }))

        return (
          <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-5 space-y-6">
            <SectionTitle icon={ArrowLeftRight} title="Aluno × Lead" sub="Comprador (pós-venda) comparado com quem só respondeu o avatar (pré-venda) — % dentro de cada grupo" />
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div>
                <p className="text-xs text-gray-400 mb-2">Gênero</p>
                <ComparativoBar data={sexoComp} />
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-2">Renda familiar</p>
                <ComparativoBar data={rendaComp} />
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-2">Formação</p>
                <ComparativoBar data={formacaoComp} />
              </div>
            </div>
          </div>
        )
      })()}

      {/* Linha 1: Formação + Renda */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        {/* Formação */}
        <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-5">
          <SectionTitle icon={BookOpen} title="Formação Acadêmica" sub="Área principal do curso" />
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={formacaoData} layout="vertical" margin={{ left: 8, right: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" width={145} tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff08' }} />
              <Bar dataKey="total" name="Alunos" radius={[0, 4, 4, 0]}>
                {formacaoData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-3 space-y-1">
            {formacaoData.map((r, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                <span className="text-gray-400 flex-1">{r.name}</span>
                <span className="text-gray-300 font-medium tabular-nums">{r.total}</span>
                <span className="text-gray-600 w-10 text-right tabular-nums">{r.pct}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Renda */}
        <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-5">
          <SectionTitle icon={DollarSign} title="Renda Familiar" sub="Faixa de renda mensal" />
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={rendaData} margin={{ left: 8, right: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff08' }} />
              <Bar dataKey="total" name="Alunos" radius={[4, 4, 0, 0]}>
                {rendaData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-3 space-y-1">
            {rendaData.map((r, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                <span className="text-gray-400 flex-1">{RENDA_LABEL[Object.keys(RENDA_LABEL)[i]] ?? r.name}</span>
                <span className="text-gray-300 font-medium tabular-nums">{r.total}</span>
                <span className="text-gray-600 w-10 text-right tabular-nums">{r.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Linha 2: Nível Acadêmico + Sexo + Já fez curso */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* Nível Acadêmico */}
        <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-5">
          <SectionTitle icon={GraduationCap} title="Nível Acadêmico" />
          <div className="space-y-2.5 mt-2">
            {academicoData.map((r, i) => (
              <div key={i}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-400">{r.name}</span>
                  <span className="text-gray-300 tabular-nums font-medium">{r.pct}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-gray-800 overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${r.pct}%`, background: COLORS[i % COLORS.length] }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sexo */}
        <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-5">
          <SectionTitle icon={Users} title="Gênero" />
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={sexoPie} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3}>
                <Cell fill="#6366f1" />
                <Cell fill="#ec4899" />
              </Pie>
              <Tooltip formatter={(v: number) => [`${v} (${pct(v, total)})`, '']} />
              <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs text-gray-400">{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Já fez curso */}
        <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-5">
          <SectionTitle icon={BookOpen} title="Experiência com Cursos" sub="Já fez curso de perícia antes?" />
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={cursoPie} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3}>
                <Cell fill="#10b981" />
                <Cell fill="#f59e0b" />
              </Pie>
              <Tooltip formatter={(v: number) => [`${v} (${pct(v, total)})`, '']} />
              <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs text-gray-400">{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Linha 3: Nível Excel + Nível Mat. Financeira */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-5">
          <SectionTitle icon={BarChart2} title="Nível de Excel" sub="Autoavaliação 0–5" />
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={excelData} margin={{ left: 0, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff08' }} />
              <Bar dataKey="total" name="Alunos" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-5">
          <SectionTitle icon={BarChart2} title="Nível de Matemática Financeira" sub="Autoavaliação 0–5" />
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={matData} margin={{ left: 0, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff08' }} />
              <Bar dataKey="total" name="Alunos" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Linha 4: Consciência prévia */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-5">
        <SectionTitle icon={Search} title="Consciência Prévia do Produto" sub="O aluno já estava procurando um curso de perícia antes de comprar?" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={procuravaData} layout="vertical" margin={{ left: 12, right: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" width={175} tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff08' }} />
              <Bar dataKey="total" name="Alunos" radius={[0, 4, 4, 0]}>
                {procuravaData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          <div className="space-y-2 self-center">
            {procuravaData.map((r, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                <span className="text-gray-400 flex-1">{r.name}</span>
                <span className="text-gray-300 font-medium tabular-nums">{r.total}</span>
                <span className="text-gray-600 w-10 text-right tabular-nums">{pct(r.total, total)}</span>
              </div>
            ))}
            <div className="mt-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-emerald-300">
              <strong>{pct((data.procurava.find(p => p.tipo !== 'nao')?.total ?? 0) + (data.procurava.filter(p => p.tipo !== 'nao').reduce((a, b) => a + b.total, 0) - (data.procurava.find(p => p.tipo !== 'nao')?.total ?? 0)), total)}</strong>
              {' '}dos compradores já estavam ativamente buscando um curso de perícia antes do lançamento.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

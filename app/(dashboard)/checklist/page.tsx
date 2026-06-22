'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  CheckSquare, Square, ChevronDown, ChevronRight, Plus, Trash2,
  Pencil, X, Check, ArrowUp, ArrowDown, Calendar, MapPin, User,
  Link2, FileText, ChevronUp,
} from 'lucide-react'

// ─── Tipos ──────────────────────────────────────────────────────────────────

type Tarefa = {
  id: string
  id_lancamento: string
  semana: number
  ordem: number
  tarefa: string
  local: string | null
  responsavel: string | null
  links: string | null
  observacoes: string | null
  offset_dias: number | null
  feito: boolean
  data_conclusao: string | null
}

type Lancamento = {
  codigo: string
  nome: string
  status: string | null
  data_abertura_carrinho: string | null
}

// ─── Constantes ─────────────────────────────────────────────────────────────

const SEMANAS: Record<number, { label: string; descricao: string; offsetInicio: number; offsetFim: number }> = {
  1: { label: 'Semana 1', descricao: 'Preparação',                        offsetInicio: -35, offsetFim: -29 },
  2: { label: 'Semana 2', descricao: 'Início da Captação',                offsetInicio: -28, offsetFim: -22 },
  3: { label: 'Semana 3', descricao: 'Lives de Aquecimento — Semana 1',   offsetInicio: -21, offsetFim: -15 },
  4: { label: 'Semana 4', descricao: 'Lives de Aquecimento — Semana 2',   offsetInicio: -14, offsetFim: -8  },
  5: { label: 'Semana 5', descricao: 'CPLs — Aulas do Evento',            offsetInicio: -7,  offsetFim: -1  },
  6: { label: 'Semana 6', descricao: 'Carrinho Aberto',                   offsetInicio: 0,   offsetFim: 6   },
  7: { label: 'Semana 7', descricao: 'Debriefing',                        offsetInicio: 7,   offsetFim: 13  },
}

const SEMANA_CORES: Record<number, string> = {
  1: 'text-blue-400 border-blue-500/30 bg-blue-500/5',
  2: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/5',
  3: 'text-violet-400 border-violet-500/30 bg-violet-500/5',
  4: 'text-purple-400 border-purple-500/30 bg-purple-500/5',
  5: 'text-amber-400 border-amber-500/30 bg-amber-500/5',
  6: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/5',
  7: 'text-rose-400 border-rose-500/30 bg-rose-500/5',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function addDias(base: Date, dias: number): Date {
  const d = new Date(base)
  d.setDate(d.getDate() + dias)
  return d
}

function formatData(d: Date): string {
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', weekday: 'short' })
}

function formatDataInput(d: Date): string {
  return d.toISOString().split('T')[0]
}

function calcularData(abertura: Date | null, offset: number | null): Date | null {
  if (!abertura || offset === null) return null
  return addDias(abertura, offset)
}

function isAtrasada(abertura: Date | null, offset: number | null, feito: boolean): boolean {
  if (feito || !abertura || offset === null) return false
  const data = calcularData(abertura, offset)
  if (!data) return false
  return data < new Date()
}

function isHoje(abertura: Date | null, offset: number | null): boolean {
  if (!abertura || offset === null) return false
  const data = calcularData(abertura, offset)
  if (!data) return false
  const hoje = new Date()
  return (
    data.getDate() === hoje.getDate() &&
    data.getMonth() === hoje.getMonth() &&
    data.getFullYear() === hoje.getFullYear()
  )
}

// ─── Componente de form de edição ────────────────────────────────────────────

type FormTarefa = {
  tarefa: string
  local: string
  responsavel: string
  links: string
  observacoes: string
  offset_dias: string
  semana: string
}

function formVazio(semana: number): FormTarefa {
  return { tarefa: '', local: '', responsavel: '', links: '', observacoes: '', offset_dias: '', semana: String(semana) }
}

function tarefaParaForm(t: Tarefa): FormTarefa {
  return {
    tarefa: t.tarefa,
    local: t.local ?? '',
    responsavel: t.responsavel ?? '',
    links: t.links ?? '',
    observacoes: t.observacoes ?? '',
    offset_dias: t.offset_dias !== null ? String(t.offset_dias) : '',
    semana: String(t.semana),
  }
}

// ─── Linha de edição ─────────────────────────────────────────────────────────

function LinhaEdicao({
  form,
  onChange,
  onSalvar,
  onCancelar,
  abertura,
}: {
  form: FormTarefa
  onChange: (f: FormTarefa) => void
  onSalvar: () => void
  onCancelar: () => void
  abertura: Date | null
}) {
  const offset = form.offset_dias !== '' ? parseInt(form.offset_dias) : null
  const dataCalc = calcularData(abertura, offset)

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800/60 p-3 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-[10px] text-gray-500 uppercase tracking-wider">Tarefa *</label>
          <input
            autoFocus
            value={form.tarefa}
            onChange={e => onChange({ ...form, tarefa: e.target.value })}
            onKeyDown={e => e.key === 'Enter' && onSalvar()}
            className="mt-1 w-full rounded-md bg-gray-900 border border-gray-700 px-3 py-1.5 text-sm text-white placeholder-gray-600 focus:border-emerald-500 focus:outline-none"
            placeholder="Nome da tarefa"
          />
        </div>
        <div>
          <label className="text-[10px] text-gray-500 uppercase tracking-wider">Local / Ferramenta</label>
          <input
            value={form.local}
            onChange={e => onChange({ ...form, local: e.target.value })}
            className="mt-1 w-full rounded-md bg-gray-900 border border-gray-700 px-3 py-1.5 text-sm text-white placeholder-gray-600 focus:border-emerald-500 focus:outline-none"
            placeholder="ex: Hotmart, Meta Ads…"
          />
        </div>
        <div>
          <label className="text-[10px] text-gray-500 uppercase tracking-wider">Responsável</label>
          <input
            value={form.responsavel}
            onChange={e => onChange({ ...form, responsavel: e.target.value })}
            className="mt-1 w-full rounded-md bg-gray-900 border border-gray-700 px-3 py-1.5 text-sm text-white placeholder-gray-600 focus:border-emerald-500 focus:outline-none"
            placeholder="ex: João Víctor"
          />
        </div>
        <div>
          <label className="text-[10px] text-gray-500 uppercase tracking-wider">
            Offset (dias da abertura)
          </label>
          <div className="flex items-center gap-2 mt-1">
            <input
              type="number"
              value={form.offset_dias}
              onChange={e => onChange({ ...form, offset_dias: e.target.value })}
              className="w-24 rounded-md bg-gray-900 border border-gray-700 px-3 py-1.5 text-sm text-white placeholder-gray-600 focus:border-emerald-500 focus:outline-none"
              placeholder="-35"
            />
            {dataCalc && (
              <span className="text-xs text-gray-400">→ {formatData(dataCalc)}</span>
            )}
          </div>
        </div>
        <div>
          <label className="text-[10px] text-gray-500 uppercase tracking-wider">Semana</label>
          <select
            value={form.semana}
            onChange={e => onChange({ ...form, semana: e.target.value })}
            className="mt-1 w-full rounded-md bg-gray-900 border border-gray-700 px-3 py-1.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
          >
            {Object.entries(SEMANAS).map(([n, s]) => (
              <option key={n} value={n}>{s.label} — {s.descricao}</option>
            ))}
          </select>
        </div>
        <div className="col-span-2">
          <label className="text-[10px] text-gray-500 uppercase tracking-wider">Link</label>
          <input
            value={form.links}
            onChange={e => onChange({ ...form, links: e.target.value })}
            className="mt-1 w-full rounded-md bg-gray-900 border border-gray-700 px-3 py-1.5 text-sm text-white placeholder-gray-600 focus:border-emerald-500 focus:outline-none"
            placeholder="https://…"
          />
        </div>
        <div className="col-span-2">
          <label className="text-[10px] text-gray-500 uppercase tracking-wider">Observações</label>
          <textarea
            value={form.observacoes}
            onChange={e => onChange({ ...form, observacoes: e.target.value })}
            rows={2}
            className="mt-1 w-full rounded-md bg-gray-900 border border-gray-700 px-3 py-1.5 text-sm text-white placeholder-gray-600 focus:border-emerald-500 focus:outline-none resize-none"
            placeholder="Notas adicionais…"
          />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <button
          onClick={onCancelar}
          className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs text-gray-400 hover:bg-gray-700 transition-colors"
        >
          <X size={12} /> Cancelar
        </button>
        <button
          onClick={onSalvar}
          disabled={!form.tarefa.trim()}
          className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs text-white hover:bg-emerald-500 disabled:opacity-40 transition-colors"
        >
          <Check size={12} /> Salvar
        </button>
      </div>
    </div>
  )
}

// ─── Linha de tarefa ─────────────────────────────────────────────────────────

function LinhaTarefa({
  tarefa,
  abertura,
  onToggle,
  onEditar,
  onDeletar,
  onMover,
  isFirst,
  isLast,
  expandida,
  onExpandir,
}: {
  tarefa: Tarefa
  abertura: Date | null
  onToggle: () => void
  onEditar: () => void
  onDeletar: () => void
  onMover: (dir: 'up' | 'down') => void
  isFirst: boolean
  isLast: boolean
  expandida: boolean
  onExpandir: () => void
}) {
  const data = calcularData(abertura, tarefa.offset_dias)
  const atrasada = isAtrasada(abertura, tarefa.offset_dias, tarefa.feito)
  const hoje = isHoje(abertura, tarefa.offset_dias)

  return (
    <div className={`group rounded-lg border transition-all ${
      tarefa.feito
        ? 'border-gray-800 bg-gray-900/30 opacity-60'
        : atrasada
        ? 'border-red-500/20 bg-red-500/5'
        : hoje
        ? 'border-amber-500/20 bg-amber-500/5'
        : 'border-gray-800 bg-gray-900/40 hover:border-gray-700'
    }`}>
      <div className="flex items-start gap-2 p-2.5">
        {/* Reordenar */}
        <div className="flex flex-col gap-0.5 pt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onMover('up')}
            disabled={isFirst}
            className="rounded p-0.5 text-gray-600 hover:text-gray-300 hover:bg-gray-700 disabled:opacity-0 transition-colors"
          >
            <ArrowUp size={10} />
          </button>
          <button
            onClick={() => onMover('down')}
            disabled={isLast}
            className="rounded p-0.5 text-gray-600 hover:text-gray-300 hover:bg-gray-700 disabled:opacity-0 transition-colors"
          >
            <ArrowDown size={10} />
          </button>
        </div>

        {/* Checkbox */}
        <button onClick={onToggle} className="shrink-0 mt-0.5">
          {tarefa.feito
            ? <CheckSquare size={16} className="text-emerald-400" />
            : <Square size={16} className="text-gray-600 hover:text-gray-400" />
          }
        </button>

        {/* Conteúdo */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 flex-wrap">
            <button
              onClick={onExpandir}
              className={`text-left text-sm font-medium leading-snug ${
                tarefa.feito ? 'line-through text-gray-500' : 'text-gray-200'
              }`}
            >
              {tarefa.tarefa}
            </button>
          </div>

          <div className="mt-1 flex items-center gap-3 flex-wrap">
            {data && (
              <span className={`flex items-center gap-1 text-[10px] ${
                atrasada ? 'text-red-400' : hoje ? 'text-amber-400' : 'text-gray-500'
              }`}>
                <Calendar size={9} />
                {formatData(data)}
                {atrasada && ' · atrasada'}
                {hoje && ' · hoje'}
              </span>
            )}
            {tarefa.local && (
              <span className="flex items-center gap-1 text-[10px] text-gray-600">
                <MapPin size={9} />
                {tarefa.local}
              </span>
            )}
            {tarefa.responsavel && (
              <span className="flex items-center gap-1 text-[10px] text-gray-600">
                <User size={9} />
                {tarefa.responsavel}
              </span>
            )}
          </div>

          {/* Detalhes expandidos */}
          {expandida && (
            <div className="mt-2 space-y-1.5 border-t border-gray-800 pt-2">
              {tarefa.links && (
                <div className="flex items-start gap-1.5">
                  <Link2 size={10} className="mt-0.5 shrink-0 text-gray-600" />
                  <a
                    href={tarefa.links}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-400 hover:underline break-all"
                  >
                    {tarefa.links}
                  </a>
                </div>
              )}
              {tarefa.observacoes && (
                <div className="flex items-start gap-1.5">
                  <FileText size={10} className="mt-0.5 shrink-0 text-gray-600" />
                  <p className="text-xs text-gray-400">{tarefa.observacoes}</p>
                </div>
              )}
              {tarefa.offset_dias !== null && (
                <p className="text-[10px] text-gray-600">
                  Offset: {tarefa.offset_dias > 0 ? '+' : ''}{tarefa.offset_dias} dias da abertura
                </p>
              )}
            </div>
          )}
        </div>

        {/* Ações */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onExpandir}
            className="rounded p-1 text-gray-600 hover:text-gray-300 hover:bg-gray-700 transition-colors"
          >
            {expandida ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          <button
            onClick={onEditar}
            className="rounded p-1 text-gray-600 hover:text-blue-400 hover:bg-gray-700 transition-colors"
          >
            <Pencil size={12} />
          </button>
          <button
            onClick={onDeletar}
            className="rounded p-1 text-gray-600 hover:text-red-400 hover:bg-gray-700 transition-colors"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Seção de semana ─────────────────────────────────────────────────────────

function SecaoSemana({
  semana,
  tarefas,
  abertura,
  onToggle,
  onEditar,
  onDeletar,
  onMover,
  onAdicionarTarefa,
  expandida,
  onToggleExpansao,
  editandoId,
  formEdicao,
  onFormChange,
  onSalvarEdicao,
  adicionando,
  formNova,
  onFormNovaChange,
  onSalvarNova,
  onCancelarNova,
  expandidaIds,
  onToggleExpandirTarefa,
}: {
  semana: number
  tarefas: Tarefa[]
  abertura: Date | null
  onToggle: (id: string, feito: boolean) => void
  onEditar: (t: Tarefa) => void
  onDeletar: (id: string) => void
  onMover: (id: string, dir: 'up' | 'down') => void
  onAdicionarTarefa: (semana: number) => void
  expandida: boolean
  onToggleExpansao: () => void
  editandoId: string | null
  formEdicao: FormTarefa
  onFormChange: (f: FormTarefa) => void
  onSalvarEdicao: () => void
  adicionando: boolean
  formNova: FormTarefa
  onFormNovaChange: (f: FormTarefa) => void
  onSalvarNova: () => void
  onCancelarNova: () => void
  expandidaIds: Set<string>
  onToggleExpandirTarefa: (id: string) => void
}) {
  const s = SEMANAS[semana]
  const cor = SEMANA_CORES[semana]
  const feitas = tarefas.filter(t => t.feito).length
  const total = tarefas.length
  const pct = total > 0 ? Math.round((feitas / total) * 100) : 0

  const dataInicio = abertura ? addDias(abertura, s.offsetInicio) : null
  const dataFim = abertura ? addDias(abertura, s.offsetFim) : null

  return (
    <div className={`rounded-xl border ${cor} overflow-hidden`}>
      {/* Header da semana */}
      <button
        onClick={onToggleExpansao}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors"
      >
        {expandida ? <ChevronDown size={14} className="shrink-0" /> : <ChevronRight size={14} className="shrink-0" />}
        <div className="flex-1 text-left min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-sm font-bold">{s.label}</span>
            <span className="text-xs opacity-70">— {s.descricao}</span>
            {dataInicio && dataFim && (
              <span className="text-[10px] opacity-50 ml-auto">
                {formatData(dataInicio)} → {formatData(dataFim)}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="text-xs opacity-60">{feitas}/{total}</div>
          <div className="w-20 h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-current transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="text-xs font-medium">{pct}%</div>
        </div>
      </button>

      {/* Lista de tarefas */}
      {expandida && (
        <div className="px-3 pb-3 space-y-1.5">
          {tarefas.map((tarefa, idx) => (
            editandoId === tarefa.id ? (
              <LinhaEdicao
                key={tarefa.id}
                form={formEdicao}
                onChange={onFormChange}
                onSalvar={onSalvarEdicao}
                onCancelar={() => onEditar({ id: '' } as Tarefa)}
                abertura={abertura}
              />
            ) : (
              <LinhaTarefa
                key={tarefa.id}
                tarefa={tarefa}
                abertura={abertura}
                onToggle={() => onToggle(tarefa.id, !tarefa.feito)}
                onEditar={() => onEditar(tarefa)}
                onDeletar={() => onDeletar(tarefa.id)}
                onMover={(dir) => onMover(tarefa.id, dir)}
                isFirst={idx === 0}
                isLast={idx === tarefas.length - 1}
                expandida={expandidaIds.has(tarefa.id)}
                onExpandir={() => onToggleExpandirTarefa(tarefa.id)}
              />
            )
          ))}

          {adicionando ? (
            <LinhaEdicao
              form={formNova}
              onChange={onFormNovaChange}
              onSalvar={onSalvarNova}
              onCancelar={onCancelarNova}
              abertura={abertura}
            />
          ) : (
            <button
              onClick={() => onAdicionarTarefa(semana)}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-gray-600 hover:text-gray-400 hover:bg-gray-800/50 transition-colors border border-dashed border-gray-800 hover:border-gray-700 mt-1"
            >
              <Plus size={12} /> Adicionar tarefa
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Página principal ────────────────────────────────────────────────────────

export default function ChecklistPage() {
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([])
  const [lancamentoId, setLancamentoId] = useState<string>('')
  const [abertura, setAbertura] = useState<Date | null>(null)
  const [dataInput, setDataInput] = useState<string>('')
  const [tarefas, setTarefas] = useState<Tarefa[]>([])
  const [loading, setLoading] = useState(false)
  const [semanasExpandidas, setSemanasExpandidas] = useState<Set<number>>(new Set([1, 2, 3, 4, 5, 6, 7]))
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [formEdicao, setFormEdicao] = useState<FormTarefa>(formVazio(1))
  const [adicionandoSemana, setAdicionandoSemana] = useState<number | null>(null)
  const [formNova, setFormNova] = useState<FormTarefa>(formVazio(1))
  const [expandidaIds, setExpandidaIds] = useState<Set<string>>(new Set())

  // Carregar lançamentos
  useEffect(() => {
    fetch('/api/lancamentos')
      .then(r => r.json())
      .then((data: Lancamento[]) => {
        setLancamentos(data)
        const ativo = data.find(l => l.status === 'ativo') ?? data[0]
        if (ativo) {
          setLancamentoId(ativo.codigo)
          if (ativo.data_abertura_carrinho) {
            const d = new Date(ativo.data_abertura_carrinho)
            setAbertura(d)
            setDataInput(formatDataInput(d))
          }
        }
      })
  }, [])

  // Carregar tarefas quando muda o lançamento
  const carregarTarefas = useCallback(() => {
    if (!lancamentoId) return
    setLoading(true)
    fetch(`/api/checklist/tarefas?lancamento=${lancamentoId}`)
      .then(r => r.json())
      .then(data => { setTarefas(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [lancamentoId])

  useEffect(() => { carregarTarefas() }, [carregarTarefas])

  // Quando muda o lançamento selecionado, atualiza a data de abertura
  useEffect(() => {
    const l = lancamentos.find(l => l.codigo === lancamentoId)
    if (l?.data_abertura_carrinho) {
      const d = new Date(l.data_abertura_carrinho)
      setAbertura(d)
      setDataInput(formatDataInput(d))
    } else {
      setAbertura(null)
      setDataInput('')
    }
  }, [lancamentoId, lancamentos])

  async function salvarDataAbertura() {
    if (!lancamentoId) return
    const d = dataInput ? new Date(dataInput + 'T12:00:00') : null
    await fetch('/api/checklist/lancamento', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_lancamento: lancamentoId, data_abertura_carrinho: d?.toISOString() ?? null }),
    })
    setAbertura(d)
    setLancamentos(prev => prev.map(l =>
      l.codigo === lancamentoId ? { ...l, data_abertura_carrinho: d?.toISOString() ?? null } : l
    ))
  }

  async function toggleFeito(id: string, feito: boolean) {
    setTarefas(prev => prev.map(t => t.id === id ? { ...t, feito } : t))
    await fetch(`/api/checklist/tarefas/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feito, data_conclusao: feito ? new Date().toISOString() : null }),
    })
  }

  function iniciarEdicao(t: Tarefa) {
    if (!t.id) { setEditandoId(null); return }
    setEditandoId(t.id)
    setFormEdicao(tarefaParaForm(t))
    setAdicionandoSemana(null)
  }

  async function salvarEdicao() {
    if (!editandoId) return
    const offset = formEdicao.offset_dias !== '' ? parseInt(formEdicao.offset_dias) : null
    const semana = parseInt(formEdicao.semana)
    const body = {
      tarefa: formEdicao.tarefa,
      local: formEdicao.local || null,
      responsavel: formEdicao.responsavel || null,
      links: formEdicao.links || null,
      observacoes: formEdicao.observacoes || null,
      offset_dias: offset,
      semana,
    }
    const res = await fetch(`/api/checklist/tarefas/${editandoId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const updated = await res.json()
    setTarefas(prev => prev.map(t => t.id === editandoId ? { ...t, ...updated } : t))
    setEditandoId(null)
  }

  async function deletarTarefa(id: string) {
    if (!confirm('Deletar esta tarefa?')) return
    setTarefas(prev => prev.filter(t => t.id !== id))
    await fetch(`/api/checklist/tarefas/${id}`, { method: 'DELETE' })
  }

  function iniciarAdicionar(semana: number) {
    setAdicionandoSemana(semana)
    setFormNova({ ...formVazio(semana), semana: String(semana) })
    setEditandoId(null)
  }

  async function salvarNova() {
    if (!formNova.tarefa.trim() || !lancamentoId) return
    const semana = parseInt(formNova.semana)
    const offset = formNova.offset_dias !== '' ? parseInt(formNova.offset_dias) : null
    const res = await fetch('/api/checklist/tarefas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id_lancamento: lancamentoId,
        semana,
        tarefa: formNova.tarefa,
        local: formNova.local || null,
        responsavel: formNova.responsavel || null,
        links: formNova.links || null,
        observacoes: formNova.observacoes || null,
        offset_dias: offset,
      }),
    })
    const nova = await res.json()
    setTarefas(prev => [...prev, nova])
    setAdicionandoSemana(null)
  }

  async function moverTarefa(id: string, dir: 'up' | 'down') {
    const tarefa = tarefas.find(t => t.id === id)
    if (!tarefa) return
    const grupo = tarefas.filter(t => t.semana === tarefa.semana).sort((a, b) => a.ordem - b.ordem)
    const idx = grupo.findIndex(t => t.id === id)
    const vizinhoIdx = dir === 'up' ? idx - 1 : idx + 1
    if (vizinhoIdx < 0 || vizinhoIdx >= grupo.length) return

    const a = grupo[idx]
    const b = grupo[vizinhoIdx]
    const novaOrdemA = b.ordem
    const novaOrdemB = a.ordem

    setTarefas(prev => prev.map(t => {
      if (t.id === a.id) return { ...t, ordem: novaOrdemA }
      if (t.id === b.id) return { ...t, ordem: novaOrdemB }
      return t
    }))

    await fetch('/api/checklist/tarefas/reorder', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [{ id: a.id, ordem: novaOrdemA }, { id: b.id, ordem: novaOrdemB }] }),
    })
  }

  function toggleExpandirTarefa(id: string) {
    setExpandidaIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Datas calculadas para o painel de milestones
  const milestones = abertura ? [
    { label: 'Início Captação',     data: addDias(abertura, -35) },
    { label: 'Início Aquecimento',  data: addDias(abertura, -28) },
    { label: 'CPL 1',               data: addDias(abertura, -7)  },
    { label: 'CPL 2',               data: addDias(abertura, -5)  },
    { label: 'CPL 3',               data: addDias(abertura, -3)  },
    { label: 'Abertura Carrinho',   data: abertura               },
    { label: 'Fechamento',          data: addDias(abertura, 6)   },
  ] : []

  const totalFeitas = tarefas.filter(t => t.feito).length
  const totalTarefas = tarefas.length
  const pctGeral = totalTarefas > 0 ? Math.round((totalFeitas / totalTarefas) * 100) : 0

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="mx-auto max-w-4xl px-4 py-6 space-y-6">

        {/* Header */}
        <div className="flex items-start gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-white">Checklist do Lançamento</h1>
            <p className="text-xs text-gray-500 mt-0.5">Gerencie todas as tarefas do seu lançamento</p>
          </div>
          <select
            value={lancamentoId}
            onChange={e => setLancamentoId(e.target.value)}
            className="rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
          >
            {lancamentos.map(l => (
              <option key={l.codigo} value={l.codigo}>{l.nome}</option>
            ))}
          </select>
        </div>

        {/* Config de data + milestones */}
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4 space-y-4">
          <div className="flex items-end gap-3 flex-wrap">
            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-wider">
                Data de Abertura do Carrinho
              </label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="date"
                  value={dataInput}
                  onChange={e => setDataInput(e.target.value)}
                  className="rounded-lg bg-gray-800 border border-gray-700 px-3 py-1.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
                <button
                  onClick={salvarDataAbertura}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs text-white hover:bg-emerald-500 transition-colors"
                >
                  Aplicar
                </button>
              </div>
            </div>
            <div className="text-xs text-gray-600">
              ← Todas as datas do checklist se calculam automaticamente
            </div>
          </div>

          {milestones.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {milestones.map(m => (
                <div key={m.label} className="rounded-lg bg-gray-800/60 px-3 py-1.5">
                  <p className="text-[10px] text-gray-500">{m.label}</p>
                  <p className="text-xs font-medium text-gray-200 mt-0.5">
                    {m.data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Barra de progresso geral */}
        {totalTarefas > 0 && (
          <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400">Progresso geral</span>
              <span className="text-sm font-bold text-white">{totalFeitas}/{totalTarefas} tarefas — {pctGeral}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${pctGeral}%` }}
              />
            </div>
          </div>
        )}

        {/* Semanas */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-600 text-sm">
            Carregando tarefas…
          </div>
        ) : (
          <div className="space-y-3">
            {Object.keys(SEMANAS).map(n => {
              const semana = parseInt(n)
              const tarefasSemana = tarefas
                .filter(t => t.semana === semana)
                .sort((a, b) => a.ordem - b.ordem)

              return (
                <SecaoSemana
                  key={semana}
                  semana={semana}
                  tarefas={tarefasSemana}
                  abertura={abertura}
                  onToggle={toggleFeito}
                  onEditar={iniciarEdicao}
                  onDeletar={deletarTarefa}
                  onMover={moverTarefa}
                  onAdicionarTarefa={iniciarAdicionar}
                  expandida={semanasExpandidas.has(semana)}
                  onToggleExpansao={() => {
                    setSemanasExpandidas(prev => {
                      const next = new Set(prev)
                      if (next.has(semana)) next.delete(semana)
                      else next.add(semana)
                      return next
                    })
                  }}
                  editandoId={editandoId}
                  formEdicao={formEdicao}
                  onFormChange={setFormEdicao}
                  onSalvarEdicao={salvarEdicao}
                  adicionando={adicionandoSemana === semana}
                  formNova={formNova}
                  onFormNovaChange={setFormNova}
                  onSalvarNova={salvarNova}
                  onCancelarNova={() => setAdicionandoSemana(null)}
                  expandidaIds={expandidaIds}
                  onToggleExpandirTarefa={toggleExpandirTarefa}
                />
              )
            })}
          </div>
        )}

        {/* Empty state */}
        {!loading && lancamentoId && tarefas.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
            <div className="rounded-full bg-gray-800 p-4">
              <CheckSquare size={24} className="text-gray-600" />
            </div>
            <p className="text-sm text-gray-400">Nenhuma tarefa cadastrada ainda</p>
            <p className="text-xs text-gray-600">Clique em &quot;Adicionar tarefa&quot; em qualquer semana para começar</p>
          </div>
        )}
      </div>
    </div>
  )
}

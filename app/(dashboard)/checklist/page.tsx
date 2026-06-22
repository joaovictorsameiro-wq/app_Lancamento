'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  CheckSquare, Square, ChevronDown, ChevronRight, Plus, Trash2,
  Pencil, X, Check, ArrowUp, ArrowDown, Calendar, MapPin, User,
  Link2, FileText, ChevronUp, Rocket,
} from 'lucide-react'

// ─── Tipos ──────────────────────────────────────────────────────────────────

type Tarefa = {
  id: string
  semana: number
  ordem: number
  tarefa: string
  local: string | null
  responsavel: string | null
  links: string | null
  observacoes: string | null
  offset_dias: number | null
  feito: boolean
}

type Lancamento = {
  codigo: string
  nome: string
  status: string | null
  data_abertura_carrinho: string | null
}

// ─── Constantes ─────────────────────────────────────────────────────────────

const SEMANAS: Record<number, { label: string; descricao: string; offsetInicio: number; offsetFim: number }> = {
  1: { label: 'Semana 1', descricao: 'Preparação',                       offsetInicio: -35, offsetFim: -29 },
  2: { label: 'Semana 2', descricao: 'Início da Captação',               offsetInicio: -28, offsetFim: -22 },
  3: { label: 'Semana 3', descricao: 'Lives de Aquecimento — Semana 1',  offsetInicio: -21, offsetFim: -15 },
  4: { label: 'Semana 4', descricao: 'Lives de Aquecimento — Semana 2',  offsetInicio: -14, offsetFim: -8  },
  5: { label: 'Semana 5', descricao: 'CPLs — Aulas do Evento',           offsetInicio: -7,  offsetFim: -1  },
  6: { label: 'Semana 6', descricao: 'Carrinho Aberto',                  offsetInicio: 0,   offsetFim: 6   },
  7: { label: 'Semana 7', descricao: 'Debriefing',                       offsetInicio: 7,   offsetFim: 13  },
}

const COR_SEMANA: Record<number, { badge: string; header: string; barra: string }> = {
  1: { badge: 'bg-blue-500/15 text-blue-400',    header: 'border-blue-500/30 bg-blue-500/5',    barra: 'bg-blue-400'   },
  2: { badge: 'bg-cyan-500/15 text-cyan-400',    header: 'border-cyan-500/30 bg-cyan-500/5',    barra: 'bg-cyan-400'   },
  3: { badge: 'bg-violet-500/15 text-violet-400',header: 'border-violet-500/30 bg-violet-500/5',barra: 'bg-violet-400' },
  4: { badge: 'bg-purple-500/15 text-purple-400',header: 'border-purple-500/30 bg-purple-500/5',barra: 'bg-purple-400' },
  5: { badge: 'bg-amber-500/15 text-amber-400',  header: 'border-amber-500/30 bg-amber-500/5',  barra: 'bg-amber-400'  },
  6: { badge: 'bg-emerald-500/15 text-emerald-400', header: 'border-emerald-500/30 bg-emerald-500/5', barra: 'bg-emerald-400' },
  7: { badge: 'bg-rose-500/15 text-rose-400',    header: 'border-rose-500/30 bg-rose-500/5',    barra: 'bg-rose-400'   },
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function addDias(base: Date, dias: number) {
  const d = new Date(base)
  d.setDate(d.getDate() + dias)
  return d
}

function fmtData(d: Date) {
  return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })
}

function fmtInput(d: Date) { return d.toISOString().split('T')[0] }

function calcData(abertura: Date | null, offset: number | null) {
  if (!abertura || offset === null) return null
  return addDias(abertura, offset)
}

function isAtrasada(abertura: Date | null, offset: number | null, feito: boolean) {
  if (feito || !abertura || offset === null) return false
  const d = calcData(abertura, offset)
  return d ? d < new Date() : false
}

function isHoje(abertura: Date | null, offset: number | null) {
  if (!abertura || offset === null) return false
  const d = calcData(abertura, offset)
  if (!d) return false
  const h = new Date()
  return d.getDate() === h.getDate() && d.getMonth() === h.getMonth() && d.getFullYear() === h.getFullYear()
}

// ─── Form ────────────────────────────────────────────────────────────────────

type FormTarefa = { tarefa: string; local: string; responsavel: string; links: string; observacoes: string; offset_dias: string; semana: string }

function vazio(semana: number): FormTarefa {
  return { tarefa: '', local: '', responsavel: '', links: '', observacoes: '', offset_dias: '', semana: String(semana) }
}

function paraForm(t: Tarefa): FormTarefa {
  return {
    tarefa: t.tarefa, local: t.local ?? '', responsavel: t.responsavel ?? '',
    links: t.links ?? '', observacoes: t.observacoes ?? '',
    offset_dias: t.offset_dias !== null ? String(t.offset_dias) : '', semana: String(t.semana),
  }
}

// ─── Form de edição ───────────────────────────────────────────────────────────

function FormEdicao({ form, onChange, onSalvar, onCancelar, abertura }: {
  form: FormTarefa; onChange: (f: FormTarefa) => void
  onSalvar: () => void; onCancelar: () => void; abertura: Date | null
}) {
  const offset = form.offset_dias !== '' ? parseInt(form.offset_dias) : null
  const dataCalc = calcData(abertura, offset)

  return (
    <div className="rounded-xl border border-gray-700 bg-gray-800/80 p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-400 mb-1">Tarefa *</label>
          <input autoFocus value={form.tarefa} onChange={e => onChange({ ...form, tarefa: e.target.value })}
            onKeyDown={e => e.key === 'Enter' && onSalvar()}
            className="w-full rounded-lg bg-gray-900 border border-gray-600 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-emerald-500 focus:outline-none"
            placeholder="Nome da tarefa" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Local / Ferramenta</label>
          <input value={form.local} onChange={e => onChange({ ...form, local: e.target.value })}
            className="w-full rounded-lg bg-gray-900 border border-gray-600 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-emerald-500 focus:outline-none"
            placeholder="ex: Hotmart, Meta Ads…" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Responsável</label>
          <input value={form.responsavel} onChange={e => onChange({ ...form, responsavel: e.target.value })}
            className="w-full rounded-lg bg-gray-900 border border-gray-600 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-emerald-500 focus:outline-none"
            placeholder="ex: João Víctor" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">
            Offset <span className="text-gray-600 font-normal">(dias da abertura)</span>
          </label>
          <div className="flex items-center gap-2">
            <input type="number" value={form.offset_dias} onChange={e => onChange({ ...form, offset_dias: e.target.value })}
              className="w-24 rounded-lg bg-gray-900 border border-gray-600 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-emerald-500 focus:outline-none"
              placeholder="-35" />
            {dataCalc && <span className="text-xs text-emerald-400 font-medium">→ {fmtData(dataCalc)}</span>}
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Semana</label>
          <select value={form.semana} onChange={e => onChange({ ...form, semana: e.target.value })}
            className="w-full rounded-lg bg-gray-900 border border-gray-600 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none">
            {Object.entries(SEMANAS).map(([n, s]) => (
              <option key={n} value={n}>{s.label} — {s.descricao}</option>
            ))}
          </select>
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-400 mb-1">Link</label>
          <input value={form.links} onChange={e => onChange({ ...form, links: e.target.value })}
            className="w-full rounded-lg bg-gray-900 border border-gray-600 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-emerald-500 focus:outline-none"
            placeholder="https://…" />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-400 mb-1">Observações</label>
          <textarea value={form.observacoes} onChange={e => onChange({ ...form, observacoes: e.target.value })}
            rows={2} className="w-full rounded-lg bg-gray-900 border border-gray-600 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-emerald-500 focus:outline-none resize-none"
            placeholder="Notas adicionais…" />
        </div>
      </div>
      <div className="flex gap-2 justify-end pt-1">
        <button onClick={onCancelar} className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm text-gray-400 hover:bg-gray-700 transition-colors">
          <X size={14} /> Cancelar
        </button>
        <button onClick={onSalvar} disabled={!form.tarefa.trim()}
          className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-500 disabled:opacity-40 transition-colors font-medium">
          <Check size={14} /> Salvar
        </button>
      </div>
    </div>
  )
}

// ─── Linha de tarefa ─────────────────────────────────────────────────────────

function LinhaTarefa({ tarefa, abertura, onToggle, onEditar, onDeletar, onMover, isFirst, isLast, expandida, onExpandir }: {
  tarefa: Tarefa; abertura: Date | null
  onToggle: () => void; onEditar: () => void; onDeletar: () => void
  onMover: (dir: 'up' | 'down') => void
  isFirst: boolean; isLast: boolean; expandida: boolean; onExpandir: () => void
}) {
  const data = calcData(abertura, tarefa.offset_dias)
  const atrasada = isAtrasada(abertura, tarefa.offset_dias, tarefa.feito)
  const hoje = isHoje(abertura, tarefa.offset_dias)

  return (
    <div className={`rounded-xl border transition-all ${
      tarefa.feito ? 'border-gray-800 bg-gray-900/20 opacity-55'
      : atrasada   ? 'border-red-500/30 bg-red-500/5'
      : hoje       ? 'border-amber-500/30 bg-amber-500/5'
      :              'border-gray-800 bg-gray-900/50 hover:border-gray-700'
    }`}>
      <div className="flex items-start gap-3 p-3">

        {/* Reordenar */}
        <div className="flex flex-col gap-0.5 mt-0.5 shrink-0">
          <button onClick={() => onMover('up')} disabled={isFirst}
            className="rounded p-1 text-gray-700 hover:text-gray-400 hover:bg-gray-700 disabled:opacity-0 transition-colors">
            <ArrowUp size={12} />
          </button>
          <button onClick={() => onMover('down')} disabled={isLast}
            className="rounded p-1 text-gray-700 hover:text-gray-400 hover:bg-gray-700 disabled:opacity-0 transition-colors">
            <ArrowDown size={12} />
          </button>
        </div>

        {/* Checkbox */}
        <button onClick={onToggle} className="shrink-0 mt-0.5">
          {tarefa.feito
            ? <CheckSquare size={20} className="text-emerald-400" />
            : <Square size={20} className="text-gray-500 hover:text-gray-300" />
          }
        </button>

        {/* Conteúdo */}
        <div className="flex-1 min-w-0">
          {/* Nome da tarefa */}
          <p className={`text-sm font-medium leading-snug ${tarefa.feito ? 'line-through text-gray-500' : 'text-gray-100'}`}>
            {tarefa.tarefa}
          </p>

          {/* Metadados em linha — sempre visíveis */}
          <div className="mt-2 flex flex-wrap gap-2">
            {data && (
              <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium ${
                atrasada ? 'bg-red-500/15 text-red-400'
                : hoje   ? 'bg-amber-500/15 text-amber-400'
                :          'bg-gray-800 text-gray-300'
              }`}>
                <Calendar size={11} />
                {fmtData(data)}
                {atrasada && ' · atrasada'}
                {hoje && ' · hoje'}
              </span>
            )}
            {tarefa.local && (
              <span className="inline-flex items-center gap-1.5 rounded-md bg-gray-800 px-2 py-0.5 text-xs font-medium text-gray-300">
                <MapPin size={11} className="text-gray-500" />
                {tarefa.local}
              </span>
            )}
            {tarefa.responsavel && (
              <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-400">
                <User size={11} />
                {tarefa.responsavel}
              </span>
            )}
          </div>

          {/* Detalhes expandidos */}
          {expandida && (
            <div className="mt-3 space-y-2 border-t border-gray-800 pt-3">
              {tarefa.links && (
                <div className="flex items-start gap-2">
                  <Link2 size={13} className="mt-0.5 shrink-0 text-gray-500" />
                  <a href={tarefa.links} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-blue-400 hover:underline break-all">{tarefa.links}</a>
                </div>
              )}
              {tarefa.observacoes && (
                <div className="flex items-start gap-2">
                  <FileText size={13} className="mt-0.5 shrink-0 text-gray-500" />
                  <p className="text-xs text-gray-300 leading-relaxed">{tarefa.observacoes}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Ações */}
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={onExpandir} className="rounded-lg p-1.5 text-gray-600 hover:text-gray-300 hover:bg-gray-700 transition-colors">
            {expandida ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button onClick={onEditar} className="rounded-lg p-1.5 text-gray-600 hover:text-blue-400 hover:bg-gray-700 transition-colors">
            <Pencil size={14} />
          </button>
          <button onClick={onDeletar} className="rounded-lg p-1.5 text-gray-600 hover:text-red-400 hover:bg-gray-700 transition-colors">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Modal novo lançamento ────────────────────────────────────────────────────

function ModalNovoLancamento({ onFechar, onCriado }: { onFechar: () => void; onCriado: (l: Lancamento) => void }) {
  const [form, setForm] = useState({ codigo: '', nome: '', meta_faturamento: '' })
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  async function salvar() {
    if (!form.codigo.trim() || !form.nome.trim()) { setErro('Código e nome são obrigatórios.'); return }
    setSalvando(true)
    const res = await fetch('/api/lancamentos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        codigo: form.codigo.toUpperCase().trim(),
        nome: form.nome.trim(),
        meta_faturamento: form.meta_faturamento ? parseFloat(form.meta_faturamento) : null,
      }),
    })
    if (!res.ok) { setErro('Erro ao criar. Verifique se o código já existe.'); setSalvando(false); return }
    const novo = await res.json()
    onCriado(novo)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-700 bg-gray-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20">
              <Rocket size={16} className="text-emerald-400" />
            </div>
            <h2 className="text-base font-bold text-white">Novo Lançamento</h2>
          </div>
          <button onClick={onFechar} className="rounded-lg p-1.5 text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Código <span className="text-gray-600 font-normal">(único, ex: LC26)</span>
            </label>
            <input autoFocus value={form.codigo} onChange={e => setForm({ ...form, codigo: e.target.value })}
              className="w-full rounded-lg bg-gray-800 border border-gray-600 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-emerald-500 focus:outline-none uppercase"
              placeholder="LC26" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Nome do lançamento</label>
            <input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })}
              onKeyDown={e => e.key === 'Enter' && salvar()}
              className="w-full rounded-lg bg-gray-800 border border-gray-600 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-emerald-500 focus:outline-none"
              placeholder="ex: Lançamento LC26 — Setembro 2026" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Meta de faturamento <span className="text-gray-600 font-normal">(opcional)</span>
            </label>
            <input type="number" value={form.meta_faturamento} onChange={e => setForm({ ...form, meta_faturamento: e.target.value })}
              className="w-full rounded-lg bg-gray-800 border border-gray-600 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-emerald-500 focus:outline-none"
              placeholder="100000" />
          </div>
          {erro && <p className="text-xs text-red-400">{erro}</p>}
        </div>

        <div className="flex gap-2 justify-end mt-5">
          <button onClick={onFechar} className="rounded-lg px-4 py-2 text-sm text-gray-400 hover:bg-gray-800 transition-colors">
            Cancelar
          </button>
          <button onClick={salvar} disabled={salvando}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors">
            <Rocket size={14} />
            {salvando ? 'Criando…' : 'Criar lançamento'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Página principal ────────────────────────────────────────────────────────

export default function ChecklistPage() {
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([])
  const [lancamentoId, setLancamentoId] = useState('')
  const [abertura, setAbertura] = useState<Date | null>(null)
  const [dataInput, setDataInput] = useState('')
  const [tarefas, setTarefas] = useState<Tarefa[]>([])
  const [loading, setLoading] = useState(false)
  const [semanasExp, setSemanasExp] = useState<Set<number>>(new Set([1, 2, 3, 4, 5, 6, 7]))
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [formEdicao, setFormEdicao] = useState<FormTarefa>(vazio(1))
  const [adicionandoSemana, setAdicionandoSemana] = useState<number | null>(null)
  const [formNova, setFormNova] = useState<FormTarefa>(vazio(1))
  const [expandidaIds, setExpandidaIds] = useState<Set<string>>(new Set())
  const [modalNovoLancamento, setModalNovoLancamento] = useState(false)

  useEffect(() => {
    fetch('/api/lancamentos').then(r => r.json()).then((data: Lancamento[]) => {
      setLancamentos(data)
      const ativo = data.find(l => l.status === 'ativo') ?? data[0]
      if (ativo) {
        setLancamentoId(ativo.codigo)
        if (ativo.data_abertura_carrinho) {
          const d = new Date(ativo.data_abertura_carrinho)
          setAbertura(d); setDataInput(fmtInput(d))
        }
      }
    })
  }, [])

  const carregarTarefas = useCallback(() => {
    if (!lancamentoId) return
    setLoading(true)
    fetch(`/api/checklist/tarefas?lancamento=${lancamentoId}`)
      .then(r => r.json()).then(d => { setTarefas(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [lancamentoId])

  useEffect(() => { carregarTarefas() }, [carregarTarefas])

  useEffect(() => {
    const l = lancamentos.find(l => l.codigo === lancamentoId)
    if (l?.data_abertura_carrinho) {
      const d = new Date(l.data_abertura_carrinho)
      setAbertura(d); setDataInput(fmtInput(d))
    } else { setAbertura(null); setDataInput('') }
  }, [lancamentoId, lancamentos])

  async function salvarDataAbertura() {
    if (!lancamentoId) return
    const d = dataInput ? new Date(dataInput + 'T12:00:00') : null
    await fetch('/api/checklist/lancamento', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_lancamento: lancamentoId, data_abertura_carrinho: d?.toISOString() ?? null }),
    })
    setAbertura(d)
    setLancamentos(prev => prev.map(l => l.codigo === lancamentoId ? { ...l, data_abertura_carrinho: d?.toISOString() ?? null } : l))
  }

  async function toggleFeito(id: string, feito: boolean) {
    setTarefas(prev => prev.map(t => t.id === id ? { ...t, feito } : t))
    await fetch(`/api/checklist/tarefas/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feito, data_conclusao: feito ? new Date().toISOString() : null }),
    })
  }

  function iniciarEdicao(t: Tarefa) {
    if (!t.id) { setEditandoId(null); return }
    setEditandoId(t.id); setFormEdicao(paraForm(t)); setAdicionandoSemana(null)
  }

  async function salvarEdicao() {
    if (!editandoId) return
    const body = {
      tarefa: formEdicao.tarefa, local: formEdicao.local || null,
      responsavel: formEdicao.responsavel || null, links: formEdicao.links || null,
      observacoes: formEdicao.observacoes || null,
      offset_dias: formEdicao.offset_dias !== '' ? parseInt(formEdicao.offset_dias) : null,
      semana: parseInt(formEdicao.semana),
    }
    const res = await fetch(`/api/checklist/tarefas/${editandoId}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
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

  async function salvarNova() {
    if (!formNova.tarefa.trim() || !lancamentoId) return
    const res = await fetch('/api/checklist/tarefas', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id_lancamento: lancamentoId, semana: parseInt(formNova.semana),
        tarefa: formNova.tarefa, local: formNova.local || null,
        responsavel: formNova.responsavel || null, links: formNova.links || null,
        observacoes: formNova.observacoes || null,
        offset_dias: formNova.offset_dias !== '' ? parseInt(formNova.offset_dias) : null,
      }),
    })
    const nova = await res.json()
    setTarefas(prev => [...prev, nova]); setAdicionandoSemana(null)
  }

  async function moverTarefa(id: string, dir: 'up' | 'down') {
    const t = tarefas.find(x => x.id === id)
    if (!t) return
    const grupo = tarefas.filter(x => x.semana === t.semana).sort((a, b) => a.ordem - b.ordem)
    const idx = grupo.findIndex(x => x.id === id)
    const viz = dir === 'up' ? idx - 1 : idx + 1
    if (viz < 0 || viz >= grupo.length) return
    const a = grupo[idx], b = grupo[viz]
    setTarefas(prev => prev.map(x => x.id === a.id ? { ...x, ordem: b.ordem } : x.id === b.id ? { ...x, ordem: a.ordem } : x))
    await fetch('/api/checklist/tarefas/reorder', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [{ id: a.id, ordem: b.ordem }, { id: b.id, ordem: a.ordem }] }),
    })
  }

  const milestones = abertura ? [
    { label: 'Início Captação',    data: addDias(abertura, -35) },
    { label: 'Início Aquecimento', data: addDias(abertura, -28) },
    { label: 'CPL 1',              data: addDias(abertura, -7)  },
    { label: 'CPL 2',              data: addDias(abertura, -5)  },
    { label: 'CPL 3',              data: addDias(abertura, -3)  },
    { label: 'Abertura Carrinho',  data: abertura               },
    { label: 'Fechamento',         data: addDias(abertura, 6)   },
  ] : []

  const totalFeitas = tarefas.filter(t => t.feito).length
  const total = tarefas.length
  const pct = total > 0 ? Math.round((totalFeitas / total) * 100) : 0

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-app)' }}>
      {modalNovoLancamento && (
        <ModalNovoLancamento
          onFechar={() => setModalNovoLancamento(false)}
          onCriado={novo => {
            setLancamentos(prev => [novo, ...prev])
            setLancamentoId(novo.codigo)
            setModalNovoLancamento(false)
          }}
        />
      )}

      <div className="mx-auto max-w-4xl px-4 py-6 space-y-5">

        {/* Header */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold" style={{ color: 'var(--text-1)' }}>Checklist do Lançamento</h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-4)' }}>Gerencie todas as tarefas do seu lançamento</p>
          </div>
          <button onClick={() => setModalNovoLancamento(true)}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition-colors">
            <Plus size={15} /> Novo lançamento
          </button>
          <select value={lancamentoId} onChange={e => setLancamentoId(e.target.value)}
            className="rounded-xl border px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-soft)', color: 'var(--text-1)' }}>
            {lancamentos.map(l => <option key={l.codigo} value={l.codigo}>{l.nome}</option>)}
          </select>
        </div>

        {/* Datas */}
        <div className="rounded-2xl border p-4 space-y-4" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
          <div className="flex items-end gap-3 flex-wrap">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-3)' }}>
                DATA DE ABERTURA DO CARRINHO
              </label>
              <div className="flex items-center gap-2">
                <input type="date" value={dataInput} onChange={e => setDataInput(e.target.value)}
                  className="rounded-lg border px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                  style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-soft)', color: 'var(--text-1)' }} />
                <button onClick={salvarDataAbertura}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition-colors">
                  Aplicar
                </button>
              </div>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-4)' }}>← Todas as datas calculam automaticamente</p>
          </div>

          {milestones.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {milestones.map(m => (
                <div key={m.label} className="rounded-xl px-3 py-2" style={{ background: 'var(--bg-elevated)' }}>
                  <p className="text-xs font-medium" style={{ color: 'var(--text-4)' }}>{m.label}</p>
                  <p className="text-sm font-bold mt-0.5" style={{ color: 'var(--text-1)' }}>
                    {m.data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Progresso */}
        {total > 0 && (
          <div className="rounded-2xl border p-4" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium" style={{ color: 'var(--text-3)' }}>Progresso geral</span>
              <span className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>
                {totalFeitas}/{total} tarefas — {pct}%
              </span>
            </div>
            <div className="h-2.5 w-full rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
              <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}

        {/* Semanas */}
        {loading ? (
          <div className="flex items-center justify-center py-16 text-sm" style={{ color: 'var(--text-4)' }}>
            Carregando tarefas…
          </div>
        ) : (
          <div className="space-y-3">
            {Object.keys(SEMANAS).map(n => {
              const semana = parseInt(n)
              const s = SEMANAS[semana]
              const cor = COR_SEMANA[semana]
              const grupo = tarefas.filter(t => t.semana === semana).sort((a, b) => a.ordem - b.ordem)
              const feitas = grupo.filter(t => t.feito).length
              const pctS = grupo.length > 0 ? Math.round((feitas / grupo.length) * 100) : 0
              const dataInicio = abertura ? addDias(abertura, s.offsetInicio) : null
              const dataFim = abertura ? addDias(abertura, s.offsetFim) : null
              const expandida = semanasExp.has(semana)

              return (
                <div key={semana} className={`rounded-2xl border overflow-hidden ${cor.header}`}>
                  {/* Header semana */}
                  <button onClick={() => setSemanasExp(prev => {
                    const nx = new Set(prev)
                    if (nx.has(semana)) nx.delete(semana); else nx.add(semana)
                    return nx
                  })} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/5 transition-colors">
                    {expandida ? <ChevronDown size={15} className="shrink-0" /> : <ChevronRight size={15} className="shrink-0" />}
                    <div className="flex-1 text-left min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-sm font-bold">{s.label}</span>
                        <span className="text-sm opacity-70">— {s.descricao}</span>
                        {dataInicio && dataFim && (
                          <span className="text-xs opacity-50 ml-auto">
                            {fmtData(dataInicio)} → {fmtData(dataFim)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className="text-xs opacity-60">{feitas}/{grupo.length}</span>
                      <div className="w-20 h-1.5 rounded-full bg-black/20 overflow-hidden">
                        <div className={`h-full rounded-full ${cor.barra} transition-all`} style={{ width: `${pctS}%` }} />
                      </div>
                      <span className="text-xs font-bold">{pctS}%</span>
                    </div>
                  </button>

                  {/* Lista */}
                  {expandida && (
                    <div className="px-3 pb-3 space-y-2">
                      {grupo.map((t, idx) => (
                        editandoId === t.id ? (
                          <FormEdicao key={t.id} form={formEdicao} onChange={setFormEdicao}
                            onSalvar={salvarEdicao} onCancelar={() => setEditandoId(null)} abertura={abertura} />
                        ) : (
                          <LinhaTarefa key={t.id} tarefa={t} abertura={abertura}
                            onToggle={() => toggleFeito(t.id, !t.feito)}
                            onEditar={() => iniciarEdicao(t)}
                            onDeletar={() => deletarTarefa(t.id)}
                            onMover={dir => moverTarefa(t.id, dir)}
                            isFirst={idx === 0} isLast={idx === grupo.length - 1}
                            expandida={expandidaIds.has(t.id)}
                            onExpandir={() => setExpandidaIds(prev => {
                              const nx = new Set(prev)
                              if (nx.has(t.id)) nx.delete(t.id); else nx.add(t.id)
                              return nx
                            })} />
                        )
                      ))}

                      {adicionandoSemana === semana ? (
                        <FormEdicao form={formNova} onChange={setFormNova}
                          onSalvar={salvarNova} onCancelar={() => setAdicionandoSemana(null)} abertura={abertura} />
                      ) : (
                        <button onClick={() => { setAdicionandoSemana(semana); setFormNova({ ...vazio(semana), semana: String(semana) }); setEditandoId(null) }}
                          className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm transition-colors border border-dashed border-gray-700 hover:border-gray-500 mt-1"
                          style={{ color: 'var(--text-4)' }}>
                          <Plus size={14} /> Adicionar tarefa nesta semana
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

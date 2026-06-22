'use client'

import { useEffect, useState, useCallback } from 'react'
import { Copy, Check, Pencil, Plus, Trash2, X, ExternalLink, Link2, ChevronDown, ChevronRight } from 'lucide-react'

// ─── Tipos ──────────────────────────────────────────────────────────────────

type Config = {
  id_lancamento?: string
  url_base_inscricao?: string | null
  url_base_vendas?: string | null
  utm_id?: string | null
}

type Link = {
  id: string
  categoria: string
  nome: string
  url: string | null
  data_exibicao: string | null
  ordem: number
}

type Lancamento = { codigo: string; nome: string; status: string | null }

// ─── UTM params fixos por fonte orgânica ────────────────────────────────────

const ORGANICOS = [
  { nome: 'Orgânico — YouTube',   source: 'organico', campaign: 'youtube',   medium: 'youtube_todos'   },
  { nome: 'Orgânico — Facebook',  source: 'organico', campaign: 'facebook',  medium: 'facebook_todos'  },
  { nome: 'Orgânico — Instagram', source: 'organico', campaign: 'instagram', medium: 'instagram_todos' },
  { nome: 'Orgânico — E-mail',    source: 'organico', campaign: 'email',     medium: 'email_todos'     },
  { nome: 'Orgânico — WhatsApp',  source: 'organico', campaign: 'whatsapp',  medium: 'whatsapp_todos'  },
  { nome: 'Orgânico — TikTok',    source: 'organico', campaign: 'tiktok',    medium: 'tiktok_todos'    },
  { nome: 'Orgânico — LinkedIn',  source: 'organico', campaign: 'linkedin',  medium: 'linkedin_todos'  },
  { nome: 'Orgânico — Ebook',     source: 'organico', campaign: 'ebook',     medium: 'ebook_todos'     },
  { nome: 'Orgânico — Blog',      source: 'organico', campaign: 'blog',      medium: 'blog_todos'      },
]

const PAGOS = [
  { nome: 'Pago — Meta Quente',      source: 'facebook_pago_quente',  campaign: '{{campaign.name}}', term: '{{adset.name}}', content: '{{ad.name}}', medium: '{{placement}}' },
  { nome: 'Pago — Meta Frio',        source: 'facebook_pago_frio',    campaign: '{{campaign.name}}', term: '{{adset.name}}', content: '{{ad.name}}', medium: '{{placement}}' },
  { nome: 'Pago — YouTube Quente',   source: 'youtube_pago_quente',   campaign: '{campaignid}',      term: '{targetid}',     content: '{creative}',  medium: 'video'         },
  { nome: 'Pago — YouTube Frio',     source: 'youtube_pago_frio',     campaign: '{campaignid}',      term: '{targetid}',     content: '{creative}',  medium: 'video'         },
  { nome: 'Pago — Google Quente',    source: 'google_pago_quente',    campaign: '{campaignid}',      term: '{keyword}',      content: '{creative}',  medium: 'video'         },
  { nome: 'Pago — Google Frio',      source: 'google_pago_frio',      campaign: '{campaignid}',      term: '{keyword}',      content: '{creative}',  medium: 'video'         },
  { nome: 'Pago — LinkedIn Quente',  source: 'linkedin_pago_quente',  campaign: '{{CAMPAIGN_NAME}}', term: '{{AD_SET_NAME}}',content: '{{AD_NAME}}', medium: 'mensagem'      },
  { nome: 'Pago — LinkedIn Frio',    source: 'linkedin_pago_frio',    campaign: '{{CAMPAIGN_NAME}}', term: '{{AD_SET_NAME}}',content: '{{AD_NAME}}', medium: 'mensagem'      },
]

function buildUtmUrl(base: string, params: { source: string; campaign: string; medium: string; term?: string; content?: string }, utmId: string): string {
  const u = new URL(base)
  u.searchParams.set('utm_source', params.source)
  u.searchParams.set('utm_campaign', params.campaign)
  u.searchParams.set('utm_term', params.term ?? 'conjunto_null')
  u.searchParams.set('utm_content', params.content ?? 'anuncio_null')
  u.searchParams.set('utm_medium', params.medium)
  u.searchParams.set('utm_id', utmId)
  return u.toString()
}

function buildPaidUrl(base: string, params: typeof PAGOS[0], utmId: string): string {
  return `${base}?utm_source=${params.source}&utm_campaign=${params.campaign}&utm_term=${params.term}&utm_content=${params.content}&utm_medium=${params.medium}&utm_id=${utmId}`
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtData(s: string | null) {
  if (!s) return ''
  return new Date(s).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

// ─── Componente de cópia ─────────────────────────────────────────────────────

function BtnCopiar({ texto, disabled }: { texto: string; disabled?: boolean }) {
  const [ok, setOk] = useState(false)
  function copiar() {
    if (!texto || disabled) return
    navigator.clipboard.writeText(texto)
    setOk(true)
    setTimeout(() => setOk(false), 2000)
  }
  return (
    <button onClick={copiar} disabled={disabled || !texto}
      className={`shrink-0 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
        ok ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200 disabled:opacity-30'
      }`}>
      {ok ? <><Check size={11} /> Copiado</> : <><Copy size={11} /> Copiar</>}
    </button>
  )
}

// ─── Linha de link manual ────────────────────────────────────────────────────

function LinhaLink({ link, onSalvar, onDeletar }: {
  link: Link
  onSalvar: (id: string, url: string | null, data: string | null, nome: string) => Promise<void>
  onDeletar: (id: string) => Promise<void>
}) {
  const [editando, setEditando] = useState(false)
  const [url, setUrl] = useState(link.url ?? '')
  const [data, setData] = useState(link.data_exibicao ? link.data_exibicao.split('T')[0] : '')
  const [nome, setNome] = useState(link.nome)
  const [salvando, setSalvando] = useState(false)

  async function salvar() {
    setSalvando(true)
    await onSalvar(link.id, url || null, data || null, nome)
    setEditando(false)
    setSalvando(false)
  }

  if (editando) {
    return (
      <div className="rounded-xl border border-gray-700 bg-gray-800/60 p-3 space-y-2">
        <input value={nome} onChange={e => setNome(e.target.value)}
          className="w-full rounded-lg bg-gray-900 border border-gray-600 px-3 py-1.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
          placeholder="Nome do link" />
        <input value={url} onChange={e => setUrl(e.target.value)}
          className="w-full rounded-lg bg-gray-900 border border-gray-600 px-3 py-1.5 text-sm text-white placeholder-gray-600 focus:border-emerald-500 focus:outline-none"
          placeholder="https://…" />
        <div className="flex items-center gap-2">
          <input type="date" value={data} onChange={e => setData(e.target.value)}
            className="rounded-lg bg-gray-900 border border-gray-600 px-3 py-1.5 text-sm text-white focus:border-emerald-500 focus:outline-none" />
          <span className="text-xs text-gray-600">Data de exibição (opcional)</span>
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={() => setEditando(false)} className="rounded-lg px-3 py-1.5 text-xs text-gray-400 hover:bg-gray-700 transition-colors"><X size={12} /></button>
          <button onClick={salvar} disabled={salvando}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors">
            <Check size={12} />{salvando ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="group flex items-center gap-3 rounded-xl border border-gray-800 bg-gray-900/40 px-3 py-2.5 hover:border-gray-700 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>{link.nome}</p>
          {link.data_exibicao && (
            <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-md">{fmtData(link.data_exibicao)}</span>
          )}
        </div>
        {link.url ? (
          <p className="text-xs mt-0.5 break-all" style={{ color: 'var(--text-4)' }}>{link.url}</p>
        ) : (
          <p className="text-xs mt-0.5 italic" style={{ color: 'var(--text-4)' }}>Sem link</p>
        )}
      </div>
      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        {link.url && (
          <a href={link.url} target="_blank" rel="noopener noreferrer"
            className="rounded-lg p-1.5 text-gray-600 hover:text-blue-400 hover:bg-gray-700 transition-colors">
            <ExternalLink size={13} />
          </a>
        )}
        <BtnCopiar texto={link.url ?? ''} disabled={!link.url} />
        <button onClick={() => setEditando(true)} className="rounded-lg p-1.5 text-gray-600 hover:text-blue-400 hover:bg-gray-700 transition-colors"><Pencil size={13} /></button>
        <button onClick={() => onDeletar(link.id)} className="rounded-lg p-1.5 text-gray-600 hover:text-red-400 hover:bg-gray-700 transition-colors"><Trash2 size={13} /></button>
      </div>
    </div>
  )
}

// ─── Seção colapsável ────────────────────────────────────────────────────────

function Secao({ titulo, cor, children }: { titulo: string; cor: string; children: React.ReactNode }) {
  const [aberta, setAberta] = useState(true)
  return (
    <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
      <button onClick={() => setAberta(v => !v)}
        className="w-full flex items-center gap-2 px-4 py-3 hover:bg-white/5 transition-colors" style={{ background: 'var(--bg-surface)' }}>
        {aberta ? <ChevronDown size={14} className={cor} /> : <ChevronRight size={14} className={cor} />}
        <span className={`text-sm font-bold ${cor}`}>{titulo}</span>
      </button>
      {aberta && <div className="px-4 pb-4 pt-1 space-y-2" style={{ background: 'var(--bg-surface)' }}>{children}</div>}
    </div>
  )
}

// ─── Linha UTM gerada ─────────────────────────────────────────────────────────

function LinhaUtm({ nome, url }: { nome: string; url: string | null }) {
  return (
    <div className="group flex items-center gap-3 rounded-xl border border-gray-800 bg-gray-900/40 px-3 py-2.5 hover:border-gray-700 transition-colors">
      <Link2 size={13} className="shrink-0 text-gray-600" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>{nome}</p>
        {url ? (
          <p className="text-xs mt-0.5 break-all" style={{ color: 'var(--text-4)' }}>{url}</p>
        ) : (
          <p className="text-xs mt-0.5 italic" style={{ color: 'var(--text-4)' }}>Configure a URL base e o UTM ID acima</p>
        )}
      </div>
      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        {url && (
          <a href={url} target="_blank" rel="noopener noreferrer"
            className="rounded-lg p-1.5 text-gray-600 hover:text-blue-400 hover:bg-gray-700 transition-colors">
            <ExternalLink size={13} />
          </a>
        )}
        <BtnCopiar texto={url ?? ''} disabled={!url} />
      </div>
    </div>
  )
}

// ─── Página principal ────────────────────────────────────────────────────────

export default function LinksPage() {
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([])
  const [lancamentoId, setLancamentoId] = useState('')
  const [config, setConfig] = useState<Config>({})
  const [links, setLinks] = useState<Link[]>([])
  const [loading, setLoading] = useState(false)
  const [configSalva, setConfigSalva] = useState(false)
  const [adicionandoCat, setAdicionandoCat] = useState<string | null>(null)
  const [formNovo, setFormNovo] = useState({ nome: '', url: '', data: '' })

  useEffect(() => {
    fetch('/api/lancamentos').then(r => r.json()).then((data: Lancamento[]) => {
      setLancamentos(data)
      const ativo = data.find(l => l.status === 'ativo') ?? data[0]
      if (ativo) setLancamentoId(ativo.codigo)
    })
  }, [])

  const carregar = useCallback(() => {
    if (!lancamentoId) return
    setLoading(true)
    Promise.all([
      fetch(`/api/links/config?lancamento=${lancamentoId}`).then(r => r.json()),
      fetch(`/api/links?lancamento=${lancamentoId}`).then(r => r.json()),
    ]).then(([cfg, lks]) => {
      setConfig(cfg)
      setLinks(lks)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [lancamentoId])

  useEffect(() => { carregar() }, [carregar])

  async function salvarConfig() {
    await fetch('/api/links/config', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_lancamento: lancamentoId, ...config }),
    })
    setConfigSalva(true)
    setTimeout(() => setConfigSalva(false), 2000)
  }

  async function salvarLink(id: string, url: string | null, data: string | null, nome: string) {
    const res = await fetch(`/api/links/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, data_exibicao: data ? new Date(data + 'T12:00:00').toISOString() : null, nome }),
    })
    const updated = await res.json()
    setLinks(prev => prev.map(l => l.id === id ? updated : l))
  }

  async function adicionarLink(categoria: string) {
    if (!formNovo.nome.trim()) return
    const res = await fetch('/api/links', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id_lancamento: lancamentoId, categoria, nome: formNovo.nome,
        url: formNovo.url || null,
        data_exibicao: formNovo.data ? new Date(formNovo.data + 'T12:00:00').toISOString() : null,
        ordem: links.filter(l => l.categoria === categoria).length + 1,
      }),
    })
    const novo = await res.json()
    setLinks(prev => [...prev, novo])
    setAdicionandoCat(null)
    setFormNovo({ nome: '', url: '', data: '' })
  }

  async function deletarLink(id: string) {
    if (!confirm('Deletar este link?')) return
    await fetch(`/api/links/${id}`, { method: 'DELETE' })
    setLinks(prev => prev.filter(l => l.id !== id))
  }

  function porCategoria(cat: string) {
    return links.filter(l => l.categoria === cat).sort((a, b) => a.ordem - b.ordem)
  }

  function BtnAdicionar({ cat }: { cat: string }) {
    if (adicionandoCat === cat) {
      return (
        <div className="rounded-xl border border-gray-700 bg-gray-800/60 p-3 space-y-2 mt-1">
          <input autoFocus value={formNovo.nome} onChange={e => setFormNovo({ ...formNovo, nome: e.target.value })}
            className="w-full rounded-lg bg-gray-900 border border-gray-600 px-3 py-1.5 text-sm text-white placeholder-gray-600 focus:border-emerald-500 focus:outline-none"
            placeholder="Nome do link" />
          <input value={formNovo.url} onChange={e => setFormNovo({ ...formNovo, url: e.target.value })}
            className="w-full rounded-lg bg-gray-900 border border-gray-600 px-3 py-1.5 text-sm text-white placeholder-gray-600 focus:border-emerald-500 focus:outline-none"
            placeholder="https://…" />
          <div className="flex gap-2 justify-end">
            <button onClick={() => setAdicionandoCat(null)} className="rounded-lg px-3 py-1.5 text-xs text-gray-400 hover:bg-gray-700 transition-colors"><X size={12} /></button>
            <button onClick={() => adicionarLink(cat)}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs text-white hover:bg-emerald-500 transition-colors">
              <Check size={12} /> Salvar
            </button>
          </div>
        </div>
      )
    }
    return (
      <button onClick={() => { setAdicionandoCat(cat); setFormNovo({ nome: '', url: '', data: '' }) }}
        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm border border-dashed border-gray-700 hover:border-gray-500 mt-1 transition-colors"
        style={{ color: 'var(--text-4)' }}>
        <Plus size={13} /> Adicionar link
      </button>
    )
  }

  const baseInscricao = config.url_base_inscricao ?? ''
  const utmId = config.utm_id ?? ''
  const canGenerate = !!baseInscricao && !!utmId

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-app)' }}>
      <div className="mx-auto max-w-full px-6 py-6 space-y-5">

        {/* Header */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold" style={{ color: 'var(--text-1)' }}>Links do Lançamento</h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-4)' }}>Todos os links organizados por fase do lançamento</p>
          </div>
          <select value={lancamentoId} onChange={e => setLancamentoId(e.target.value)}
            className="rounded-xl border px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-soft)', color: 'var(--text-1)' }}>
            {lancamentos.map(l => <option key={l.codigo} value={l.codigo}>{l.nome}</option>)}
          </select>
        </div>

        {/* Config UTM */}
        <div className="rounded-2xl border p-4 space-y-3" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-4)' }}>Configuração de URLs e UTMs</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-3)' }}>URL Base de Inscrição</label>
              <input value={config.url_base_inscricao ?? ''} onChange={e => setConfig({ ...config, url_base_inscricao: e.target.value })}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-soft)', color: 'var(--text-1)' }}
                placeholder="https://claudiosameiro.com.br/inscrever" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-3)' }}>UTM ID do Lançamento</label>
              <input value={config.utm_id ?? ''} onChange={e => setConfig({ ...config, utm_id: e.target.value })}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-soft)', color: 'var(--text-1)' }}
                placeholder="LC25_JUN26" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-3)' }}>URL Base de Vendas</label>
              <input value={config.url_base_vendas ?? ''} onChange={e => setConfig({ ...config, url_base_vendas: e.target.value })}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-soft)', color: 'var(--text-1)' }}
                placeholder="https://claudiosameiro.com.br/curso" />
            </div>
            <div className="flex items-end">
              <button onClick={salvarConfig}
                className={`w-full rounded-lg px-4 py-2 text-sm font-medium transition-colors ${configSalva ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-200 hover:bg-gray-700'}`}>
                {configSalva ? '✓ Salvo' : 'Salvar config'}
              </button>
            </div>
          </div>
          {!canGenerate && (
            <p className="text-xs text-amber-400">⚠ Preencha a URL Base e o UTM ID para gerar os links de captação automaticamente</p>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-sm" style={{ color: 'var(--text-4)' }}>Carregando…</div>
        ) : (
          <div className="space-y-3">

            {/* CAPTAÇÃO — ORGÂNICO */}
            <Secao titulo="Captação — Orgânico" cor="text-blue-400">
              {ORGANICOS.map(o => {
                const url = canGenerate ? buildUtmUrl(baseInscricao, o, utmId) : null
                return <LinhaUtm key={o.nome} nome={o.nome} url={url} />
              })}
            </Secao>

            {/* CAPTAÇÃO — PAGO */}
            <Secao titulo="Captação — Pago (Templates com parâmetros dinâmicos)" cor="text-violet-400">
              {PAGOS.map(p => {
                const url = canGenerate ? buildPaidUrl(baseInscricao, p, utmId) : null
                return <LinhaUtm key={p.nome} nome={p.nome} url={url} />
              })}
              <p className="text-xs pt-1" style={{ color: 'var(--text-4)' }}>
                Os parâmetros {'{{campaign.name}}'}, {'{campaignid}'} etc. são substituídos automaticamente pelo Meta/Google Ads
              </p>
            </Secao>

            {/* CAPTAÇÃO — PÁGINAS DE OBRIGADO */}
            <Secao titulo="Páginas de Obrigado" cor="text-cyan-400">
              {porCategoria('obrigado').map(l => (
                <LinhaLink key={l.id} link={l} onSalvar={salvarLink} onDeletar={deletarLink} />
              ))}
              <BtnAdicionar cat="obrigado" />
            </Secao>

            {/* AQUECIMENTO */}
            <Secao titulo="Aquecimento — Lives" cor="text-amber-400">
              {porCategoria('aquecimento').map(l => (
                <LinhaLink key={l.id} link={l} onSalvar={salvarLink} onDeletar={deletarLink} />
              ))}
              <BtnAdicionar cat="aquecimento" />
            </Secao>

            {/* CPLS — YOUTUBE */}
            <Secao titulo="CPLs — YouTube" cor="text-red-400">
              {porCategoria('cpl_yt').map(l => (
                <LinhaLink key={l.id} link={l} onSalvar={salvarLink} onDeletar={deletarLink} />
              ))}
              <BtnAdicionar cat="cpl_yt" />
            </Secao>

            {/* CPLS — BLOG */}
            <Secao titulo="CPLs — Blog de Lançamento" cor="text-orange-400">
              {porCategoria('cpl_blog').map(l => (
                <LinhaLink key={l.id} link={l} onSalvar={salvarLink} onDeletar={deletarLink} />
              ))}
              <BtnAdicionar cat="cpl_blog" />
            </Secao>

            {/* CARRINHO ABERTO */}
            <Secao titulo="Carrinho Aberto" cor="text-emerald-400">
              {porCategoria('carrinho_aberto').map(l => (
                <LinhaLink key={l.id} link={l} onSalvar={salvarLink} onDeletar={deletarLink} />
              ))}
              <BtnAdicionar cat="carrinho_aberto" />
            </Secao>

            {/* CARRINHO FECHADO */}
            <Secao titulo="Carrinho Fechado — Lista de Espera" cor="text-rose-400">
              {porCategoria('carrinho_fechado').map(l => (
                <LinhaLink key={l.id} link={l} onSalvar={salvarLink} onDeletar={deletarLink} />
              ))}
              <BtnAdicionar cat="carrinho_fechado" />
            </Secao>

            {/* EXTRAS */}
            <Secao titulo="Links Extras" cor="text-gray-400">
              {porCategoria('extras').map(l => (
                <LinhaLink key={l.id} link={l} onSalvar={salvarLink} onDeletar={deletarLink} />
              ))}
              <BtnAdicionar cat="extras" />
            </Secao>

          </div>
        )}
      </div>
    </div>
  )
}

import * as XLSX from 'xlsx'
import { Prisma } from '@prisma/client'
import { prisma } from '../prisma'

type LinhaLead = {
  email: string | null
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  utm_content: string | null
  utm_term: string | null
}

// Valores como "{{campaign.name}}" acontecem quando o Meta não resolveu o parâmetro — não é dado real.
function limpar(v: unknown): string | null {
  const s = String(v ?? '').trim()
  if (!s || s.includes('{{')) return null
  return s
}

function acharChave(headers: string[], termos: string[]): string | null {
  const norm = (s: string) => s.toLowerCase().trim()
  for (const h of headers) {
    if (termos.some(t => norm(h) === norm(t))) return h
  }
  return null
}

export function parseArquivoLeads(buffer: Buffer, nomeArquivo: string): LinhaLead[] {
  const isCsv = nomeArquivo.toLowerCase().endsWith('.csv')
  const wb = isCsv
    ? XLSX.read(buffer.toString('utf-8'), { type: 'string' })
    : XLSX.read(buffer, { type: 'buffer' })

  const sheet = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null })
  if (rows.length === 0) return []

  const headers = Object.keys(rows[0])
  const col = {
    email:        acharChave(headers, ['email', 'e-mail']),
    utm_source:   acharChave(headers, ['utm_source']),
    utm_medium:   acharChave(headers, ['utm_medium']),
    utm_campaign: acharChave(headers, ['utm_campaign']),
    utm_content:  acharChave(headers, ['utm_content']),
    utm_term:     acharChave(headers, ['utm_term']),
  }

  return rows.map(r => ({
    email:        col.email ? limpar(r[col.email])?.toLowerCase() ?? null : null,
    utm_source:   col.utm_source ? limpar(r[col.utm_source]) : null,
    utm_medium:   col.utm_medium ? limpar(r[col.utm_medium]) : null,
    utm_campaign: col.utm_campaign ? limpar(r[col.utm_campaign]) : null,
    utm_content:  col.utm_content ? limpar(r[col.utm_content]) : null,
    utm_term:     col.utm_term ? limpar(r[col.utm_term]) : null,
  }))
}

// Extrai o código do lançamento do início da utm_campaign (ex: "LC24_LEADS_..." -> "LC24")
function extrairLancamento(utmCampaign: string | null): string | null {
  if (!utmCampaign) return null
  const m = utmCampaign.match(/^([A-Za-z]+\d+)/)
  return m ? m[1].toUpperCase() : null
}

export type ResultadoImportacaoLeads = {
  totalLinhas: number
  semEmail: number
  semLancamentoIdentificavel: number
  atribuidosAoLancamentoAtivo: number // sem LC na utm_campaign (ex: orgânico/YouTube), atribuídos ao lançamento ativo
  novosLeads: number
  leadsAtualizados: number // já existia, algum campo de UTM foi preenchido (não sobrescrito)
  semMudanca: number
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

const UTM_FIELDS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const

export async function importarLeads(buffer: Buffer, nomeArquivo: string): Promise<ResultadoImportacaoLeads> {
  const linhas = parseArquivoLeads(buffer, nomeArquivo)

  const resultado: ResultadoImportacaoLeads = {
    totalLinhas: linhas.length,
    semEmail: 0,
    semLancamentoIdentificavel: 0,
    atribuidosAoLancamentoAtivo: 0,
    novosLeads: 0,
    leadsAtualizados: 0,
    semMudanca: 0,
  }

  const ativoRows = await prisma.$queryRaw<{ codigo: string }[]>`
    SELECT codigo FROM lancamentos WHERE status = 'ativo' LIMIT 1
  `
  const lancamentoAtivo = ativoRows[0]?.codigo ?? null

  // 1) Histórico bruto — toda linha, sempre, em lote.
  for (const grupo of chunk(linhas, 500)) {
    const valores = Prisma.join(grupo.map(l => {
      const idLanc = extrairLancamento(l.utm_campaign)
      return Prisma.sql`(${nomeArquivo}, ${l.email}, ${l.utm_source}, ${l.utm_medium}, ${l.utm_campaign}, ${l.utm_content}, ${l.utm_term}, ${idLanc})`
    }))
    await prisma.$executeRaw`
      INSERT INTO leads_importacoes_raw (arquivo_nome, email, utm_source, utm_medium, utm_campaign, utm_content, utm_term, id_lancamento_detectado)
      VALUES ${valores}
    `
  }

  // 2) Deduplica candidatos válidos por (id_lancamento, email) — mescla UTMs dentro do próprio arquivo.
  // Quando a utm_campaign não traz um código de lançamento (ex: orgânico/YouTube), atribui ao lançamento ativo.
  const candidatos = new Map<string, LinhaLead & { id_lancamento: string }>()
  for (const l of linhas) {
    if (!l.email) { resultado.semEmail++; continue }
    let idLancamento = extrairLancamento(l.utm_campaign)
    if (!idLancamento) {
      // Só assume "orgânico do lançamento ativo" se a utm_campaign tiver algum conteúdo real
      // (ex: "youtube", "linkedin") sem o prefixo LC. Campo totalmente vazio não vira suposição.
      if (!l.utm_campaign || !lancamentoAtivo) { resultado.semLancamentoIdentificavel++; continue }
      idLancamento = lancamentoAtivo
      resultado.atribuidosAoLancamentoAtivo++
    }

    const chave = `${idLancamento}::${l.email}`
    const existente = candidatos.get(chave)
    if (!existente) {
      candidatos.set(chave, { ...l, id_lancamento: idLancamento })
    } else {
      for (const f of UTM_FIELDS) if (!existente[f] && l[f]) existente[f] = l[f]
    }
  }

  const lista = Array.from(candidatos.values())
  if (lista.length === 0) return resultado

  // 3) Busca o estado atual dos leads já existentes (pra saber o que realmente mudou).
  const existentesMap = new Map<string, Record<string, string | null>>()
  for (const grupo of chunk(lista, 500)) {
    const pares = Prisma.join(grupo.map(c => Prisma.sql`(${c.id_lancamento}, ${c.email})`))
    const rows = await prisma.$queryRaw<{ id_lancamento: string; email: string; utm_source: string | null; utm_medium: string | null; utm_campaign: string | null; utm_content: string | null; utm_term: string | null }[]>`
      SELECT id_lancamento, lower(email) AS email, utm_source, utm_medium, utm_campaign, utm_content, utm_term
      FROM leads
      WHERE (id_lancamento, lower(email)) IN (${pares})
    `
    for (const r of rows) existentesMap.set(`${r.id_lancamento}::${r.email}`, r)
  }

  // 4) Upsert em lote — nunca apaga UTM existente (COALESCE mantém o valor já salvo).
  for (const grupo of chunk(lista, 500)) {
    const valores = Prisma.join(grupo.map(c => Prisma.sql`(${c.id_lancamento}, ${c.email}, ${c.utm_source}, ${c.utm_medium}, ${c.utm_campaign}, ${c.utm_content}, ${c.utm_term})`))
    await prisma.$executeRaw`
      INSERT INTO leads (id_lancamento, email, utm_source, utm_medium, utm_campaign, utm_content, utm_term)
      VALUES ${valores}
      ON CONFLICT (id_lancamento, (lower(email))) WHERE email IS NOT NULL AND id_lancamento IS NOT NULL DO UPDATE SET
        utm_source   = COALESCE(leads.utm_source, EXCLUDED.utm_source),
        utm_medium   = COALESCE(leads.utm_medium, EXCLUDED.utm_medium),
        utm_campaign = COALESCE(leads.utm_campaign, EXCLUDED.utm_campaign),
        utm_content  = COALESCE(leads.utm_content, EXCLUDED.utm_content),
        utm_term     = COALESCE(leads.utm_term, EXCLUDED.utm_term)
    `
  }

  // 5) Contabiliza resultado comparando com o snapshot anterior.
  for (const c of lista) {
    const chave = `${c.id_lancamento}::${c.email}`
    const antes = existentesMap.get(chave)
    if (!antes) { resultado.novosLeads++; continue }
    const preencheu = UTM_FIELDS.some(f => !antes[f] && c[f])
    if (preencheu) resultado.leadsAtualizados++
    else resultado.semMudanca++
  }

  return resultado
}

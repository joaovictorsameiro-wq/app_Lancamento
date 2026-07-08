import * as XLSX from 'xlsx'
import { Prisma } from '@prisma/client'
import { prisma } from '../prisma'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Não assume nenhuma coluna específica — coleta qualquer célula que pareça um e-mail,
// em qualquer linha/coluna. Robusto a planilha com só uma coluna de e-mail, com ou sem cabeçalho.
export function parseEmails(buffer: Buffer, nomeArquivo: string): string[] {
  const isCsv = nomeArquivo.toLowerCase().endsWith('.csv')
  const wb = isCsv
    ? XLSX.read(buffer.toString('utf-8'), { type: 'string' })
    : XLSX.read(buffer, { type: 'buffer' })

  const sheet = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: null })

  const emails = new Set<string>()
  for (const row of rows) {
    for (const cell of row) {
      const s = String(cell ?? '').trim().toLowerCase()
      if (EMAIL_RE.test(s)) emails.add(s)
    }
  }
  return Array.from(emails)
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

export type ResultadoImportacaoCompradores = {
  totalEmailsNoArquivo: number
  leadsMarcadosAgora: number   // linhas de leads que viraram virou_comprador=true agora
  leadsJaMarcados: number      // linhas de leads que já estavam true
  emailsNaoEncontrados: number // e-mails do arquivo sem nenhum lead correspondente
}

export async function importarCompradoresEmail(buffer: Buffer, nomeArquivo: string): Promise<ResultadoImportacaoCompradores> {
  const emails = parseEmails(buffer, nomeArquivo)

  const resultado: ResultadoImportacaoCompradores = {
    totalEmailsNoArquivo: emails.length,
    leadsMarcadosAgora: 0,
    leadsJaMarcados: 0,
    emailsNaoEncontrados: 0,
  }
  if (emails.length === 0) return resultado

  // Histórico bruto — todo e-mail de toda importação, sempre.
  for (const grupo of chunk(emails, 1000)) {
    const valores = Prisma.join(grupo.map(e => Prisma.sql`(${nomeArquivo}, ${e})`))
    await prisma.$executeRaw`INSERT INTO compradores_importacoes_raw (arquivo_nome, email) VALUES ${valores}`
  }

  // Marca virou_comprador=true em TODAS as linhas de leads com esse e-mail (qualquer lançamento).
  // Não duplica nada — é um UPDATE, e um e-mail já marcado simplesmente não muda.
  const encontrados = new Set<string>()
  for (const grupo of chunk(emails, 1000)) {
    const lista = Prisma.join(grupo.map(e => Prisma.sql`${e}`))
    const rows = await prisma.$queryRaw<{ email: string; ja_marcado: boolean }[]>`
      WITH alvo AS (
        SELECT id, lower(email) AS email, virou_comprador AS ja_marcado
        FROM leads WHERE lower(email) IN (${lista})
      )
      UPDATE leads SET virou_comprador = true
      FROM alvo WHERE leads.id = alvo.id
      RETURNING alvo.email, alvo.ja_marcado
    `
    for (const r of rows) {
      encontrados.add(r.email)
      if (r.ja_marcado) resultado.leadsJaMarcados++
      else resultado.leadsMarcadosAgora++
    }
  }

  resultado.emailsNaoEncontrados = emails.filter(e => !encontrados.has(e)).length
  return resultado
}

import { NextRequest, NextResponse } from 'next/server'
import { importarLeads } from '../../../../lib/db/leads-import'
import { prisma } from '../../../../lib/prisma'

export async function GET() {
  try {
    const historico = await prisma.$queryRaw<{ arquivo_nome: string; importado_em: string; linhas: number }[]>`
      SELECT arquivo_nome, MIN(importado_em) AS importado_em, COUNT(*)::int AS linhas
      FROM leads_importacoes_raw
      GROUP BY arquivo_nome, date_trunc('minute', importado_em)
      ORDER BY importado_em DESC
      LIMIT 20
    `
    return NextResponse.json(historico)
  } catch (err) {
    console.error('[GET /api/leads/importar]', err)
    return NextResponse.json({ error: 'Erro ao buscar histórico' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const file = form.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    const resultado = await importarLeads(buffer, file.name)
    return NextResponse.json(resultado)
  } catch (err) {
    console.error('[POST /api/leads/importar]', err)
    const msg = err instanceof Error ? err.message : 'Erro ao importar leads'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

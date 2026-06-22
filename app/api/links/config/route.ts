import { NextRequest, NextResponse } from 'next/server'
import { getLinksConfig, upsertLinksConfig } from '../../../../lib/db/links'

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('lancamento')
  if (!id) return NextResponse.json({ error: 'lancamento obrigatório' }, { status: 400 })
  const config = await getLinksConfig(id)
  return NextResponse.json(config ?? {})
}

export async function PUT(req: NextRequest) {
  const body = await req.json()
  const config = await upsertLinksConfig(body.id_lancamento, {
    url_base_inscricao: body.url_base_inscricao ?? null,
    url_base_vendas: body.url_base_vendas ?? null,
    utm_id: body.utm_id ?? null,
  })
  return NextResponse.json(config)
}

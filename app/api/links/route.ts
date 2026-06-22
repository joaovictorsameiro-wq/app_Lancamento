import { NextRequest, NextResponse } from 'next/server'
import { getLinks, upsertLink, seedLinksLancamento } from '../../../lib/db/links'

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('lancamento')
  if (!id) return NextResponse.json({ error: 'lancamento obrigatório' }, { status: 400 })
  await seedLinksLancamento(id)
  const links = await getLinks(id)
  return NextResponse.json(links)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const link = await upsertLink(body)
  return NextResponse.json(link)
}

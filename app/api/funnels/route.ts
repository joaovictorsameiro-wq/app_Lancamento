import { NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const lancamento = searchParams.get('lancamento')

    let rows
    if (lancamento) {
      rows = await prisma.$queryRaw<unknown[]>`
        SELECT id, lancamento, nome, status, nodes, edges, created_at, updated_at
        FROM funnels WHERE lancamento = ${lancamento}
        ORDER BY updated_at DESC
      `
    } else {
      rows = await prisma.$queryRaw<unknown[]>`
        SELECT id, lancamento, nome, status, nodes, edges, created_at, updated_at
        FROM funnels ORDER BY updated_at DESC
      `
    }
    return NextResponse.json(rows)
  } catch (err) {
    console.error('[GET /api/funnels]', err)
    return NextResponse.json({ error: 'Erro ao buscar funis' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { nome, lancamento, nodes = [], edges = [] } = body
    if (!nome) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 })

    const rows = await prisma.$queryRaw<{ id: string }[]>`
      INSERT INTO funnels (nome, lancamento, nodes, edges)
      VALUES (${nome}, ${lancamento ?? null}, ${JSON.stringify(nodes)}::jsonb, ${JSON.stringify(edges)}::jsonb)
      RETURNING id
    `
    return NextResponse.json({ id: rows[0].id })
  } catch (err) {
    console.error('[POST /api/funnels]', err)
    return NextResponse.json({ error: 'Erro ao criar funil' }, { status: 500 })
  }
}

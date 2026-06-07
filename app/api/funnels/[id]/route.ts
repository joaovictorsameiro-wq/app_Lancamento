import { NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const { nome, status, nodes, edges } = body

    await prisma.$executeRaw`
      UPDATE funnels SET
        nome       = COALESCE(${nome ?? null}, nome),
        status     = COALESCE(${status ?? null}, status),
        nodes      = COALESCE(${nodes != null ? JSON.stringify(nodes) : null}::jsonb, nodes),
        edges      = COALESCE(${edges != null ? JSON.stringify(edges) : null}::jsonb, edges),
        updated_at = NOW()
      WHERE id = ${id}
    `
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[PUT /api/funnels/:id]', err)
    return NextResponse.json({ error: 'Erro ao atualizar funil' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await prisma.$executeRaw`DELETE FROM funnels WHERE id = ${id}`
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[DELETE /api/funnels/:id]', err)
    return NextResponse.json({ error: 'Erro ao deletar funil' }, { status: 500 })
  }
}

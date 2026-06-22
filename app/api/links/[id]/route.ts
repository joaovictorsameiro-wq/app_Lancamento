import { NextRequest, NextResponse } from 'next/server'
import { upsertLink } from '../../../../lib/db/links'
import { prisma } from '../../../../lib/prisma'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const link = await upsertLink({ id, ...body })
  return NextResponse.json(link)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.lancamento_link.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}

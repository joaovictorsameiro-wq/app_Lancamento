import { NextRequest, NextResponse } from 'next/server'
import { atualizarAutomacao, deletarAutomacao } from '../../../../lib/db/automacoes'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const automacao = await atualizarAutomacao(id, body)
  return NextResponse.json(automacao)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await deletarAutomacao(id)
  return NextResponse.json({ ok: true })
}

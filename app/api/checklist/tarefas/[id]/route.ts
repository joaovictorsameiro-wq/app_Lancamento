import { NextRequest, NextResponse } from 'next/server'
import { atualizarTarefa, deletarTarefa } from '../../../../../lib/db/checklist'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const tarefa = await atualizarTarefa(id, body)
    return NextResponse.json(tarefa)
  } catch (err) {
    console.error('[PUT /api/checklist/tarefas/[id]]', err)
    return NextResponse.json({ error: 'Erro ao atualizar tarefa' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await deletarTarefa(id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[DELETE /api/checklist/tarefas/[id]]', err)
    return NextResponse.json({ error: 'Erro ao deletar tarefa' }, { status: 500 })
  }
}

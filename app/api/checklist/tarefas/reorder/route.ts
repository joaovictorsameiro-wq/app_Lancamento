import { NextRequest, NextResponse } from 'next/server'
import { reordenarTarefas } from '../../../../../lib/db/checklist'

export async function PUT(req: NextRequest) {
  try {
    const { items } = await req.json()
    await reordenarTarefas(items)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[PUT /api/checklist/tarefas/reorder]', err)
    return NextResponse.json({ error: 'Erro ao reordenar tarefas' }, { status: 500 })
  }
}

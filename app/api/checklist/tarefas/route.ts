import { NextRequest, NextResponse } from 'next/server'
import { getTarefasLancamento, criarTarefa } from '../../../../lib/db/checklist'

export async function GET(req: NextRequest) {
  const idLancamento = req.nextUrl.searchParams.get('lancamento')
  if (!idLancamento) return NextResponse.json({ error: 'lancamento obrigatório' }, { status: 400 })
  try {
    const data = await getTarefasLancamento(idLancamento)
    return NextResponse.json(data)
  } catch (err) {
    console.error('[GET /api/checklist/tarefas]', err)
    return NextResponse.json({ error: 'Erro ao buscar tarefas' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const tarefa = await criarTarefa(body)
    return NextResponse.json(tarefa, { status: 201 })
  } catch (err) {
    console.error('[POST /api/checklist/tarefas]', err)
    return NextResponse.json({ error: 'Erro ao criar tarefa' }, { status: 500 })
  }
}

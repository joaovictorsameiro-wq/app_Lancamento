import { NextRequest, NextResponse } from 'next/server'
import { getPublicosResumo, getPublicosEvolucao } from '../../../lib/db/publicos'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  const view = searchParams.get('view') ?? 'resumo'

  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })

  try {
    const data = view === 'evolucao' ? await getPublicosEvolucao(id) : await getPublicosResumo(id)
    return NextResponse.json(data)
  } catch (err) {
    console.error('[GET /api/publicos]', err)
    return NextResponse.json({ error: 'Erro ao buscar públicos' }, { status: 500 })
  }
}

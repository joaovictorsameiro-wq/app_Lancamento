import { NextRequest, NextResponse } from 'next/server'
import {
  getStatusPagamento,
  getRecuperacaoPipeline,
} from '../../../lib/db/compradores'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  const view = searchParams.get('view') ?? 'status'

  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })

  try {
    const data = view === 'recuperacao'
      ? await getRecuperacaoPipeline(id)
      : await getStatusPagamento(id)
    return NextResponse.json(data)
  } catch (err) {
    console.error('[GET /api/compradores]', err)
    return NextResponse.json({ error: 'Erro ao buscar compradores' }, { status: 500 })
  }
}

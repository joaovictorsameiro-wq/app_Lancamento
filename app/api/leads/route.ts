import { NextRequest, NextResponse } from 'next/server'
import { getLeadsUtmAnalysis, getLeadsTimeline } from '../../../lib/db/leads'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  const view = searchParams.get('view') ?? 'utm'

  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })

  try {
    const data = view === 'timeline'
      ? await getLeadsTimeline(id)
      : await getLeadsUtmAnalysis(id)
    return NextResponse.json(data)
  } catch (err) {
    console.error('[GET /api/leads]', err)
    return NextResponse.json({ error: 'Erro ao buscar leads' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import {
  getLeadsUtmAnalysis,
  getLeadsUtmCampanha,
  getLeadsUtmConjunto,
  getLeadsUtmAnuncio,
  getLeadsTimeline,
} from '../../../lib/db/leads'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  const view = searchParams.get('view') ?? 'utm'

  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })

  try {
    let data
    if (view === 'timeline')       data = await getLeadsTimeline(id)
    else if (view === 'campanha')  data = await getLeadsUtmCampanha(id)
    else if (view === 'conjunto')  data = await getLeadsUtmConjunto(id)
    else if (view === 'anuncio')   data = await getLeadsUtmAnuncio(id)
    else                           data = await getLeadsUtmAnalysis(id)

    return NextResponse.json(data)
  } catch (err) {
    console.error('[GET /api/leads]', err)
    return NextResponse.json({ error: 'Erro ao buscar leads' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import {
  getTrafegoByLancamento,
  getTrafegoAgregado,
  getTrafegoAnuncios,
  getTrafegoDiario,
  getTrafegoBreakdown,
  getTrafegoCampanhas,
} from '../../../lib/db/trafego'
import { getQualificacaoPorTipo } from '../../../lib/db/avatar'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  const view = searchParams.get('view') ?? 'diario'

  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })

  try {
    let data
    if (view === 'qualificacao') data = await getQualificacaoPorTipo(id)
    else if (view === 'breakdown') data = await getTrafegoBreakdown(id)
    else if (view === 'campanhas') data = await getTrafegoCampanhas(id)
    else if (view === 'agregado') data = await getTrafegoAgregado(id)
    else if (view === 'anuncios') data = await getTrafegoAnuncios(id)
    else if (view === 'diario') data = await getTrafegoDiario(id)
    else data = await getTrafegoByLancamento(id)

    return NextResponse.json(data)
  } catch (err) {
    console.error('[GET /api/trafego]', err)
    return NextResponse.json({ error: 'Erro ao buscar dados de tráfego' }, { status: 500 })
  }
}

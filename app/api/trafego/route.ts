import { NextRequest, NextResponse } from 'next/server'
import {
  getTrafegoByLancamento,
  getTrafegoAgregado,
  getTrafegoAnuncios,
  getTrafegoDiario,
} from '../../../lib/db/trafego'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  const view = searchParams.get('view') ?? 'diario'

  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })

  try {
    let data
    if (view === 'agregado') data = await getTrafegoAgregado(id)
    else if (view === 'anuncios') data = await getTrafegoAnuncios(id)
    else if (view === 'diario') data = await getTrafegoDiario(id)
    else data = await getTrafegoByLancamento(id)

    return NextResponse.json(data)
  } catch (err) {
    console.error('[GET /api/trafego]', err)
    return NextResponse.json({ error: 'Erro ao buscar dados de tráfego' }, { status: 500 })
  }
}

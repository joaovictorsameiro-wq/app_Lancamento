import { NextRequest, NextResponse } from 'next/server'
import { getAvatarDemografia, getAvatarConversaoCruzada } from '../../../lib/db/avatar'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  const view = searchParams.get('view') ?? 'demografia'

  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })

  try {
    const data = view === 'conversao'
      ? await getAvatarConversaoCruzada(id)
      : await getAvatarDemografia(id)
    return NextResponse.json(data)
  } catch (err) {
    console.error('[GET /api/avatar]', err)
    return NextResponse.json({ error: 'Erro ao buscar dados de avatar' }, { status: 500 })
  }
}

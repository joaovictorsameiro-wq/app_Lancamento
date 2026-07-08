import { NextRequest, NextResponse } from 'next/server'
import { getAvatarDemografia, getAvatarConversaoCruzada, getAvatarCompradores, type AvatarDimensao } from '../../../lib/db/avatar'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id        = searchParams.get('id')
  const view      = searchParams.get('view') ?? 'demografia'
  const dimensao  = (searchParams.get('dimensao') ?? 'formacao') as AvatarDimensao

  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })

  try {
    let data
    if (view === 'conversao') data = await getAvatarConversaoCruzada(id, dimensao)
    else if (view === 'compradores') data = await getAvatarCompradores(id)
    else data = await getAvatarDemografia(id)
    return NextResponse.json(data)
  } catch (err) {
    console.error('[GET /api/avatar]', err)
    return NextResponse.json({ error: 'Erro ao buscar dados de avatar' }, { status: 500 })
  }
}

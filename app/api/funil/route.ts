import { NextRequest, NextResponse } from 'next/server'
import { getFunilLancamento } from '../../../lib/db/lancamentos'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id') ?? undefined

  try {
    const data = await getFunilLancamento(id)
    return NextResponse.json(data)
  } catch (err) {
    console.error('[GET /api/funil]', err)
    return NextResponse.json({ error: 'Erro ao buscar funil' }, { status: 500 })
  }
}

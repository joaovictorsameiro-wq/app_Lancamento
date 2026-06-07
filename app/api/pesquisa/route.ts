import { NextResponse } from 'next/server'
import { getPesquisaResumo } from '../../../lib/db/pesquisa'

export async function GET() {
  try {
    const data = await getPesquisaResumo()
    return NextResponse.json(data)
  } catch (err) {
    console.error('[pesquisa]', err)
    return NextResponse.json({ error: 'Erro ao buscar pesquisa' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { listarPlanilhas, salvarPlanilha } from '../../../lib/db/planilhas'

export async function GET() {
  try {
    const data = await listarPlanilhas()
    return NextResponse.json(data)
  } catch (err) {
    console.error('[GET /api/planilhas]', err)
    return NextResponse.json({ error: 'Erro ao buscar planilhas' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { idLancamento, tipo, url } = await req.json()
    if (!idLancamento || !tipo || !url) {
      return NextResponse.json({ error: 'idLancamento, tipo e url são obrigatórios' }, { status: 400 })
    }
    await salvarPlanilha(idLancamento, tipo, url)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[POST /api/planilhas]', err)
    return NextResponse.json({ error: 'Erro ao salvar planilha' }, { status: 500 })
  }
}

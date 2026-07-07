import { NextRequest, NextResponse } from 'next/server'
import { sincronizarPlanilha } from '../../../../lib/db/planilhas'

export async function POST(req: NextRequest) {
  try {
    const { idLancamento, tipo } = await req.json()
    if (!idLancamento || !tipo) {
      return NextResponse.json({ error: 'idLancamento e tipo são obrigatórios' }, { status: 400 })
    }
    const resultado = await sincronizarPlanilha(idLancamento, tipo)
    return NextResponse.json(resultado)
  } catch (err) {
    console.error('[POST /api/planilhas/sync]', err)
    const msg = err instanceof Error ? err.message : 'Erro ao sincronizar'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

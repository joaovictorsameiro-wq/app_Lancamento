import { NextRequest, NextResponse } from 'next/server'
import { atualizarDataAbertura } from '../../../../lib/db/checklist'

export async function PUT(req: NextRequest) {
  try {
    const { id_lancamento, data_abertura_carrinho } = await req.json()
    const lancamento = await atualizarDataAbertura(
      id_lancamento,
      data_abertura_carrinho ? new Date(data_abertura_carrinho) : null
    )
    return NextResponse.json(lancamento)
  } catch (err) {
    console.error('[PUT /api/checklist/lancamento]', err)
    return NextResponse.json({ error: 'Erro ao atualizar data' }, { status: 500 })
  }
}

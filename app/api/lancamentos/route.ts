import { NextRequest, NextResponse } from 'next/server'
import { getLancamentos } from '../../../lib/db/lancamentos'
import { prisma } from '../../../lib/prisma'

export async function GET() {
  try {
    const data = await getLancamentos()
    return NextResponse.json(data)
  } catch (err) {
    console.error('[GET /api/lancamentos]', err)
    return NextResponse.json({ error: 'Erro ao buscar lançamentos' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const lancamento = await prisma.lancamentos.create({
      data: {
        codigo: body.codigo,
        nome: body.nome,
        status: body.status ?? 'planejamento',
        meta_faturamento: body.meta_faturamento ?? null,
        observacoes: body.observacoes ?? null,
      },
    })
    return NextResponse.json(lancamento, { status: 201 })
  } catch (err) {
    console.error('[POST /api/lancamentos]', err)
    return NextResponse.json({ error: 'Erro ao criar lançamento' }, { status: 500 })
  }
}

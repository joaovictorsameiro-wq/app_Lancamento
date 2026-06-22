import { NextRequest, NextResponse } from 'next/server'
import { getAutomacoes, criarAutomacao } from '../../../lib/db/automacoes'

export async function GET() {
  const data = await getAutomacoes()
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const automacao = await criarAutomacao(body)
  return NextResponse.json(automacao, { status: 201 })
}

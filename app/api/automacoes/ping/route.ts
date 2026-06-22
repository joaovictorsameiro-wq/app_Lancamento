import { NextRequest, NextResponse } from 'next/server'
import { registrarPing } from '../../../../lib/db/automacoes'

// N8N chama este endpoint ao fim de cada execução
// POST /api/automacoes/ping  { "id": "automacao-id" }
export async function POST(req: NextRequest) {
  try {
    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })
    await registrarPing(id)
    return NextResponse.json({ ok: true, ping: new Date().toISOString() })
  } catch {
    return NextResponse.json({ error: 'Automação não encontrada' }, { status: 404 })
  }
}

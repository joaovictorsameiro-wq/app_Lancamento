import { NextResponse } from 'next/server'
import { getLancamentos } from '../../../lib/db/lancamentos'

export async function GET() {
  try {
    const data = await getLancamentos()
    return NextResponse.json(data)
  } catch (err) {
    console.error('[GET /api/lancamentos]', err)
    return NextResponse.json({ error: 'Erro ao buscar lançamentos' }, { status: 500 })
  }
}

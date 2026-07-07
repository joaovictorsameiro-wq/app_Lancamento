import { NextResponse } from 'next/server'
import { getPesquisaResumo } from '../../../lib/db/pesquisa'
import { getAvatarComparativoGlobal } from '../../../lib/db/avatar'

export async function GET() {
  try {
    const [data, comparativo] = await Promise.all([
      getPesquisaResumo(),
      getAvatarComparativoGlobal(),
    ])
    return NextResponse.json({ ...data, comparativoLead: comparativo })
  } catch (err) {
    console.error('[pesquisa]', err)
    return NextResponse.json({ error: 'Erro ao buscar pesquisa' }, { status: 500 })
  }
}

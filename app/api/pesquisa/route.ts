import { NextRequest, NextResponse } from 'next/server'
import { getPesquisaResumo, getLancamentosDisponiveisPesquisa } from '../../../lib/db/pesquisa'
import { getAvatarComparativoGlobal } from '../../../lib/db/avatar'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lancamento       = searchParams.get('lancamento') || undefined       // filtro pesquisa_alunos
  const lancamentoAvatar = searchParams.get('lancamentoAvatar') || undefined // filtro avatar

  try {
    const [data, comparativo, lancamentosDisponiveis] = await Promise.all([
      getPesquisaResumo(lancamento),
      getAvatarComparativoGlobal(lancamentoAvatar),
      getLancamentosDisponiveisPesquisa(),
    ])
    return NextResponse.json({ ...data, comparativoLead: comparativo, lancamentosDisponiveis })
  } catch (err) {
    console.error('[pesquisa]', err)
    return NextResponse.json({ error: 'Erro ao buscar pesquisa' }, { status: 500 })
  }
}

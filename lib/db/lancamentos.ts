import { prisma } from '../prisma'

export async function getLancamentos() {
  return prisma.lancamentos.findMany({
    orderBy: { codigo: 'desc' },
  })
}

export async function getLancamentoAtual() {
  return prisma.lancamentos.findFirst({
    where: { status: 'ativo' },
    orderBy: { codigo: 'desc' },
  })
}

export async function getFunilLancamento(idLancamento?: string) {
  const where = idLancamento ? `WHERE id_lancamento = '${idLancamento}'` : ''
  const result = await prisma.$queryRawUnsafe<FunilRow[]>(
    `SELECT * FROM funil_lancamento ${where} ORDER BY id_lancamento DESC`
  )
  return result
}

export type FunilRow = {
  id_lancamento: string
  investimento_total: number
  total_leads: number
  cpl: number
  respostas_avatar: number
  total_vendas: number
  faturamento_bruto: number
  taxa_conversao_pct: number
  roi: number
}

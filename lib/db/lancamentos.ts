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
  if (idLancamento) {
    return prisma.$queryRaw<FunilRow[]>`
      SELECT * FROM funil_lancamento
      WHERE id_lancamento = ${idLancamento}
      ORDER BY id_lancamento DESC
    `
  }
  return prisma.$queryRaw<FunilRow[]>`
    SELECT * FROM funil_lancamento ORDER BY id_lancamento DESC
  `
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

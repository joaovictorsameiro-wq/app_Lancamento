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
  // A view usa coluna "lancamento" (não "id_lancamento")
  if (idLancamento) {
    return prisma.$queryRaw<FunilRow[]>`
      SELECT * FROM funil_lancamento
      WHERE lancamento = ${idLancamento}
      ORDER BY lancamento DESC
    `
  }
  return prisma.$queryRaw<FunilRow[]>`
    SELECT * FROM funil_lancamento ORDER BY lancamento DESC
  `
}

export type FunilRow = {
  lancamento: string        // nome real na view
  nome_lancamento: string
  status: string
  investimento_total: number
  impressoes_total: number
  cliques_total: number
  total_leads: number
  cpl: number
  gasto_captacao: number
  respostas_avatar: number
  total_vendas: number
  faturamento_bruto: number
  faturamento_liquido: number
  taxa_conversao_pct: number
  roi: number
  // Order bumps separados
  vendas_order_bump: number
  fat_order_bump: number
}

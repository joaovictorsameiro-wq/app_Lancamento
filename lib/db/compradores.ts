import { prisma } from '../prisma'

export async function getCompradoresByLancamento(idLancamento: string) {
  return prisma.compradores.findMany({
    where: { id_lancamento: idLancamento },
    orderBy: { data_compra: 'desc' },
  })
}

export async function getStatusPagamento(idLancamento: string) {
  const result = await prisma.$queryRaw<StatusCount[]>`
    SELECT
      COALESCE(status_pagamento, 'desconhecido') AS status,
      metodo_pagamento,
      COUNT(*)::int AS quantidade,
      SUM(valor_bruto)::float AS valor_bruto_total,
      SUM(valor_liquido)::float AS valor_liquido_total
    FROM compradores
    WHERE id_lancamento = ${idLancamento}
    GROUP BY status_pagamento, metodo_pagamento
    ORDER BY quantidade DESC
  `
  return result
}

export async function getRecuperacaoPipeline(idLancamento: string) {
  const result = await prisma.$queryRaw<RecuperacaoRow[]>`
    SELECT
      email,
      nome,
      valor_bruto,
      metodo_pagamento,
      status_pagamento,
      data_compra
    FROM compradores
    WHERE id_lancamento = ${idLancamento}
      AND status_pagamento IN ('pendente', 'cancelado', 'atrasado', 'chargeback')
    ORDER BY data_compra DESC
  `
  return result
}

export async function getFaturamentoBruto(idLancamento: string) {
  const result = await prisma.$queryRaw<{ total: number }[]>`
    SELECT SUM(valor_bruto)::float AS total
    FROM compradores
    WHERE id_lancamento = ${idLancamento}
      AND status_pagamento = 'aprovado'
  `
  return result[0]?.total ?? 0
}

export type StatusCount = {
  status: string
  metodo_pagamento: string
  quantidade: number
  valor_bruto_total: number
  valor_liquido_total: number
}

export type RecuperacaoRow = {
  email: string
  nome: string
  valor_bruto: number
  metodo_pagamento: string
  status_pagamento: string
  data_compra: string
}

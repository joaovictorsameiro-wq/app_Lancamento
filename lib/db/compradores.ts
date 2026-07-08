import { Prisma } from '@prisma/client'
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

// Origem dos compradores: cruza compradores x leads (por e-mail + lançamento) porque a Hotmart
// costuma apagar a UTM da própria compra depois — leads guarda a UTM original de captação.
export type OrigemRow = {
  valor: string
  compradores: number
  faturamento: number
}

async function origemPorCampo(idLancamento: string, campo: 'utm_content' | 'utm_campaign' | 'utm_source'): Promise<OrigemRow[]> {
  const coluna = Prisma.raw(campo)
  return prisma.$queryRaw<OrigemRow[]>`
    SELECT
      COALESCE(NULLIF(c.${coluna}, ''), NULLIF(l.${coluna}, ''), 'Não identificado') AS valor,
      COUNT(*)::int AS compradores,
      SUM(c.valor_liquido)::float AS faturamento
    FROM compradores c
    LEFT JOIN leads l ON lower(l.email) = lower(c.email) AND l.id_lancamento = c.id_lancamento
    WHERE c.id_lancamento = ${idLancamento}
      AND c.status_pagamento = 'aprovado'
      AND c.tipo_venda = 'principal'
    GROUP BY valor
    ORDER BY compradores DESC
  `
}

export async function getOrigemCompradores(idLancamento: string) {
  const [porAnuncio, porCampanha, porPlataforma] = await Promise.all([
    origemPorCampo(idLancamento, 'utm_content'),
    origemPorCampo(idLancamento, 'utm_campaign'),
    origemPorCampo(idLancamento, 'utm_source'),
  ])
  return { porAnuncio, porCampanha, porPlataforma }
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

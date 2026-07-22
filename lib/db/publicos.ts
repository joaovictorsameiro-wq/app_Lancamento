import { prisma } from '../prisma'

// Snapshot mais recente de cada público, com o valor do dia anterior pra calcular variação.
export async function getPublicosResumo(idLancamento: string) {
  return prisma.$queryRaw<PublicoResumoRow[]>`
    WITH ranked AS (
      SELECT *, ROW_NUMBER() OVER (PARTITION BY publico_nome ORDER BY data DESC) AS rn
      FROM publicos_meta
      WHERE id_lancamento = ${idLancamento}
    )
    SELECT
      a.publico_nome,
      a.data::date AS data_atual,
      a.tamanho_min AS atual,
      a.semelhante,
      b.tamanho_min AS anterior
    FROM ranked a
    LEFT JOIN ranked b ON b.publico_nome = a.publico_nome AND b.rn = 2
    WHERE a.rn = 1
    ORDER BY a.publico_nome ASC
  `
}

// Série diária de cada público, pra plotar evolução no tempo.
export async function getPublicosEvolucao(idLancamento: string) {
  return prisma.$queryRaw<PublicoEvolucaoRow[]>`
    SELECT
      data::date AS dia,
      publico_nome,
      tamanho_min,
      semelhante
    FROM publicos_meta
    WHERE id_lancamento = ${idLancamento}
    ORDER BY data ASC
  `
}

export type PublicoResumoRow = {
  publico_nome: string
  data_atual: string
  atual: number | null
  semelhante: boolean
  anterior: number | null
}

export type PublicoEvolucaoRow = {
  dia: string
  publico_nome: string
  tamanho_min: number | null
  semelhante: boolean
}

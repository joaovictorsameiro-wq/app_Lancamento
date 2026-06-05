import { prisma } from '../prisma'

export async function getTrafegoByLancamento(idLancamento: string) {
  return prisma.trafego_meta.findMany({
    where: { id_lancamento: idLancamento },
    orderBy: { data: 'asc' },
  })
}

export async function getTrafegoAgregado(idLancamento: string) {
  const result = await prisma.$queryRaw<TrafegoAgregado[]>`
    SELECT
      campanha,
      SUM(total_gasto)::float AS total_gasto,
      SUM(impressoes)::int AS impressoes,
      SUM(cliques_no_link)::int AS cliques,
      SUM(leads)::int AS leads,
      AVG(cpc)::float AS cpc_medio,
      AVG(cpm)::float AS cpm_medio,
      AVG(ctr)::float AS ctr_medio,
      CASE WHEN SUM(leads) > 0 THEN SUM(total_gasto) / SUM(leads) ELSE NULL END AS cpl
    FROM trafego_meta
    WHERE id_lancamento = ${idLancamento}
    GROUP BY campanha
    ORDER BY total_gasto DESC
  `
  return result
}

export async function getTrafegoAnuncios(idLancamento: string) {
  const result = await prisma.$queryRaw<AnuncioScore[]>`
    SELECT
      anuncio,
      conjunto_anuncio,
      campanha,
      SUM(total_gasto)::float AS total_gasto,
      SUM(impressoes)::int AS impressoes,
      SUM(cliques_no_link)::int AS cliques,
      SUM(leads)::int AS leads,
      AVG(ctr)::float AS ctr_medio,
      AVG(cpc)::float AS cpc_medio,
      CASE WHEN SUM(leads) > 0 THEN SUM(total_gasto) / SUM(leads) ELSE NULL END AS cpl
    FROM trafego_meta
    WHERE id_lancamento = ${idLancamento}
    GROUP BY anuncio, conjunto_anuncio, campanha
    ORDER BY leads DESC NULLS LAST
    LIMIT 20
  `
  return result
}

export async function getTrafegoDiario(idLancamento: string) {
  const result = await prisma.$queryRaw<TrafegoDiario[]>`
    SELECT
      data::date AS dia,
      SUM(total_gasto)::float AS gasto,
      SUM(leads)::int AS leads,
      CASE WHEN SUM(leads) > 0 THEN SUM(total_gasto) / SUM(leads) ELSE NULL END AS cpl
    FROM trafego_meta
    WHERE id_lancamento = ${idLancamento}
    GROUP BY dia
    ORDER BY dia ASC
  `
  return result
}

export type TrafegoAgregado = {
  campanha: string
  total_gasto: number
  impressoes: number
  cliques: number
  leads: number
  cpc_medio: number
  cpm_medio: number
  ctr_medio: number
  cpl: number
}

export type AnuncioScore = {
  anuncio: string
  conjunto_anuncio: string
  campanha: string
  total_gasto: number
  impressoes: number
  cliques: number
  leads: number
  ctr_medio: number
  cpc_medio: number
  cpl: number
}

export type TrafegoDiario = {
  dia: string
  gasto: number
  leads: number
  cpl: number
}

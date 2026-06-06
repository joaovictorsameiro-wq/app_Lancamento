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
  `
  return result
}

export async function getTrafegoDiario(idLancamento: string) {
  const result = await prisma.$queryRaw<TrafegoDiario[]>`
    SELECT
      data::date AS dia,
      SUM(total_gasto)::float AS gasto,
      -- gasto apenas de campanhas de captação (por nome), usado pro CPL real
      SUM(CASE WHEN campanha ILIKE '%LEAD%' OR campanha ILIKE '%Captacao%' THEN total_gasto ELSE 0 END)::float AS gasto_captacao,
      SUM(CASE WHEN campanha ILIKE '%LEAD%' OR campanha ILIKE '%Captacao%' THEN leads ELSE 0 END)::int AS leads,
      CASE WHEN SUM(CASE WHEN campanha ILIKE '%LEAD%' OR campanha ILIKE '%Captacao%' THEN leads ELSE 0 END) > 0
        THEN SUM(CASE WHEN campanha ILIKE '%LEAD%' OR campanha ILIKE '%Captacao%' THEN total_gasto ELSE 0 END)
           / SUM(CASE WHEN campanha ILIKE '%LEAD%' OR campanha ILIKE '%Captacao%' THEN leads ELSE 0 END)
        ELSE NULL
      END::float AS cpl
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
  gasto_captacao: number
  leads: number
  cpl: number
}

// Classificação de campanha por nome
// Retorna breakdown por tipo: captacao_pq, captacao_pf, aquecimento, distribuicao, lembrete, venda, outros
export async function getTrafegoBreakdown(idLancamento: string) {
  return prisma.$queryRaw<TrafegoBreakdown[]>`
    SELECT
      CASE
        WHEN campanha ILIKE '%LEAD%' AND (campanha ILIKE '%_PQ_%' OR campanha ILIKE '%PQ_%') THEN 'captacao_pq'
        WHEN campanha ILIKE '%LEAD%' AND (campanha ILIKE '%_PF_%' OR campanha ILIKE '%PF_%') THEN 'captacao_pf'
        WHEN campanha ILIKE '%LEAD%' OR campanha ILIKE '%Captacao%' THEN 'captacao'
        WHEN campanha ILIKE '%Aquecimento%' THEN 'aquecimento'
        WHEN campanha ILIKE '%Distribuicao%' OR campanha ILIKE '%Turbinado%' THEN 'distribuicao'
        WHEN campanha ILIKE '%Lembrete%' THEN 'lembrete'
        WHEN campanha ILIKE '%Remarketing%' THEN 'remarketing'
        WHEN campanha ILIKE '%Carrinho%' OR campanha ILIKE '%Venda%' THEN 'venda'
        ELSE 'outros'
      END AS tipo,
      SUM(total_gasto)::float  AS gasto,
      SUM(leads)::int          AS leads,
      SUM(impressoes)::int     AS impressoes,
      SUM(cliques_no_link)::int AS cliques
    FROM trafego_meta
    WHERE id_lancamento = ${idLancamento}
    GROUP BY tipo
    ORDER BY gasto DESC
  `
}

export async function getTrafegoCampanhas(idLancamento: string) {
  return prisma.$queryRaw<TrafegoCampanha[]>`
    SELECT
      campanha,
      CASE
        WHEN campanha ILIKE '%LEAD%' AND (campanha ILIKE '%_PQ_%' OR campanha ILIKE '%PQ_%') THEN 'captacao_pq'
        WHEN campanha ILIKE '%LEAD%' AND (campanha ILIKE '%_PF_%' OR campanha ILIKE '%PF_%') THEN 'captacao_pf'
        WHEN campanha ILIKE '%LEAD%' OR campanha ILIKE '%Captacao%' THEN 'captacao'
        WHEN campanha ILIKE '%Aquecimento%' THEN 'aquecimento'
        WHEN campanha ILIKE '%Distribuicao%' OR campanha ILIKE '%Turbinado%' THEN 'distribuicao'
        WHEN campanha ILIKE '%Lembrete%' THEN 'lembrete'
        WHEN campanha ILIKE '%Remarketing%' THEN 'remarketing'
        WHEN campanha ILIKE '%Carrinho%' OR campanha ILIKE '%Venda%' THEN 'venda'
        ELSE 'outros'
      END AS tipo,
      SUM(total_gasto)::float   AS gasto,
      SUM(leads)::int           AS leads,
      SUM(impressoes)::int      AS impressoes,
      SUM(cliques_no_link)::int AS cliques,
      ROUND(AVG(ctr)::numeric, 2)::float AS ctr,
      ROUND(AVG(cpm)::numeric, 2)::float AS cpm,
      CASE WHEN SUM(leads) > 0 THEN ROUND((SUM(total_gasto)/SUM(leads))::numeric,2)::float ELSE NULL END AS cpl
    FROM trafego_meta
    WHERE id_lancamento = ${idLancamento}
    GROUP BY campanha
    ORDER BY gasto DESC
  `
}

export type TrafegoBreakdown = {
  tipo: string
  gasto: number
  leads: number
  impressoes: number
  cliques: number
}

export type TrafegoCampanha = {
  campanha: string
  tipo: string
  gasto: number
  leads: number
  impressoes: number
  cliques: number
  ctr: number
  cpm: number
  cpl: number | null
}

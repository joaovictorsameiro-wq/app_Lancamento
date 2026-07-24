import { Prisma } from '@prisma/client'
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

export async function getTrafegoAnuncios(idLancamento: string, dataInicio?: string, dataFim?: string) {
  const inicio = dataInicio || null // null = sem limite inferior
  const fim    = dataFim    || null // null = sem limite superior
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
      AND (${inicio}::date IS NULL OR data >= ${inicio}::date)
      AND (${fim}::date IS NULL OR data <= ${fim}::date)
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

export type CorredorPolonesCategoria = 'turbinamento' | 'distribuicao'
export type CorredorPolonesNivel = 'campanha' | 'conjunto' | 'anuncio'

function filtroCategoriaSql(categoria?: CorredorPolonesCategoria) {
  if (categoria === 'turbinamento') return Prisma.sql`AND campanha ILIKE '%Turbinamento%'`
  if (categoria === 'distribuicao') return Prisma.sql`AND campanha ILIKE '%Distribuicao%'`
  return Prisma.empty
}

function colunaNivelSql(nivel: CorredorPolonesNivel) {
  if (nivel === 'anuncio')  return Prisma.sql`anuncio`
  if (nivel === 'conjunto') return Prisma.sql`conjunto_anuncio`
  return Prisma.sql`campanha`
}

// Corredor Polonês — teste de retenção de vídeo, agrupável por campanha/conjunto/anúncio
// e filtrável por categoria (Turbinamento vs Distribuição), só linhas com dado de vídeo.
export async function getCorredorPolones(
  idLancamento: string,
  dataInicio?: string,
  dataFim?: string,
  categoria?: CorredorPolonesCategoria,
  nivel: CorredorPolonesNivel = 'campanha',
) {
  const inicio = dataInicio || null
  const fim    = dataFim    || null
  const coluna = colunaNivelSql(nivel)
  const filtroCategoria = filtroCategoriaSql(categoria)

  return prisma.$queryRaw<CorredorPolonesRow[]>`
    SELECT
      ${coluna} AS campanha,
      SUM(total_gasto)::float AS total_gasto,
      SUM(thruplays)::int AS thruplays,
      CASE WHEN SUM(thruplays) > 0 THEN SUM(total_gasto) / SUM(thruplays) ELSE NULL END AS custo_thruplay,
      SUM(video_plays_3s)::int AS video_plays_3s,
      SUM(video_p25)::int AS video_p25,
      SUM(video_p50)::int AS video_p50,
      SUM(video_p75)::int AS video_p75,
      SUM(video_p95)::int AS video_p95,
      SUM(video_p100)::int AS video_p100,
      SUM(video_plays)::int AS video_plays,
      CASE WHEN SUM(video_p25) > 0 THEN SUM(total_gasto) / SUM(video_p25) ELSE NULL END AS custo_vv25,
      CASE WHEN SUM(video_p50) > 0 THEN SUM(total_gasto) / SUM(video_p50) ELSE NULL END AS custo_vv50,
      CASE WHEN SUM(video_p75) > 0 THEN SUM(total_gasto) / SUM(video_p75) ELSE NULL END AS custo_vv75,
      CASE WHEN SUM(video_p95) > 0 THEN SUM(total_gasto) / SUM(video_p95) ELSE NULL END AS custo_vv95,
      CASE WHEN SUM(impressoes) > 0 THEN SUM(video_plays_3s)::float / SUM(impressoes) ELSE NULL END AS hook_rate,
      CASE WHEN SUM(video_p25) > 0 THEN SUM(video_p75)::float / SUM(video_p25) ELSE NULL END AS retencao_25_75
    FROM trafego_meta
    WHERE id_lancamento = ${idLancamento}
      AND (thruplays IS NOT NULL OR video_plays_3s IS NOT NULL)
      AND (${inicio}::date IS NULL OR data >= ${inicio}::date)
      AND (${fim}::date IS NULL OR data <= ${fim}::date)
      ${filtroCategoria}
    GROUP BY ${coluna}
    ORDER BY total_gasto DESC
  `
}

// Evolução diária do Hook Rate e Retenção 25→75%, só das 5 campanhas com mais gasto
// (evita poluir o gráfico quando há muitas campanhas de teste), filtrável por categoria.
export async function getCorredorPolonesDiario(idLancamento: string, categoria?: CorredorPolonesCategoria) {
  const filtroCategoria = filtroCategoriaSql(categoria)
  return prisma.$queryRaw<CorredorPolonesDiaRow[]>`
    WITH top_campanhas AS (
      SELECT campanha FROM trafego_meta
      WHERE id_lancamento = ${idLancamento} AND (thruplays IS NOT NULL OR video_plays_3s IS NOT NULL)
        ${filtroCategoria}
      GROUP BY campanha ORDER BY SUM(total_gasto) DESC LIMIT 5
    )
    SELECT
      data::date AS dia,
      campanha,
      CASE WHEN SUM(impressoes) > 0 THEN SUM(video_plays_3s)::float / SUM(impressoes) ELSE NULL END AS hook_rate,
      CASE WHEN SUM(video_p25) > 0 THEN SUM(video_p75)::float / SUM(video_p25) ELSE NULL END AS retencao_25_75
    FROM trafego_meta
    WHERE id_lancamento = ${idLancamento}
      AND campanha IN (SELECT campanha FROM top_campanhas)
      AND (thruplays IS NOT NULL OR video_plays_3s IS NOT NULL)
    GROUP BY dia, campanha
    ORDER BY dia ASC
  `
}

export type CorredorPolonesDiaRow = {
  dia: string
  campanha: string
  hook_rate: number | null
  retencao_25_75: number | null
}

export type CorredorPolonesRow = {
  campanha: string
  total_gasto: number
  thruplays: number
  custo_thruplay: number | null
  video_plays_3s: number
  video_p25: number
  video_p50: number
  video_p75: number
  video_p95: number
  video_p100: number
  video_plays: number
  custo_vv25: number | null
  custo_vv50: number | null
  custo_vv75: number | null
  custo_vv95: number | null
  hook_rate: number | null
  retencao_25_75: number | null
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
export async function getTrafegoBreakdown(idLancamento: string, dataInicio?: string, dataFim?: string) {
  const inicio = dataInicio || null
  const fim    = dataFim    || null
  return prisma.$queryRaw<TrafegoBreakdown[]>`
    SELECT
      CASE
        WHEN campanha ILIKE '%LEAD%' AND (campanha ILIKE '%_PQ_%' OR campanha ILIKE '%PQ_%' OR campanha ILIKE '%_PQ') THEN 'captacao_pq'
        WHEN campanha ILIKE '%LEAD%' AND (campanha ILIKE '%_PF_%' OR campanha ILIKE '%PF_%' OR campanha ILIKE '%_PF') THEN 'captacao_pf'
        WHEN campanha ILIKE '%LEAD%' OR campanha ILIKE '%Captacao%' THEN 'captacao'
        WHEN campanha ILIKE '%Aquecimento%' THEN 'aquecimento'
        WHEN campanha ILIKE '%Turbinamento%' THEN 'atracao'
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
      AND (${inicio}::date IS NULL OR data >= ${inicio}::date)
      AND (${fim}::date IS NULL OR data <= ${fim}::date)
    GROUP BY tipo
    ORDER BY gasto DESC
  `
}

export async function getTrafegoCampanhas(idLancamento: string, dataInicio?: string, dataFim?: string) {
  const inicio = dataInicio || null
  const fim    = dataFim    || null
  return prisma.$queryRaw<TrafegoCampanha[]>`
    SELECT
      campanha,
      CASE
        WHEN campanha ILIKE '%LEAD%' AND (campanha ILIKE '%_PQ_%' OR campanha ILIKE '%PQ_%' OR campanha ILIKE '%_PQ') THEN 'captacao_pq'
        WHEN campanha ILIKE '%LEAD%' AND (campanha ILIKE '%_PF_%' OR campanha ILIKE '%PF_%' OR campanha ILIKE '%_PF') THEN 'captacao_pf'
        WHEN campanha ILIKE '%LEAD%' OR campanha ILIKE '%Captacao%' THEN 'captacao'
        WHEN campanha ILIKE '%Aquecimento%' THEN 'aquecimento'
        WHEN campanha ILIKE '%Turbinamento%' THEN 'atracao'
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
      AND (${inicio}::date IS NULL OR data >= ${inicio}::date)
      AND (${fim}::date IS NULL OR data <= ${fim}::date)
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

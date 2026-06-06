import { prisma } from '../prisma'

export async function getLeadsByLancamento(idLancamento: string) {
  return prisma.leads.findMany({
    where: { id_lancamento: idLancamento },
    orderBy: { email: 'asc' },
  })
}

export async function getLeadsUtmAnalysis(idLancamento: string) {
  const result = await prisma.$queryRaw<UtmAnalysis[]>`
    SELECT
      COALESCE(utm_source, '(sem source)') AS utm_source,
      COUNT(*)::int AS total_leads,
      SUM(CASE WHEN virou_comprador THEN 1 ELSE 0 END)::int AS compradores,
      ROUND(
        SUM(CASE WHEN virou_comprador THEN 1 ELSE 0 END)::numeric /
        NULLIF(COUNT(*), 0) * 100, 2
      )::float AS taxa_conversao
    FROM leads
    WHERE id_lancamento = ${idLancamento}
    GROUP BY utm_source
    ORDER BY total_leads DESC
  `
  return result
}

export async function getLeadsUtmCampanha(idLancamento: string) {
  const result = await prisma.$queryRaw<UtmCampanha[]>`
    SELECT
      COALESCE(utm_source, '(sem source)') AS utm_source,
      COALESCE(utm_campaign, '(sem campanha)') AS utm_campaign,
      COUNT(*)::int AS total_leads,
      SUM(CASE WHEN virou_comprador THEN 1 ELSE 0 END)::int AS compradores,
      ROUND(
        SUM(CASE WHEN virou_comprador THEN 1 ELSE 0 END)::numeric /
        NULLIF(COUNT(*), 0) * 100, 2
      )::float AS taxa_conversao
    FROM leads
    WHERE id_lancamento = ${idLancamento}
    GROUP BY utm_source, utm_campaign
    ORDER BY total_leads DESC
  `
  return result
}

export async function getLeadsUtmConjunto(idLancamento: string) {
  const result = await prisma.$queryRaw<UtmConjunto[]>`
    SELECT
      COALESCE(utm_source, '(sem source)') AS utm_source,
      COALESCE(utm_campaign, '(sem campanha)') AS utm_campaign,
      COALESCE(utm_medium, '(sem conjunto)') AS utm_medium,
      COUNT(*)::int AS total_leads,
      SUM(CASE WHEN virou_comprador THEN 1 ELSE 0 END)::int AS compradores,
      ROUND(
        SUM(CASE WHEN virou_comprador THEN 1 ELSE 0 END)::numeric /
        NULLIF(COUNT(*), 0) * 100, 2
      )::float AS taxa_conversao
    FROM leads
    WHERE id_lancamento = ${idLancamento}
    GROUP BY utm_source, utm_campaign, utm_medium
    ORDER BY total_leads DESC
  `
  return result
}

export async function getLeadsUtmAnuncio(idLancamento: string) {
  const result = await prisma.$queryRaw<UtmAnuncio[]>`
    SELECT
      COALESCE(utm_source, '(sem source)') AS utm_source,
      COALESCE(utm_campaign, '(sem campanha)') AS utm_campaign,
      COALESCE(utm_medium, '(sem conjunto)') AS utm_medium,
      COALESCE(utm_content, '(sem anúncio)') AS utm_content,
      COUNT(*)::int AS total_leads,
      SUM(CASE WHEN virou_comprador THEN 1 ELSE 0 END)::int AS compradores,
      ROUND(
        SUM(CASE WHEN virou_comprador THEN 1 ELSE 0 END)::numeric /
        NULLIF(COUNT(*), 0) * 100, 2
      )::float AS taxa_conversao
    FROM leads
    WHERE id_lancamento = ${idLancamento}
    GROUP BY utm_source, utm_campaign, utm_medium, utm_content
    ORDER BY total_leads DESC
  `
  return result
}

export async function getLeadsTimeline(idLancamento: string) {
  // Leads don't have a timestamp directly — join with compradores for purchase date
  // Use a count aggregation from trafego_meta's lead data as proxy
  const result = await prisma.$queryRaw<{ dia: string; leads: number }[]>`
    SELECT
      data::date AS dia,
      SUM(leads)::int AS leads
    FROM trafego_meta
    WHERE id_lancamento = ${idLancamento}
    GROUP BY dia
    ORDER BY dia ASC
  `
  return result
}

export type UtmAnalysis = {
  utm_source: string
  total_leads: number
  compradores: number
  taxa_conversao: number
}

export type UtmCampanha = {
  utm_source: string
  utm_campaign: string
  total_leads: number
  compradores: number
  taxa_conversao: number
}

export type UtmConjunto = {
  utm_source: string
  utm_campaign: string
  utm_medium: string
  total_leads: number
  compradores: number
  taxa_conversao: number
}

export type UtmAnuncio = {
  utm_source: string
  utm_campaign: string
  utm_medium: string
  utm_content: string
  total_leads: number
  compradores: number
  taxa_conversao: number
}

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

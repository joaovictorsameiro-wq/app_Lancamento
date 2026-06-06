import { prisma } from '../prisma'

export async function getLeadsByLancamento(idLancamento: string) {
  return prisma.leads.findMany({
    where: { id_lancamento: idLancamento },
    orderBy: { email: 'asc' },
  })
}

export async function getLeadsUtmAnalysis(idLancamento: string) {
  return prisma.$queryRaw<UtmAnalysis[]>`
    SELECT
      COALESCE(l.utm_source, '(sem source)') AS utm_source,
      COUNT(DISTINCT l.email)::int AS total_leads,
      COUNT(DISTINCT c.hotmart_transaction)::int AS compradores,
      ROUND(COUNT(DISTINCT c.hotmart_transaction)::numeric / NULLIF(COUNT(DISTINCT l.email),0)*100,2)::float AS taxa_conversao
    FROM leads l
    LEFT JOIN compradores c ON c.email = l.email AND c.id_lancamento = l.id_lancamento AND c.status_pagamento = 'aprovado'
    WHERE l.id_lancamento = ${idLancamento}
    GROUP BY l.utm_source
    ORDER BY total_leads DESC
  `
}

export async function getLeadsUtmCampanha(idLancamento: string) {
  return prisma.$queryRaw<UtmCampanha[]>`
    SELECT
      COALESCE(l.utm_source,   '(sem source)')   AS utm_source,
      COALESCE(l.utm_campaign, '(sem campanha)') AS utm_campaign,
      COUNT(DISTINCT l.email)::int AS total_leads,
      COUNT(DISTINCT c.hotmart_transaction)::int AS compradores,
      ROUND(COUNT(DISTINCT c.hotmart_transaction)::numeric / NULLIF(COUNT(DISTINCT l.email),0)*100,2)::float AS taxa_conversao
    FROM leads l
    LEFT JOIN compradores c ON c.email = l.email AND c.id_lancamento = l.id_lancamento AND c.status_pagamento = 'aprovado'
    WHERE l.id_lancamento = ${idLancamento}
    GROUP BY l.utm_source, l.utm_campaign
    ORDER BY total_leads DESC
  `
}

export async function getLeadsUtmConjunto(idLancamento: string) {
  return prisma.$queryRaw<UtmConjunto[]>`
    SELECT
      COALESCE(l.utm_source,   '(sem source)')   AS utm_source,
      COALESCE(l.utm_campaign, '(sem campanha)') AS utm_campaign,
      COALESCE(l.utm_medium,   '(sem conjunto)') AS utm_medium,
      COUNT(DISTINCT l.email)::int AS total_leads,
      COUNT(DISTINCT c.hotmart_transaction)::int AS compradores,
      ROUND(COUNT(DISTINCT c.hotmart_transaction)::numeric / NULLIF(COUNT(DISTINCT l.email),0)*100,2)::float AS taxa_conversao
    FROM leads l
    LEFT JOIN compradores c ON c.email = l.email AND c.id_lancamento = l.id_lancamento AND c.status_pagamento = 'aprovado'
    WHERE l.id_lancamento = ${idLancamento}
    GROUP BY l.utm_source, l.utm_campaign, l.utm_medium
    ORDER BY total_leads DESC
  `
}

export async function getLeadsUtmAnuncio(idLancamento: string) {
  return prisma.$queryRaw<UtmAnuncio[]>`
    SELECT
      COALESCE(l.utm_source,   '(sem source)')   AS utm_source,
      COALESCE(l.utm_campaign, '(sem campanha)') AS utm_campaign,
      COALESCE(l.utm_medium,   '(sem conjunto)') AS utm_medium,
      COALESCE(l.utm_content,  '(sem anúncio)')  AS utm_content,
      COUNT(DISTINCT l.email)::int AS total_leads,
      COUNT(DISTINCT c.hotmart_transaction)::int AS compradores,
      ROUND(COUNT(DISTINCT c.hotmart_transaction)::numeric / NULLIF(COUNT(DISTINCT l.email),0)*100,2)::float AS taxa_conversao
    FROM leads l
    LEFT JOIN compradores c ON c.email = l.email AND c.id_lancamento = l.id_lancamento AND c.status_pagamento = 'aprovado'
    WHERE l.id_lancamento = ${idLancamento}
    GROUP BY l.utm_source, l.utm_campaign, l.utm_medium, l.utm_content
    ORDER BY total_leads DESC
  `
}

export async function getLeadsTimeline(idLancamento: string) {
  return prisma.$queryRaw<{ dia: string; leads: number }[]>`
    SELECT
      data::date AS dia,
      SUM(leads)::int AS leads
    FROM trafego_meta
    WHERE id_lancamento = ${idLancamento}
    GROUP BY dia
    ORDER BY dia ASC
  `
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

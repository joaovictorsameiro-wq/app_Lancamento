import { NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })

  try {
    // Dados do funil principal (view já agrega tudo)
    const funilRows = await prisma.$queryRaw<Record<string, unknown>[]>`
      SELECT * FROM funil_lancamento WHERE lancamento = ${id}
    `
    const f = funilRows[0] ?? {}

    // Tráfego breakdown PQ vs PF
    const trafegoRows = await prisma.$queryRaw<Record<string, unknown>[]>`
      SELECT
        SUM(CASE WHEN campanha ILIKE '%_PQ_%' OR campanha ILIKE '%PQ_%' OR campanha ILIKE '%_PQ'
          THEN leads ELSE 0 END)::int        AS leads_pq,
        SUM(CASE WHEN campanha ILIKE '%_PF_%' OR campanha ILIKE '%PF_%' OR campanha ILIKE '%_PF'
          THEN leads ELSE 0 END)::int        AS leads_pf,
        SUM(CASE WHEN campanha ILIKE '%_PQ_%' OR campanha ILIKE '%PQ_%' OR campanha ILIKE '%_PQ'
          THEN total_gasto ELSE 0 END)::float AS gasto_pq,
        SUM(CASE WHEN campanha ILIKE '%_PF_%' OR campanha ILIKE '%PF_%' OR campanha ILIKE '%_PF'
          THEN total_gasto ELSE 0 END)::float AS gasto_pf,
        SUM(impressoes)::int                 AS impressoes,
        SUM(cliques_no_link)::int            AS cliques
      FROM trafego_meta WHERE id_lancamento = ${id}
    `
    const t = trafegoRows[0] ?? {}

    // Pesquisa alunos (global, sem filtro de lançamento)
    const pesquisaRows = await prisma.$queryRaw<{ total: number }[]>`
      SELECT COUNT(*)::int AS total FROM pesquisa_alunos
    `
    const pesqTotal = Number(pesquisaRows[0]?.total ?? 0)

    // Extrair valores — tudo via Number() para garantir tipo correto
    const inv     = Number(f.investimento_total   ?? 0)
    const gastCap = Number(f.gasto_captacao        ?? 0)
    const leads   = Number(f.total_leads           ?? 0)
    const cpl     = Number(f.cpl                   ?? 0)
    const vendas  = Number(f.total_vendas          ?? 0)
    const fatB    = Number(f.faturamento_bruto      ?? 0)
    const fatL    = Number(f.faturamento_liquido    ?? 0)
    const conv    = Number(f.taxa_conversao_pct     ?? 0)
    const roi     = Number(f.roi                   ?? 0)
    const avatar  = Number(f.respostas_avatar       ?? 0)
    const imprTot = Number(f.impressoes_total       ?? 0)
    const clkTot  = Number(f.cliques_total          ?? 0)

    const leadsPQ  = Number(t.leads_pq   ?? 0)
    const leadsPF  = Number(t.leads_pf   ?? 0)
    const gastoPQ  = Number(t.gasto_pq   ?? 0)
    const gastoPF  = Number(t.gasto_pf   ?? 0)
    const impressoes = Number(t.impressoes ?? imprTot)
    const cliques    = Number(t.cliques    ?? clkTot)

    const ticket  = vendas > 0 ? fatB / vendas : 0
    const ctr     = impressoes > 0 ? +((cliques / impressoes) * 100).toFixed(2) : 0
    const cpm     = impressoes > 0 ? +((inv / impressoes) * 1000).toFixed(2) : 0
    const cplPQ   = leadsPQ > 0 ? +(gastoPQ / leadsPQ).toFixed(2) : 0
    const cplPF   = leadsPF > 0 ? +(gastoPF / leadsPF).toFixed(2) : 0
    const roiPct  = inv > 0 ? +((fatB / inv) * 100).toFixed(1) : 0
    const roas    = inv > 0 ? +(fatB / inv).toFixed(2) : 0
    const lucro   = +(fatB - inv).toFixed(2)

    const metricas = [
      // Tráfego
      { categoria: 'Tráfego',    key: 'investimento',    label: 'Investimento Total',    valor: inv,     unidade: 'R$',      cor: '#3b82f6' },
      { categoria: 'Tráfego',    key: 'gasto_captacao',  label: 'Gasto Captação',        valor: gastCap, unidade: 'R$',      cor: '#3b82f6' },
      { categoria: 'Tráfego',    key: 'impressoes',      label: 'Impressões',             valor: impressoes, unidade: 'impr.', cor: '#3b82f6' },
      { categoria: 'Tráfego',    key: 'cliques',         label: 'Cliques no Link',       valor: cliques, unidade: 'cliques', cor: '#3b82f6' },
      { categoria: 'Tráfego',    key: 'ctr',             label: 'CTR',                   valor: ctr,     unidade: '%',       cor: '#3b82f6' },
      { categoria: 'Tráfego',    key: 'cpm',             label: 'CPM Médio',             valor: cpm,     unidade: 'R$',      cor: '#3b82f6' },
      // Captação
      { categoria: 'Captação',   key: 'leads_total',     label: 'Total de Leads',        valor: leads,   unidade: 'leads',   cor: '#8b5cf6' },
      { categoria: 'Captação',   key: 'cpl',             label: 'CPL Médio',             valor: cpl,     unidade: 'R$',      cor: '#8b5cf6' },
      { categoria: 'Captação',   key: 'leads_pq',        label: 'Leads PQ (Quente)',     valor: leadsPQ, unidade: 'leads',   cor: '#8b5cf6' },
      { categoria: 'Captação',   key: 'leads_pf',        label: 'Leads PF (Frio)',       valor: leadsPF, unidade: 'leads',   cor: '#8b5cf6' },
      { categoria: 'Captação',   key: 'cpl_pq',          label: 'CPL PQ',                valor: cplPQ,   unidade: 'R$',      cor: '#8b5cf6' },
      { categoria: 'Captação',   key: 'cpl_pf',          label: 'CPL PF',                valor: cplPF,   unidade: 'R$',      cor: '#8b5cf6' },
      // Vendas
      { categoria: 'Vendas',     key: 'total_vendas',    label: 'Total de Vendas',       valor: vendas,  unidade: 'alunos',  cor: '#10b981' },
      { categoria: 'Vendas',     key: 'taxa_conversao',  label: 'Taxa de Conversão',     valor: conv,    unidade: '%',       cor: '#10b981' },
      { categoria: 'Vendas',     key: 'ticket_medio',    label: 'Ticket Médio',          valor: ticket,  unidade: 'R$',      cor: '#10b981' },
      { categoria: 'Vendas',     key: 'fat_bruto',       label: 'Faturamento Bruto',     valor: fatB,    unidade: 'R$',      cor: '#10b981' },
      { categoria: 'Vendas',     key: 'fat_liquido',     label: 'Faturamento Líquido',   valor: fatL,    unidade: 'R$',      cor: '#10b981' },
      // Resultado
      { categoria: 'Resultado',  key: 'roi',             label: 'ROI',                   valor: roi,     unidade: 'x',       cor: '#f59e0b' },
      { categoria: 'Resultado',  key: 'roi_pct',         label: 'ROI %',                 valor: roiPct,  unidade: '%',       cor: '#f59e0b' },
      { categoria: 'Resultado',  key: 'roas',            label: 'ROAS',                  valor: roas,    unidade: 'x',       cor: '#f59e0b' },
      { categoria: 'Resultado',  key: 'lucro',           label: 'Lucro (Fat. - Inv.)',   valor: lucro,   unidade: 'R$',      cor: '#f59e0b' },
      // Engajamento
      { categoria: 'Engajamento', key: 'avatar',         label: 'Respostas de Avatar',   valor: avatar,  unidade: 'resp.',   cor: '#ec4899' },
      { categoria: 'Engajamento', key: 'pesquisa',       label: 'Pesquisa de Alunos',    valor: pesqTotal, unidade: 'resp.', cor: '#ec4899' },
    ]

    // Retorna todas, mesmo com valor 0 — deixa o usuário decidir o que quer ver
    return NextResponse.json(metricas)
  } catch (err) {
    console.error('[metricas-funil]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

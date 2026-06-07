import { NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })

  try {
    // Funil principal
    const [funil] = await prisma.$queryRaw<{
      investimento_total: number; gasto_captacao: number
      impressoes_total: number; cliques_total: number; total_leads: number; cpl: number
      respostas_avatar: number; total_vendas: number; faturamento_bruto: number
      faturamento_liquido: number; taxa_conversao_pct: number; roi: number
    }[]>`SELECT * FROM funil_lancamento WHERE lancamento = ${id}`

    // Tráfego detalhado
    const trafego = await prisma.$queryRaw<{
      leads_pq: number; leads_pf: number; gasto_pq: number; gasto_pf: number
      impressoes: number; cliques: number; gasto_total: number
    }[]>`
      SELECT
        SUM(CASE WHEN campanha ILIKE '%_PQ_%' OR campanha ILIKE '%PQ_%' OR campanha ILIKE '%_PQ' THEN leads ELSE 0 END)::int AS leads_pq,
        SUM(CASE WHEN campanha ILIKE '%_PF_%' OR campanha ILIKE '%PF_%' OR campanha ILIKE '%_PF' THEN leads ELSE 0 END)::int AS leads_pf,
        SUM(CASE WHEN campanha ILIKE '%_PQ_%' OR campanha ILIKE '%PQ_%' OR campanha ILIKE '%_PQ' THEN total_gasto ELSE 0 END)::float AS gasto_pq,
        SUM(CASE WHEN campanha ILIKE '%_PF_%' OR campanha ILIKE '%PF_%' OR campanha ILIKE '%_PF' THEN total_gasto ELSE 0 END)::float AS gasto_pf,
        SUM(impressoes)::int AS impressoes,
        SUM(cliques_no_link)::int AS cliques,
        SUM(total_gasto)::float AS gasto_total
      FROM trafego_meta WHERE id_lancamento = ${id}
    `

    // Compradores
    const compradores = await prisma.$queryRaw<{
      total: number; fat_bruto: number; fat_liquido: number; ticket_medio: number
    }[]>`
      SELECT
        COUNT(*)::int AS total,
        SUM(valor_bruto)::float AS fat_bruto,
        SUM(valor_liquido)::float AS fat_liquido,
        AVG(valor_bruto)::float AS ticket_medio
      FROM compradores WHERE id_lancamento = ${id} AND status = 'approved'
    `

    // Pesquisa avatar
    const pesquisa = await prisma.$queryRaw<{ total: number }[]>`
      SELECT COUNT(*)::int AS total FROM pesquisa_alunos
    `

    const f = funil
    const t = trafego[0] ?? {}
    const c = compradores[0] ?? {}
    const p = pesquisa[0] ?? {}

    const inv    = Number(f?.investimento_total ?? 0)
    const leads  = Number(f?.total_leads ?? 0)
    const vendas = Number(f?.total_vendas ?? 0)
    const fatB   = Number(f?.faturamento_bruto ?? 0)
    const fatL   = Number(f?.faturamento_liquido ?? 0)
    const impr   = Number(t?.impressoes ?? 0)
    const clk    = Number(t?.cliques ?? 0)
    const leadsPQ = Number(t?.leads_pq ?? 0)
    const leadsPF = Number(t?.leads_pf ?? 0)
    const gastoPQ = Number(t?.gasto_pq ?? 0)
    const gastoPF = Number(t?.gasto_pf ?? 0)

    const metricas = [
      // ─ Tráfego
      { categoria: 'Tráfego', key: 'investimento',     label: 'Investimento Total',   valor: inv,                                    unidade: 'R$',      cor: '#3b82f6' },
      { categoria: 'Tráfego', key: 'impressoes',       label: 'Impressões',           valor: impr,                                   unidade: 'impr.',   cor: '#3b82f6' },
      { categoria: 'Tráfego', key: 'cliques',          label: 'Cliques no Link',      valor: clk,                                    unidade: 'cliques', cor: '#3b82f6' },
      { categoria: 'Tráfego', key: 'ctr',              label: 'CTR',                  valor: impr > 0 ? +((clk/impr)*100).toFixed(2) : 0, unidade: '%',  cor: '#3b82f6' },
      { categoria: 'Tráfego', key: 'cpm',              label: 'CPM Médio',            valor: impr > 0 ? +((inv/impr)*1000).toFixed(2) : 0, unidade: 'R$', cor: '#3b82f6' },
      // ─ Captação
      { categoria: 'Captação', key: 'leads_total',     label: 'Total de Leads',       valor: leads,                                  unidade: 'leads',   cor: '#8b5cf6' },
      { categoria: 'Captação', key: 'cpl',             label: 'CPL (Custo por Lead)', valor: Number(f?.cpl ?? 0),                    unidade: 'R$',      cor: '#8b5cf6' },
      { categoria: 'Captação', key: 'leads_pq',        label: 'Leads PQ (Quente)',    valor: leadsPQ,                                unidade: 'leads',   cor: '#8b5cf6' },
      { categoria: 'Captação', key: 'leads_pf',        label: 'Leads PF (Frio)',      valor: leadsPF,                                unidade: 'leads',   cor: '#8b5cf6' },
      { categoria: 'Captação', key: 'cpl_pq',          label: 'CPL PQ',               valor: leadsPQ > 0 ? +(gastoPQ/leadsPQ).toFixed(2) : 0, unidade: 'R$', cor: '#8b5cf6' },
      { categoria: 'Captação', key: 'cpl_pf',          label: 'CPL PF',               valor: leadsPF > 0 ? +(gastoPF/leadsPF).toFixed(2) : 0, unidade: 'R$', cor: '#8b5cf6' },
      { categoria: 'Captação', key: 'gasto_captacao',  label: 'Gasto Captação',       valor: Number(f?.gasto_captacao ?? 0),         unidade: 'R$',      cor: '#8b5cf6' },
      // ─ Vendas
      { categoria: 'Vendas',   key: 'total_vendas',    label: 'Total de Vendas',      valor: vendas,                                 unidade: 'alunos',  cor: '#10b981' },
      { categoria: 'Vendas',   key: 'taxa_conversao',  label: 'Taxa de Conversão',    valor: Number(f?.taxa_conversao_pct ?? 0),     unidade: '%',       cor: '#10b981' },
      { categoria: 'Vendas',   key: 'ticket_medio',    label: 'Ticket Médio',         valor: vendas > 0 ? +(fatB/vendas).toFixed(2) : 0, unidade: 'R$', cor: '#10b981' },
      { categoria: 'Vendas',   key: 'fat_bruto',       label: 'Faturamento Bruto',    valor: fatB,                                   unidade: 'R$',      cor: '#10b981' },
      { categoria: 'Vendas',   key: 'fat_liquido',     label: 'Faturamento Líquido',  valor: fatL,                                   unidade: 'R$',      cor: '#10b981' },
      // ─ Rentabilidade
      { categoria: 'Resultado', key: 'roi',            label: 'ROI',                  valor: Number(f?.roi ?? 0),                    unidade: 'x',       cor: '#f59e0b' },
      { categoria: 'Resultado', key: 'roi_pct',        label: 'ROI %',                valor: inv > 0 ? +((fatB/inv)*100).toFixed(1) : 0, unidade: '%',  cor: '#f59e0b' },
      { categoria: 'Resultado', key: 'roas',           label: 'ROAS',                 valor: inv > 0 ? +(fatB/inv).toFixed(2) : 0,  unidade: 'x',       cor: '#f59e0b' },
      { categoria: 'Resultado', key: 'lucro',          label: 'Lucro (Bruto - Inv)',  valor: +(fatB - inv).toFixed(2),               unidade: 'R$',      cor: '#f59e0b' },
      // ─ Engajamento
      { categoria: 'Engajamento', key: 'avatar',       label: 'Respostas de Avatar',  valor: Number(f?.respostas_avatar ?? 0),       unidade: 'resp.',   cor: '#ec4899' },
      { categoria: 'Engajamento', key: 'pesquisa',     label: 'Pesquisa de Alunos',   valor: Number(p?.total ?? 0),                  unidade: 'resp.',   cor: '#ec4899' },
    ].filter(m => m.valor > 0)

    return NextResponse.json(metricas)
  } catch (err) {
    console.error('[metricas-funil]', err)
    return NextResponse.json({ error: 'Erro' }, { status: 500 })
  }
}

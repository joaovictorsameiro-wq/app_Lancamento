import { prisma } from '../prisma'

export async function getLinksConfig(idLancamento: string) {
  return prisma.lancamento_links_config.findUnique({ where: { id_lancamento: idLancamento } })
}

export async function upsertLinksConfig(idLancamento: string, data: {
  url_base_inscricao?: string | null
  url_base_vendas?: string | null
  utm_id?: string | null
}) {
  return prisma.lancamento_links_config.upsert({
    where: { id_lancamento: idLancamento },
    create: { id_lancamento: idLancamento, ...data },
    update: data,
  })
}

export async function getLinks(idLancamento: string) {
  return prisma.lancamento_link.findMany({
    where: { id_lancamento: idLancamento },
    orderBy: [{ categoria: 'asc' }, { ordem: 'asc' }],
  })
}

export async function upsertLink(data: {
  id?: string
  id_lancamento: string
  categoria: string
  nome: string
  url?: string | null
  data_exibicao?: Date | null
  ordem?: number
}) {
  if (data.id) {
    return prisma.lancamento_link.update({
      where: { id: data.id },
      data: { url: data.url, data_exibicao: data.data_exibicao, nome: data.nome },
    })
  }
  return prisma.lancamento_link.create({ data: { ...data } })
}

export async function seedLinksLancamento(idLancamento: string) {
  const existentes = await prisma.lancamento_link.count({ where: { id_lancamento: idLancamento } })
  if (existentes > 0) return

  const templates = [
    // Captação — obrigado
    { categoria: 'obrigado', nome: 'Página de Obrigado — Orgânico',  ordem: 1 },
    { categoria: 'obrigado', nome: 'Página de Obrigado — Meta',      ordem: 2 },
    { categoria: 'obrigado', nome: 'Página de Obrigado — Google',    ordem: 3 },
    { categoria: 'obrigado', nome: 'Página de Obrigado — LinkedIn',  ordem: 4 },
    // Aquecimento — 10 lives
    { categoria: 'aquecimento', nome: 'Live 01 — Como começar na perícia financeira judicial?',                        ordem: 1 },
    { categoria: 'aquecimento', nome: 'Live 02 — Quem pode atuar como perito financeiro judicial?',                   ordem: 2 },
    { categoria: 'aquecimento', nome: 'Live 03 — Motivos para ter uma segunda profissão como perito financeiro',      ordem: 3 },
    { categoria: 'aquecimento', nome: 'Live 04 — Veja qual a renda que um perito financeiro iniciante consegue ter', ordem: 4 },
    { categoria: 'aquecimento', nome: 'Live 05 — Veja como potencializar sua nomeação como perito financeiro',       ordem: 5 },
    { categoria: 'aquecimento', nome: 'Live 06 — Quais os tipos de perícias financeiras mais comuns?',               ordem: 6 },
    { categoria: 'aquecimento', nome: 'Live 07 — Como precificar corretamente sua proposta de honorários?',          ordem: 7 },
    { categoria: 'aquecimento', nome: 'Live 08 — Como elaborar um currículo atraente para obter nomeações?',         ordem: 8 },
    { categoria: 'aquecimento', nome: 'Live 09 — Como fazer parcerias com advogados e alavancar seus ganhos?',       ordem: 9 },
    { categoria: 'aquecimento', nome: 'Live 10 — Como iniciar uma perícia financeira de forma correta e segura?',    ordem: 10 },
    // CPLs YouTube
    { categoria: 'cpl_yt', nome: 'Aula 01',                      ordem: 1 },
    { categoria: 'cpl_yt', nome: 'Aula 02',                      ordem: 2 },
    { categoria: 'cpl_yt', nome: 'Aula 03',                      ordem: 3 },
    { categoria: 'cpl_yt', nome: 'Aula 04 (ao vivo — domingo)',  ordem: 4 },
    { categoria: 'cpl_yt', nome: 'Vídeo de Vendas',              ordem: 5 },
    // CPLs Blog
    { categoria: 'cpl_blog', nome: 'Página de Aulas (Blog)',     ordem: 1 },
    // Carrinho aberto
    { categoria: 'carrinho_aberto', nome: 'Página de Vendas — Normal',      ordem: 1 },
    { categoria: 'carrinho_aberto', nome: 'Checkout Hotmart',               ordem: 2 },
    { categoria: 'carrinho_aberto', nome: 'Pesquisa de Alunos (Google Forms)', ordem: 3 },
    { categoria: 'carrinho_aberto', nome: 'Página de Boas-Vindas',          ordem: 4 },
    // Carrinho fechado
    { categoria: 'carrinho_fechado', nome: 'Página de Inscrição — Espera', ordem: 1 },
    { categoria: 'carrinho_fechado', nome: 'Página de Obrigado — Espera',  ordem: 2 },
    // Extras
    { categoria: 'extras', nome: 'Pesquisa do Avatar (Google Forms)',       ordem: 1 },
    { categoria: 'extras', nome: 'Comunidade WhatsApp #01',                 ordem: 2 },
    { categoria: 'extras', nome: 'Comunidade WhatsApp #02',                 ordem: 3 },
    { categoria: 'extras', nome: 'Comunidade WhatsApp #03',                 ordem: 4 },
    { categoria: 'extras', nome: 'Grupo VIP — Pré-Inscrição (WhatsApp)',   ordem: 5 },
    { categoria: 'extras', nome: 'Carta — Efeito Tsunami',                  ordem: 6 },
  ]

  await prisma.lancamento_link.createMany({
    data: templates.map(t => ({ ...t, id_lancamento: idLancamento })),
  })
}

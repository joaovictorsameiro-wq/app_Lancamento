/**
 * Importa as tarefas da planilha "Gestão de Lançamento.xlsx" para o banco.
 * Uso: npx ts-node prisma/seed-checklist.ts <codigo_lancamento>
 *
 * Offsets são em dias relativos à data_abertura_carrinho (negativo = antes).
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

type TarefaTemplate = {
  semana: number
  ordem: number
  tarefa: string
  local?: string
  responsavel?: string
  observacoes?: string
  offset_dias: number
}

const TAREFAS: TarefaTemplate[] = [
  // ── SEMANA 1 — Preparação (captação: carrinho -35 a -29) ─────────────────
  { semana: 1, ordem: 1,  tarefa: 'Turbinar reels de atração no Instagram', local: 'Meta Business Suite', responsavel: 'João Víctor', offset_dias: -35 },
  { semana: 1, ordem: 2,  tarefa: 'Atualizar a planilha de Tags', offset_dias: -35 },
  { semana: 1, ordem: 3,  tarefa: 'Atualizar os links das páginas de inscrição e de obrigado', offset_dias: -35 },
  { semana: 1, ordem: 4,  tarefa: 'Cadastrar tags no Hotmart Send', local: 'Hotmart Send', offset_dias: -35 },
  { semana: 1, ordem: 5,  tarefa: 'Consultar mapa mental do lançamento', offset_dias: -35 },
  { semana: 1, ordem: 6,  tarefa: 'Criar pesquisa de avatar', local: 'Google Forms', observacoes: 'Capa + Publicar link público + e-book', offset_dias: -35 },
  { semana: 1, ordem: 7,  tarefa: 'Criar comunidade do evento no WhatsApp', local: 'WhatsApp', observacoes: 'Capa + Descrição com link da pesquisa + Configuração do grupo + Administradores', offset_dias: -35 },
  { semana: 1, ordem: 8,  tarefa: 'Importar comunidades no Devzap', local: 'Devzap', offset_dias: -34 },
  { semana: 1, ordem: 9,  tarefa: 'Copiar link do grupo de avisos e atualizar no mapa mental do lançamento', offset_dias: -34 },
  { semana: 1, ordem: 10, tarefa: 'Configurar página de inscrição do evento', local: 'Hotmart Page', observacoes: 'Data do evento', offset_dias: -34 },
  { semana: 1, ordem: 11, tarefa: 'Configurar páginas de obrigado', observacoes: 'Link da comunidade [grupo de avisos] no botão e redirecionamento automático', offset_dias: -34 },
  { semana: 1, ordem: 12, tarefa: 'Configurar formulários de captação', observacoes: 'Tags + link página obrigado', offset_dias: -34 },
  { semana: 1, ordem: 13, tarefa: 'Alterar a página de obrigado dos Formulários', offset_dias: -34 },
  { semana: 1, ordem: 14, tarefa: 'Configurar automação e-mail de boas-vindas + pesquisa', observacoes: 'Atualizar o [Passo 1] com a tag do evento + link no botão da pesquisa | Atualizar o [Passo 2] com link no botão da comunidade', offset_dias: -34 },
  { semana: 1, ordem: 15, tarefa: 'Configurar mensagem de boas-vindas na API WhatsApp', local: 'API WhatsApp / N8N / ManyChat', observacoes: 'Tag do evento', offset_dias: -34 },
  { semana: 1, ordem: 16, tarefa: 'Alterar tag geral do evento na integração via webhook na Hotmart', offset_dias: -32 },
  { semana: 1, ordem: 17, tarefa: 'Alterar a tag ID no nó do N8N', offset_dias: -32 },
  { semana: 1, ordem: 18, tarefa: 'Alterar o link da pesquisa e a tag do gatilho na automação do ManyChat', offset_dias: -32 },
  { semana: 1, ordem: 19, tarefa: 'Configurar automações de Evento no ManyChat [Palavra-chave]', local: 'ManyChat', observacoes: 'Atualizar com link da página de inscrição', offset_dias: -32 },
  { semana: 1, ordem: 20, tarefa: 'Subir campanhas de captação de leads — Meta', local: 'Gerenciador de Anúncios Meta', observacoes: 'Link da land page + UTMs + 21 dias', offset_dias: -32 },
  { semana: 1, ordem: 21, tarefa: 'Ajustar o limite de gastos do lançamento no gerenciador de anúncios — Meta', offset_dias: -32 },
  { semana: 1, ordem: 22, tarefa: 'Subir campanhas de aquecimento Reels — Meta', offset_dias: -32 },
  { semana: 1, ordem: 23, tarefa: 'Preparar o dashboard de captação de leads', local: 'Looker Studios', observacoes: 'Dados do gerenciador de anúncios Meta + Pesquisa de avatar', offset_dias: -32 },
  { semana: 1, ordem: 24, tarefa: 'Configurar e programar e-mail de Convite Inscrição no Evento [Leads Antigas] — Hotmart Send', local: 'Hotmart Send', observacoes: 'Disparar todas as segundas-feiras no período de captação', offset_dias: -32 },
  { semana: 1, ordem: 25, tarefa: 'Configurar e programar msg de Convite Inscrição no Evento [Leads Antigas] — DevZap', local: 'DevZap', offset_dias: -32 },

  // ── SEMANA 2 — Captação em andamento (carrinho -28 a -22) ────────────────
  { semana: 2, ordem: 1,  tarefa: 'Trocar as capas, avatares e links de inscrição do evento nas redes sociais', local: 'YT · FB · IG · LK · TK', offset_dias: -28 },
  { semana: 2, ordem: 2,  tarefa: 'Atualizar banner e link do evento no blog e no site institucional', local: 'WordPress', observacoes: 'No blog Galera da Perícia | No site da Sameiro Educacional', offset_dias: -28 },
  { semana: 2, ordem: 3,  tarefa: 'Programar postagem criativo imagem "poster" do evento no FEED [no primeiro dia]', local: 'MLabs (IG · FB · LK) · YouTube', responsavel: 'Rafaella', observacoes: 'Programar somente no primeiro dia de captação. Horário 00:01', offset_dias: -28 },
  { semana: 2, ordem: 4,  tarefa: 'Programar postagem criativo imagem "poster" do evento nos STORIES [todos os dias]', local: 'MLabs (IG · FB)', responsavel: 'Rafaella', observacoes: 'Programar para todos os dias da captação e CPLs. Horário 00:01', offset_dias: -28 },
  { semana: 2, ordem: 5,  tarefa: 'Preparar as thumbs das lives de aquecimento das semanas 1 e 2', local: 'Photoshop', responsavel: 'Rafaella', observacoes: 'Ver aba do Kit Designs', offset_dias: -28 },
  { semana: 2, ordem: 6,  tarefa: 'Preparar imagens de convite para as lives de aquecimento das semanas 1 e 2', responsavel: 'Rafaella', offset_dias: -28 },
  { semana: 2, ordem: 7,  tarefa: 'Programar as lives de aquecimento no YouTube (Semana 1) — Dia 1', local: 'StreamYard', observacoes: 'Configurar a live e atualizar link na "URLs do lançamento"', offset_dias: -26 },
  { semana: 2, ordem: 8,  tarefa: 'Programar as lives de aquecimento no YouTube (Semana 1) — Dia 2', local: 'StreamYard', offset_dias: -25 },
  { semana: 2, ordem: 9,  tarefa: 'Programar as lives de aquecimento no YouTube (Semana 1) — Dia 3', local: 'StreamYard', offset_dias: -24 },
  { semana: 2, ordem: 10, tarefa: 'Programar as lives de aquecimento no YouTube (Semana 1) — Dia 4', local: 'StreamYard', offset_dias: -23 },
  { semana: 2, ordem: 11, tarefa: 'Programar as lives de aquecimento no YouTube (Semana 1) — Dia 5', local: 'StreamYard', offset_dias: -22 },
  { semana: 2, ordem: 12, tarefa: 'Preparar as mensagens de convite das lives de aquecimento da semana 1', observacoes: 'Anexar imagens às mensagens | Consultar os links no mapa mental do lançamento', offset_dias: -26 },
  { semana: 2, ordem: 13, tarefa: 'Programar as mensagens de convite para as lives de aquecimento da semana 1', observacoes: 'Enviar para as comunidades antigas e novas | Chamada 1 às 7h / chamada 2 às 20h', offset_dias: -26 },
  { semana: 2, ordem: 14, tarefa: 'Programar postagens dos convites (feed e stories) das lives de aquecimento da semana 1', observacoes: 'Programar no feed e stories às 7h de cada dia', offset_dias: -26 },
  { semana: 2, ordem: 15, tarefa: 'Programar postagem de notificação "Hoje tem live no YouTube" — FEED e STORIES [todos os dias]', observacoes: 'Programar para todos os dias das lives de aquecimento. Horário 00:01', offset_dias: -26 },

  // ── SEMANA 3 — Lives de Aquecimento Semana 1 (carrinho -21 a -15) ────────
  { semana: 3, ordem: 1,  tarefa: 'Programar as lives de aquecimento no YouTube — Live 06', local: 'StreamYard', observacoes: 'Configurar a live e atualizar link no mapa mental do lançamento', offset_dias: -21 },
  { semana: 3, ordem: 2,  tarefa: 'Programar as lives de aquecimento no YouTube — Live 07', local: 'StreamYard', offset_dias: -20 },
  { semana: 3, ordem: 3,  tarefa: 'Programar as lives de aquecimento no YouTube — Live 08', local: 'StreamYard', offset_dias: -19 },
  { semana: 3, ordem: 4,  tarefa: 'Programar as lives de aquecimento no YouTube — Live 09', local: 'StreamYard', offset_dias: -18 },
  { semana: 3, ordem: 5,  tarefa: 'Programar as lives de aquecimento no YouTube — Live 10', local: 'StreamYard', offset_dias: -17 },
  { semana: 3, ordem: 6,  tarefa: 'Revisar a copy das mensagens de convite das lives de aquecimento da semana 2', observacoes: 'Anexar imagens + links das lives', offset_dias: -21 },
  { semana: 3, ordem: 7,  tarefa: 'Programar as mensagens de convite para as lives de aquecimento da semana 2', observacoes: 'Chamada 1 às 7h e chamada 2 às 20h de cada dia', offset_dias: -21 },
  { semana: 3, ordem: 8,  tarefa: 'Preparar imagens de convite para as lives de aquecimento da semana 2', responsavel: 'Rafaella', offset_dias: -21 },
  { semana: 3, ordem: 9,  tarefa: 'Programar postagens dos convites (feed e stories) das lives de aquecimento da semana 2', observacoes: 'Programar no feed e stories às 7h de cada dia', offset_dias: -21 },

  // ── SEMANA 4 — Lives de Aquecimento Semana 2 (carrinho -14 a -8) ─────────
  { semana: 4, ordem: 1,  tarefa: 'Criar imagens dos lembretes de aulas liberadas para o feed e stories', responsavel: 'Rafaella', offset_dias: -14 },
  { semana: 4, ordem: 2,  tarefa: 'Revisar a copy das campanhas de e-mail de notificações de aulas liberadas', offset_dias: -14 },
  { semana: 4, ordem: 3,  tarefa: '[Dia 1] — E-mail CPL1 no ar', offset_dias: -14 },
  { semana: 4, ordem: 4,  tarefa: '[Dia 2] — E-mail CPL1 no ar — Reforço', offset_dias: -14 },
  { semana: 4, ordem: 5,  tarefa: '[Dia 3] — E-mail CPL2 no ar', offset_dias: -14 },
  { semana: 4, ordem: 6,  tarefa: '[Dia 4] — E-mail CPL2 no ar — Reforço', offset_dias: -14 },
  { semana: 4, ordem: 7,  tarefa: '[Dia 5] — E-mail CPL3 no ar', offset_dias: -14 },
  { semana: 4, ordem: 8,  tarefa: '[Dia 6] — E-mail Boa e a Má Notícia (Efeito Tsunami)', offset_dias: -14 },
  { semana: 4, ordem: 9,  tarefa: '[Dia 6] — E-mail Seu Acesso Vai Ser Cancelado', offset_dias: -14 },
  { semana: 4, ordem: 10, tarefa: '[Dia 7] — E-mail Instruções para Amanhã', offset_dias: -14 },
  { semana: 4, ordem: 11, tarefa: 'Revisar a copy das notificações do WhatsApp de aulas liberadas', offset_dias: -14 },
  { semana: 4, ordem: 12, tarefa: '[Dia 1] — WhatsApp aulas liberadas — Chamada 1 (7h) e Chamada 2 (18h)', offset_dias: -14 },
  { semana: 4, ordem: 13, tarefa: '[Dia 2] — WhatsApp aulas liberadas — Chamada 1 (7h) e Chamada 2 (18h)', offset_dias: -14 },
  { semana: 4, ordem: 14, tarefa: '[Dia 3] — WhatsApp aulas liberadas — Chamada 1 (7h) e Chamada 2 (18h)', offset_dias: -14 },
  { semana: 4, ordem: 15, tarefa: '[Dia 4] — WhatsApp aulas liberadas — Chamada 1 (7h) e Chamada 2 (18h)', offset_dias: -14 },
  { semana: 4, ordem: 16, tarefa: '[Dia 5] — WhatsApp aulas liberadas — Chamada 1 (7h) e Chamada 2 (18h)', offset_dias: -14 },
  { semana: 4, ordem: 17, tarefa: '[Dia 7] — Convite aula 4 às 20h', offset_dias: -8 },
  { semana: 4, ordem: 18, tarefa: '[Dia 7] — Estou ao vivo — Aula 4', offset_dias: -8 },
  { semana: 4, ordem: 19, tarefa: 'Criar comunidade do Grupo VIP', local: 'WhatsApp', offset_dias: -14 },
  { semana: 4, ordem: 20, tarefa: 'Configurar página do Blog de Lançamento (Aulas)', offset_dias: -14 },

  // ── SEMANA 5 — CPLs / Aulas do Evento (carrinho -7 a -1) ─────────────────
  { semana: 5, ordem: 1,  tarefa: 'Programar postagens dos lembretes de aulas liberadas no feed e stories', offset_dias: -7 },
  { semana: 5, ordem: 2,  tarefa: 'Subir campanhas de lembretes de aulas liberadas — Meta', observacoes: 'Link das aulas', offset_dias: -7 },
  { semana: 5, ordem: 3,  tarefa: 'Programar notificações do WhatsApp de aulas liberadas', offset_dias: -7 },
  { semana: 5, ordem: 4,  tarefa: '[Dia 1 às 7h] — Aulas liberadas — Chamada 1', offset_dias: -7 },
  { semana: 5, ordem: 5,  tarefa: '[Dia 1 às 18h] — Aulas liberadas — Chamada 2', offset_dias: -7 },
  { semana: 5, ordem: 6,  tarefa: '[Dia 2 às 7h] — Aulas liberadas — Chamada 1', offset_dias: -6 },
  { semana: 5, ordem: 7,  tarefa: '[Dia 2 às 18h] — Aulas liberadas — Chamada 2', offset_dias: -6 },
  { semana: 5, ordem: 8,  tarefa: '[Dia 3 às 7h] — Aulas liberadas — Chamada 1', offset_dias: -5 },
  { semana: 5, ordem: 9,  tarefa: '[Dia 3 às 18h] — Aulas liberadas — Chamada 2', offset_dias: -5 },
  { semana: 5, ordem: 10, tarefa: '[Dia 4 às 7h] — Aulas liberadas — Chamada 1', offset_dias: -4 },
  { semana: 5, ordem: 11, tarefa: '[Dia 4 às 18h] — Aulas liberadas — Chamada 2', offset_dias: -4 },
  { semana: 5, ordem: 12, tarefa: '[Dia 5 às 7h] — Aulas liberadas — Chamada 1', offset_dias: -3 },
  { semana: 5, ordem: 13, tarefa: '[Dia 5 às 18h] — Aulas liberadas — Chamada 2', offset_dias: -3 },
  { semana: 5, ordem: 14, tarefa: '[Dia 6 às 7h] — E-mail Boa e a Má Notícia (Efeito Tsunami)', offset_dias: -2 },
  { semana: 5, ordem: 15, tarefa: '[Dia 6 às 15h] — E-mail Seu Acesso Vai Ser Cancelado', offset_dias: -2 },
  { semana: 5, ordem: 16, tarefa: '[Dia 7 às 7h] — E-mail Instruções para Amanhã', offset_dias: -1 },
  { semana: 5, ordem: 17, tarefa: 'Programar campanhas de e-mails de lembretes de aulas liberadas', offset_dias: -7 },
  { semana: 5, ordem: 18, tarefa: '[Dia 1 às 7h] — E-mail CPL1 no ar', offset_dias: -7 },
  { semana: 5, ordem: 19, tarefa: '[Dia 2 às 7h] — E-mail CPL1 no ar — Reforço', offset_dias: -6 },
  { semana: 5, ordem: 20, tarefa: '[Dia 3 às 7h] — E-mail CPL2 no ar', offset_dias: -5 },
  { semana: 5, ordem: 21, tarefa: '[Dia 4 às 7h] — E-mail CPL2 no ar — Reforço', offset_dias: -4 },
  { semana: 5, ordem: 22, tarefa: '[Dia 5 às 7h] — E-mail CPL3 no ar', offset_dias: -3 },
  { semana: 5, ordem: 23, tarefa: '[Dia 6 às 7h] — E-mail Boa e a Má Notícia (Efeito Tsunami) — para quem não abriu', offset_dias: -2 },

  // ── SEMANA 6 — Carrinho Aberto (carrinho 0 a +6) ─────────────────────────
  { semana: 6, ordem: 1,  tarefa: 'Fazer download de leads com UTMs antes de abrir o carrinho', offset_dias: -1 },
  { semana: 6, ordem: 2,  tarefa: 'Programar postagens dos lembretes de carrinho aberto no feed e stories', offset_dias: 0 },
  { semana: 6, ordem: 3,  tarefa: 'Subir campanhas de carrinho aberto — Meta', offset_dias: 0 },
  { semana: 6, ordem: 4,  tarefa: 'Trocar as capas, avatares e links de carrinho aberto [Dia 1] nas redes sociais', offset_dias: 0 },
  { semana: 6, ordem: 5,  tarefa: '[Dia 1 às 8h] — Inscrições Abertas — Chamada 1', offset_dias: 0 },
  { semana: 6, ordem: 6,  tarefa: '[Dia 1 às 10h] — Cuidado! Você pode perder sua vaga — Chamada 2', offset_dias: 0 },
  { semana: 6, ordem: 7,  tarefa: '[Dia 1 às 18h] — Últimas horas, as vagas estão esgotando — Chamada 3', offset_dias: 0 },
  { semana: 6, ordem: 8,  tarefa: '[VIP Dia 1 às 6h] — Inscrições Abertas — Chamada 1 (Grupo VIP)', offset_dias: 0 },
  { semana: 6, ordem: 9,  tarefa: '[VIP Dia 1 às 7h] — Inscrições Abertas — Chamada 1 (Grupo VIP)', offset_dias: 0 },
  { semana: 6, ordem: 10, tarefa: '[Dia 2 às 7h] — Estamos vivos… — Chamada 1', offset_dias: 1 },
  { semana: 6, ordem: 11, tarefa: '[Dia 2 às 18h] — Vagas disponíveis com bônus e Garantias — Chamada 2', offset_dias: 1 },
  { semana: 6, ordem: 12, tarefa: 'Trocar as capas, avatares e links de carrinho aberto [Dia 3] nas redes sociais', offset_dias: 2 },
  { semana: 6, ordem: 13, tarefa: '[Dia 3 às 7h] — Atendendo a pedidos — Chamada 1', offset_dias: 2 },
  { semana: 6, ordem: 14, tarefa: '[Dia 4 às 7h] — Encerramento das inscrições — Chamada 1', offset_dias: 3 },
  { semana: 6, ordem: 15, tarefa: 'Trocar as capas "Últimas horas" nas redes sociais [Dia 5]', offset_dias: 4 },
  { semana: 6, ordem: 16, tarefa: '[Dia 5 às 7h] — As matrículas encerram hoje — Chamada 1', offset_dias: 4 },
  { semana: 6, ordem: 17, tarefa: '[Dia 5 às 18h] — Últimas horas, as vagas vão fechar — Chamada 2', offset_dias: 4 },
  { semana: 6, ordem: 18, tarefa: '[Dia 7 às 8h] — Última chance — reabertura — Chamada 1', offset_dias: 6 },
  { semana: 6, ordem: 19, tarefa: '[Dia 7 às 18h] — Última chance — reabertura — Chamada 2', offset_dias: 6 },

  // ── SEMANA 7 — Debriefing (carrinho +7 em diante) ────────────────────────
  { semana: 7, ordem: 1,  tarefa: 'Trocar as capas para carrinho "NORMAL" nas redes sociais', offset_dias: 7 },
  { semana: 7, ordem: 2,  tarefa: 'Redirecionar os links para lista de espera', local: 'HotmartPage', offset_dias: 7 },
  { semana: 7, ordem: 3,  tarefa: 'Baixar planilha de COMPRA_APROVADA', offset_dias: 7 },
  { semana: 7, ordem: 4,  tarefa: 'Baixar planilha de Leads do lançamento', offset_dias: 7 },
  { semana: 7, ordem: 5,  tarefa: 'Atribuir tags "COMPRA-APROVADA_HOTMART" às tags "LCxx_COMPRA_APROVADA"', offset_dias: 8 },
  { semana: 7, ordem: 6,  tarefa: 'Atribuir tags "LISTA_GERAL" às tags "LCxx"', offset_dias: 8 },
  { semana: 7, ordem: 7,  tarefa: 'Análise de resultados — métricas gerais do lançamento', offset_dias: 9 },
  { semana: 7, ordem: 8,  tarefa: 'Registrar aprendizados e pontos de melhoria para o próximo lançamento', offset_dias: 10 },
]

async function main() {
  const idLancamento = process.argv[2]
  if (!idLancamento) {
    console.error('Uso: npx ts-node prisma/seed-checklist.ts <codigo_lancamento>')
    process.exit(1)
  }

  const lancamento = await prisma.lancamentos.findUnique({ where: { codigo: idLancamento } })
  if (!lancamento) {
    console.error(`Lançamento "${idLancamento}" não encontrado.`)
    process.exit(1)
  }

  console.log(`Importando ${TAREFAS.length} tarefas para "${lancamento.nome}"…`)

  // Limpar tarefas existentes (opcional — comenta se não quiser limpar)
  await prisma.checklist_tarefa.deleteMany({ where: { id_lancamento: idLancamento } })

  await prisma.checklist_tarefa.createMany({
    data: TAREFAS.map(t => ({
      id_lancamento: idLancamento,
      semana: t.semana,
      ordem: t.ordem,
      tarefa: t.tarefa,
      local: t.local ?? null,
      responsavel: t.responsavel ?? null,
      observacoes: t.observacoes ?? null,
      offset_dias: t.offset_dias,
    })),
  })

  console.log('✓ Importação concluída.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())

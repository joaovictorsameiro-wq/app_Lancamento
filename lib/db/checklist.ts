import { prisma } from '../prisma'

export type ChecklistTarefa = {
  id: string
  id_lancamento: string
  semana: number
  ordem: number
  tarefa: string
  local: string | null
  responsavel: string | null
  links: string | null
  observacoes: string | null
  offset_dias: number | null
  feito: boolean
  data_conclusao: Date | null
  criado_em: Date
  atualizado_em: Date
}

export async function getTarefasLancamento(idLancamento: string) {
  return prisma.checklist_tarefa.findMany({
    where: { id_lancamento: idLancamento },
    orderBy: [{ semana: 'asc' }, { ordem: 'asc' }],
  })
}

export async function criarTarefa(data: {
  id_lancamento: string
  semana: number
  tarefa: string
  local?: string
  responsavel?: string
  links?: string
  observacoes?: string
  offset_dias?: number
}) {
  const ultima = await prisma.checklist_tarefa.findFirst({
    where: { id_lancamento: data.id_lancamento, semana: data.semana },
    orderBy: { ordem: 'desc' },
  })
  return prisma.checklist_tarefa.create({
    data: { ...data, ordem: (ultima?.ordem ?? 0) + 1 },
  })
}

export async function atualizarTarefa(
  id: string,
  data: Partial<{
    tarefa: string
    local: string | null
    responsavel: string | null
    links: string | null
    observacoes: string | null
    offset_dias: number | null
    feito: boolean
    semana: number
    data_conclusao: Date | null
  }>
) {
  return prisma.checklist_tarefa.update({ where: { id }, data })
}

export async function deletarTarefa(id: string) {
  return prisma.checklist_tarefa.delete({ where: { id } })
}

export async function reordenarTarefas(
  items: { id: string; ordem: number }[]
) {
  await prisma.$transaction(
    items.map((item) =>
      prisma.checklist_tarefa.update({
        where: { id: item.id },
        data: { ordem: item.ordem },
      })
    )
  )
}

export async function atualizarDataAbertura(
  idLancamento: string,
  dataAbertura: Date | null
) {
  return prisma.lancamentos.update({
    where: { codigo: idLancamento },
    data: { data_abertura_carrinho: dataAbertura },
  })
}

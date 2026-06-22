import { prisma } from '../prisma'

export async function getAutomacoes() {
  return prisma.automacao.findMany({ orderBy: { nome: 'asc' } })
}

export async function criarAutomacao(data: {
  nome: string
  descricao?: string | null
  intervalo_minutos?: number
}) {
  return prisma.automacao.create({ data })
}

export async function atualizarAutomacao(id: string, data: Partial<{
  nome: string
  descricao: string | null
  intervalo_minutos: number
  ativo: boolean
}>) {
  return prisma.automacao.update({ where: { id }, data })
}

export async function deletarAutomacao(id: string) {
  return prisma.automacao.delete({ where: { id } })
}

export async function registrarPing(id: string) {
  return prisma.automacao.update({
    where: { id },
    data: { ultimo_ping: new Date() },
  })
}

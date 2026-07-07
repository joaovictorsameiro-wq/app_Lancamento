import { prisma } from '../prisma'

export async function getPesquisaResumo(lancamento?: string) {
  const filtro = lancamento || null // null = sem filtro (todos)

  const [sexo, formacao, renda, academico, excel, mat, curso, procurava, totalRow] = await Promise.all([
    // Sexo
    prisma.$queryRaw<{ sexo: string; total: number }[]>`
      SELECT sexo, COUNT(*)::int AS total
      FROM pesquisa_alunos WHERE sexo IS NOT NULL AND (${filtro}::text IS NULL OR lancamento = ${filtro})
      GROUP BY sexo ORDER BY total DESC
    `,
    // Formação normalizada
    prisma.$queryRaw<{ formacao: string; total: number }[]>`
      SELECT formacao, COUNT(*)::int AS total
      FROM pesquisa_alunos WHERE formacao IS NOT NULL AND (${filtro}::text IS NULL OR lancamento = ${filtro})
      GROUP BY formacao ORDER BY total DESC
    `,
    // Renda normalizada (ordenada por faixa)
    prisma.$queryRaw<{ renda: string; total: number }[]>`
      SELECT renda, COUNT(*)::int AS total
      FROM pesquisa_alunos WHERE renda IS NOT NULL AND (${filtro}::text IS NULL OR lancamento = ${filtro})
      GROUP BY renda
      ORDER BY CASE renda
        WHEN 'Ate R$3.000'         THEN 1
        WHEN 'R$3.001 a R$7.000'   THEN 2
        WHEN 'R$7.001 a R$10.000'  THEN 3
        WHEN 'R$10.001 a R$14.000' THEN 4
        WHEN 'Acima de R$14.000'   THEN 5
        ELSE 6
      END
    `,
    // Nível acadêmico
    prisma.$queryRaw<{ nivel_academico: string; total: number }[]>`
      SELECT nivel_academico, COUNT(*)::int AS total
      FROM pesquisa_alunos WHERE nivel_academico IS NOT NULL AND (${filtro}::text IS NULL OR lancamento = ${filtro})
      GROUP BY nivel_academico ORDER BY total DESC
    `,
    // Nível Excel
    prisma.$queryRaw<{ nivel: number; total: number }[]>`
      SELECT nivel_excel AS nivel, COUNT(*)::int AS total
      FROM pesquisa_alunos WHERE nivel_excel IS NOT NULL AND (${filtro}::text IS NULL OR lancamento = ${filtro})
      GROUP BY nivel_excel ORDER BY nivel_excel
    `,
    // Nível Mat. Financeira
    prisma.$queryRaw<{ nivel: number; total: number }[]>`
      SELECT nivel_mat_financeira AS nivel, COUNT(*)::int AS total
      FROM pesquisa_alunos WHERE nivel_mat_financeira IS NOT NULL AND (${filtro}::text IS NULL OR lancamento = ${filtro})
      GROUP BY nivel_mat_financeira ORDER BY nivel_mat_financeira
    `,
    // Já fez curso
    prisma.$queryRaw<{ fez: boolean; total: number }[]>`
      SELECT ja_fez_curso AS fez, COUNT(*)::int AS total
      FROM pesquisa_alunos WHERE ja_fez_curso IS NOT NULL AND (${filtro}::text IS NULL OR lancamento = ${filtro})
      GROUP BY ja_fez_curso ORDER BY ja_fez_curso
    `,
    // Já procurava
    prisma.$queryRaw<{ tipo: string; total: number }[]>`
      SELECT ja_procurava AS tipo, COUNT(*)::int AS total
      FROM pesquisa_alunos WHERE ja_procurava IS NOT NULL AND (${filtro}::text IS NULL OR lancamento = ${filtro})
      GROUP BY ja_procurava ORDER BY total DESC
    `,
    // Total de respostas (linhas), respeitando o filtro
    prisma.$queryRaw<{ total: number }[]>`
      SELECT COUNT(*)::int AS total
      FROM pesquisa_alunos WHERE (${filtro}::text IS NULL OR lancamento = ${filtro})
    `,
  ])

  const totalRespostas = totalRow[0]?.total ?? 0

  return { sexo, formacao, renda, academico, excel, mat, curso, procurava, totalRespostas }
}

export async function getLancamentosDisponiveisPesquisa(): Promise<string[]> {
  const rows = await prisma.$queryRaw<{ lancamento: string }[]>`
    SELECT DISTINCT lancamento FROM pesquisa_alunos WHERE lancamento IS NOT NULL ORDER BY lancamento DESC
  `
  return rows.map(r => r.lancamento)
}

export type PesquisaResumo = Awaited<ReturnType<typeof getPesquisaResumo>> & {
  comparativoLead?: {
    sexo: { sexo: string; total: number }[]
    renda: { renda: string; total: number }[]
    formacao: { formacao: string; total: number }[]
  }
  lancamentosDisponiveis?: string[]
}

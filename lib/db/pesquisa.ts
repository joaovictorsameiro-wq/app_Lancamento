import { prisma } from '../prisma'

export async function getPesquisaResumo() {
  const [sexo, formacao, renda, academico, excel, mat, curso, procurava] = await Promise.all([
    // Sexo
    prisma.$queryRaw<{ sexo: string; total: number }[]>`
      SELECT sexo, COUNT(*)::int AS total
      FROM pesquisa_alunos WHERE sexo IS NOT NULL
      GROUP BY sexo ORDER BY total DESC
    `,
    // Formação normalizada
    prisma.$queryRaw<{ formacao: string; total: number }[]>`
      SELECT formacao, COUNT(*)::int AS total
      FROM pesquisa_alunos WHERE formacao IS NOT NULL
      GROUP BY formacao ORDER BY total DESC
    `,
    // Renda normalizada (ordenada por faixa)
    prisma.$queryRaw<{ renda: string; total: number }[]>`
      SELECT renda, COUNT(*)::int AS total
      FROM pesquisa_alunos WHERE renda IS NOT NULL
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
      FROM pesquisa_alunos WHERE nivel_academico IS NOT NULL
      GROUP BY nivel_academico ORDER BY total DESC
    `,
    // Nível Excel
    prisma.$queryRaw<{ nivel: number; total: number }[]>`
      SELECT nivel_excel AS nivel, COUNT(*)::int AS total
      FROM pesquisa_alunos WHERE nivel_excel IS NOT NULL
      GROUP BY nivel_excel ORDER BY nivel_excel
    `,
    // Nível Mat. Financeira
    prisma.$queryRaw<{ nivel: number; total: number }[]>`
      SELECT nivel_mat_financeira AS nivel, COUNT(*)::int AS total
      FROM pesquisa_alunos WHERE nivel_mat_financeira IS NOT NULL
      GROUP BY nivel_mat_financeira ORDER BY nivel_mat_financeira
    `,
    // Já fez curso
    prisma.$queryRaw<{ fez: boolean; total: number }[]>`
      SELECT ja_fez_curso AS fez, COUNT(*)::int AS total
      FROM pesquisa_alunos WHERE ja_fez_curso IS NOT NULL
      GROUP BY ja_fez_curso ORDER BY ja_fez_curso
    `,
    // Já procurava
    prisma.$queryRaw<{ tipo: string; total: number }[]>`
      SELECT ja_procurava AS tipo, COUNT(*)::int AS total
      FROM pesquisa_alunos WHERE ja_procurava IS NOT NULL
      GROUP BY ja_procurava ORDER BY total DESC
    `,
  ])

  const totalRespostas = 1172

  return { sexo, formacao, renda, academico, excel, mat, curso, procurava, totalRespostas }
}

export type PesquisaResumo = Awaited<ReturnType<typeof getPesquisaResumo>> & {
  comparativoLead?: {
    sexo: { sexo: string; total: number }[]
    renda: { renda: string; total: number }[]
    formacao: { formacao: string; total: number }[]
  }
}

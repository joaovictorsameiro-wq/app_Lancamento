import { prisma } from '../prisma'

export async function getAvatarDemografia(idLancamento: string) {
  const [sexo, faixa_etaria, estado, formacao, renda] = await Promise.all([
    prisma.$queryRaw<{ sexo: string; count: number }[]>`
      SELECT COALESCE(sexo, 'N/A') AS sexo, COUNT(*)::int AS count
      FROM avatar WHERE id_lancamento = ${idLancamento}
      GROUP BY sexo ORDER BY count DESC
    `,
    prisma.$queryRaw<{ faixa: string; count: number }[]>`
      SELECT
        CASE
          WHEN idade < 25 THEN 'Até 24'
          WHEN idade BETWEEN 25 AND 34 THEN '25-34'
          WHEN idade BETWEEN 35 AND 44 THEN '35-44'
          WHEN idade BETWEEN 45 AND 54 THEN '45-54'
          ELSE '55+'
        END AS faixa,
        COUNT(*)::int AS count
      FROM avatar WHERE id_lancamento = ${idLancamento} AND idade IS NOT NULL
      GROUP BY faixa ORDER BY faixa
    `,
    prisma.$queryRaw<{ estado: string; count: number }[]>`
      SELECT COALESCE(estado, 'N/A') AS estado, COUNT(*)::int AS count
      FROM avatar WHERE id_lancamento = ${idLancamento}
      GROUP BY estado ORDER BY count DESC LIMIT 10
    `,
    prisma.$queryRaw<{ formacao: string; count: number }[]>`
      SELECT COALESCE(formacao_universitaria, 'N/A') AS formacao, COUNT(*)::int AS count
      FROM avatar WHERE id_lancamento = ${idLancamento}
      GROUP BY formacao ORDER BY count DESC LIMIT 8
    `,
    prisma.$queryRaw<{ renda: string; count: number }[]>`
      SELECT COALESCE(renda_familiar, 'N/A') AS renda, COUNT(*)::int AS count
      FROM avatar WHERE id_lancamento = ${idLancamento}
      GROUP BY renda ORDER BY count DESC LIMIT 8
    `,
  ])

  return { sexo, faixa_etaria, estado, formacao, renda }
}

export async function getAvatarConversaoCruzada(idLancamento: string) {
  const result = await prisma.$queryRaw<AvatarConversao[]>`
    SELECT
      a.sexo,
      CASE
        WHEN a.idade < 35 THEN 'Até 34'
        WHEN a.idade BETWEEN 35 AND 44 THEN '35-44'
        ELSE '45+'
      END AS faixa_etaria,
      a.formacao_universitaria AS formacao,
      COUNT(*)::int AS total_respostas,
      SUM(CASE WHEN l.virou_comprador THEN 1 ELSE 0 END)::int AS compradores,
      ROUND(
        SUM(CASE WHEN l.virou_comprador THEN 1 ELSE 0 END)::numeric /
        NULLIF(COUNT(*), 0) * 100, 1
      )::float AS taxa_conversao
    FROM avatar a
    LEFT JOIN leads l ON a.email = l.email AND a.id_lancamento = l.id_lancamento
    WHERE a.id_lancamento = ${idLancamento}
    GROUP BY a.sexo, faixa_etaria, a.formacao_universitaria
    ORDER BY compradores DESC
    LIMIT 15
  `
  return result
}

export type AvatarConversao = {
  sexo: string
  faixa_etaria: string
  formacao: string
  total_respostas: number
  compradores: number
  taxa_conversao: number
}

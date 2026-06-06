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
          WHEN idade ~ '^[0-9]+$' AND idade::int < 25 THEN 'Até 24'
          WHEN idade ~ '^[0-9]+$' AND idade::int BETWEEN 25 AND 34 THEN '25-34'
          WHEN idade ~ '^[0-9]+$' AND idade::int BETWEEN 35 AND 44 THEN '35-44'
          WHEN idade ~ '^[0-9]+$' AND idade::int BETWEEN 45 AND 54 THEN '45-54'
          WHEN idade ~ '^[0-9]+$' THEN '55+'
          ELSE 'N/A'
        END AS faixa,
        COUNT(*)::int AS count
      FROM avatar WHERE id_lancamento = ${idLancamento}
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

// Dimensões disponíveis para cruzamento com conversão
export type AvatarDimensao =
  | 'formacao'
  | 'faixa_etaria'
  | 'sexo'
  | 'estado'
  | 'renda'
  | 'experiencia'
  | 'mais_atrativo'
  | 'filhos'

export const AVATAR_DIMENSAO_LABELS: Record<AvatarDimensao, string> = {
  formacao:      'Formação',
  faixa_etaria:  'Faixa Etária',
  sexo:          'Sexo',
  estado:        'Estado',
  renda:         'Renda Familiar',
  experiencia:   'Experiência Profissional',
  mais_atrativo: 'Mais Atrativo no Curso',
  filhos:        'Possui Filhos',
}

// Cada dimensão tem sua própria query para evitar SQL injection via column name
async function queryPorDimensao(idLancamento: string, dimensao: AvatarDimensao): Promise<AvatarConversao[]> {
  // Template comum: JOIN avatar → compradores (vendas reais)
  // Retorna: dimensao_valor, total_respostas, compradores, taxa_conversao

  switch (dimensao) {
    case 'formacao':
      return prisma.$queryRaw<AvatarConversao[]>`
        SELECT
          COALESCE(a.formacao_universitaria, 'N/A') AS dimensao_valor,
          COUNT(*)::int AS total_respostas,
          COUNT(DISTINCT CASE WHEN c.hotmart_transaction IS NOT NULL THEN a.email END)::int AS compradores,
          ROUND(COUNT(DISTINCT CASE WHEN c.hotmart_transaction IS NOT NULL THEN a.email END)::numeric
            / NULLIF(COUNT(*),0)*100, 1)::float AS taxa_conversao
        FROM avatar a
        LEFT JOIN compradores c ON c.email = a.email AND c.id_lancamento = a.id_lancamento AND c.status_pagamento = 'aprovado'
        WHERE a.id_lancamento = ${idLancamento}
        GROUP BY a.formacao_universitaria
        ORDER BY compradores DESC, total_respostas DESC
        LIMIT 20
      `

    case 'faixa_etaria':
      return prisma.$queryRaw<AvatarConversao[]>`
        SELECT
          CASE
            WHEN a.idade ~ '^[0-9]+$' AND a.idade::int < 35 THEN 'Até 34'
            WHEN a.idade ~ '^[0-9]+$' AND a.idade::int BETWEEN 35 AND 44 THEN '35-44'
            WHEN a.idade ~ '^[0-9]+$' THEN '45+'
            ELSE 'N/A'
          END AS dimensao_valor,
          COUNT(*)::int AS total_respostas,
          COUNT(DISTINCT CASE WHEN c.hotmart_transaction IS NOT NULL THEN a.email END)::int AS compradores,
          ROUND(COUNT(DISTINCT CASE WHEN c.hotmart_transaction IS NOT NULL THEN a.email END)::numeric
            / NULLIF(COUNT(*),0)*100, 1)::float AS taxa_conversao
        FROM avatar a
        LEFT JOIN compradores c ON c.email = a.email AND c.id_lancamento = a.id_lancamento AND c.status_pagamento = 'aprovado'
        WHERE a.id_lancamento = ${idLancamento}
        GROUP BY dimensao_valor
        ORDER BY compradores DESC, total_respostas DESC
      `

    case 'sexo':
      return prisma.$queryRaw<AvatarConversao[]>`
        SELECT
          COALESCE(a.sexo, 'N/A') AS dimensao_valor,
          COUNT(*)::int AS total_respostas,
          COUNT(DISTINCT CASE WHEN c.hotmart_transaction IS NOT NULL THEN a.email END)::int AS compradores,
          ROUND(COUNT(DISTINCT CASE WHEN c.hotmart_transaction IS NOT NULL THEN a.email END)::numeric
            / NULLIF(COUNT(*),0)*100, 1)::float AS taxa_conversao
        FROM avatar a
        LEFT JOIN compradores c ON c.email = a.email AND c.id_lancamento = a.id_lancamento AND c.status_pagamento = 'aprovado'
        WHERE a.id_lancamento = ${idLancamento}
        GROUP BY a.sexo
        ORDER BY compradores DESC, total_respostas DESC
      `

    case 'estado':
      return prisma.$queryRaw<AvatarConversao[]>`
        SELECT
          COALESCE(a.estado, 'N/A') AS dimensao_valor,
          COUNT(*)::int AS total_respostas,
          COUNT(DISTINCT CASE WHEN c.hotmart_transaction IS NOT NULL THEN a.email END)::int AS compradores,
          ROUND(COUNT(DISTINCT CASE WHEN c.hotmart_transaction IS NOT NULL THEN a.email END)::numeric
            / NULLIF(COUNT(*),0)*100, 1)::float AS taxa_conversao
        FROM avatar a
        LEFT JOIN compradores c ON c.email = a.email AND c.id_lancamento = a.id_lancamento AND c.status_pagamento = 'aprovado'
        WHERE a.id_lancamento = ${idLancamento}
        GROUP BY a.estado
        ORDER BY compradores DESC, total_respostas DESC
        LIMIT 20
      `

    case 'renda':
      return prisma.$queryRaw<AvatarConversao[]>`
        SELECT
          COALESCE(a.renda_familiar, 'N/A') AS dimensao_valor,
          COUNT(*)::int AS total_respostas,
          COUNT(DISTINCT CASE WHEN c.hotmart_transaction IS NOT NULL THEN a.email END)::int AS compradores,
          ROUND(COUNT(DISTINCT CASE WHEN c.hotmart_transaction IS NOT NULL THEN a.email END)::numeric
            / NULLIF(COUNT(*),0)*100, 1)::float AS taxa_conversao
        FROM avatar a
        LEFT JOIN compradores c ON c.email = a.email AND c.id_lancamento = a.id_lancamento AND c.status_pagamento = 'aprovado'
        WHERE a.id_lancamento = ${idLancamento}
        GROUP BY a.renda_familiar
        ORDER BY compradores DESC, total_respostas DESC
      `

    case 'experiencia':
      return prisma.$queryRaw<AvatarConversao[]>`
        SELECT
          COALESCE(a.experiencia_profissional, 'N/A') AS dimensao_valor,
          COUNT(*)::int AS total_respostas,
          COUNT(DISTINCT CASE WHEN c.hotmart_transaction IS NOT NULL THEN a.email END)::int AS compradores,
          ROUND(COUNT(DISTINCT CASE WHEN c.hotmart_transaction IS NOT NULL THEN a.email END)::numeric
            / NULLIF(COUNT(*),0)*100, 1)::float AS taxa_conversao
        FROM avatar a
        LEFT JOIN compradores c ON c.email = a.email AND c.id_lancamento = a.id_lancamento AND c.status_pagamento = 'aprovado'
        WHERE a.id_lancamento = ${idLancamento}
        GROUP BY a.experiencia_profissional
        ORDER BY compradores DESC, total_respostas DESC
      `

    case 'mais_atrativo':
      return prisma.$queryRaw<AvatarConversao[]>`
        SELECT
          COALESCE(a.mais_atrativo, 'N/A') AS dimensao_valor,
          COUNT(*)::int AS total_respostas,
          COUNT(DISTINCT CASE WHEN c.hotmart_transaction IS NOT NULL THEN a.email END)::int AS compradores,
          ROUND(COUNT(DISTINCT CASE WHEN c.hotmart_transaction IS NOT NULL THEN a.email END)::numeric
            / NULLIF(COUNT(*),0)*100, 1)::float AS taxa_conversao
        FROM avatar a
        LEFT JOIN compradores c ON c.email = a.email AND c.id_lancamento = a.id_lancamento AND c.status_pagamento = 'aprovado'
        WHERE a.id_lancamento = ${idLancamento}
        GROUP BY a.mais_atrativo
        ORDER BY compradores DESC, total_respostas DESC
      `

    case 'filhos':
      return prisma.$queryRaw<AvatarConversao[]>`
        SELECT
          COALESCE(a.possui_filhos, 'N/A') AS dimensao_valor,
          COUNT(*)::int AS total_respostas,
          COUNT(DISTINCT CASE WHEN c.hotmart_transaction IS NOT NULL THEN a.email END)::int AS compradores,
          ROUND(COUNT(DISTINCT CASE WHEN c.hotmart_transaction IS NOT NULL THEN a.email END)::numeric
            / NULLIF(COUNT(*),0)*100, 1)::float AS taxa_conversao
        FROM avatar a
        LEFT JOIN compradores c ON c.email = a.email AND c.id_lancamento = a.id_lancamento AND c.status_pagamento = 'aprovado'
        WHERE a.id_lancamento = ${idLancamento}
        GROUP BY a.possui_filhos
        ORDER BY compradores DESC, total_respostas DESC
      `
  }
}

export async function getAvatarConversaoCruzada(
  idLancamento: string,
  dimensao: AvatarDimensao = 'formacao'
): Promise<AvatarConversao[]> {
  return queryPorDimensao(idLancamento, dimensao)
}

export type AvatarConversao = {
  dimensao_valor: string
  total_respostas: number
  compradores: number
  taxa_conversao: number
}

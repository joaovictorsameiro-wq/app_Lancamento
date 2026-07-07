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

// Comparativo global Avatar (lead pré-venda) x Pesquisa de Alunos (pós-venda).
// Normaliza renda e formação do avatar (texto livre/faixas inconsistentes entre lançamentos)
// para as mesmas categorias já usadas em pesquisa_alunos, sem alterar nenhum pipeline de ingestão.
export async function getAvatarComparativoGlobal(idLancamento?: string) {
  const filtro = idLancamento || null // null = sem filtro (todos)

  const [sexo, renda, formacao] = await Promise.all([
    prisma.$queryRaw<{ sexo: string; total: number }[]>`
      SELECT COALESCE(sexo, 'N/A') AS sexo, COUNT(*)::int AS total
      FROM avatar WHERE sexo IS NOT NULL AND (${filtro}::text IS NULL OR id_lancamento = ${filtro})
      GROUP BY sexo ORDER BY total DESC
    `,
    prisma.$queryRaw<{ renda: string; total: number }[]>`
      SELECT
        CASE
          WHEN n IS NULL THEN 'N/A'
          WHEN n <= 3000  THEN 'Ate R$3.000'
          WHEN n <= 7000  THEN 'R$3.001 a R$7.000'
          WHEN n <= 10000 THEN 'R$7.001 a R$10.000'
          WHEN n <= 14000 THEN 'R$10.001 a R$14.000'
          ELSE 'Acima de R$14.000'
        END AS renda,
        COUNT(*)::int AS total
      FROM (
        SELECT NULLIF(regexp_replace(substring(renda_familiar from '[0-9.]+'), '\\.', '', 'g'), '')::numeric AS n
        FROM avatar WHERE renda_familiar IS NOT NULL AND (${filtro}::text IS NULL OR id_lancamento = ${filtro})
      ) t
      GROUP BY renda
    `,
    prisma.$queryRaw<{ formacao: string; total: number }[]>`
      SELECT
        CASE
          WHEN formacao_universitaria ILIKE '%direito%'       THEN 'Direito'
          WHEN formacao_universitaria ILIKE '%contabilidade%' THEN 'Contabilidade'
          WHEN formacao_universitaria ILIKE '%administra%'    THEN 'Administração'
          WHEN formacao_universitaria ILIKE '%economia%'      THEN 'Economia'
          WHEN formacao_universitaria ILIKE '%engenharia%'    THEN 'Engenharia'
          ELSE 'Outras áreas'
        END AS formacao,
        COUNT(*)::int AS total
      FROM avatar WHERE formacao_universitaria IS NOT NULL AND (${filtro}::text IS NULL OR id_lancamento = ${filtro})
      GROUP BY formacao
    `,
  ])
  return { sexo, renda, formacao }
}

export async function getAvatarConversaoCruzada(
  idLancamento: string,
  dimensao: AvatarDimensao = 'formacao'
): Promise<AvatarConversao[]> {
  return queryPorDimensao(idLancamento, dimensao)
}

// Qualificação de lead: mesma regra usada no relatório Data Studio —
// formação em Admin/Contab/Econ E renda familiar a partir de R$5.000,01.
export type QualificacaoResumo = {
  tipo: string
  qualificados: number
  total: number
  pct_qualificado: number
}

export async function getQualificacaoPorTipo(idLancamento: string): Promise<QualificacaoResumo[]> {
  return prisma.$queryRaw<QualificacaoResumo[]>`
    WITH base AS (
      SELECT
        CASE
          WHEN utm_campaign ILIKE '%LEAD%' AND (utm_campaign ILIKE '%_PQ_%' OR utm_campaign ILIKE '%PQ_%' OR utm_campaign ILIKE '%_PQ') THEN 'captacao_pq'
          WHEN utm_campaign ILIKE '%LEAD%' AND (utm_campaign ILIKE '%_PF_%' OR utm_campaign ILIKE '%PF_%' OR utm_campaign ILIKE '%_PF') THEN 'captacao_pf'
          WHEN utm_campaign ILIKE '%LEAD%' OR utm_campaign ILIKE '%Captacao%' THEN 'captacao'
          ELSE 'outros'
        END AS tipo,
        (formacao_universitaria ILIKE '%admin%' OR formacao_universitaria ILIKE '%contab%' OR formacao_universitaria ILIKE '%econ%')
        AND NULLIF(regexp_replace(substring(renda_familiar from '[0-9.]+'), '\\.', '', 'g'), '')::numeric >= 5000
        AS qualificado
      FROM avatar
      WHERE id_lancamento = ${idLancamento}
    )
    SELECT
      tipo,
      COUNT(*) FILTER (WHERE qualificado)::int AS qualificados,
      COUNT(*)::int AS total,
      ROUND(COUNT(*) FILTER (WHERE qualificado)::numeric / NULLIF(COUNT(*), 0) * 100, 1)::float AS pct_qualificado
    FROM base
    GROUP BY tipo
    ORDER BY total DESC
  `
}

// Mesma regra de qualificação, mas por anúncio individual.
// avatar.utm_content bate com trafego_meta.anuncio (ex.: "AD02_VID_Flipchart_Novo"),
// permitindo responder "qual anúncio trouxe mais lead qualificado".
export type QualificacaoAnuncio = {
  anuncio: string
  qualificados: number
  total: number
  pct_qualificado: number
}

export async function getQualificacaoPorAnuncio(idLancamento: string): Promise<QualificacaoAnuncio[]> {
  return prisma.$queryRaw<QualificacaoAnuncio[]>`
    WITH base AS (
      SELECT
        utm_content AS anuncio,
        (formacao_universitaria ILIKE '%admin%' OR formacao_universitaria ILIKE '%contab%' OR formacao_universitaria ILIKE '%econ%')
        AND NULLIF(regexp_replace(substring(renda_familiar from '[0-9.]+'), '\\.', '', 'g'), '')::numeric >= 5000
        AS qualificado
      FROM avatar
      WHERE id_lancamento = ${idLancamento} AND utm_content IS NOT NULL AND utm_content != ''
    )
    SELECT
      anuncio,
      COUNT(*) FILTER (WHERE qualificado)::int AS qualificados,
      COUNT(*)::int AS total,
      ROUND(COUNT(*) FILTER (WHERE qualificado)::numeric / NULLIF(COUNT(*), 0) * 100, 1)::float AS pct_qualificado
    FROM base
    GROUP BY anuncio
    ORDER BY total DESC
  `
}

export type AvatarConversao = {
  dimensao_valor: string
  total_respostas: number
  compradores: number
  taxa_conversao: number
}

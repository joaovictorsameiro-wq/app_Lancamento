import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id') ?? 'LC25'

  try {
    const [totais, porNivel, diasComDados, campanhas] = await Promise.all([
      // Totais brutos
      prisma.$queryRaw<{ total_rows: number; total_leads: number; total_gasto: number }[]>`
        SELECT
          COUNT(*)::int AS total_rows,
          SUM(leads)::int AS total_leads,
          ROUND(SUM(total_gasto)::numeric, 2)::float AS total_gasto
        FROM trafego_meta
        WHERE id_lancamento = ${id}
      `,
      // Breakdown por nível (tem anuncio null? conjunto null?)
      prisma.$queryRaw<{ tem_anuncio: boolean; tem_conjunto: boolean; linhas: number; leads: number; gasto: number }[]>`
        SELECT
          (anuncio IS NOT NULL AND anuncio <> '') AS tem_anuncio,
          (conjunto_anuncio IS NOT NULL AND conjunto_anuncio <> '') AS tem_conjunto,
          COUNT(*)::int AS linhas,
          SUM(leads)::int AS leads,
          ROUND(SUM(total_gasto)::numeric, 2)::float AS gasto
        FROM trafego_meta
        WHERE id_lancamento = ${id}
        GROUP BY tem_anuncio, tem_conjunto
        ORDER BY linhas DESC
      `,
      // Quantos dias distintos
      prisma.$queryRaw<{ primeiro_dia: string; ultimo_dia: string; total_dias: number }[]>`
        SELECT
          MIN(data)::date::text AS primeiro_dia,
          MAX(data)::date::text AS ultimo_dia,
          COUNT(DISTINCT data::date)::int AS total_dias
        FROM trafego_meta
        WHERE id_lancamento = ${id}
      `,
      // Campanhas distintas
      prisma.$queryRaw<{ campanha: string; leads: number; gasto: number }[]>`
        SELECT campanha, SUM(leads)::int AS leads, ROUND(SUM(total_gasto)::numeric,2)::float AS gasto
        FROM trafego_meta WHERE id_lancamento = ${id}
        GROUP BY campanha ORDER BY leads DESC
      `,
    ])

    return NextResponse.json({ id, totais, porNivel, diasComDados, campanhas })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  try {
    const [trafegoRecente, leadsUtmVazias, compradoresSemEmail] = await Promise.all([
      // Última atualização de tráfego
      prisma.$queryRaw<{ ultima_data: Date; horas_atraso: number }[]>`
        SELECT
          MAX(data)::date AS ultima_data,
          EXTRACT(HOUR FROM NOW() - MAX(data))::int AS horas_atraso
        FROM trafego_meta
        ${id ? prisma.$queryRaw`WHERE id_lancamento = ${id}` : prisma.$queryRaw``}
      `.catch(() => []),

      // Leads sem UTM source
      id ? prisma.$queryRaw<{ sem_utm: number; total: number }[]>`
        SELECT
          COUNT(CASE WHEN utm_source IS NULL OR utm_source = '' THEN 1 END)::int AS sem_utm,
          COUNT(*)::int AS total
        FROM leads
        WHERE id_lancamento = ${id}
      `.catch(() => []) : Promise.resolve([]),

      // Compradores com email duplicado no mesmo lançamento
      id ? prisma.$queryRaw<{ duplicados: number }[]>`
        SELECT COUNT(*)::int AS duplicados
        FROM (
          SELECT email, COUNT(*) FROM compradores
          WHERE id_lancamento = ${id}
          GROUP BY email HAVING COUNT(*) > 1
        ) AS dup
      `.catch(() => []) : Promise.resolve([]),
    ])

    // Contagens gerais de sanidade
    const [totalTrafego, totalLeads, totalCompradores, totalAvatar] = await Promise.all([
      id
        ? prisma.trafego_meta.count({ where: { id_lancamento: id } })
        : prisma.trafego_meta.count(),
      id
        ? prisma.leads.count({ where: { id_lancamento: id } })
        : prisma.leads.count(),
      id
        ? prisma.compradores.count({ where: { id_lancamento: id } })
        : prisma.compradores.count(),
      id
        ? prisma.avatar.count({ where: { id_lancamento: id } })
        : prisma.avatar.count(),
    ])

    return NextResponse.json({
      trafegoRecente: (trafegoRecente as { ultima_data: Date; horas_atraso: number }[])[0] ?? null,
      leadsUtmVazias: (leadsUtmVazias as { sem_utm: number; total: number }[])[0] ?? null,
      compradoresDuplicados: (compradoresSemEmail as { duplicados: number }[])[0] ?? null,
      contagens: { totalTrafego, totalLeads, totalCompradores, totalAvatar },
    })
  } catch (err) {
    console.error('[GET /api/auditoria]', err)
    return NextResponse.json({ error: 'Erro ao buscar auditoria' }, { status: 500 })
  }
}

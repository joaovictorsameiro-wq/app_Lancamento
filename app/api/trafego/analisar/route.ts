import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { getCorredorPolones, type CorredorPolonesCategoria, type CorredorPolonesNivel } from '../../../../lib/db/trafego'

const LABEL_CATEGORIA: Record<string, string> = {
  turbinamento: 'Turbinamento',
  distribuicao: 'Distribuição',
}
const LABEL_NIVEL: Record<string, string> = {
  campanha: 'campanha',
  conjunto: 'conjunto de anúncios',
  anuncio: 'anúncio',
}

export async function POST(req: NextRequest) {
  const { id, categoria, nivel, instrucao } = await req.json() as {
    id?: string
    categoria?: CorredorPolonesCategoria
    nivel?: CorredorPolonesNivel
    instrucao?: string
  }
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: 'GEMINI_API_KEY não configurada no servidor' }, { status: 500 })
  }

  try {
    const dados = await getCorredorPolones(id, undefined, undefined, categoria, nivel ?? 'campanha')
    if (dados.length === 0) {
      return NextResponse.json({ error: 'Sem dados de Corredor Polonês para esse filtro' }, { status: 404 })
    }

    const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

    const tabela = dados.map(d => ({
      campanha: d.campanha,
      total_gasto: d.total_gasto,
      hook_rate: d.hook_rate,
      retencao_25_75: d.retencao_25_75,
      custo_thruplay: d.custo_thruplay,
      custo_vv25: d.custo_vv25,
      custo_vv50: d.custo_vv50,
      custo_vv75: d.custo_vv75,
      custo_vv95: d.custo_vv95,
    }))

    const escopo = categoria
      ? `Escopo: apenas campanhas de "${LABEL_CATEGORIA[categoria]}", agrupado por ${LABEL_NIVEL[nivel ?? 'campanha']}.`
      : `Escopo: todas as campanhas de vídeo (Turbinamento e Distribuição juntas), agrupado por campanha.`

    const pedidoUsuario = instrucao?.trim()
      ? `\nO usuário pediu especificamente: "${instrucao.trim()}". Priorize responder exatamente isso antes de qualquer outra observação — não ignore o pedido nem substitua por uma análise genérica.\n`
      : ''

    const prompt = `Você é um analista de tráfego pago especializado no método "Corredor Polonês" (teste de retenção de vídeo em anúncios). Analise os dados abaixo e dê recomendações práticas e diretas em português.

${escopo}
${pedidoUsuario}
Métricas: hook_rate = % de quem assistiu 3s do vídeo em relação às impressões (quanto maior, melhor o gancho inicial). retencao_25_75 = % de quem chegou em 75% do vídeo entre os que chegaram em 25% (mede se o vídeo "segura" a audiência). custo_vvXX = custo por visualização até XX% do vídeo.

Dados (JSON):
${JSON.stringify(tabela, null, 2)}
${instrucao?.trim() ? '' : `
Estruture sua resposta em:
1. Diagnóstico rápido (2-3 frases)
2. Melhor e pior criativo, com o porquê
3. Recomendações práticas (o que cortar, o que escalar, o que testar em seguida)`}

Seja direto, sem enrolação, focado em ação. Não analise nada fora do escopo pedido acima.`

    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    })

    const texto = response.text ?? ''

    return NextResponse.json({ analise: texto })
  } catch (err) {
    console.error('[POST /api/trafego/analisar]', err)
    const detalhe = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `Erro ao gerar análise: ${detalhe}` }, { status: 500 })
  }
}

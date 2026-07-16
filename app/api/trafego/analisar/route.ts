import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { getCorredorPolones } from '../../../../lib/db/trafego'

export async function POST(req: NextRequest) {
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: 'GEMINI_API_KEY não configurada no servidor' }, { status: 500 })
  }

  try {
    const dados = await getCorredorPolones(id)
    if (dados.length === 0) {
      return NextResponse.json({ error: 'Sem dados de Corredor Polonês para este lançamento' }, { status: 404 })
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

    const prompt = `Você é um analista de tráfego pago especializado no método "Corredor Polonês" (teste de retenção de vídeo em anúncios). Analise os dados abaixo de um lançamento e dê recomendações práticas e diretas em português.

Métricas: hook_rate = % de quem assistiu 3s do vídeo em relação às impressões (quanto maior, melhor o gancho inicial). retencao_25_75 = % de quem chegou em 75% do vídeo entre os que chegaram em 25% (mede se o vídeo "segura" a audiência). custo_vvXX = custo por visualização até XX% do vídeo.

Dados por campanha/criativo (JSON):
${JSON.stringify(tabela, null, 2)}

Estruture sua resposta em:
1. Diagnóstico rápido (2-3 frases)
2. Melhor e pior criativo, com o porquê
3. Recomendações práticas (o que cortar, o que escalar, o que testar em seguida)

Seja direto, sem enrolação, focado em ação.`

    const response = await client.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: prompt,
    })

    const texto = response.text ?? ''

    return NextResponse.json({ analise: texto })
  } catch (err) {
    console.error('[POST /api/trafego/analisar]', err)
    return NextResponse.json({ error: 'Erro ao gerar análise' }, { status: 500 })
  }
}

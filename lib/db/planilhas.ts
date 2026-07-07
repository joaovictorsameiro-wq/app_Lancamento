import { prisma } from '../prisma'
import { lerPlanilhaComoObjetos, extrairSpreadsheetId } from '../google-sheets'

export type PlanilhaConfig = {
  id: string
  id_lancamento: string
  tipo: 'avatar' | 'aluno'
  spreadsheet_id: string
  ultima_sincronizacao: string | null
  linhas_importadas: number
  ultimo_erro: string | null
}

export async function listarPlanilhas(): Promise<PlanilhaConfig[]> {
  return prisma.$queryRaw<PlanilhaConfig[]>`
    SELECT id, id_lancamento, tipo, spreadsheet_id, ultima_sincronizacao, linhas_importadas, ultimo_erro
    FROM pesquisa_planilhas
    ORDER BY id_lancamento DESC, tipo
  `
}

export async function salvarPlanilha(idLancamento: string, tipo: 'avatar' | 'aluno', urlOuId: string) {
  const spreadsheetId = extrairSpreadsheetId(urlOuId)
  await prisma.$executeRaw`
    INSERT INTO pesquisa_planilhas (id_lancamento, tipo, spreadsheet_id)
    VALUES (${idLancamento}, ${tipo}, ${spreadsheetId})
    ON CONFLICT (id_lancamento, tipo)
    DO UPDATE SET spreadsheet_id = EXCLUDED.spreadsheet_id
  `
}

// Encontra, sem depender de acento/maiúsculas exatas, a coluna do cabeçalho
// cujo texto contenha algum dos termos de busca (ex.: pergunta do Google Forms).
function acharColuna(headers: string[], termos: string[]): string | null {
  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ')
  for (const h of headers) {
    const hn = norm(h)
    if (termos.some(t => hn.includes(norm(t)))) return h
  }
  return null
}

export type ResultadoSync = {
  tipo: 'avatar' | 'aluno'
  totalNaPlanilha: number
  novosImportados: number
  colunasNaoMapeadas: string[]
  colunasMapeadas: Record<string, string>
}

export async function sincronizarPlanilha(idLancamento: string, tipo: 'avatar' | 'aluno'): Promise<ResultadoSync> {
  const config = await prisma.$queryRaw<{ spreadsheet_id: string }[]>`
    SELECT spreadsheet_id FROM pesquisa_planilhas WHERE id_lancamento = ${idLancamento} AND tipo = ${tipo}
  `
  if (config.length === 0) throw new Error('Planilha não configurada para este lançamento')

  const linhas = await lerPlanilhaComoObjetos(config[0].spreadsheet_id)
  if (linhas.length === 0) {
    await marcarSync(idLancamento, tipo, 0, null)
    return { tipo, totalNaPlanilha: 0, novosImportados: 0, colunasNaoMapeadas: [], colunasMapeadas: {} }
  }

  const headers = Object.keys(linhas[0])

  let resultado: ResultadoSync
  try {
    resultado = tipo === 'avatar'
      ? await importarAvatar(idLancamento, linhas, headers)
      : await importarAluno(idLancamento, linhas, headers)
  } catch (err) {
    await marcarSync(idLancamento, tipo, 0, err instanceof Error ? err.message : 'Erro desconhecido')
    throw err
  }

  await marcarSync(idLancamento, tipo, resultado.novosImportados, null)
  return resultado
}

async function marcarSync(idLancamento: string, tipo: string, linhasImportadas: number, erro: string | null) {
  await prisma.$executeRaw`
    UPDATE pesquisa_planilhas
    SET ultima_sincronizacao = now(), linhas_importadas = linhas_importadas + ${linhasImportadas}, ultimo_erro = ${erro}
    WHERE id_lancamento = ${idLancamento} AND tipo = ${tipo}
  `
}

async function importarAvatar(idLancamento: string, linhas: Record<string, string>[], headers: string[]): Promise<ResultadoSync> {
  const col = {
    email:        acharColuna(headers, ['e-mail', 'email']),
    respondido:   acharColuna(headers, ['carimbo de data']),
    formacao:     acharColuna(headers, ['formação universitária', 'formacao universitaria']),
    titulacao:    acharColuna(headers, ['maior titulação', 'titulacao']),
    experiencia:  acharColuna(headers, ['experiência profissional']),
    anos_exp:     acharColuna(headers, ['anos de experiência', 'quanto tempo']),
    sexo:         acharColuna(headers, ['sexo', 'gênero']),
    idade:        acharColuna(headers, ['idade']),
    estado:       acharColuna(headers, ['estado', 'uf']),
    tempo_conhece:acharColuna(headers, ['conhece o claudio', 'conhece o claudio']),
    mais_atrativo:acharColuna(headers, ['mais atrativo']),
    renda:        acharColuna(headers, ['renda familiar', 'renda']),
    pergunta:     acharColuna(headers, ['pergunta', 'dúvida']),
    desejos:      acharColuna(headers, ['desejo', 'desafio']),
    filhos:       acharColuna(headers, ['filho']),
    utm_source:   acharColuna(headers, ['utm_source']),
    utm_medium:   acharColuna(headers, ['utm_medium']),
    utm_campaign: acharColuna(headers, ['utm_campaign']),
    utm_content:  acharColuna(headers, ['utm_content']),
    utm_term:     acharColuna(headers, ['utm_term']),
  }

  if (!col.email) throw new Error('Não encontrei uma coluna de e-mail nessa planilha — confira o cabeçalho')

  const emailsExistentes = new Set(
    (await prisma.$queryRaw<{ email: string }[]>`
      SELECT email FROM avatar WHERE id_lancamento = ${idLancamento} AND email IS NOT NULL
    `).map(r => r.email.toLowerCase())
  )

  let novos = 0
  for (const linha of linhas) {
    const email = linha[col.email]?.toLowerCase()
    if (!email || emailsExistentes.has(email)) continue

    await prisma.$executeRaw`
      INSERT INTO avatar (
        id_lancamento, email, respondido_em, formacao_universitaria, maior_titulacao,
        experiencia_profissional, anos_experiencia, sexo, idade, estado, tempo_conhece_claudio,
        mais_atrativo, renda_familiar, pergunta_ao_claudio, desejos_desafios, possui_filhos,
        utm_source, utm_medium, utm_campaign, utm_content, utm_term
      ) VALUES (
        ${idLancamento}, ${email},
        ${col.respondido ? parseDataForms(linha[col.respondido]) : null}::timestamptz,
        ${col.formacao ? linha[col.formacao] : null}, ${col.titulacao ? linha[col.titulacao] : null},
        ${col.experiencia ? linha[col.experiencia] : null}, ${col.anos_exp ? linha[col.anos_exp] : null},
        ${col.sexo ? linha[col.sexo] : null}, ${col.idade ? linha[col.idade] : null},
        ${col.estado ? linha[col.estado] : null}, ${col.tempo_conhece ? linha[col.tempo_conhece] : null},
        ${col.mais_atrativo ? linha[col.mais_atrativo] : null}, ${col.renda ? linha[col.renda] : null},
        ${col.pergunta ? linha[col.pergunta] : null}, ${col.desejos ? linha[col.desejos] : null},
        ${col.filhos ? linha[col.filhos] : null},
        ${col.utm_source ? linha[col.utm_source] : null}, ${col.utm_medium ? linha[col.utm_medium] : null},
        ${col.utm_campaign ? linha[col.utm_campaign] : null}, ${col.utm_content ? linha[col.utm_content] : null},
        ${col.utm_term ? linha[col.utm_term] : null}
      )
    `
    emailsExistentes.add(email)
    novos++
  }

  const colunasMapeadas = Object.fromEntries(Object.entries(col).filter(([, v]) => v) as [string, string][])
  const colunasNaoMapeadas = headers.filter(h => !Object.values(col).includes(h))

  return { tipo: 'avatar', totalNaPlanilha: linhas.length, novosImportados: novos, colunasNaoMapeadas, colunasMapeadas }
}

// Mesma normalização usada em avatar (ver lib/db/avatar.ts) — mantém as duas fontes comparáveis.
function normalizarRenda(raw: string | null): string | null {
  if (!raw) return null
  const m = raw.match(/[0-9.]+/)
  if (!m) return null
  const n = parseFloat(m[0].replace(/\./g, ''))
  if (Number.isNaN(n)) return null
  if (n <= 3000) return 'Ate R$3.000'
  if (n <= 7000) return 'R$3.001 a R$7.000'
  if (n <= 10000) return 'R$7.001 a R$10.000'
  if (n <= 14000) return 'R$10.001 a R$14.000'
  return 'Acima de R$14.000'
}

function normalizarFormacao(raw: string | null): string | null {
  if (!raw) return null
  const s = raw.toLowerCase()
  if (s.includes('direito')) return 'Direito'
  if (s.includes('contab')) return 'Contabilidade'
  if (s.includes('admin')) return 'Administração'
  if (s.includes('econom')) return 'Economia'
  if (s.includes('engenh')) return 'Engenharia'
  return 'Outras áreas'
}

async function importarAluno(idLancamento: string, linhas: Record<string, string>[], headers: string[]): Promise<ResultadoSync> {
  // pesquisa_alunos não tem coluna de e-mail hoje — dedupe por carimbo de data/hora (única por resposta)
  const col = {
    carimbo:  acharColuna(headers, ['carimbo de data']),
    sexo:     acharColuna(headers, ['sexo', 'gênero']),
    formacao: acharColuna(headers, ['formação']),
    renda:    acharColuna(headers, ['renda']),
    excel:    acharColuna(headers, ['excel']),
    mat_fin:  acharColuna(headers, ['matemática financeira', 'matematica financeira']),
    ja_fez:   acharColuna(headers, ['já fez', 'ja fez']),
    procurava:acharColuna(headers, ['já procurava', 'ja procurava']),
  }

  if (!col.carimbo) throw new Error('Não encontrei a coluna "Carimbo de data/hora" nessa planilha')

  const existentes = new Set(
    (await prisma.$queryRaw<{ epoch: number }[]>`
      SELECT EXTRACT(EPOCH FROM created_at)::bigint AS epoch FROM pesquisa_alunos WHERE lancamento = ${idLancamento}
    `).map(r => Number(r.epoch))
  )

  let novos = 0
  for (const linha of linhas) {
    const carimbo = linha[col.carimbo]
    if (!carimbo) continue
    const dataResposta = parseDataForms(carimbo)
    if (!dataResposta) continue
    const epoch = Math.floor(new Date(dataResposta).getTime() / 1000)
    if (existentes.has(epoch)) continue

    const formacaoRaw = col.formacao ? linha[col.formacao] : null
    const rendaRaw     = col.renda ? linha[col.renda] : null

    await prisma.$executeRaw`
      INSERT INTO pesquisa_alunos (lancamento, sexo, formacao_raw, formacao, renda_raw, renda, nivel_excel, nivel_mat_financeira, ja_fez_curso, ja_procurava, created_at)
      VALUES (
        ${idLancamento}, ${col.sexo ? linha[col.sexo] : null}, ${formacaoRaw}, ${normalizarFormacao(formacaoRaw)},
        ${rendaRaw}, ${normalizarRenda(rendaRaw)},
        ${col.excel ? parseInt(linha[col.excel]) || null : null},
        ${col.mat_fin ? parseInt(linha[col.mat_fin]) || null : null},
        ${col.ja_fez ? /sim/i.test(linha[col.ja_fez]) : null},
        ${col.procurava ? linha[col.procurava] : null},
        ${dataResposta}::timestamptz
      )
    `
    existentes.add(epoch)
    novos++
  }

  const colunasMapeadas = Object.fromEntries(Object.entries(col).filter(([, v]) => v) as [string, string][])
  const colunasNaoMapeadas = headers.filter(h => !Object.values(col).includes(h))

  return { tipo: 'aluno', totalNaPlanilha: linhas.length, novosImportados: novos, colunasNaoMapeadas, colunasMapeadas }
}

// Google Forms grava datas como "DD/MM/AAAA HH:MM:SS" — converte pra ISO
function parseDataForms(v: string): string | null {
  const m = v?.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/)
  if (!m) return null
  const [, dd, mm, yyyy, hh, min, ss] = m
  return `${yyyy}-${mm}-${dd}T${hh}:${min}:${ss}`
}

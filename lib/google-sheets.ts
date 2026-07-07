import { google } from 'googleapis'

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n')
  if (!email || !key) throw new Error('Credenciais do Google Sheets não configuradas (.env.local)')

  return new google.auth.JWT({
    email,
    key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  })
}

// Lê a primeira aba de uma planilha e retorna como array de objetos,
// usando a primeira linha como cabeçalho (mesmo texto das perguntas do Google Forms).
export async function lerPlanilhaComoObjetos(spreadsheetId: string): Promise<Record<string, string>[]> {
  const sheets = google.sheets({ version: 'v4', auth: getAuth() })
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'A:ZZ',
  })

  const rows = res.data.values ?? []
  if (rows.length < 2) return []

  const headers = rows[0].map(h => String(h ?? '').trim())
  return rows.slice(1).map(row => {
    const obj: Record<string, string> = {}
    headers.forEach((h, i) => { obj[h] = String(row[i] ?? '').trim() })
    return obj
  })
}

// Extrai o ID da planilha a partir de uma URL completa ou já retorna o ID se já vier puro.
export function extrairSpreadsheetId(urlOuId: string): string {
  const match = urlOuId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
  return match ? match[1] : urlOuId.trim()
}

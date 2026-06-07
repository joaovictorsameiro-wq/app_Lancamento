import { NextResponse } from 'next/server'
import { createHmac } from 'crypto'

const AUTH_PASSWORD = process.env.AUTH_PASSWORD ?? 'launch2024'
const AUTH_SECRET   = process.env.AUTH_SECRET   ?? 'fallback_secret_change_me'
const COOKIE_NAME   = 'la_session'
const MAX_AGE       = 60 * 60 * 24 * 30 // 30 dias

function makeToken(): string {
  const ts = Date.now().toString()
  const sig = createHmac('sha256', AUTH_SECRET).update(ts).digest('hex')
  return `${ts}.${sig}`
}

export async function POST(req: Request) {
  try {
    const { password } = await req.json()

    if (password !== AUTH_PASSWORD) {
      return NextResponse.json({ error: 'Senha incorreta' }, { status: 401 })
    }

    const token = makeToken()
    const res = NextResponse.json({ ok: true })
    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: MAX_AGE,
      path: '/',
      // secure: true, // descomente se usar HTTPS
    })
    return res
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

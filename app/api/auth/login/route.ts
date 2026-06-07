import { NextResponse } from 'next/server'

const AUTH_PASSWORD = process.env.AUTH_PASSWORD ?? 'launch2024'
const AUTH_SECRET   = process.env.AUTH_SECRET   ?? 'fallback_secret_change_me'
const COOKIE_NAME   = 'la_session'
const MAX_AGE       = 60 * 60 * 24 * 30 // 30 dias

async function makeToken(): Promise<string> {
  const ts  = Date.now().toString()
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(AUTH_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sigBuf = await crypto.subtle.sign('HMAC', key, enc.encode(ts))
  const sig = btoa(String.fromCharCode(...new Uint8Array(sigBuf)))
  return `${ts}.${sig}`
}

export async function POST(req: Request) {
  try {
    const { password } = await req.json()

    if (password !== AUTH_PASSWORD) {
      return NextResponse.json({ error: 'Senha incorreta' }, { status: 401 })
    }

    const token = await makeToken()
    const res = NextResponse.json({ ok: true })
    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: MAX_AGE,
      path: '/',
    })
    return res
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

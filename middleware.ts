import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const AUTH_SECRET = process.env.AUTH_SECRET ?? 'fallback_secret_change_me'
const COOKIE_NAME = 'la_session'

// Rotas que não precisam de autenticação
const PUBLIC_PATHS = ['/login', '/api/auth/login']

// Usa Web Crypto API (compatível com Edge Runtime)
async function importKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder()
  return crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  )
}

async function isValidToken(token: string): Promise<boolean> {
  try {
    const [ts, sig] = token.split('.')
    if (!ts || !sig) return false

    const key = await importKey(AUTH_SECRET)
    const enc = new TextEncoder()
    const sigBytes = Uint8Array.from(atob(sig), c => c.charCodeAt(0))
    return crypto.subtle.verify('HMAC', key, sigBytes, enc.encode(ts))
  } catch {
    return false
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Deixar passar: rotas públicas e arquivos estáticos
  if (
    PUBLIC_PATHS.some(p => pathname.startsWith(p)) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next()
  }

  // Verificar cookie de sessão
  const token = request.cookies.get(COOKIE_NAME)?.value ?? ''
  if (token && await isValidToken(token)) {
    return NextResponse.next()
  }

  // Não autenticado → redireciona para login
  const loginUrl = request.nextUrl.clone()
  loginUrl.pathname = '/login'
  loginUrl.search = `?from=${encodeURIComponent(pathname)}`
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}

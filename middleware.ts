import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createHmac } from 'crypto'

const AUTH_SECRET = process.env.AUTH_SECRET ?? 'fallback_secret_change_me'
const COOKIE_NAME = 'la_session'

// Rotas que não precisam de autenticação
const PUBLIC_PATHS = ['/login', '/api/auth/login']

function isValidToken(token: string): boolean {
  try {
    const [ts, sig] = token.split('.')
    if (!ts || !sig) return false
    const expected = createHmac('sha256', AUTH_SECRET).update(ts).digest('hex')
    return sig === expected
  } catch {
    return false
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Deixar passar: rotas públicas, arquivos estáticos e imagens
  if (
    PUBLIC_PATHS.some(p => pathname.startsWith(p)) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next()
  }

  // Verificar cookie de sessão
  const token = request.cookies.get(COOKIE_NAME)?.value ?? ''
  if (isValidToken(token)) {
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
    // Aplica a tudo exceto arquivos estáticos
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}

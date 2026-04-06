import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

const AUTH_HINT_COOKIE = 'abg_auth_hint'
const AUTH_ROUTES = ['/login', '/forgot-password', '/reset-password']
const PUBLIC_PREFIXES = ['/invite']

function isProtectedRoute(pathname: string): boolean {
  if (pathname === '/') return false
  if (AUTH_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`))) {
    return false
  }
  if (PUBLIC_PREFIXES.some((route) => pathname.startsWith(route))) {
    return false
  }
  return true
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hasAuthHint = request.cookies.get(AUTH_HINT_COOKIE)?.value === '1'

  if (isProtectedRoute(pathname) && !hasAuthHint) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
}

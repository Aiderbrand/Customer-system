import { NextRequest } from 'next/server'
import { describe, expect, it } from 'vitest'
import { middleware } from '@/middleware'

function createRequest(url: string, cookie?: string): NextRequest {
  const headers = new Headers()

  if (cookie) {
    headers.set('cookie', cookie)
  }

  return new NextRequest(url, { headers })
}

describe('middleware auth routing', () => {
  it('keeps login reachable even when the auth hint cookie is present', () => {
    const response = middleware(createRequest('http://localhost:3000/login', 'abg_auth_hint=1'))

    expect(response.status).toBe(200)
    expect(response.headers.get('location')).toBeNull()
  })

  it('redirects protected routes to login when there is no auth hint cookie', () => {
    const response = middleware(createRequest('http://localhost:3000/dashboard'))

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('http://localhost:3000/login?redirect=%2Fdashboard')
  })

  it('allows protected routes to continue when the auth hint cookie exists', () => {
    const response = middleware(createRequest('http://localhost:3000/dashboard', 'abg_auth_hint=1'))

    expect(response.status).toBe(200)
    expect(response.headers.get('location')).toBeNull()
  })
})

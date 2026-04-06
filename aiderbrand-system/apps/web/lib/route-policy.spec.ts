import { getNavigationSectionsForActor, resolveRouteAccess, resolveRoutePolicy } from '@/lib/route-policy'

describe('route policy', () => {
  const internalViewer = {
    actorGroup: 'internal' as const,
    effectiveCompanyId: 'comp-1',
    hasCapability: (permission: string) => !['projects:delete'].includes(permission),
  }

  const clientViewer = {
    actorGroup: 'client' as const,
    effectiveCompanyId: 'comp-2',
    hasCapability: (permission: string) => permission === 'projects:view' || permission === 'tickets:view_own',
  }

  it('redirects the shared dashboard entrypoint to the actor landing', () => {
    expect(resolveRouteAccess({ pathname: '/dashboard', viewer: internalViewer })).toMatchObject({
      allowed: false,
      redirectTo: '/internal/dashboard',
      reason: 'entrypoint-redirect',
    })

    expect(resolveRouteAccess({ pathname: '/dashboard', viewer: clientViewer })).toMatchObject({
      allowed: false,
      redirectTo: '/client/dashboard',
      reason: 'entrypoint-redirect',
    })
  })

  it('blocks actor-mismatched dashboards with owned fallback', () => {
    expect(resolveRouteAccess({ pathname: '/internal/dashboard', viewer: clientViewer })).toMatchObject({
      allowed: false,
      redirectTo: '/client/dashboard',
      reason: 'actor-mismatch',
    })
  })

  it('keeps shared resources permission-gated instead of actor-gated', () => {
    expect(resolveRouteAccess({ pathname: '/projects', viewer: clientViewer })).toMatchObject({
      allowed: true,
      redirectTo: null,
    })

    expect(resolveRouteAccess({
      pathname: '/tickets',
      viewer: { ...clientViewer, hasCapability: () => false },
    })).toMatchObject({
      allowed: false,
      redirectTo: '/client/dashboard',
      reason: 'missing-permission',
    })
  })

  it('requires company scope for deep shared detail routes', () => {
    expect(resolveRouteAccess({
      pathname: '/projects/proj-1',
      viewer: { ...internalViewer, effectiveCompanyId: null },
    })).toMatchObject({
      allowed: false,
      redirectTo: '/internal/dashboard',
      reason: 'missing-scope',
    })
  })

  it('removes dead navigation and keeps actor-aware dashboard links', () => {
    expect(resolveRoutePolicy('/tasks')).toBeNull()
    expect(getNavigationSectionsForActor('internal')[0]?.items.map((item) => item.href)).toEqual([
      '/internal/dashboard',
      '/companies',
      '/tickets',
      '/projects',
    ])
    expect(getNavigationSectionsForActor('client')[0]?.items.map((item) => item.href)).toEqual([
      '/client/dashboard',
      '/tickets',
      '/projects',
    ])
    expect(getNavigationSectionsForActor('client', { canViewCompanies: true })[0]?.items.map((item) => item.href)).toEqual([
      '/client/dashboard',
      '/companies',
      '/tickets',
      '/projects',
    ])
  })

  it('keeps companies permission-gated for both internal and account-owner views', () => {
    expect(resolveRouteAccess({ pathname: '/companies', viewer: internalViewer })).toMatchObject({
      allowed: true,
      redirectTo: null,
    })

    expect(resolveRouteAccess({ pathname: '/companies/comp-1', viewer: internalViewer })).toMatchObject({
      allowed: true,
      redirectTo: null,
    })

    expect(resolveRouteAccess({ pathname: '/companies', viewer: clientViewer })).toMatchObject({
      allowed: false,
      redirectTo: '/client/dashboard',
      reason: 'missing-permission',
    })

    expect(resolveRouteAccess({
      pathname: '/companies',
      viewer: { ...clientViewer, hasCapability: (permission: string) => ['nav:companies', 'companies:view'].includes(permission) },
    })).toMatchObject({
      allowed: true,
      redirectTo: null,
    })

    expect(resolveRouteAccess({
      pathname: '/companies/comp-1',
      viewer: { ...internalViewer, hasCapability: (permission: string) => permission === 'companies:view' },
    })).toMatchObject({
      allowed: false,
      redirectTo: '/internal/dashboard',
      reason: 'missing-permission',
    })
  })
})

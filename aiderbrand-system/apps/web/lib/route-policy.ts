import { Building2, FolderKanban, LayoutDashboard, Ticket } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ActorGroup, ViewerContext } from '@/lib/types'
import type { Permission } from '@/lib/rbac'

export type RouteScopeMode = 'none' | 'optional-company' | 'required-company'
export type RouteAccessFailure =
  | 'actor-mismatch'
  | 'missing-permission'
  | 'missing-scope'
  | 'entrypoint-redirect'

export interface RoutePolicy {
  key: string
  title: string
  actorGroups: ActorGroup[]
  requiredPermissions?: Permission[]
  permissionMode?: 'all' | 'any'
  scopeMode: RouteScopeMode
  actorMismatchFallback?: Partial<Record<ActorGroup, string>>
  unauthorizedFallback?: string
}

interface RouteMatcher extends RoutePolicy {
  pattern: RegExp
}

export interface RouteAccessResolution {
  allowed: boolean
  redirectTo: string | null
  reason: RouteAccessFailure | null
  policy: RoutePolicy | null
}

export interface RouteNavigationItem {
  label: string
  href: string
  icon: LucideIcon
}

export interface RouteNavigationSection {
  label: string
  items: RouteNavigationItem[]
}

export const ACTOR_LANDING_PATH: Record<ActorGroup, string> = {
  internal: '/internal/dashboard',
  client: '/client/dashboard',
}

const ROUTE_MATCHERS: RouteMatcher[] = [
  {
    key: 'dashboard-entry',
    title: 'Dashboard',
    pattern: /^\/dashboard$/,
    actorGroups: ['internal', 'client'],
    scopeMode: 'none',
  },
  {
    key: 'internal-dashboard',
    title: 'Dashboard',
    pattern: /^\/internal\/dashboard$/,
    actorGroups: ['internal'],
    scopeMode: 'optional-company',
    actorMismatchFallback: { client: ACTOR_LANDING_PATH.client },
  },
  {
    key: 'client-dashboard',
    title: 'Dashboard',
    pattern: /^\/client\/dashboard$/,
    actorGroups: ['client'],
    scopeMode: 'optional-company',
    actorMismatchFallback: { internal: ACTOR_LANDING_PATH.internal },
  },
  {
    key: 'projects',
    title: 'Proyectos',
    pattern: /^\/projects$/,
    actorGroups: ['internal', 'client'],
    requiredPermissions: ['projects:view'],
    scopeMode: 'optional-company',
  },
  {
    key: 'companies',
    title: 'Companies',
    pattern: /^\/companies$/,
    actorGroups: ['internal', 'client'],
    requiredPermissions: ['nav:companies', 'companies:view'],
    scopeMode: 'none',
    actorMismatchFallback: { client: ACTOR_LANDING_PATH.client },
  },
  {
    key: 'company-detail',
    title: 'Detalle',
    pattern: /^\/companies\/[^/]+$/,
    actorGroups: ['internal', 'client'],
    requiredPermissions: ['nav:companies', 'companies:view'],
    scopeMode: 'none',
    actorMismatchFallback: { client: ACTOR_LANDING_PATH.client },
  },
  {
    key: 'project-detail',
    title: 'Detalle',
    pattern: /^\/projects\/[^/]+$/,
    actorGroups: ['internal', 'client'],
    requiredPermissions: ['projects:view'],
    scopeMode: 'required-company',
  },
  {
    key: 'project-tickets',
    title: 'Tickets',
    pattern: /^\/projects\/[^/]+\/tickets$/,
    actorGroups: ['internal', 'client'],
    requiredPermissions: ['projects:view', 'tickets:view_all', 'tickets:view_own'],
    permissionMode: 'any',
    scopeMode: 'required-company',
  },
  {
    key: 'project-ticket-detail',
    title: 'Detalle',
    pattern: /^\/projects\/[^/]+\/tickets\/[^/]+$/,
    actorGroups: ['internal', 'client'],
    requiredPermissions: ['tickets:view_all', 'tickets:view_own'],
    permissionMode: 'any',
    scopeMode: 'required-company',
  },
  {
    key: 'tickets',
    title: 'Tickets',
    pattern: /^\/tickets$/,
    actorGroups: ['internal', 'client'],
    requiredPermissions: ['tickets:view_all', 'tickets:view_own'],
    permissionMode: 'any',
    scopeMode: 'optional-company',
  },
  {
    key: 'ticket-detail',
    title: 'Detalle',
    pattern: /^\/tickets\/[^/]+$/,
    actorGroups: ['internal', 'client'],
    requiredPermissions: ['tickets:view_all', 'tickets:view_own'],
    permissionMode: 'any',
    scopeMode: 'required-company',
  },
]

export function resolveActorLandingPath(actorGroup: ActorGroup): string {
  return ACTOR_LANDING_PATH[actorGroup]
}

export function resolveRoutePolicy(pathname: string): RoutePolicy | null {
  const match = ROUTE_MATCHERS.find((candidate) => candidate.pattern.test(pathname))

  if (!match) {
    return null
  }

  return {
    key: match.key,
    title: match.title,
    actorGroups: match.actorGroups,
    requiredPermissions: match.requiredPermissions,
    permissionMode: match.permissionMode,
    scopeMode: match.scopeMode,
    actorMismatchFallback: match.actorMismatchFallback,
    unauthorizedFallback: match.unauthorizedFallback,
  }
}

export function resolveRouteAccess(params: {
  pathname: string
  viewer: Pick<ViewerContext, 'actorGroup' | 'effectiveCompanyId'> & {
    hasCapability: (permission: Permission) => boolean
  }
}): RouteAccessResolution {
  const policy = resolveRoutePolicy(params.pathname)

  if (!policy) {
    return { allowed: true, redirectTo: null, reason: null, policy: null }
  }

  const actorLanding = resolveActorLandingPath(params.viewer.actorGroup)

  if (policy.key === 'dashboard-entry') {
    return {
      allowed: false,
      redirectTo: actorLanding,
      reason: 'entrypoint-redirect',
      policy,
    }
  }

  if (!policy.actorGroups.includes(params.viewer.actorGroup)) {
    return {
      allowed: false,
      redirectTo: policy.actorMismatchFallback?.[params.viewer.actorGroup] ?? actorLanding,
      reason: 'actor-mismatch',
      policy,
    }
  }

  if (policy.requiredPermissions?.length) {
    const hasPermission = (policy.permissionMode ?? 'all') === 'all'
      ? policy.requiredPermissions.every(permission => params.viewer.hasCapability(permission))
      : policy.requiredPermissions.some(permission => params.viewer.hasCapability(permission))

    if (!hasPermission) {
      return {
        allowed: false,
        redirectTo: policy.unauthorizedFallback ?? actorLanding,
        reason: 'missing-permission',
        policy,
      }
    }
  }

  if (policy.scopeMode === 'required-company' && !params.viewer.effectiveCompanyId) {
    return {
      allowed: false,
      redirectTo: actorLanding,
      reason: 'missing-scope',
      policy,
    }
  }

  return { allowed: true, redirectTo: null, reason: null, policy }
}

export function getNavigationSectionsForActor(
  actorGroup: ActorGroup,
  options?: { canViewCompanies?: boolean },
): RouteNavigationSection[] {
  return [
    {
      label: 'Principal',
      items: [
        { label: 'Dashboard', href: resolveActorLandingPath(actorGroup), icon: LayoutDashboard },
        ...((actorGroup === 'internal' || options?.canViewCompanies)
          ? [{ label: 'Companies', href: '/companies', icon: Building2 }]
          : []),
        { label: 'Tickets', href: '/tickets', icon: Ticket },
        { label: 'Proyectos', href: '/projects', icon: FolderKanban },
      ],
    },
  ]
}

export function normalizeBreadcrumbSegments(pathname: string): string[] {
  const segments = pathname.split('/').filter(Boolean)

  if (segments[0] === 'internal' || segments[0] === 'client') {
    return segments.slice(1)
  }

  return segments
}

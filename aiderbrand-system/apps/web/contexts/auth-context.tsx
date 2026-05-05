'use client'

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import type { ActorGroup, Company, CompanyMembership, Invitation, Role, RoleSimulationSession, User, ViewerContext } from '@/lib/types'
import { getActorGroupForRole, hasPermission as checkPermission } from '@/lib/rbac'
import type { Permission } from '@/lib/rbac'
import { authApi, type AuthSession, type CompleteOnboardingPayload, type OnboardingTokenInfo } from '@/lib/api/auth'
import { apiClient } from '@/lib/api/client'
import { toast } from 'sonner'

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

interface StoredAuthState {
  preferredCompanyId: string | null
}

interface AuthContextValue {
  status: AuthStatus
  isAuthenticated: boolean
  currentUser: User | null
  currentCompany: Company | null
  memberships: CompanyMembership[]
  activeMembership: CompanyMembership | null
  simulation: RoleSimulationSession | null
  actorHasSystemAdminCapability: boolean
  actorGroup: ActorGroup | null
  effectiveCompanyId: string | null
  effectiveRole: Role | null
  currentRole: Role | null
  availableCompanyIds: string[]
  viewerContext: ViewerContext | null
  hasPermission: (permission: Permission) => boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  switchCompany: (companyId: string) => void
  startRoleSimulation: (role: Role) => Promise<void>
  stopRoleSimulation: () => Promise<void>
  acceptInvitation: (params: { token: string; name: string; password: string }) => Promise<void>
  forgotPassword: (email: string) => Promise<{ message: string }>
  resetPassword: (token: string, password: string) => Promise<{ message: string }>
  validateInvitationToken: (token: string) => Promise<Pick<Invitation, 'id' | 'email' | 'role' | 'status' | 'expiresAt'>>
  validateOnboardingToken: (token: string) => Promise<OnboardingTokenInfo>
  completeOnboarding: (payload: CompleteOnboardingPayload) => Promise<{ projectName: string }>
}

const AuthContext = createContext<AuthContextValue | null>(null)

const STORAGE_KEY = 'abg:auth:session:v1'
const AUTH_HINT_COOKIE = 'abg_auth_hint'

function hasWindow(): boolean {
  return typeof window !== 'undefined'
}

function persistAuthState(state: StoredAuthState | null): void {
  if (!hasWindow()) return

  if (!state) {
    window.localStorage.removeItem(STORAGE_KEY)
    document.cookie = `${AUTH_HINT_COOKIE}=; path=/; max-age=0; SameSite=Lax`
    return
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  document.cookie = `${AUTH_HINT_COOKIE}=1; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`
}

function readStoredAuthState(): StoredAuthState | null {
  if (!hasWindow()) return null

  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as StoredAuthState
    return {
      preferredCompanyId: parsed.preferredCompanyId,
    }
  } catch {
    window.localStorage.removeItem(STORAGE_KEY)
    return null
  }
}

function resolvePreferredCompanyId(
  session: AuthSession,
  preferredCompanyId?: string | null,
): string | null {
  const memberships = session.memberships.filter((membership) => membership.isActive)

  if (preferredCompanyId && memberships.some((membership) => membership.companyId === preferredCompanyId)) {
    return preferredCompanyId
  }

  return memberships[0]?.companyId ?? null
}

function isAccessibleCompanyId(memberships: CompanyMembership[], companyId: string | null | undefined): boolean {
  if (!companyId) {
    return false
  }

  return memberships.some((membership) => membership.isActive && membership.companyId === companyId)
}

function resolveEffectiveCompanyId(params: {
  session: AuthSession
  preferredCompanyId: string | null
}): string | null {
  if (isAccessibleCompanyId(params.session.memberships, params.session.effective.companyId)) {
    return params.session.effective.companyId
  }

  if (isAccessibleCompanyId(params.session.memberships, params.preferredCompanyId)) {
    return params.preferredCompanyId
  }

  return params.session.memberships.find((membership) => membership.isActive)?.companyId ?? null
}

function toStoredState(preferredCompanyId: string | null): StoredAuthState {
  return {
    preferredCompanyId,
  }
}

function resolveCompany(membership: CompanyMembership | null): Company | null {
  if (!membership) return null
  return {
    id: membership.companyId,
    name: membership.companyName,
    slug: membership.companySlug,
    createdAt: new Date(),
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [memberships, setMemberships] = useState<CompanyMembership[]>([])
  const [simulation, setSimulation] = useState<RoleSimulationSession | null>(null)
  const [actorHasSystemAdminCapability, setActorHasSystemAdminCapability] = useState(false)
  const [apiEffectiveCompanyId, setApiEffectiveCompanyId] = useState<string | null>(null)
  const [preferredCompanyId, setPreferredCompanyId] = useState<string | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)

  const clearSession = useCallback(() => {
    setAccessToken(null)
    setCurrentUser(null)
    setMemberships([])
    setSimulation(null)
    setActorHasSystemAdminCapability(false)
    setApiEffectiveCompanyId(null)
    setPreferredCompanyId(null)
    setStatus('unauthenticated')
    apiClient.clearSessionContext()
    persistAuthState(null)
  }, [])

  const applySession = useCallback(
    (session: AuthSession, preferredCompanyId?: string | null) => {
      const nextMemberships = session.memberships.filter((membership) => membership.isActive)
      const nextPreferredCompanyId = resolvePreferredCompanyId(session, preferredCompanyId)

      setAccessToken(session.accessToken)
      setCurrentUser(session.user)
      setMemberships(nextMemberships)
      setSimulation(session.simulation)
      setActorHasSystemAdminCapability(session.actor.hasSystemAdminCapability)
      setApiEffectiveCompanyId(session.effective.companyId)
      setPreferredCompanyId(nextPreferredCompanyId)
      setStatus('authenticated')

      apiClient.setAccessToken(session.accessToken)
      apiClient.setCompanyId(resolveEffectiveCompanyId({ session, preferredCompanyId: nextPreferredCompanyId }))
      persistAuthState(toStoredState(nextPreferredCompanyId))
    },
    [],
  )

  useEffect(() => {
    const stored = readStoredAuthState()
    setStatus('loading')

    void authApi
      .refresh()
      .then(({ accessToken: refreshedAccessToken }) => {
        apiClient.setAccessToken(refreshedAccessToken)

        return authApi.getSession(refreshedAccessToken).then((session) => {
          applySession(session, stored?.preferredCompanyId)
        })
      })
      .catch(() => {
        clearSession()
      })
  }, [applySession, clearSession])

  useEffect(() => {
    apiClient.setAccessToken(accessToken)
  }, [accessToken])

  const effectiveCompanyId = useMemo(() => {
    if (isAccessibleCompanyId(memberships, apiEffectiveCompanyId)) {
      return apiEffectiveCompanyId
    }

    if (isAccessibleCompanyId(memberships, preferredCompanyId)) {
      return preferredCompanyId
    }

    return memberships[0]?.companyId ?? null
  }, [apiEffectiveCompanyId, memberships, preferredCompanyId])
  const activeMembership = useMemo<CompanyMembership | null>(() => {
    return memberships.find((membership) => membership.companyId === effectiveCompanyId)
      ?? memberships[0]
      ?? null
  }, [effectiveCompanyId, memberships])
  const currentCompany = useMemo<Company | null>(() => {
    return resolveCompany(activeMembership)
  }, [activeMembership])
  const effectiveRole = simulation?.effectiveRole ?? activeMembership?.role ?? null
  const actorGroup = effectiveRole ? getActorGroupForRole(effectiveRole) : null
  const currentRole = effectiveRole
  const availableCompanyIds = useMemo(
    () => memberships.filter((membership) => membership.isActive).map((membership) => membership.companyId),
    [memberships],
  )
  const viewerContext = useMemo<ViewerContext | null>(() => {
    if (!actorGroup || !effectiveRole) {
      return null
    }

    return {
      actorGroup,
      effectiveRole,
      effectiveCompanyId,
      availableCompanyIds,
    }
  }, [actorGroup, availableCompanyIds, effectiveCompanyId, effectiveRole])

  useEffect(() => {
    apiClient.setCompanyId(effectiveCompanyId)
  }, [effectiveCompanyId])

  const hasPermission = useCallback(
    (permission: Permission): boolean => {
      if (!currentRole) return false
      return checkPermission(currentRole, permission)
    },
    [currentRole],
  )

  const login = useCallback(
    async (email: string, password: string) => {
      const session = await authApi.login(email, password)
      applySession(session)
    },
    [applySession],
  )

  const logout = useCallback(async () => {
    try {
      await authApi.logout(accessToken)
    } finally {
      clearSession()
    }
  }, [accessToken, clearSession])

  const switchCompany = useCallback(
    (companyId: string) => {
      if (!memberships.some((membership) => membership.companyId === companyId)) {
        return
      }

      setPreferredCompanyId(companyId)

      if (currentUser) {
        persistAuthState({ preferredCompanyId: companyId })
      }
    },
    [currentUser, memberships],
  )

  const startRoleSimulation = useCallback(async (role: Role) => {
    if (!accessToken || !actorHasSystemAdminCapability) {
      toast.error('No tenés permiso para simular roles')
      return
    }

    if (role === 'SYSTEM_ADMIN') {
      if (!simulation) {
        return
      }

      const session = await authApi.stopRoleSimulation(accessToken)
      applySession(session, readStoredAuthState()?.preferredCompanyId)
      return
    }

    const session = await authApi.startRoleSimulation(accessToken, { effectiveRole: role })
    applySession(session, readStoredAuthState()?.preferredCompanyId)
  }, [accessToken, actorHasSystemAdminCapability, applySession, simulation])

  const stopRoleSimulation = useCallback(async () => {
    if (!accessToken || !simulation) {
      return
    }

    const session = await authApi.stopRoleSimulation(accessToken)
    applySession(session, readStoredAuthState()?.preferredCompanyId)
  }, [accessToken, applySession, simulation])

  const acceptInvitation = useCallback(
    async (params: { token: string; name: string; password: string }) => {
      const session = await authApi.acceptInvitation(params)
      applySession(session)
    },
    [applySession],
  )

  const forgotPassword = useCallback(async (email: string) => {
    return authApi.forgotPassword(email)
  }, [])

  const resetPassword = useCallback(async (token: string, password: string) => {
    return authApi.resetPassword(token, password)
  }, [])

  const validateInvitationToken = useCallback(async (token: string) => {
    return authApi.validateInvitationToken(token)
  }, [])

  const validateOnboardingToken = useCallback(async (token: string) => {
    return authApi.validateOnboardingToken(token)
  }, [])

  const completeOnboarding = useCallback(
    async (payload: CompleteOnboardingPayload): Promise<{ projectName: string }> => {
      const { session, projectName } = await authApi.submitOnboarding(payload)
      applySession(session)
      return { projectName }
    },
    [applySession],
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      isAuthenticated: status === 'authenticated' && !!currentUser,
      currentUser,
      currentCompany,
      memberships,
      activeMembership,
      simulation,
      actorHasSystemAdminCapability,
      actorGroup,
      effectiveCompanyId,
      effectiveRole,
      currentRole,
      availableCompanyIds,
      viewerContext,
      hasPermission,
      login,
      logout,
      switchCompany,
      startRoleSimulation,
      stopRoleSimulation,
      acceptInvitation,
      forgotPassword,
      resetPassword,
      validateInvitationToken,
      validateOnboardingToken,
      completeOnboarding,
    }),
    [
      status,
      currentUser,
      currentCompany,
      memberships,
      activeMembership,
      simulation,
      actorHasSystemAdminCapability,
      actorGroup,
      effectiveCompanyId,
      effectiveRole,
      currentRole,
      availableCompanyIds,
      viewerContext,
      hasPermission,
      login,
      logout,
      switchCompany,
      startRoleSimulation,
      stopRoleSimulation,
      acceptInvitation,
      forgotPassword,
      resetPassword,
      validateInvitationToken,
      validateOnboardingToken,
      completeOnboarding,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import type {
  Company,
  ProjectHubPayload,
  ProjectStatus,
  ProjectWithStats,
  ProjectWorkspacePayload,
  ProjectWorkspaceTabId,
} from '@/lib/types'
import { projectService } from '@/lib/services/project-service'
import { useAuth } from '@/contexts/auth-context'
import { resolveScopedCompanySelection } from '@/lib/company-scope'
import { useRealDataScopeCompanies } from '@/hooks/use-real-data-scope-companies'
import {
  filterProjectHubItems,
  getProjectsHubEmptyState,
  getProjectWorkspaceEmptyState,
  getProjectWorkspaceTabs,
  PROJECT_STATUS_OPTIONS,
  resolveProjectWorkspaceTab,
} from '@/features/projects/lib/project-selectors'
import type { ProjectFilters, ProjectSectionTab } from '@/features/projects/types'

interface UseProjectsResult {
  projects: ProjectWithStats[]
  companyOptions: Company[]
  loading: boolean
  error: string | null
  refetch: () => void
}

interface UseProjectResult {
  project: ProjectWithStats | null
  loading: boolean
  error: string | null
}

interface UseProjectsHubResult {
  hub: ProjectHubPayload | null
  projects: ProjectHubPayload['items']
  loading: boolean
  error: string | null
  refetch: () => void
  filters: Required<ProjectFilters>
  companyOptions: Company[]
  setCompanyId: (value: string | null) => void
  setSearch: (value: string) => void
  toggleStatus: (status: ProjectStatus) => void
  clearFilters: () => void
  emptyState: ReturnType<typeof getProjectsHubEmptyState>
  statusOptions: typeof PROJECT_STATUS_OPTIONS
  canCreateProject: boolean
}

interface UseProjectWorkspaceResult {
  workspace: ProjectWorkspacePayload | null
  loading: boolean
  error: string | null
  refetch: () => void
  tabs: ProjectSectionTab[]
  selectedSection: ProjectWorkspaceTabId
  setSelectedSection: (value: ProjectWorkspaceTabId) => void
  sectionEmptyState: ReturnType<typeof getProjectWorkspaceEmptyState>
}

function useUpdateSearchParams() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  return useCallback((updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString())
    const currentQuery = searchParams.toString()

    Object.entries(updates).forEach(([key, value]) => {
      if (!value) {
        params.delete(key)
        return
      }

      params.set(key, value)
    })

    const query = params.toString()
    const nextUrl = query ? `${pathname}?${query}` : pathname
    const currentUrl = currentQuery ? `${pathname}?${currentQuery}` : pathname

    if (nextUrl === currentUrl) {
      return
    }

    router.replace(nextUrl, { scroll: false })
  }, [pathname, router, searchParams])
}

function parseStatusFilter(rawValue: string | null): ProjectStatus[] {
  if (!rawValue) {
    return []
  }

  const allowedStatuses = new Set(PROJECT_STATUS_OPTIONS.map(option => option.value))

  return rawValue
    .split(',')
    .map(value => value.trim())
    .filter((value): value is ProjectStatus => allowedStatuses.has(value as ProjectStatus))
}

export function useProjects(companyId?: string | null): UseProjectsResult {
  const { companyOptions, loading: companyOptionsLoading } = useRealDataScopeCompanies()
  const [projects, setProjects] = useState<ProjectWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const companySelection = useMemo(
    () => resolveScopedCompanySelection(companyOptions, companyId),
    [companyId, companyOptions],
  )

  const fetch = useCallback(async () => {
    if (companyOptionsLoading) {
      setLoading(true)
      return
    }

    if (!companyOptions.length || (companyId && !companySelection.isAccessible)) {
      setProjects([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const scopedCompanyIds = companySelection.selectedCompanyId
        ? [companySelection.selectedCompanyId]
        : companyOptions.map((company) => company.id)
      const data = await projectService.getProjects(scopedCompanyIds)
      setProjects(data)
    } catch (err) {
      console.error('[useProjects] Error fetching projects', err)
      setError('No se pudieron cargar los proyectos. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }, [companyId, companyOptions, companyOptionsLoading, companySelection.isAccessible, companySelection.selectedCompanyId])

  useEffect(() => {
    void fetch()
  }, [fetch])

  return {
    projects,
    companyOptions,
    loading,
    error,
    refetch: fetch,
  }
}

export function useProject(id: string): UseProjectResult {
  const { effectiveCompanyId } = useAuth()
  const [project, setProject] = useState<ProjectWithStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id || !effectiveCompanyId) {
      setProject(null)
      setLoading(false)
      setError(null)
      return
    }

    const companyId = effectiveCompanyId
    let cancelled = false

    async function fetch() {
      setLoading(true)
      setError(null)

      try {
        const data = await projectService.getProject(companyId, id)
        if (!cancelled) {
          setProject(data)
        }
      } catch (err) {
        console.error('[useProject] Error fetching project', err)
        if (!cancelled) {
          setError('No se pudo cargar el proyecto.')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void fetch()

    return () => {
      cancelled = true
    }
  }, [effectiveCompanyId, id])

  return { project, loading, error }
}

export function useProjectsHub(): UseProjectsHubResult {
  const { currentRole, hasPermission } = useAuth()
  const { companyOptions, loading: companyOptionsLoading } = useRealDataScopeCompanies()
  const searchParams = useSearchParams()
  const updateSearchParams = useUpdateSearchParams()
  const [hub, setHub] = useState<ProjectHubPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const requestedCompanyId = searchParams.get('companyId')
  const companySelection = useMemo(
    () => resolveScopedCompanySelection(companyOptions, requestedCompanyId),
    [companyOptions, requestedCompanyId],
  )

  const filters = useMemo<Required<ProjectFilters>>(() => ({
    companyId: companySelection.isAccessible ? companySelection.selectedCompanyId : requestedCompanyId,
    search: searchParams.get('q') ?? '',
    status: parseStatusFilter(searchParams.get('status')),
  }), [companySelection.isAccessible, companySelection.selectedCompanyId, requestedCompanyId, searchParams])

  const fetch = useCallback(async () => {
    if (companyOptionsLoading) {
      setLoading(true)
      return
    }

    if (!currentRole || !companyOptions.length) {
      setHub(null)
      setLoading(false)
      return
    }

    if (requestedCompanyId && !companySelection.isAccessible) {
      setHub({
        audience: currentRole === 'ACCOUNT_OWNER' || currentRole === 'COLLABORATOR' ? 'client' : 'internal',
        summary: {
          totalProjects: 0,
          activeProjects: 0,
          pausedProjects: 0,
          projectsWithOpenTickets: 0,
          projectsAtRisk: currentRole === 'ACCOUNT_OWNER' || currentRole === 'COLLABORATOR' ? null : 0,
        },
        items: [],
      })
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const scopedCompanyIds = companySelection.selectedCompanyId
        ? [companySelection.selectedCompanyId]
        : companyOptions.map((company) => company.id)
      const data = await projectService.getProjectsHub(currentRole, { companyIds: scopedCompanyIds })
      setHub(data)
    } catch (err) {
      console.error('[useProjectsHub] Error fetching projects hub', err)
      setError('No se pudo cargar el hub de proyectos.')
    } finally {
      setLoading(false)
    }
  }, [companyOptions, companyOptionsLoading, companySelection.isAccessible, companySelection.selectedCompanyId, currentRole, requestedCompanyId])

  useEffect(() => {
    void fetch()
  }, [fetch])

  const projects = useMemo(() => filterProjectHubItems(hub?.items ?? [], filters), [filters, hub?.items])

  const emptyState = useMemo(() => getProjectsHubEmptyState({
    totalItems: hub?.items.length ?? 0,
    filteredItemsCount: projects.length,
    filters,
  }), [filters, hub?.items.length, projects.length])

  const setCompanyId = useCallback((value: string | null) => {
    updateSearchParams({ companyId: value })
  }, [updateSearchParams])

  const setSearch = useCallback((value: string) => {
    updateSearchParams({ q: value.trim() ? value : null })
  }, [updateSearchParams])

  const toggleStatus = useCallback((status: ProjectStatus) => {
    const nextStatuses = filters.status.includes(status)
      ? filters.status.filter(value => value !== status)
      : [...filters.status, status]

    updateSearchParams({ status: nextStatuses.length ? nextStatuses.join(',') : null })
  }, [filters.status, updateSearchParams])

  const clearFilters = useCallback(() => {
    updateSearchParams({ companyId: null, q: null, status: null })
  }, [updateSearchParams])

  return {
    hub,
    projects,
    loading,
    error,
    refetch: fetch,
    filters,
    companyOptions,
    setCompanyId,
    setSearch,
    toggleStatus,
    clearFilters,
    emptyState,
    statusOptions: PROJECT_STATUS_OPTIONS,
    canCreateProject: hasPermission('projects:create'),
  }
}

export function useProjectWorkspace(projectId: string): UseProjectWorkspaceResult {
  const { currentRole, currentUser } = useAuth()
  const { companyOptions, loading: companyOptionsLoading } = useRealDataScopeCompanies()
  const searchParams = useSearchParams()
  const updateSearchParams = useUpdateSearchParams()
  const [workspace, setWorkspace] = useState<ProjectWorkspacePayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const tabs = useMemo(() => currentRole ? getProjectWorkspaceTabs(currentRole) : [], [currentRole])
  const selectedSection = useMemo<ProjectWorkspaceTabId>(() => {
    if (!currentRole) {
      return 'plan'
    }

    return resolveProjectWorkspaceTab(currentRole, searchParams.get('section'))
  }, [currentRole, searchParams])

  const fetch = useCallback(async () => {
    if (companyOptionsLoading) {
      setLoading(true)
      return
    }

    if (!projectId || !companyOptions.length || !currentRole) {
      setWorkspace(null)
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const accessibleCompanyIds = companyOptions.map((company) => company.id)
      const data = await projectService.getProjectWorkspace(accessibleCompanyIds, projectId, {
        role: currentRole,
        currentUserId: currentUser?.id ?? null,
      })
      setWorkspace(data)
    } catch (err) {
      console.error('[useProjectWorkspace] Error fetching project workspace', err)
      setError('No se pudo cargar el workspace del proyecto.')
    } finally {
      setLoading(false)
    }
  }, [companyOptions, companyOptionsLoading, currentRole, currentUser?.id, projectId])

  useEffect(() => {
    void fetch()
  }, [fetch])

  useEffect(() => {
    if (!currentRole) {
      return
    }

    const requestedSection = searchParams.get('section')
    const normalizedSection = resolveProjectWorkspaceTab(currentRole, requestedSection)
    const normalizedQueryValue = normalizedSection === 'plan' ? null : normalizedSection

    if (requestedSection !== normalizedQueryValue) {
      updateSearchParams({ section: normalizedQueryValue })
    }
  }, [currentRole, searchParams, updateSearchParams])

  const setSelectedSection = useCallback((value: ProjectWorkspaceTabId) => {
    updateSearchParams({ section: value === 'plan' ? null : value })
  }, [updateSearchParams])

  const sectionEmptyState = useMemo(() => {
    if (!workspace) {
      return null
    }

    return getProjectWorkspaceEmptyState(selectedSection, workspace)
  }, [selectedSection, workspace])

  return {
    workspace,
    loading,
    error,
    refetch: fetch,
    tabs,
    selectedSection,
    setSelectedSection,
    sectionEmptyState,
  }
}

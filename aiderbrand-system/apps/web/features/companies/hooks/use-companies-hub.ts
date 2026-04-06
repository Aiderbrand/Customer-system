'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import type { CompanyHubItem, CompanyHubPayload } from '@/lib/types'
import { companyService } from '@/lib/services/company-service'

export const COMPANY_STATUS_OPTIONS = [
  { value: 'active', label: 'Activas' },
  { value: 'inactive', label: 'Inactivas' },
] as const

export const COMPANY_SORT_OPTIONS = [
  { value: 'updatedAt.desc', label: 'Actualizadas recientemente' },
  { value: 'updatedAt.asc', label: 'Actualizadas hace más tiempo' },
  { value: 'name.asc', label: 'Nombre A-Z' },
  { value: 'name.desc', label: 'Nombre Z-A' },
  { value: 'status.asc', label: 'Estado: activas primero' },
  { value: 'status.desc', label: 'Estado: inactivas primero' },
] as const

type CompanyStatusFilter = (typeof COMPANY_STATUS_OPTIONS)[number]['value'] | null
type CompanySort = (typeof COMPANY_SORT_OPTIONS)[number]['value']

interface UseCompaniesHubResult {
  hub: CompanyHubPayload | null
  companies: CompanyHubItem[]
  loading: boolean
  error: string | null
  refetch: () => void
  search: string
  status: CompanyStatusFilter
  sort: CompanySort
  page: number
  selectedCompanyId: string | null
  selectedCompany: CompanyHubItem | null
  setSearch: (value: string) => void
  setStatus: (value: CompanyStatusFilter) => void
  setSort: (value: CompanySort) => void
  setPage: (value: number) => void
  setSelectedCompanyId: (value: string | null) => void
  clearFilters: () => void
}

function parseStatus(value: string | null): CompanyStatusFilter {
  if (!value) return null
  return COMPANY_STATUS_OPTIONS.some((option) => option.value === value)
    ? (value as CompanyStatusFilter)
    : null
}

function parseSort(value: string | null): CompanySort {
  if (value && COMPANY_SORT_OPTIONS.some((option) => option.value === value)) {
    return value as CompanySort
  }

  return 'updatedAt.desc'
}

function parsePage(value: string | null): number {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1
}

export function useCompaniesHub(): UseCompaniesHubResult {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [hub, setHub] = useState<CompanyHubPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const search = searchParams.get('q') ?? ''
  const status = parseStatus(searchParams.get('status'))
  const sort = parseSort(searchParams.get('sort'))
  const page = parsePage(searchParams.get('page'))
  const requestedCompanyId = searchParams.get('company')?.trim() || null

  const updateSearchParams = useCallback((updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString())

    Object.entries(updates).forEach(([key, value]) => {
      if (!value) {
        params.delete(key)
        return
      }

      params.set(key, value)
    })

    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }, [pathname, router, searchParams])

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const payload = await companyService.getCompaniesHub({
        q: search,
        status: status ?? undefined,
        sort,
        page,
      })
      setHub(payload)
    } catch (err) {
      console.error('[useCompaniesHub] Error fetching companies hub', err)
      setError('No se pudo cargar el hub de companies.')
    } finally {
      setLoading(false)
    }
  }, [page, search, sort, status])

  useEffect(() => {
    void fetch()
  }, [fetch])

  useEffect(() => {
    const normalizedUpdates: Record<string, string | null> = {}

    if (searchParams.get('status') !== status) normalizedUpdates.status = status
    if (searchParams.get('sort') !== sort && sort !== 'updatedAt.desc') normalizedUpdates.sort = sort
    if (searchParams.get('sort') && sort === 'updatedAt.desc') normalizedUpdates.sort = null
    if (searchParams.get('page') !== (page > 1 ? String(page) : null)) normalizedUpdates.page = page > 1 ? String(page) : null

    if (Object.keys(normalizedUpdates).length > 0) {
      updateSearchParams(normalizedUpdates)
    }
  }, [page, searchParams, sort, status, updateSearchParams])

  const companies = hub?.items ?? []
  const selectedCompany = useMemo(
    () => companies.find((company) => company.id === requestedCompanyId) ?? null,
    [companies, requestedCompanyId],
  )

  useEffect(() => {
    if (!requestedCompanyId) {
      return
    }

    if (hub && hub.items.length > 0 && !selectedCompany) {
      updateSearchParams({ company: null })
    }
  }, [hub, requestedCompanyId, selectedCompany, updateSearchParams])

  return {
    hub,
    companies,
    loading,
    error,
    refetch: fetch,
    search,
    status,
    sort,
    page,
    selectedCompanyId: selectedCompany?.id ?? requestedCompanyId,
    selectedCompany,
    setSearch: (value) => updateSearchParams({ q: value.trim() ? value : null, page: null }),
    setStatus: (value) => updateSearchParams({ status: value, page: null }),
    setSort: (value) => updateSearchParams({ sort: value === 'updatedAt.desc' ? null : value }),
    setPage: (value) => updateSearchParams({ page: value > 1 ? String(value) : null }),
    setSelectedCompanyId: (value) => updateSearchParams({ company: value }),
    clearFilters: () => updateSearchParams({ q: null, status: null, sort: null, page: null }),
  }
}

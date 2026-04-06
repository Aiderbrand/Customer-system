'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { resolveScopedCompanyOptions } from '@/lib/company-scope'
import { companyService } from '@/lib/services/company-service'
import type { Company } from '@/lib/types'

interface UseRealDataScopeCompaniesResult {
  companyOptions: Company[]
  loading: boolean
}

export function useRealDataScopeCompanies(): UseRealDataScopeCompaniesResult {
  const { memberships, currentUser, currentRole, actorHasSystemAdminCapability } = useAuth()
  const fallbackOptions = useMemo(
    () => resolveScopedCompanyOptions({ memberships, effectiveRole: currentRole, actorHasSystemAdminCapability }),
    [actorHasSystemAdminCapability, currentRole, memberships],
  )
  const [companyOptions, setCompanyOptions] = useState<Company[]>(fallbackOptions)
  const [loading, setLoading] = useState(Boolean(currentUser))

  const load = useCallback(async () => {
    if (!currentUser) {
      setCompanyOptions(fallbackOptions)
      setLoading(false)
      return
    }

    setLoading(true)

    try {
      const scopedOptions = await companyService.getScopedOptions()
      setCompanyOptions(scopedOptions)
    } catch {
      setCompanyOptions(fallbackOptions)
    } finally {
      setLoading(false)
    }
  }, [currentUser, fallbackOptions])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!currentUser) {
      setCompanyOptions(fallbackOptions)
    }
  }, [currentUser, fallbackOptions])

  return { companyOptions, loading }
}

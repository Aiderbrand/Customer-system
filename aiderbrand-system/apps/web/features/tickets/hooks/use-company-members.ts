'use client'

import { useCallback, useEffect, useState } from 'react'
import { apiClient } from '@/lib/api/client'

export interface CompanyMember {
  id: string
  name: string
  email: string
}

interface ApiMembership {
  userId: string
  isActive: boolean
  user: {
    id: string
    name: string
    email: string
  }
}

export function useCompanyMembers(companyId: string | null): { members: CompanyMember[]; loading: boolean } {
  const [members, setMembers] = useState<CompanyMember[]>([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async (id: string) => {
    setLoading(true)
    try {
      const data = await apiClient.request<ApiMembership[]>(
        `/companies/${id}/memberships?status=active`,
        { companyId: id },
      )
      setMembers(
        data
          .filter((m) => m.isActive)
          .map((m) => ({ id: m.user.id, name: m.user.name, email: m.user.email })),
      )
    } catch {
      setMembers([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (companyId) {
      void load(companyId)
    } else {
      setMembers([])
    }
  }, [companyId, load])

  return { members, loading }
}

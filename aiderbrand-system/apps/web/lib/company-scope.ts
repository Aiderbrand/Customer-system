import type { Company, CompanyMembership, Role } from '@/lib/types'

function dedupeCompanies(companies: Company[]): Company[] {
  const seen = new Set<string>()

  return companies.filter((company) => {
    if (seen.has(company.id)) {
      return false
    }

    seen.add(company.id)
    return true
  })
}

export function toMembershipCompanies(memberships: CompanyMembership[]): Company[] {
  return dedupeCompanies(
    memberships
      .filter((membership) => membership.isActive)
      .map((membership) => ({
        id: membership.companyId,
        name: membership.companyName,
        slug: membership.companySlug,
        createdAt: new Date(),
      })),
  )
}

export function resolveScopedCompanyOptions(params: {
  memberships: CompanyMembership[]
  effectiveRole: Role | null
  actorHasSystemAdminCapability: boolean
}): Company[] {
  return toMembershipCompanies(params.memberships)
}

export function resolveScopedCompanySelection(
  availableCompanies: Company[],
  requestedCompanyId: string | null | undefined,
): { selectedCompanyId: string | null; isAccessible: boolean } {
  if (!requestedCompanyId) {
    return { selectedCompanyId: null, isAccessible: true }
  }

  const isAccessible = availableCompanies.some((company) => company.id === requestedCompanyId)

  return {
    selectedCompanyId: isAccessible ? requestedCompanyId : null,
    isAccessible,
  }
}

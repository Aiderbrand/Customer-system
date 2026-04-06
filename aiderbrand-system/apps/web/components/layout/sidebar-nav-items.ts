import type { ActorGroup } from '@/lib/types'
import { getNavigationSectionsForActor } from '@/lib/route-policy'

export const getSidebarNavSections = (
  actorGroup: ActorGroup,
  options?: { canViewCompanies?: boolean },
) => getNavigationSectionsForActor(actorGroup, options)

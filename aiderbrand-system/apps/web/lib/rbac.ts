import type { ActorGroup, ProjectAudience, ProjectWorkspaceTabId, Role } from '@/lib/types'

export type Permission =
  | 'nav:companies'
  // Tickets
  | 'tickets:view_all'       // See all company tickets
  | 'tickets:view_own'       // See only own tickets
  | 'tickets:create'         // Create new tickets
  | 'tickets:change_status'  // Change ticket status
  | 'tickets:assign'         // Assign tickets to team members
  | 'tickets:edit'           // Edit ticket title/description/priority
  | 'tickets:delete'         // Soft-delete tickets
  | 'tickets:comment'        // Add comments
  | 'tickets:view_internal'  // See internal comments
  // Projects
  | 'projects:view'          // See projects
  | 'projects:create'        // Create projects
  | 'projects:edit'          // Edit projects
  | 'projects:delete'        // Delete projects
  | 'projects:health'        // See internal project health summary
  | 'projects:plan'          // Access Plan tab (phases + tasks)
  | 'projects:team_notes'    // Access Team Notes tab (internal chat)
  // Companies
  | 'companies:view'
  | 'companies:create'
  | 'companies:update'
  | 'companies:invite'
  | 'companies:create-project'
  | 'companies:status'
  | 'companies:memberships:update'
  | 'companies:activity:view'

const INTERNAL_PROJECT_TAB_PERMISSIONS: Partial<Record<ProjectWorkspaceTabId, Permission>> = {
  team_notes: 'projects:team_notes',
}

const ALL_PROJECT_TABS: ProjectWorkspaceTabId[] = ['plan', 'tickets', 'activity', 'team_notes']

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  SYSTEM_ADMIN: [
    'nav:companies',
    'tickets:view_all', 'tickets:create', 'tickets:change_status', 'tickets:assign',
    'tickets:edit', 'tickets:delete', 'tickets:comment', 'tickets:view_internal',
    'projects:view', 'projects:create', 'projects:edit', 'projects:delete',
    'projects:health', 'projects:plan', 'projects:team_notes',
    'companies:view', 'companies:create', 'companies:update', 'companies:invite',
    'companies:create-project', 'companies:status', 'companies:memberships:update', 'companies:activity:view',
  ],
  PROJECT_LEAD: [
    'nav:companies',
    'tickets:view_all', 'tickets:create', 'tickets:change_status', 'tickets:assign',
    'tickets:edit', 'tickets:comment', 'tickets:view_internal',
    'projects:view', 'projects:create', 'projects:edit',
    'projects:health', 'projects:plan', 'projects:team_notes',
    'companies:view', 'companies:update', 'companies:invite',
    'companies:create-project', 'companies:memberships:update',
  ],
  DELIVERY_SPECIALIST: [
    'tickets:view_all', 'tickets:change_status', 'tickets:comment', 'tickets:view_internal',
    'projects:view',
    'projects:health', 'projects:plan', 'projects:team_notes',
  ],
  ACCOUNT_OWNER: [
    'nav:companies',
    'companies:view',
    'companies:invite',
    'tickets:view_all', 'tickets:create', 'tickets:comment',
    'projects:view', 'projects:plan',
  ],
  COLLABORATOR: [
    'tickets:view_own', 'tickets:create', 'tickets:comment',
    'projects:view', 'projects:plan',
  ],
}

const INVITABLE_ROLE_MATRIX: Record<Role, Role[]> = {
  SYSTEM_ADMIN: ['ACCOUNT_OWNER', 'COLLABORATOR', 'DELIVERY_SPECIALIST'],
  PROJECT_LEAD: ['ACCOUNT_OWNER', 'COLLABORATOR', 'DELIVERY_SPECIALIST'],
  DELIVERY_SPECIALIST: [],
  ACCOUNT_OWNER: ['COLLABORATOR'],
  COLLABORATOR: [],
}

/**
 * Check if a role has a specific permission.
 */
export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false
}

/**
 * Filter items that require a specific permission.
 * Items without `requiredPermission` are always included.
 */
export function filterByPermission<T extends { requiredPermission?: Permission }>(
  items: T[],
  role: Role,
): T[] {
  return items.filter(
    (item) => !item.requiredPermission || hasPermission(role, item.requiredPermission)
  )
}

export function getInvitableRoles(role: Role): Role[] {
  return INVITABLE_ROLE_MATRIX[role] ?? []
}

export function getProjectAudienceForRole(role: Role): ProjectAudience {
  return role === 'ACCOUNT_OWNER' || role === 'COLLABORATOR' ? 'client' : 'internal'
}

export function getActorGroupForRole(role: Role): ActorGroup {
  return getProjectAudienceForRole(role)
}

export function getVisibleProjectTabs(role: Role): ProjectWorkspaceTabId[] {
  return ALL_PROJECT_TABS.filter((tabId) => canAccessProjectTab(role, tabId))
}

export function canAccessProjectTab(role: Role, tabId: ProjectWorkspaceTabId): boolean {
  const requiredPermission = INTERNAL_PROJECT_TAB_PERMISSIONS[tabId]

  if (!requiredPermission) {
    return true
  }

  return hasPermission(role, requiredPermission)
}

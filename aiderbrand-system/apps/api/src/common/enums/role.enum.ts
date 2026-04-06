/**
 * Role enum — matches Prisma schema and frontend enums.ts
 * Role lives in CompanyMembership, NOT on User.
 */
export enum Role {
  SYSTEM_ADMIN = 'SYSTEM_ADMIN',
  PROJECT_LEAD = 'PROJECT_LEAD',
  DELIVERY_SPECIALIST = 'DELIVERY_SPECIALIST',
  ACCOUNT_OWNER = 'ACCOUNT_OWNER',
  COLLABORATOR = 'COLLABORATOR',
}

/**
 * Role hierarchy — used for invite permission matrix.
 * A user can only invite users with roles <= their own level.
 */
export const ROLE_HIERARCHY: Record<Role, number> = {
  [Role.SYSTEM_ADMIN]: 100,
  [Role.PROJECT_LEAD]: 80,
  [Role.DELIVERY_SPECIALIST]: 60,
  [Role.ACCOUNT_OWNER]: 40,
  [Role.COLLABORATOR]: 20,
}

/** Roles allowed to invite other users */
export const INVITE_CAPABLE_ROLES: Role[] = [
  Role.SYSTEM_ADMIN,
  Role.PROJECT_LEAD,
  Role.ACCOUNT_OWNER,
]

/** Explicit invitation matrix — hierarchy alone is not sufficient. */
export const INVITATION_PERMISSION_MATRIX: Record<Role, Role[]> = {
  [Role.SYSTEM_ADMIN]: [
    Role.ACCOUNT_OWNER,
    Role.COLLABORATOR,
    Role.DELIVERY_SPECIALIST,
  ],
  [Role.PROJECT_LEAD]: [
    Role.ACCOUNT_OWNER,
    Role.COLLABORATOR,
    Role.DELIVERY_SPECIALIST,
  ],
  [Role.DELIVERY_SPECIALIST]: [],
  [Role.ACCOUNT_OWNER]: [Role.COLLABORATOR],
  [Role.COLLABORATOR]: [],
}

export interface CreateAuditLogDto {
  actorId?: string
  companyId?: string
  action: string
  entityType?: string
  entityId?: string
  metadata?: Record<string, unknown>
}

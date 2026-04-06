export type Role =
  | 'SYSTEM_ADMIN'
  | 'PROJECT_LEAD'
  | 'DELIVERY_SPECIALIST'
  | 'ACCOUNT_OWNER'
  | 'COLLABORATOR'

export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED'

export type TicketStatus = 'pendiente' | 'en_revision' | 'en_proceso' | 'cerrado'

export type Priority = 'baja' | 'media' | 'alta' | 'urgente'

export type ProjectStatus =
  | 'planificacion'
  | 'desarrollo'
  | 'pruebas'
  | 'revision_cliente'
  | 'produccion'
  | 'pausado'
  | 'finalizado'

export type PhaseStatus =
  | 'planificacion'
  | 'desarrollo'
  | 'pruebas'
  | 'revision'
  | 'produccion'
  | 'completada'

export type TaskStatus = 'pendiente' | 'en_progreso' | 'bloqueada' | 'completada'

export type CommentType = 'public' | 'internal'

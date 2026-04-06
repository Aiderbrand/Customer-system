import type {
  Role,
  TicketStatus,
  Priority,
  ProjectStatus,
  PhaseStatus,
  TaskStatus,
  CommentType,
  InvitationStatus,
} from './enums'

export type ProjectAudience = 'client' | 'internal'

export type ActorGroup = 'internal' | 'client'

export type ProjectHealthStatus = 'on-track' | 'at-risk' | 'breached'

export type ProjectTaskCompletionType = 'done' | 'not_applicable'

export type ProjectWorkspaceTabId = 'plan' | 'tickets' | 'activity' | 'team_notes'

export interface ViewerContext {
  actorGroup: ActorGroup
  effectiveRole: Role
  effectiveCompanyId: string | null
  availableCompanyIds: string[]
}

// ─── Attachment model (discriminated union) ───────────────────────────────────

export interface AttachmentBase {
  id: string
  name: string
  /** Byte count */
  size: number
  /** Human-readable label, e.g. "248 KB" */
  sizeLabel: string
  mimeType: string
}

/** A browser-selected file not yet persisted. objectUrl MUST be revoked on remove/unmount. */
export interface LocalAttachment extends AttachmentBase {
  source: 'local'
  file: File
  objectUrl: string
}

/** A file already persisted (or mocked as persisted) in the backend. */
export interface PersistedAttachment extends AttachmentBase {
  source: 'persisted'
  /** Download/preview URL from backend (or mock data URI). */
  url: string
  uploadedAt: Date
  uploadedById: string
}

export type Attachment = LocalAttachment | PersistedAttachment

// ─── Ticket Files (legacy shape — kept for mock data compatibility) ───────────

/** @deprecated Use PersistedAttachment instead. Kept for mock data compatibility. */
export interface TicketFile {
  id: string
  ticketId?: string
  name: string
  sizeLabel: string
  uploadedAt: Date
  uploadedById: string
  mimeType: string
}

export interface Company {
  id: string            // UUID
  name: string
  slug: string
  isActive?: boolean
  updatedAt?: Date
  createdAt: Date
}

export interface CompanyHubItem extends Company {
  isActive: boolean
  updatedAt: Date
  activeMemberCount: number
  pendingInvitationCount: number
}

export interface CompanyHubSummary {
  totalCompanies: number
  activeCompanies: number
  inactiveCompanies: number
  companiesWithPendingInvitations: number
}

export interface CompanyHubPayload {
  items: CompanyHubItem[]
  summary: CompanyHubSummary
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}

export interface CompanyActivityItem {
  id: string
  action: string
  entityType: string | null
  entityId: string | null
  actorId: string | null
  createdAt: Date
  metadata: Record<string, unknown> | null
}

export interface CompanyDetailMembershipItem {
  userId: string
  companyId: string
  role: Role
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  user: {
    id: string
    email: string
    name: string
    avatarUrl: string | null
  }
}

export interface CompanyDetailPayload {
  company: CompanyHubItem
  members: CompanyDetailMembershipItem[]
  invitations: Invitation[]
  projects: Array<never>
  activity: CompanyActivityItem[] | null
}

export interface User {
  id: string            // UUID
  name: string
  email: string
  avatarUrl?: string
  createdAt: Date
}

export interface CompanyMembership {
  companyId: string
  companyName: string
  companySlug: string
  role: Role
  isActive: boolean
}

export interface RoleSimulationSession {
  sessionId: string
  effectiveRole: Role
  startedAt: Date
}

export interface Invitation {
  id: string
  companyId: string
  email: string
  role: Role
  status: InvitationStatus
  expiresAt: Date
  createdById: string | null
  acceptedAt: Date | null
  revokedAt: Date | null
  createdAt: Date
}

export interface Project {
  id: string            // UUID
  companyId: string
  name: string
  description: string
  status: ProjectStatus
  createdAt: Date
  updatedAt: Date
}

export interface ProjectWithStats extends Project {
  ticketCount: number
  openTicketCount: number
}

export interface ProjectCanonicalContext {
  id: string
  companyId: string
  companyName: string | null
  name: string
  description: string
  status: ProjectStatus
  currentPhase: string | null
  progressPct: number | null
  targetLaunchAt: Date | null
  updatedAt: Date
  createdAt: Date
}

export interface ProjectHubItem extends ProjectCanonicalContext {
  ticketCount: number
  openTicketCount: number
  nextMilestone: string | null
  health: ProjectHealthStatus | null
  phases: ProjectPhaseSummary[]
}


export interface ProjectHubSummary {
  totalProjects: number
  activeProjects: number
  pausedProjects: number
  projectsWithOpenTickets: number
  projectsAtRisk: number | null
}

export interface ProjectHubPayload {
  audience: ProjectAudience
  summary: ProjectHubSummary
  items: ProjectHubItem[]
}

export interface ProjectPhaseSummary {
  id: string
  projectId: string
  name: string
  order: number
  status: PhaseStatus
  startsAt: Date | null
  dueAt: Date | null
  completedAt: Date | null
  ownerUserId: string | null
  ownerName: string | null
  milestone: string | null
  blocker: string | null
  isClientVisible: boolean
}

export interface ProjectPendingTaskSummary {
  id: string
  projectId: string
  phaseId: string | null
  title: string
  status: TaskStatus
  completionType: ProjectTaskCompletionType | null
  priority: Priority
  assigneeUserId: string | null
  assigneeName: string | null
  dueAt: Date | null
  dueState: 'on-track' | 'at-risk' | 'breached' | 'no-deadline'
  dependencyTaskId: string | null
  blockReason: string | null
  resolutionNote: string | null
  visibleToClient: boolean
  checklist: Array<{
    id: string
    label: string
    done: boolean
  }>
}

export interface ProjectNote {
  id: string
  projectId: string
  phaseId: string | null
  authorId: string
  authorName: string
  body: string
  parentId: string | null
  createdAt: Date
  updatedAt: Date
}

export interface ProjectNoteThread {
  root: ProjectNote
  replies: ProjectNote[]
  replyCount: number
}

export interface ProjectActivityEvent {
  id: string
  projectId: string
  type: 'project' | 'phase' | 'ticket' | 'note'
  label: string
  description: string
  happenedAt: Date
  actorUserId: string | null
}

export interface ProjectAdminSummary {
  projectLeadId: string | null
  projectLeadName: string | null
  deliveryOwnerId: string | null
  deliveryOwnerName: string | null
  targetLaunchAt: Date | null
  lastUpdatedAt: Date
  isDependencyReady: boolean
}

export interface ProjectWorkspaceSummary {
  openTickets: number
  visiblePhases: number
  nextMilestone: string | null
  health: ProjectHealthStatus | null
}

export interface ProjectWorkspaceInternalPayload {
  tasks: ProjectPendingTaskSummary[]
  notes: ProjectNote[]
  admin: ProjectAdminSummary
}

export interface ProjectWorkspacePayload {
  audience: ProjectAudience
  project: ProjectCanonicalContext
  summary: ProjectWorkspaceSummary
  phases: ProjectPhaseSummary[]
  tasks: ProjectPendingTaskSummary[]
  tickets: Pick<Ticket, 'id' | 'title' | 'status' | 'priority'>[]
  activity: ProjectActivityEvent[]
  internal?: ProjectWorkspaceInternalPayload
}

export interface ProjectWorkspaceViewerContext {
  role: Role
  currentUserId: string | null
}

export interface Ticket {
  id: string            // UUID
  companyId: string
  projectId?: string    // OPTIONAL — ticket can exist without project
  projectName?: string | null
  title: string
  description: string
  status: TicketStatus
  priority: Priority
  createdById: string
  assignedToId?: string
  assignedToName?: string | null
  assignedToEmail?: string | null
  slaDeadline: Date
  createdAt: Date
  updatedAt: Date
}

export interface TicketWithTimeline extends Ticket {
  timeline: TimelineEvent[]
  files: PersistedAttachment[]
}

export interface Comment {
  id: string            // UUID
  ticketId: string
  userId: string
  userName: string
  content: string
  type: CommentType     // 'public' | 'internal'
  createdAt: Date
}

export type TimelineEvent =
  | { type: 'comment'; data: Comment; at: Date }
  | { type: 'status_change'; data: { from: TicketStatus; to: TicketStatus; changedByName: string | null }; at: Date }
  | { type: 'assignment'; data: { assigneeName: string | null; assignedByName: string | null }; at: Date }
  | { type: 'created'; data: { createdById: string | null; createdByName: string | null }; at: Date }
  | {
      type: 'file_attachment'
      data: {
        fileNames: string[]
        uploadedById: string
        uploadedByName: string
        /** Attached persisted attachments — present when available so the timeline can render inline previews. */
        attachments?: PersistedAttachment[]
      }
      at: Date
    }

// DTOs (for create/update operations)
export interface CreateTicketDTO {
  title: string
  description: string
  priority: Priority
  projectId?: string
  /** Real browser File objects to attach to the created ticket. */
  files?: File[]
}

export interface UpdateTicketDTO {
  title?: string
  description?: string
  priority?: Priority
  projectId?: string | null   // null to unlink
}

export interface AddCommentDTO {
  content: string
  type: CommentType
}

export interface CreateProjectDTO {
  name: string
  description: string
}

export interface CreatePhaseDTO {
  name: string
  startsAt?: Date | null
  dueAt?: Date | null
  milestone?: string | null
  isClientVisible?: boolean
}

export interface ReorderPhasesDTO {
  orderedIds: string[]
}

export interface UpdatePhaseDTO {
  name?: string
  order?: number
  startsAt?: Date | null
  dueAt?: Date | null
  status?: PhaseStatus
  milestone?: string | null
  blocker?: string | null
  isClientVisible?: boolean
}

export interface CreateProjectTaskDTO {
  phaseId?: string | null
  title: string
  priority: Priority
  assigneeUserId?: string | null
  dueAt?: Date | null
}

export interface UpdateProjectTaskDTO {
  title?: string
  priority?: Priority
  status?: TaskStatus
  assigneeUserId?: string | null
  dueAt?: Date | null
  phaseId?: string | null
  order?: number
}

export interface SendNoteDTO {
  body: string
  phaseId?: string | null
  parentId?: string | null
}

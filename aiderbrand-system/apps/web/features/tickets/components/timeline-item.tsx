import {
  ArrowRight,
  UserCheck,
  Plus,
  Paperclip,
  Image as ImageIcon,
} from "lucide-react"
import {
  Avatar,
  AvatarFallback,
} from "@workspace/ui/components/avatar"
import { Badge } from "@workspace/ui/components/badge"
import { cn } from "@workspace/ui/lib/utils"
import { getPreviewUrl } from "@/features/tickets/lib/file-attachments"
import type {
  TimelineEvent,
  PersistedAttachment,
  Attachment,
} from "@/lib/types"

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * formatRelativeTime — returns a human-friendly relative time string.
 * e.g. "hace 2h", "hace 3 días", "hace 5min"
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)
  const diffWeeks = Math.floor(diffDays / 7)
  const diffMonths = Math.floor(diffDays / 30)

  if (diffSeconds < 60) return "hace un momento"
  if (diffMinutes < 60) return `hace ${diffMinutes}min`
  if (diffHours < 24) return `hace ${diffHours}h`
  if (diffDays < 7) return `hace ${diffDays} ${diffDays === 1 ? "día" : "días"}`
  if (diffWeeks < 4)
    return `hace ${diffWeeks} ${diffWeeks === 1 ? "semana" : "semanas"}`
  return `hace ${diffMonths} ${diffMonths === 1 ? "mes" : "meses"}`
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pendiente: "Pendiente",
    en_revision: "En revisión",
    en_proceso: "En proceso",
    cerrado: "Cerrado",
  }
  return labels[status] ?? status
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface TimelineItemProps {
  event: TimelineEvent
  currentUserId: string
  onOpenFile?: (attachment: Attachment) => void
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/**
 * CommentItem — chat-style message bubble.
 * Internal comments are visually differentiated with amber tint.
 * Author and relative time appear prominently at the top.
 */
function CommentItem({
  event,
  currentUserId,
}: {
  event: Extract<TimelineEvent, { type: "comment" }>
  currentUserId: string
}) {
  const { data, at } = event
  const userName = data.userName
  const initials = getInitials(userName)
  const isInternal = data.type === "internal"
  const isOwnMessage = data.userId === currentUserId

  return (
    <div className={cn("group flex gap-3", isOwnMessage && "justify-end")}>
      {/* Avatar */}
      <div className={cn("flex-shrink-0 pt-0.5", isOwnMessage && "order-2")}>
        <Avatar className="size-8 ring-2 ring-background">
          <AvatarFallback className="text-xs font-medium">{initials}</AvatarFallback>
        </Avatar>
      </div>

      {/* Message bubble */}
      <div
        className={cn(
          "max-w-[85%] min-w-0 flex-1",
          isOwnMessage && "order-1 flex justify-end"
        )}
      >
        <div className={cn("min-w-0", isOwnMessage && "max-w-xl")}>
          {/* Author + time header */}
          <div
            className={cn(
              "mb-1.5 flex flex-wrap items-baseline gap-2",
              isOwnMessage && "justify-end"
            )}
          >
            <span className="text-[13px] leading-none font-semibold text-foreground">
              {userName}
            </span>
            {isInternal && (
              <Badge
                variant="warning"
                className="h-4 px-1.5 py-0 text-[10px] font-medium"
              >
                Interno
              </Badge>
            )}
            <span className="ml-auto shrink-0 text-[11px] text-muted-foreground/70">
              {formatRelativeTime(at)}
            </span>
          </div>

          {/* Bubble */}
          <div
            className={cn(
              "rounded-xl border px-4 py-3",
              isInternal
                ? "border-amber-200/80 bg-amber-50 dark:border-amber-800/60 dark:bg-amber-950/30"
                : isOwnMessage
                  ? "border-primary/20 bg-primary/10"
                  : "border-border bg-muted/50"
            )}
          >
            <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
              {data.content}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * SystemEventItem — subtle separator-style event for status changes, assignments, etc.
 * Centered, lighter, doesn't interrupt the conversation flow.
 */
function SystemEventItem({
  icon: Icon,
  text,
  at,
}: {
  icon: React.ComponentType<{ className?: string }>
  text: string
  at: Date
}) {
  return (
    <div className="flex items-center justify-center gap-2 py-0.5">
      <div className="h-px flex-1 bg-border/60" />
      <div className="flex items-center gap-1.5 px-1 text-[11px] text-muted-foreground/70">
        <Icon className="size-3 shrink-0" aria-hidden="true" />
        <span>{text}</span>
        <span className="opacity-50">·</span>
        <span>{formatRelativeTime(at)}</span>
      </div>
      <div className="h-px flex-1 bg-border/60" />
    </div>
  )
}

/**
 * InlineImagePreview — a single tappable image thumbnail in the timeline.
 * Clicking opens the full FileViewerSheet.
 */
function InlineImagePreview({
  attachment,
  onOpen,
}: {
  attachment: PersistedAttachment
  onOpen: (a: Attachment) => void
}) {
  const previewUrl = getPreviewUrl(attachment)
  if (!previewUrl) return null

  return (
    <button
      type="button"
      onClick={() => onOpen(attachment)}
      aria-label={`Ver imagen ${attachment.name}`}
      className={cn(
        "group relative overflow-hidden rounded-lg border bg-muted/30",
        "h-24 w-24 shrink-0 cursor-zoom-in",
        "transition-all hover:scale-[1.03] hover:border-primary/40 hover:shadow-md",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={previewUrl}
        alt={attachment.name}
        className="h-full w-full object-cover"
        draggable={false}
      />
      {/* Hover overlay with magnify icon */}
      <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/20">
        <ImageIcon
          className="size-5 text-white opacity-0 drop-shadow transition-opacity group-hover:opacity-100"
          aria-hidden="true"
        />
      </div>
    </button>
  )
}

/**
 * FileAttachmentItem — renders a file_attachment event.
 *
 * - Image attachments → rendered as a chat-style message bubble (with avatar + thumbnails).
 *   Clicking a thumbnail opens the image in the lightbox (via onOpenFile).
 * - Non-image attachments (or when no preview is available) → compact centered system chip.
 *
 * The `onOpenFile` callback is responsible for routing:
 * - Images → ImageLightboxDialog
 * - Non-images → FileViewerSheet
 * (routing is handled by the parent; this component just calls onOpenFile)
 */
function FileAttachmentItem({
  event,
  currentUserId,
  onOpenFile,
}: {
  event: Extract<TimelineEvent, { type: "file_attachment" }>
  currentUserId: string
  onOpenFile?: (attachment: Attachment) => void
}) {
  const { data, at } = event
  const uploaderName = data.uploadedByName
  const initials = getInitials(uploaderName)
  const isOwnMessage = data.uploadedById === currentUserId

  // Separate image vs non-image attachments
  const imageAttachments = (data.attachments ?? []).filter(
    (a) => a.mimeType.startsWith("image/") && getPreviewUrl(a)
  )
  const nonImageCount = data.fileNames.length - imageAttachments.length

  const hasImages = imageAttachments.length > 0
  const hasOtherFiles = nonImageCount > 0

  if (!hasImages) {
    // Pure system event — no inline images available
    const fileCount = data.fileNames.length
    const fileLabel =
      fileCount === 1 ? `"${data.fileNames[0]}"` : `${fileCount} archivos`
    const text = `${uploaderName} adjuntó ${fileLabel}`
    return <SystemEventItem icon={Paperclip} text={text} at={at} />
  }

  // Rich event: chat-style bubble with inline image thumbnails
  return (
    <div className={cn("group flex gap-3", isOwnMessage && "justify-end")}>
      {/* Avatar */}
      <div className={cn("flex-shrink-0 pt-0.5", isOwnMessage && "order-2")}>
        <Avatar className="size-8 ring-2 ring-background">
          <AvatarFallback className="text-xs font-medium">
            {initials}
          </AvatarFallback>
        </Avatar>
      </div>

      {/* Bubble */}
      <div
        className={cn(
          "max-w-[85%] min-w-0 flex-1",
          isOwnMessage && "order-1 flex justify-end"
        )}
      >
        <div className={cn("min-w-0", isOwnMessage && "max-w-xl")}>
          {/* Author + time header */}
          <div
            className={cn(
              "mb-1.5 flex flex-wrap items-baseline gap-2",
              isOwnMessage && "justify-end"
            )}
          >
            <span className="text-[13px] leading-none font-semibold text-foreground">
              {uploaderName}
            </span>
            <span className="ml-auto shrink-0 text-[11px] text-muted-foreground/70">
              {formatRelativeTime(at)}
            </span>
          </div>

          {/* Image grid bubble */}
          <div
            className={cn(
              "rounded-xl border px-3 py-3",
              isOwnMessage
                ? "border-primary/20 bg-primary/10"
                : "border-border bg-muted/50"
            )}
          >
            {/* Attachment label */}
            <div className="mb-2 flex items-center gap-1.5 text-[11px] text-muted-foreground/70">
              <Paperclip className="size-3 shrink-0" aria-hidden="true" />
              <span>
                {imageAttachments.length === 1
                  ? "1 imagen adjunta"
                  : `${imageAttachments.length} imágenes adjuntas`}
                {hasOtherFiles
                  ? ` · ${nonImageCount} archivo${nonImageCount > 1 ? "s" : ""}`
                  : ""}
              </span>
            </div>

            {/* Thumbnail grid */}
            <div className="flex flex-wrap gap-2">
              {imageAttachments.map((attachment) => (
                <InlineImagePreview
                  key={attachment.id}
                  attachment={attachment}
                  onOpen={onOpenFile ?? (() => undefined)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * TimelineItem — renders a single timeline event with discriminated union.
 * Handles: comment (public/internal), status_change, assignment, created, file_attachment.
 * Pure presentational — no hooks.
 */
export function TimelineItem({
  event,
  currentUserId,
  onOpenFile,
}: TimelineItemProps) {
  if (event.type === "comment") {
    return (
      <CommentItem event={event} currentUserId={currentUserId} />
    )
  }

  if (event.type === "status_change") {
    const { data, at } = event
    const fromLabel = getStatusLabel(data.from)
    const toLabel = getStatusLabel(data.to)
    const actor = data.changedByName ?? 'Alguien'
    const text = `${actor} cambió el estado de ${fromLabel} a ${toLabel}`
    return <SystemEventItem icon={ArrowRight} text={text} at={at} />
  }

  if (event.type === "assignment") {
    const { data, at } = event
    const assignedBy = data.assignedByName ?? 'Alguien'
    const assignee = data.assigneeName ?? 'alguien'
    const text = `${assignedBy} asignó el ticket a ${assignee}`
    return <SystemEventItem icon={UserCheck} text={text} at={at} />
  }

  if (event.type === "created") {
    const { data, at } = event
    const createdByName = data.createdByName ?? 'Alguien'
    const text = `Ticket creado por ${createdByName}`
    return <SystemEventItem icon={Plus} text={text} at={at} />
  }

  if (event.type === "file_attachment") {
    return (
      <FileAttachmentItem
        event={event}
        currentUserId={currentUserId}
        onOpenFile={onOpenFile}
      />
    )
  }

  // Exhaustive — TypeScript should ensure this never runs
  return null
}

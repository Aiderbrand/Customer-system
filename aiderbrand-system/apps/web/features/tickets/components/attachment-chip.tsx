import { X, FileText, Image, File } from 'lucide-react'
import { Badge } from '@workspace/ui/components/badge'
import { truncateFilename } from '@/features/tickets/lib/file-attachments'
import type { Attachment } from '@/lib/types'

// ─── Icon helper ──────────────────────────────────────────────────────────────

function getAttachmentIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return Image
  if (
    mimeType === 'application/pdf' ||
    mimeType.includes('spreadsheet') ||
    mimeType.includes('document')
  )
    return FileText
  return File
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface AttachmentChipProps {
  attachment: Attachment
  /** If provided, shows a remove button with this callback. */
  onRemove?: () => void
  /** Maximum characters for the filename before truncation. Defaults to 40. */
  maxNameLength?: number
  /** Additional className for the root element. */
  className?: string
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * AttachmentChip — displays a single attachment with icon, name, size badge, and optional remove button.
 *
 * Used in:
 * - CreateTicketSheet: list of selected local files before submission
 * - TicketDetail sidebar: persisted file list (without remove, or with it for allowed roles)
 * - TicketReplyBox: preview of locally selected files before sending (future)
 */
export function AttachmentChip({
  attachment,
  onRemove,
  maxNameLength = 40,
  className,
}: AttachmentChipProps) {
  const Icon = getAttachmentIcon(attachment.mimeType)
  const displayName = truncateFilename(attachment.name, maxNameLength)

  return (
    <div
      className={[
        'flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* File type icon */}
      <Icon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />

      {/* Filename */}
      <span
        className="text-xs text-foreground flex-1 truncate"
        title={attachment.name}
      >
        {displayName}
      </span>

      {/* Size badge */}
      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 shrink-0">
        {attachment.sizeLabel}
      </Badge>

      {/* Remove button (optional) */}
      {onRemove && (
        <button
          type="button"
          aria-label={`Quitar ${attachment.name}`}
          onClick={onRemove}
          className="ml-0.5 text-muted-foreground hover:text-foreground transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
        >
          <X className="size-3.5" aria-hidden="true" />
        </button>
      )}
    </div>
  )
}

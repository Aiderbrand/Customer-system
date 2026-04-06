'use client'

import { useState, useCallback, useEffect } from 'react'
import {
  Download,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ExternalLink,
  X,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@workspace/ui/components/dialog'
import { Button } from '@workspace/ui/components/button'
import { cn } from '@workspace/ui/lib/utils'
import { getPreviewUrl } from '@/features/tickets/lib/file-attachments'
import type { Attachment } from '@/lib/types'

// ─── Constants ─────────────────────────────────────────────────────────────────

const ZOOM_STEP = 0.25
const ZOOM_MIN = 0.5
const ZOOM_MAX = 4

// ─── Props ─────────────────────────────────────────────────────────────────────

interface ImageLightboxDialogProps {
  /** The image attachment to display, or null when closed. */
  attachment: Attachment | null
  /** Called when the dialog requests to close. */
  onClose: () => void
}

// ─── Component ─────────────────────────────────────────────────────────────────

/**
 * ImageLightboxDialog — full-screen dialog for previewing image attachments.
 *
 * Features:
 * - Zoom in / out / reset
 * - Download
 * - Open in new tab / fullscreen path
 * - Keyboard: Escape to close (handled by Dialog primitive)
 * - Resets zoom when attachment changes
 *
 * Used exclusively for image attachments. Non-image files use FileViewerSheet.
 */
export function ImageLightboxDialog({
  attachment,
  onClose,
}: ImageLightboxDialogProps) {
  const open = attachment !== null
  const [zoom, setZoom] = useState(1)

  const previewUrl = attachment ? getPreviewUrl(attachment) : null

  // Reset zoom when the attachment changes
  useEffect(() => {
    setZoom(1)
  }, [attachment?.id])

  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (!isOpen) {
        onClose()
      }
    },
    [onClose],
  )

  const zoomIn = () => setZoom((z) => Math.min(z + ZOOM_STEP, ZOOM_MAX))
  const zoomOut = () => setZoom((z) => Math.max(z - ZOOM_STEP, ZOOM_MIN))
  const resetZoom = () => setZoom(1)

  if (!attachment || !previewUrl) return null

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn(
          'flex flex-col gap-0 p-0 overflow-hidden',
          'w-[90vw] max-w-5xl h-[90vh] max-h-[90vh]',
          'sm:rounded-xl',
        )}
      >
        {/* Accessible title/description — visually hidden, used by screen readers */}
        <DialogTitle className="sr-only">{attachment.name}</DialogTitle>
        <DialogDescription className="sr-only">
          Visor de imagen adjunta
        </DialogDescription>

        {/* ── Toolbar ── */}
        <div className="flex items-center gap-2 px-4 py-3 border-b bg-background shrink-0">
          {/* File name */}
          <span
            className="text-sm font-medium text-foreground truncate flex-1 min-w-0"
            title={attachment.name}
          >
            {attachment.name}
          </span>

          {/* Zoom controls */}
          <div className="flex items-center gap-0.5 rounded-md border bg-muted/50 p-0.5 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={zoomOut}
              disabled={zoom <= ZOOM_MIN}
              aria-label="Reducir zoom"
              title="Reducir"
            >
              <ZoomOut className="size-3.5" aria-hidden="true" />
            </Button>
            <button
              type="button"
              onClick={resetZoom}
              className={cn(
                'px-2 text-xs font-mono tabular-nums min-w-[3.5rem] text-center rounded-sm',
                'hover:bg-background transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                zoom !== 1 && 'text-primary font-semibold',
              )}
              title="Restablecer zoom"
              aria-label="Restablecer zoom"
            >
              {Math.round(zoom * 100)}%
            </button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={zoomIn}
              disabled={zoom >= ZOOM_MAX}
              aria-label="Aumentar zoom"
              title="Aumentar"
            >
              <ZoomIn className="size-3.5" aria-hidden="true" />
            </Button>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              asChild
              aria-label="Abrir en pestaña nueva"
              title="Abrir en pestaña nueva"
            >
              <a href={previewUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="size-4" aria-hidden="true" />
              </a>
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              asChild
              aria-label="Descargar imagen"
              title="Descargar"
            >
              <a href={previewUrl} download={attachment.name}>
                <Download className="size-4" aria-hidden="true" />
              </a>
            </Button>

            {/* Close button — explicit, in addition to the Dialog primitive's X */}
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={onClose}
              aria-label="Cerrar"
              title="Cerrar"
            >
              <X className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </div>

        {/* ── Image area ── */}
        <div className="flex-1 overflow-auto bg-muted/30 flex items-center justify-center min-h-0">
          <div
            className="transition-transform duration-150 ease-out p-4"
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'center center',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt={attachment.name}
              className="max-w-full max-h-[calc(90vh-4rem)] object-contain select-none rounded-md shadow-sm"
              draggable={false}
            />
          </div>
        </div>

        {/* ── Metadata footer ── */}
        {'sizeLabel' in attachment && (
          <div className="flex items-center gap-3 px-4 py-2 border-t bg-background shrink-0">
            <span className="text-xs text-muted-foreground">
              {attachment.sizeLabel}
            </span>
            <span className="text-xs text-muted-foreground">
              {attachment.mimeType}
            </span>
            {attachment.source === 'persisted' && (
              <span className="text-xs text-muted-foreground">
                {attachment.uploadedAt.toLocaleString('es-AR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

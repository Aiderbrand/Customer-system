"use client"

import { useState, useCallback } from "react"
import {
  Download,
  File,
  FileText,
  Image,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ExternalLink,
  Maximize2,
} from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@workspace/ui/components/sheet"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Separator } from "@workspace/ui/components/separator"
import { cn } from "@workspace/ui/lib/utils"
import {
  isPreviewable,
  getPreviewUrl,
} from "@/features/tickets/lib/file-attachments"
import type { Attachment } from "@/lib/types"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return Image
  if (
    mimeType === "application/pdf" ||
    mimeType.includes("spreadsheet") ||
    mimeType.includes("document")
  )
    return FileText
  return File
}

function formatDateTime(date: Date): string {
  return date.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

const ZOOM_STEP = 0.25
const ZOOM_MIN = 0.5
const ZOOM_MAX = 4

// ─── Props ────────────────────────────────────────────────────────────────────

interface FileViewerSheetProps {
  /** The attachment to preview, or null when closed. */
  attachment: Attachment | null
  /** Called when the sheet requests to close. */
  onClose: () => void
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * FileViewerSheet — displays an attachment in a right-side Sheet.
 *
 * - Images: rendered with zoom in/out/reset, fullscreen (open in new tab), and download.
 * - Other types: metadata card + fallback message with optional download.
 * - Works with both `LocalAttachment` and `PersistedAttachment`.
 */
export function FileViewerSheet({ attachment, onClose }: FileViewerSheetProps) {
  const open = attachment !== null
  const [zoom, setZoom] = useState(1)

  const previewable = attachment ? isPreviewable(attachment) : false
  const previewUrl = attachment ? getPreviewUrl(attachment) : null
  const Icon = attachment ? getFileIcon(attachment.mimeType) : File

  // Reset zoom whenever the attachment changes
  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (!isOpen) {
        setZoom(1)
        onClose()
      }
    },
    [onClose]
  )

  const zoomIn = () => setZoom((z) => Math.min(z + ZOOM_STEP, ZOOM_MAX))
  const zoomOut = () => setZoom((z) => Math.max(z - ZOOM_STEP, ZOOM_MIN))
  const resetZoom = () => setZoom(1)

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-lg"
      >
        {/* Header */}
        <SheetHeader className="px-6 pt-6 pb-4">
          <SheetTitle className="flex items-center gap-2 text-sm leading-snug font-semibold break-all">
            <Icon
              className="size-4 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
            {attachment?.name ?? ""}
          </SheetTitle>
          <SheetDescription className="sr-only">
            Visor de archivo adjunto
          </SheetDescription>
        </SheetHeader>

        <Separator />

        {/* Body */}
        {attachment && (
          <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 py-5">
            {/* Metadata badges */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="text-xs">
                {attachment.sizeLabel}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {attachment.mimeType}
              </Badge>
              {attachment.source === "persisted" && (
                <Badge variant="outline" className="text-xs">
                  {formatDateTime(attachment.uploadedAt)}
                </Badge>
              )}
              {attachment.source === "local" && (
                <Badge variant="warning" className="text-xs">
                  Seleccionado localmente
                </Badge>
              )}
            </div>

            {/* Preview area */}
            <div className="min-h-[260px] flex-1">
              {previewable && previewUrl ? (
                /* Image preview with zoom */
                <div className="flex flex-col gap-3">
                  {/* Zoom / action toolbar */}
                  <div className="flex items-center gap-1.5">
                    <div className="flex items-center gap-0.5 rounded-md border bg-background p-0.5">
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
                          "min-w-[3.5rem] rounded-sm px-2 text-center font-mono text-xs tabular-nums",
                          "transition-colors hover:bg-muted focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none",
                          zoom !== 1 && "font-semibold text-primary"
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

                    <div className="ml-auto flex items-center gap-1">
                      {/* Open in new tab — fullscreen inspect */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        asChild
                        aria-label="Abrir en pestaña nueva"
                        title="Abrir en pestaña nueva"
                      >
                        <a
                          href={previewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink
                            className="size-3.5"
                            aria-hidden="true"
                          />
                        </a>
                      </Button>

                      {/* Download */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        asChild
                        aria-label="Descargar archivo"
                        title="Descargar"
                      >
                        <a href={previewUrl} download={attachment.name}>
                          <Download className="size-3.5" aria-hidden="true" />
                        </a>
                      </Button>
                    </div>
                  </div>

                  {/* Scrollable image container */}
                  <div className="flex max-h-[60vh] min-h-[260px] items-center justify-center overflow-auto rounded-xl border bg-muted/20">
                    <div
                      className="p-2 transition-transform duration-150 ease-out"
                      style={{
                        transform: `scale(${zoom})`,
                        transformOrigin: "center center",
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={previewUrl}
                        alt={attachment.name}
                        className="max-w-full object-contain select-none"
                        draggable={false}
                      />
                    </div>
                  </div>

                  {/* Zoom hint */}
                  {zoom === 1 && (
                    <p className="text-center text-[11px] text-muted-foreground/60">
                      Usá los controles de zoom o abrí en pestaña nueva para ver
                      a tamaño completo.
                    </p>
                  )}
                </div>
              ) : (
                /* Fallback state */
                <div className="flex min-h-[260px] flex-col items-center justify-center gap-4 rounded-xl border border-dashed bg-muted/20 p-8 text-center">
                  <Icon
                    className="size-10 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <div className="max-w-xs space-y-1">
                    <p className="text-sm font-medium text-foreground">
                      Vista previa no disponible
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {attachment.source === "local"
                        ? "El archivo está seleccionado localmente. Cuando conectemos backend podrás abrirlo."
                        : "Este tipo de archivo no se puede previsualizar en el navegador."}
                    </p>
                  </div>
                  {previewUrl && (
                    <div className="flex gap-2">
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                      >
                        <a
                          href={previewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Maximize2 className="size-3.5" aria-hidden="true" />
                          Abrir
                        </a>
                      </Button>
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                      >
                        <a href={previewUrl} download={attachment.name}>
                          <Download className="size-3.5" aria-hidden="true" />
                          Descargar
                        </a>
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

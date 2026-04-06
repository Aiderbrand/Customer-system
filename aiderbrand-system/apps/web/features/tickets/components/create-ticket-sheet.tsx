'use client'

import { useState, useRef } from 'react'
import { Paperclip } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@workspace/ui/components/dialog'
import { Input } from '@workspace/ui/components/input'
import { Label } from '@workspace/ui/components/label'
import { Textarea } from '@workspace/ui/components/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import { Button } from '@workspace/ui/components/button'
import { Separator } from '@workspace/ui/components/separator'
import { UnsavedChangesDialog } from '@/components/shared/unsaved-changes-dialog'
import { ticketService } from '@/lib/services/ticket-service'
import { createTicketSchema } from '@/features/tickets/types'
import { useFileAttachments } from '@/features/tickets/hooks/use-file-attachments'
import { AttachmentChip } from '@/features/tickets/components/attachment-chip'
import type { CreateTicketFormValues } from '@/features/tickets/types'
import type { Ticket } from '@/lib/types'
import { toast } from 'sonner'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CreateTicketSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: (ticket: Ticket) => void
  /** Pre-select project if coming from project view */
  defaultProjectId?: string
  projects: { id: string; name: string }[]
  companyId: string
  createdById: string
}

// ─── Initial form values ──────────────────────────────────────────────────────

const EMPTY_FORM: CreateTicketFormValues = {
  title: '',
  description: '',
  priority: 'media',
  projectId: undefined,
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * CreateTicketSheet — modal form to create a new ticket.
 * - Manual zod validation (no react-hook-form)
 * - UnsavedChanges guard: if form is dirty and user tries to close, shows confirmation
 * - Real browser file selection via hidden <input type="file" multiple>
 * - Uses useFileAttachments hook for lifecycle management (objectUrl cleanup)
 */
export function CreateTicketSheet({
  open,
  onOpenChange,
  onCreated,
  defaultProjectId,
  projects,
  companyId,
  createdById,
}: CreateTicketSheetProps) {
  // ─── Form state ─────────────────────────────────────────────────────────────
  const [values, setValues] = useState<CreateTicketFormValues>({
    ...EMPTY_FORM,
    projectId: defaultProjectId,
  })
  const [errors, setErrors] = useState<Partial<Record<keyof CreateTicketFormValues, string>>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isDirty, setIsDirty] = useState(false)

  // ─── File attachments (real browser files) ──────────────────────────────────
  const { attachments, addFiles, removeFile: removeAttachment, clear: clearAttachments } = useFileAttachments()

  // Hidden file input ref
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ─── Unsaved changes guard ───────────────────────────────────────────────────
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false)

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  function resetForm() {
    setValues({ ...EMPTY_FORM, projectId: defaultProjectId })
    setErrors({})
    setSubmitError(null)
    setIsDirty(false)
    clearAttachments()
  }

  function handleOpenFilePicker() {
    fileInputRef.current?.click()
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (files && files.length > 0) {
      addFiles(files)
      setIsDirty(true)
    }
    // Reset input so same file can be picked again if needed
    e.target.value = ''
  }

  function handleFieldChange<K extends keyof CreateTicketFormValues>(
    field: K,
    value: CreateTicketFormValues[K],
  ) {
    setValues((prev) => ({ ...prev, [field]: value }))
    setIsDirty(true)
    // Clear field error on change
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }

  // ─── Close guard ─────────────────────────────────────────────────────────────

   /**
    * Called whenever something tries to change the dialog open state.
    * If dirty → intercept and show unsaved dialog.
    * If clean → close immediately.
    */
  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen && isDirty) {
      // Intercept — show confirmation
      setShowUnsavedDialog(true)
      return
    }
    onOpenChange(nextOpen)
    if (!nextOpen) resetForm()
  }

  function handleUnsavedConfirm() {
    // User chose to discard
    setShowUnsavedDialog(false)
    onOpenChange(false)
    resetForm()
  }

  function handleUnsavedCancel() {
    // User chose to keep editing
    setShowUnsavedDialog(false)
  }

  // ─── Submit ──────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    // Validate
    const result = createTicketSchema.safeParse(values)
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof CreateTicketFormValues, string>> = {}
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof CreateTicketFormValues
        if (field && !fieldErrors[field]) {
          fieldErrors[field] = issue.message
        }
      }
      setErrors(fieldErrors)
      return
    }

    setSubmitting(true)
    setSubmitError(null)

    try {
      const dto = {
        title: result.data.title,
        description: result.data.description ?? '',
        priority: result.data.priority,
        projectId: result.data.projectId,
        // Pass real File objects from attachments
        files: attachments.length > 0 ? attachments.map((a) => a.file) : undefined,
      }
      const created = await ticketService.createTicket(companyId, dto, createdById)
      onCreated?.(created)
      toast.success('Ticket creado', {
        description: 'El ticket ya quedó disponible en el listado principal.',
      })
      onOpenChange(false)
      resetForm()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al crear el ticket'
      setSubmitError(message)
      toast.error('No se pudo crear el ticket', {
        description: message,
      })
    } finally {
      setSubmitting(false)
    }
  }

  // ─── Derived ─────────────────────────────────────────────────────────────────

  const descriptionLength = (values.description ?? '').length
  const MAX_DESCRIPTION = 2000

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Hidden file input — triggered by the Agregar archivo button */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
        onChange={handleFileInputChange}
        disabled={submitting}
      />

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="flex max-h-[min(90svh,760px)] flex-col overflow-hidden p-0 sm:max-w-2xl">
          <DialogHeader className="border-b px-6 py-6">
            <DialogTitle>Nuevo ticket</DialogTitle>
            <DialogDescription>
              Completá los datos del ticket. Los campos marcados con * son obligatorios.
            </DialogDescription>
          </DialogHeader>

          <form
            id="create-ticket-form"
            onSubmit={handleSubmit}
            className="flex flex-1 flex-col gap-4 overflow-y-auto p-6"
          >
            {/* Título */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ticket-title">
                Título <span aria-hidden="true">*</span>
              </Label>
              <Input
                id="ticket-title"
                placeholder="Describí brevemente el problema o solicitud"
                value={values.title}
                onChange={(e) => handleFieldChange('title', e.target.value)}
                maxLength={200}
                aria-invalid={!!errors.title}
                aria-describedby={errors.title ? 'ticket-title-error' : undefined}
                disabled={submitting}
              />
              {errors.title && (
                <p id="ticket-title-error" className="text-sm text-destructive">
                  {errors.title}
                </p>
              )}
            </div>

            {/* Descripción */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ticket-description">Descripción</Label>
              <Textarea
                id="ticket-description"
                placeholder="Detallá el problema, pasos para reproducirlo, contexto relevante..."
                value={values.description ?? ''}
                onChange={(e) => handleFieldChange('description', e.target.value)}
                maxLength={MAX_DESCRIPTION}
                rows={4}
                aria-invalid={!!errors.description}
                aria-describedby={errors.description ? 'ticket-desc-error' : 'ticket-desc-count'}
                disabled={submitting}
              />
              <div className="flex items-center justify-between">
                {errors.description ? (
                  <p id="ticket-desc-error" className="text-sm text-destructive">
                    {errors.description}
                  </p>
                ) : (
                  <span />
                )}
                <p
                  id="ticket-desc-count"
                  className="text-xs text-muted-foreground ml-auto"
                  aria-live="polite"
                >
                  {descriptionLength}/{MAX_DESCRIPTION}
                </p>
              </div>
            </div>

            {/* Prioridad */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ticket-priority">
                Prioridad <span aria-hidden="true">*</span>
              </Label>
              <Select
                value={values.priority}
                onValueChange={(val) =>
                  handleFieldChange('priority', val as CreateTicketFormValues['priority'])
                }
                disabled={submitting}
              >
                <SelectTrigger id="ticket-priority" aria-invalid={!!errors.priority}>
                  <SelectValue placeholder="Seleccioná una prioridad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="baja">Baja</SelectItem>
                  <SelectItem value="media">Media</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
              {errors.priority && (
                <p className="text-sm text-destructive">{errors.priority}</p>
              )}
            </div>

            {/* Proyecto (opcional) */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ticket-project">Proyecto</Label>
              <Select
                value={values.projectId ?? '__none__'}
                onValueChange={(val) =>
                  handleFieldChange('projectId', val === '__none__' ? undefined : val)
                }
                disabled={submitting}
              >
                <SelectTrigger id="ticket-project">
                  <SelectValue placeholder="Sin proyecto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sin proyecto</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Archivos */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label>Archivos</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 px-2.5 text-xs gap-1.5"
                  onClick={handleOpenFilePicker}
                  disabled={submitting}
                  aria-label="Agregar archivo desde el dispositivo"
                >
                  <Paperclip className="size-3.5" aria-hidden="true" />
                  Agregar archivo
                </Button>
              </div>

              {attachments.length === 0 ? (
                <p className="text-xs text-muted-foreground py-1">
                  Sin archivos adjuntos.
                </p>
              ) : (
                <ul className="flex flex-col gap-1.5" aria-label="Archivos seleccionados">
                  {attachments.map((attachment) => (
                    <li key={attachment.id}>
                      <AttachmentChip
                        attachment={attachment}
                        onRemove={!submitting ? () => removeAttachment(attachment.id) : undefined}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Submit error */}
            {submitError && (
              <p className="text-sm text-destructive" role="alert">
                {submitError}
              </p>
            )}
          </form>

          <DialogFooter className="border-t px-6 py-4 sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form="create-ticket-form"
              disabled={submitting}
            >
              {submitting ? 'Creando...' : 'Crear ticket'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unsaved changes guard */}
      <UnsavedChangesDialog
        open={showUnsavedDialog}
        onConfirm={handleUnsavedConfirm}
        onCancel={handleUnsavedCancel}
      />
    </>
  )
}

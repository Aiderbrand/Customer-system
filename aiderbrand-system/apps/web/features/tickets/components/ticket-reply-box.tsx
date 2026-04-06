'use client'

import { useState, useEffect, useRef } from 'react'
import { Lock, Paperclip, Send } from 'lucide-react'
import { Textarea } from '@workspace/ui/components/textarea'
import { Button } from '@workspace/ui/components/button'
import { cn } from '@workspace/ui/lib/utils'
import type { CommentType } from '@/lib/types'

// ─── Props ────────────────────────────────────────────────────────────────────

interface TicketReplyBoxProps {
  onSubmit: (content: string, type: CommentType) => Promise<void>
  canPostInternal: boolean
  disabled?: boolean
  /** Called whenever the dirty state changes so parent can track it */
  onDirtyChange?: (dirty: boolean) => void
  /**
   * Called when the user selects files via the attach button.
   * The reply box itself does NOT manage attached files state —
   * that is done by the parent (TicketDetail / container).
   */
  onAttachFiles?: (files: File[]) => void
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * TicketReplyBox — textarea + optional type toggle + submit button.
 * Manages local state: content, comment type, submitting state.
 * Expone dirty state al contenedor para que el guard viva una sola vez.
 * 'use client' — has local state.
 */
export function TicketReplyBox({
  onSubmit,
  canPostInternal,
  disabled = false,
  onDirtyChange,
  onAttachFiles,
}: TicketReplyBoxProps) {
  const [content, setContent] = useState('')
  const [type, setType] = useState<CommentType>('public')
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isDirty = content.trim().length > 0

  // Notify parent of dirty state changes
  useEffect(() => {
    onDirtyChange?.(isDirty)
  }, [isDirty, onDirtyChange])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isDirty || submitting || disabled) return

    setSubmitting(true)
    try {
      await onSubmit(content.trim(), type)
      // Clear on success
      setContent('')
      setType('public')
    } finally {
      setSubmitting(false)
    }
  }
  function handleAttachClick() {
    fileInputRef.current?.click()
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return
    onAttachFiles?.(Array.from(files))
    // Reset input so the same file can be re-selected if needed
    e.target.value = ''
  }

  const isDisabled = disabled || submitting

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3"
      aria-label="Responder al ticket"
    >
        {/* Hidden file input — triggered by Paperclip button */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="sr-only"
          aria-hidden="true"
          tabIndex={-1}
          onChange={handleFileChange}
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip"
        />

        {/* Textarea */}
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={
            type === 'internal'
              ? 'Escribí una nota interna (solo visible para el equipo)...'
              : 'Escribí una respuesta...'
          }
          disabled={isDisabled}
          rows={4}
          className={cn(
            'resize-none',
            type === 'internal' &&
              'border-amber-300 bg-amber-50/50 dark:border-amber-700 dark:bg-amber-950/20',
          )}
          aria-label="Contenido del comentario"
        />

        {/* Footer: single row — char count | internal toggle | attach | send */}
        <div className="flex items-center gap-1.5">
          {/* Char count */}
          <span className="text-xs text-muted-foreground tabular-nums min-w-[4.5rem]" aria-live="polite" aria-atomic="true">
            {content.length > 0 ? `${content.length} car.` : ''}
          </span>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Internal toggle */}
          {canPostInternal && (
            <Button
              type="button"
              variant={type === 'internal' ? 'secondary' : 'ghost'}
              size="sm"
              disabled={isDisabled}
              className={cn(
                'h-7 gap-1.5 px-2.5 text-xs',
                type === 'internal' &&
                  'border border-amber-300 bg-amber-100 text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
              )}
              onClick={() => setType((prev) => (prev === 'internal' ? 'public' : 'internal'))}
            >
              <Lock className="size-3.5" aria-hidden="true" />
              {type === 'internal' ? 'Interna' : 'Pública'}
            </Button>
          )}

          {/* Attach files button */}
          {onAttachFiles && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isDisabled}
              className="h-7 w-7 p-0"
              onClick={handleAttachClick}
              aria-label="Adjuntar archivos"
            >
              <Paperclip className="size-3.5" aria-hidden="true" />
            </Button>
          )}

          {/* Send */}
          <Button type="submit" disabled={!isDirty || isDisabled} size="sm">
            <Send className="size-3.5" aria-hidden="true" />
            {submitting ? 'Enviando...' : 'Enviar'}
          </Button>
        </div>
    </form>
  )
}

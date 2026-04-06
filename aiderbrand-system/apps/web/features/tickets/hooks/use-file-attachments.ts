'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import type { LocalAttachment } from '@/lib/types'
import { fileToLocalAttachment, revokeObjectUrl } from '@/features/tickets/lib/file-attachments'

// ─── Counter for unique IDs ───────────────────────────────────────────────────

let _idCounter = 0
function nextAttachmentId(): string {
  return `local-${Date.now()}-${++_idCounter}`
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface UseFileAttachmentsReturn {
  /** Currently selected local attachments. */
  attachments: LocalAttachment[]
  /** Add one or more files (from a FileList or array). */
  addFiles: (files: FileList | File[]) => void
  /** Remove a single attachment by id and revoke its objectUrl. */
  removeFile: (id: string) => void
  /** Remove all attachments and revoke all objectUrls. */
  clear: () => void
}

/**
 * useFileAttachments — manages browser-local file selections.
 *
 * - Creates objectUrls on add.
 * - Revokes objectUrls on remove, clear, and component unmount.
 * - Designed to power both CreateTicketSheet and TicketReplyBox.
 */
export function useFileAttachments(): UseFileAttachmentsReturn {
  const [attachments, setAttachments] = useState<LocalAttachment[]>([])

  // Track URLs separately so unmount cleanup always has the latest set,
  // even if state updates haven't flushed.
  const urlsRef = useRef<Map<string, string>>(new Map())

  const addFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files)
    if (fileArray.length === 0) return

    const newAttachments = fileArray.map((file) => {
      const id = nextAttachmentId()
      const attachment = fileToLocalAttachment(file, id)
      urlsRef.current.set(id, attachment.objectUrl)
      return attachment
    })

    setAttachments((prev) => [...prev, ...newAttachments])
  }, [])

  const removeFile = useCallback((id: string) => {
    setAttachments((prev) => {
      const target = prev.find((a) => a.id === id)
      if (target) {
        revokeObjectUrl(target.objectUrl)
        urlsRef.current.delete(id)
      }
      return prev.filter((a) => a.id !== id)
    })
  }, [])

  const clear = useCallback(() => {
    setAttachments((prev) => {
      for (const attachment of prev) {
        revokeObjectUrl(attachment.objectUrl)
      }
      urlsRef.current.clear()
      return []
    })
  }, [])

  // Revoke all URLs on unmount
  useEffect(() => {
    return () => {
      for (const url of urlsRef.current.values()) {
        revokeObjectUrl(url)
      }
      urlsRef.current.clear()
    }
  }, [])

  return { attachments, addFiles, removeFile, clear }
}

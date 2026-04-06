'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

interface UseUnsavedChangesGuardOptions {
  enabled: boolean
}

export function useUnsavedChangesGuard({ enabled }: UseUnsavedChangesGuardOptions) {
  const router = useRouter()
  const [confirmationOpen, setConfirmationOpen] = useState(false)
  const pendingActionRef = useRef<(() => void) | null>(null)
  const bypassRef = useRef(false)

  const requestConfirmation = useCallback(
    (action: () => void) => {
      if (!enabled) {
        action()
        return
      }

      pendingActionRef.current = action
      setConfirmationOpen(true)
    },
    [enabled],
  )

  const cancelNavigation = useCallback(() => {
    pendingActionRef.current = null
    setConfirmationOpen(false)
  }, [])

  const confirmNavigation = useCallback(() => {
    const action = pendingActionRef.current

    pendingActionRef.current = null
    setConfirmationOpen(false)

    if (!action) {
      return
    }

    bypassRef.current = true
    action()

    window.setTimeout(() => {
      bypassRef.current = false
    }, 0)
  }, [])

  useEffect(() => {
    if (!enabled) {
      return
    }

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault()
      event.returnValue = ''
    }

    function handleDocumentClick(event: MouseEvent) {
      if (
        event.defaultPrevented
        || event.button !== 0
        || event.metaKey
        || event.ctrlKey
        || event.shiftKey
        || event.altKey
      ) {
        return
      }

      const target = event.target

      if (!(target instanceof Element)) {
        return
      }

      const anchor = target.closest('a[href]')

      if (!(anchor instanceof HTMLAnchorElement)) {
        return
      }

      if (anchor.target === '_blank' || anchor.hasAttribute('download')) {
        return
      }

      const nextUrl = new URL(anchor.href, window.location.href)

      if (nextUrl.origin !== window.location.origin) {
        return
      }

      const currentUrl = new URL(window.location.href)

      if (nextUrl.href === currentUrl.href) {
        return
      }

      event.preventDefault()
      requestConfirmation(() => {
        router.push(`${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`)
      })
    }

    function handlePopState() {
      if (bypassRef.current) {
        return
      }

      window.history.go(1)
      requestConfirmation(() => {
        window.history.back()
      })
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('popstate', handlePopState)
    document.addEventListener('click', handleDocumentClick, true)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('popstate', handlePopState)
      document.removeEventListener('click', handleDocumentClick, true)
    }
  }, [enabled, requestConfirmation, router])

  return {
    confirmationOpen,
    confirmNavigation,
    cancelNavigation,
  }
}

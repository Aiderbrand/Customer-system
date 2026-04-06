'use client'

import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { useAuth } from '@/contexts/auth-context'
import { resolveRouteAccess } from '@/lib/route-policy'

export function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const {
    status,
    isAuthenticated,
    actorGroup,
    effectiveCompanyId,
    hasPermission,
  } = useAuth()

  const access = status === 'authenticated' && isAuthenticated && actorGroup
    ? resolveRouteAccess({
        pathname,
        viewer: {
          actorGroup,
          effectiveCompanyId,
          hasCapability: hasPermission,
        },
      })
    : null

  useEffect(() => {
    if (status === 'unauthenticated' || (status === 'authenticated' && !isAuthenticated)) {
      const redirect = pathname ? `?redirect=${encodeURIComponent(pathname)}` : ''
      router.replace(`/login${redirect}`)
      return
    }

    if (access?.redirectTo && access.redirectTo !== pathname) {
      router.replace(access.redirectTo)
    }
  }, [access?.redirectTo, isAuthenticated, pathname, router, status])

  if (status === 'loading') {
    return (
      <div className="flex flex-1 flex-col gap-4 p-6">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  if (access && (!access.allowed || access.redirectTo)) {
    return null
  }

  return <>{children}</>
}

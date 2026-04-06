'use client'

import { Fragment } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@workspace/ui/components/breadcrumb'
import { useAuth } from '@/contexts/auth-context'
import { normalizeBreadcrumbSegments, resolveActorLandingPath } from '@/lib/route-policy'

// ─── Segment label map ────────────────────────────────────────────────────────

const SEGMENT_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  tickets: 'Tickets',
  projects: 'Proyectos',
  companies: 'Companies',
}

// ─── UUID-like pattern detection ──────────────────────────────────────────────

const UUID_PATTERN = /^[0-9a-f-]{8,}$/i

function isUuidLike(segment: string): boolean {
  return UUID_PATTERN.test(segment)
}

function labelForSegment(segment: string): string {
  if (SEGMENT_LABELS[segment]) return SEGMENT_LABELS[segment]
  if (isUuidLike(segment)) return 'Detalle'
  // Fallback: capitalise and replace hyphens
  return segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ')
}

// ─── BreadcrumbNav ────────────────────────────────────────────────────────────

export function BreadcrumbNav() {
  const pathname = usePathname()
  const { actorGroup } = useAuth()

  // Split pathname into non-empty segments (skip the leading `/`)
  const rawSegments = normalizeBreadcrumbSegments(pathname)
  const homeHref = actorGroup ? resolveActorLandingPath(actorGroup) : '/dashboard'

  // Build cumulative href list for each segment
  const segments = rawSegments.map((segment, index) => ({
    label: labelForSegment(segment),
    href: '/' + rawSegments.slice(0, index + 1).join('/'),
    isLast: index === rawSegments.length - 1,
  }))

  // Always anchor from Dashboard when at root or deeper
  const showHome = pathname !== homeHref

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {showHome && (
          <>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                  <Link href={homeHref}>Dashboard</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            {segments.length > 0 && <BreadcrumbSeparator />}
          </>
        )}

        {segments.map((segment) => (
          <Fragment key={segment.href}>
            <BreadcrumbItem>
              {segment.isLast ? (
                <BreadcrumbPage>{segment.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild className="hidden md:block">
                  <Link href={segment.href}>{segment.label}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
            {!segment.isLast && <BreadcrumbSeparator className="hidden md:block" />}
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}

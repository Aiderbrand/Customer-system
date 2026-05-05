'use client'

import { useState } from 'react'
import { CheckCircle2, ChevronDown } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu'
import type { PhaseStatus, ProjectPhaseSummary } from '@/lib/types'
import { PHASE_STATUS_CONFIG, PHASE_STATUS_ORDER } from './project-phases-shared'

// ─── Component ────────────────────────────────────────────────────────────────

export function PhaseStatusSelector({
  phase,
  onStatusChange,
}: {
  phase: ProjectPhaseSummary
  onStatusChange: (phase: ProjectPhaseSummary, status: PhaseStatus) => Promise<void>
}) {
  const cfg = PHASE_STATUS_CONFIG[phase.status]
  const [loading, setLoading] = useState(false)

  async function handleSelect(status: PhaseStatus) {
    if (status === phase.status) return
    setLoading(true)
    try {
      await onStatusChange(phase, status)
    } finally {
      setLoading(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          onClick={(e) => e.stopPropagation()}
          disabled={loading}
          className={[
            'inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
            cfg.badge,
            loading ? 'opacity-50' : '',
          ].join(' ')}
        >
          <span className={['h-1.5 w-1.5 rounded-full', cfg.dot].join(' ')} />
          {cfg.label}
          <ChevronDown className="h-3 w-3 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[160px]">
        {PHASE_STATUS_ORDER.map((status) => {
          const c = PHASE_STATUS_CONFIG[status]
          return (
            <DropdownMenuItem
              key={status}
              onClick={(e) => {
                e.stopPropagation()
                handleSelect(status)
              }}
              className="flex items-center gap-2 text-sm"
            >
              <span className={['h-2 w-2 rounded-full', c.dot].join(' ')} />
              {c.label}
              {status === phase.status && (
                <CheckCircle2 className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
              )}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

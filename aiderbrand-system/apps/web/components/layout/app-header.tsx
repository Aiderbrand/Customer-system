'use client'

import { LogOut, ShieldAlert } from 'lucide-react'
import { SidebarTrigger } from '@workspace/ui/components/sidebar'
import { Separator } from '@workspace/ui/components/separator'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { Alert, AlertDescription, AlertTitle } from '@workspace/ui/components/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import { BreadcrumbNav } from './breadcrumb-nav'
import { useAuth } from '@/contexts/auth-context'
import type { Role } from '@/lib/types'

// ─── Role labels ──────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<Role, string> = {
  SYSTEM_ADMIN: 'System Admin',
  PROJECT_LEAD: 'Project Lead',
  DELIVERY_SPECIALIST: 'Delivery Specialist',
  ACCOUNT_OWNER: 'Account Owner',
  COLLABORATOR: 'Collaborator',
}

const HEADER_ROLE_OPTIONS: Role[] = [
  'SYSTEM_ADMIN',
  'PROJECT_LEAD',
  'DELIVERY_SPECIALIST',
  'ACCOUNT_OWNER',
  'COLLABORATOR',
]

function RoleSwitcher() {
  const { actorHasSystemAdminCapability, currentRole, actorGroup, startRoleSimulation } = useAuth()

  if (!currentRole || !actorGroup) {
    return null
  }

  if (!actorHasSystemAdminCapability) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="outline">{actorGroup === 'internal' ? 'Internal' : 'Client'}</Badge>
        <Badge variant="secondary">{ROLE_LABELS[currentRole]}</Badge>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Badge variant="outline">{actorGroup === 'internal' ? 'Internal' : 'Client'}</Badge>
      <Select value={currentRole} onValueChange={(value) => void startRoleSimulation(value as Role)}>
        <SelectTrigger className="h-8 w-[200px] lg:w-[220px]" aria-label="Elegir rol efectivo">
          <SelectValue placeholder="Rol efectivo" />
        </SelectTrigger>
        <SelectContent>
          {HEADER_ROLE_OPTIONS.map((role) => (
            <SelectItem key={role} value={role} className="text-xs">
              {ROLE_LABELS[role]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function SimulationBanner() {
  const { simulation } = useAuth()

  if (!simulation) {
    return null
  }

  return (
    <Alert className="mx-4 mt-3 min-w-0 overflow-hidden border-warning/50 bg-warning/10 md:mx-6">
      <div className="flex min-w-0 items-start gap-3">
        <ShieldAlert className="mt-0.5" />
        <div className="flex min-w-0 flex-col gap-1">
          <AlertTitle>Simulación activa</AlertTitle>
          <AlertDescription className="break-words">
            Operando como <strong>{ROLE_LABELS[simulation.effectiveRole]}</strong>. Elegí{' '}
            <strong>{ROLE_LABELS.SYSTEM_ADMIN}</strong> para cerrar la simulación.
          </AlertDescription>
        </div>
      </div>
    </Alert>
  )
}

// ─── AppHeader ────────────────────────────────────────────────────────────────

export function AppHeader() {
  const { logout } = useAuth()

  return (
    <header className="sticky top-0 z-30 min-w-0 max-w-full overflow-x-clip border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex h-16 min-w-0 w-full max-w-full shrink-0 items-center gap-2 overflow-hidden px-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 md:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
        <div className="min-w-0 flex-1">
          <BreadcrumbNav />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div className="hidden md:block">
            <RoleSwitcher />
          </div>
          <Button variant="ghost" size="sm" onClick={() => void logout()}>
            <LogOut className="size-4" />
            <span className="hidden sm:inline">Cerrar sesión</span>
          </Button>
        </div>
      </div>
      <SimulationBanner />
    </header>
  )
}

import type { ComponentType } from 'react'
import Link from 'next/link'
import {
  Ticket,
  CircleDot,
  AlertTriangle,
  User,
  FolderOpen,
} from 'lucide-react'
import {
  Badge,
} from '@workspace/ui/components/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import { AppPageHeader } from '@/components/layout/app-page'
import type { ActorGroup, Role } from '@/lib/types'

// ─── Role labels ──────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<Role, string> = {
  SYSTEM_ADMIN: 'System Admin',
  PROJECT_LEAD: 'Project Lead',
  DELIVERY_SPECIALIST: 'Delivery Specialist',
  ACCOUNT_OWNER: 'Account Owner',
  COLLABORATOR: 'Collaborator',
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DashboardStats {
  totalTickets: number
  openTickets: number
  criticalTickets: number
  myTickets: number
  totalProjects: number
  showMyTickets: boolean
}

interface DashboardViewProps {
  actorGroup: ActorGroup
  userName: string
  userRole: Role
  stats: DashboardStats
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string
  value: number
  icon: ComponentType<{ className?: string }>
  href: string
}

function StatCard({ label, value, icon: Icon, href }: StatCardProps) {
  return (
    <Link
      href={href}
      className="group block outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
    >
      <Card className="h-full transition-shadow group-hover:shadow-md group-focus-visible:shadow-md">
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {label}
          </CardTitle>
          <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-foreground">{value}</p>
        </CardContent>
      </Card>
    </Link>
  )
}

// ─── DashboardView ────────────────────────────────────────────────────────────

/**
 * DashboardView — pure presentational dashboard.
 * Shows a role-based greeting and actionable stats grid.
 * No hooks, no data fetching — all data comes from props.
 */
export function DashboardView({ actorGroup, userName, userRole, stats }: DashboardViewProps) {
  const {
    totalTickets,
    openTickets,
    criticalTickets,
    myTickets,
    totalProjects,
    showMyTickets,
  } = stats

  const isInternal = actorGroup === 'internal'

  return (
    <div className="flex flex-col gap-6">
      <AppPageHeader
        title={`Buenos días, ${userName}`}
        description={isInternal
          ? 'Vista operativa para coordinar tickets, proyectos y seguimiento interno.'
          : 'Seguimiento claro de tus proyectos y tickets compartidos.'}
        badge={<Badge variant="secondary">{ROLE_LABELS[userRole]}</Badge>}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total tickets"
          value={totalTickets}
          icon={Ticket}
          href="/tickets"
        />

        <StatCard
          label="Tickets abiertos"
          value={openTickets}
          icon={CircleDot}
          href="/tickets"
        />

        <StatCard
          label="Urgentes / Altos"
          value={criticalTickets}
          icon={AlertTriangle}
          href="/tickets"
        />

        {isInternal && showMyTickets ? (
          <StatCard
            label="Mis tickets"
            value={myTickets}
            icon={User}
            href="/tickets"
          />
        ) : (
          <StatCard
            label={isInternal ? 'Proyectos activos' : 'Proyectos visibles'}
            value={totalProjects}
            icon={FolderOpen}
            href="/projects"
          />
        )}
      </div>

      {/* Second row — always show projects for roles that see my tickets */}
      {isInternal && showMyTickets && (
        <Card>
          <CardHeader>
            <CardTitle>Acción rápida</CardTitle>
            <CardDescription>Acceso directo al hub operativo de proyectos.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:max-w-xs">
            <StatCard
              label="Proyectos activos"
              value={totalProjects}
              icon={FolderOpen}
              href="/projects"
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}

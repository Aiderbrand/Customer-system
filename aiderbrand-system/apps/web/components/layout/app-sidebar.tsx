'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronsUpDown, LogOut } from 'lucide-react'

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@workspace/ui/components/sidebar'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@workspace/ui/components/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu'

import { useAuth } from '@/contexts/auth-context'
import { resolveActorLandingPath } from '@/lib/route-policy'
import { getSidebarNavSections } from './sidebar-nav-items'

// ─── Role label map ───────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  SYSTEM_ADMIN: 'Admin',
  PROJECT_LEAD: 'Project Lead',
  DELIVERY_SPECIALIST: 'Delivery',
  ACCOUNT_OWNER: 'Owner',
  COLLABORATOR: 'Colaborador',
}

// ─── Avatar initials helper ───────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

// ─── AppSidebar ───────────────────────────────────────────────────────────────

export function AppSidebar() {
  const { currentUser, currentCompany, currentRole, actorGroup, hasPermission, logout } = useAuth()
  const pathname = usePathname()

  if (!currentUser || !currentCompany || !currentRole || !actorGroup) {
    return null
  }

  const homeHref = resolveActorLandingPath(actorGroup)
  const visibleSections = getSidebarNavSections(actorGroup, {
    canViewCompanies: hasPermission('companies:view'),
  })

  return (
    <Sidebar collapsible="icon">
      {/* ── Header: company name ─────────────────────────────────────────── */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href={homeHref}>
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground font-bold text-sm">
                  {currentCompany.name[0]?.toUpperCase() ?? 'A'}
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{currentCompany.name}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {actorGroup === 'internal' ? 'Operación interna' : 'Portal cliente'}
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* ── Content: nav sections ─────────────────────────────────────────── */}
      <SidebarContent>
        {visibleSections.map((section) => (
          <SidebarGroup key={section.label}>
            <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={isActive}>
                        <Link href={item.href}>
                          <item.icon />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      {/* ── Footer: user card with dropdown ──────────────────────────────── */}
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    {currentUser.avatarUrl && (
                      <AvatarImage src={currentUser.avatarUrl} alt={currentUser.name} />
                    )}
                    <AvatarFallback className="rounded-lg">
                      {getInitials(currentUser.name)}
                    </AvatarFallback>
                  </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">{currentUser.name}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        {ROLE_LABELS[currentRole] ?? currentRole}
                      </span>
                    </div>
                  <ChevronsUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side="bottom"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuItem className="gap-2">
                  <div className="flex size-6 items-center justify-center">
                    <Avatar className="h-6 w-6 rounded-md">
                      {currentUser.avatarUrl && (
                        <AvatarImage src={currentUser.avatarUrl} alt={currentUser.name} />
                      )}
                      <AvatarFallback className="rounded-md text-xs">
                        {getInitials(currentUser.name)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="grid flex-1 text-left text-xs leading-tight">
                    <span className="truncate font-medium">{currentUser.name}</span>
                    <span className="truncate text-muted-foreground">{currentUser.email}</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {/* Logout placeholder — auth will be wired in a later task */}
                <DropdownMenuItem
                  className="gap-2 text-destructive focus:text-destructive"
                  onClick={() => void logout()}
                >
                  <LogOut className="size-4" />
                  Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

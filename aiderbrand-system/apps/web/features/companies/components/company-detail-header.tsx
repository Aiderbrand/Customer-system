'use client'

import Link from 'next/link'
import { MailPlus, Pencil, Power, Building2 } from 'lucide-react'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@workspace/ui/components/breadcrumb'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@workspace/ui/components/card'

interface CompanyDetailHeaderProps {
  companyName: string
  companySlug: string
  isActive: boolean
  canInvite: boolean
  canEdit: boolean
  canUpdateStatus: boolean
  onInvite: () => void
  onEdit: () => void
  onToggleStatus: () => void
}

export function CompanyDetailHeader({
  companyName,
  companySlug,
  isActive,
  canInvite,
  canEdit,
  canUpdateStatus,
  onInvite,
  onEdit,
  onToggleStatus,
}: CompanyDetailHeaderProps) {
  return (
    <Card>
      <CardHeader className="gap-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/companies">Companies</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{companyName}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 flex-col gap-2">
            <div className="flex flex-wrap items-center gap-3">
              <CardTitle className="text-3xl tracking-tight">{companyName}</CardTitle>
              <Badge variant={isActive ? 'secondary' : 'outline'}>{isActive ? 'Active' : 'Inactive'}</Badge>
            </div>
            <CardDescription>
              Vista operativa para administrar miembros, invitaciones y trazabilidad sin salir del contexto de la company.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="grid gap-4 md:grid-cols-3">
        <div className="flex items-start gap-3 rounded-xl border bg-muted/20 p-4">
          <div className="rounded-lg bg-background p-2 text-muted-foreground">
            <Building2 className="size-4" aria-hidden="true" />
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-sm text-muted-foreground">Contexto visible</p>
            <p className="font-medium text-foreground">{companyName}</p>
            <p className="text-sm text-muted-foreground">{companySlug ? `/${companySlug}` : 'Sin slug operativo'}</p>
          </div>
        </div>

        <div className="flex flex-col gap-1 rounded-xl border bg-muted/20 p-4">
          <p className="text-sm text-muted-foreground">Estado operativo</p>
          <p className="font-medium text-foreground">{isActive ? 'Disponible para operación activa' : 'Operación pausada'}</p>
          <p className="text-sm text-muted-foreground">Las acciones secundarias conservan el flujo actual y la trazabilidad.</p>
        </div>

        <div className="flex flex-col gap-1 rounded-xl border bg-muted/20 p-4">
          <p className="text-sm text-muted-foreground">Jerarquía de acciones</p>
          <p className="font-medium text-foreground">Una sola CTA primaria visible</p>
          <p className="text-sm text-muted-foreground">Edit y Status quedan como acciones secundarias para no competir con la operación principal.</p>
        </div>
      </CardContent>

      {(canInvite || canEdit || canUpdateStatus) ? (
        <CardFooter className="flex flex-wrap items-center gap-2 border-t pt-6">
          {canInvite ? (
            <Button onClick={onInvite} data-testid="company-primary-cta">
              <MailPlus />
              Invite member
            </Button>
          ) : null}
          {canEdit ? (
            <Button variant="outline" onClick={onEdit}>
              <Pencil />
              Edit
            </Button>
          ) : null}
          {canUpdateStatus ? (
            <Button variant="outline" onClick={onToggleStatus}>
              <Power />
              {isActive ? 'Status: deactivate' : 'Status: reactivate'}
            </Button>
          ) : null}
        </CardFooter>
      ) : null}
    </Card>
  )
}

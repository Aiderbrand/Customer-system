'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@workspace/ui/components/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@workspace/ui/components/dialog'
import { Input } from '@workspace/ui/components/input'
import { Label } from '@workspace/ui/components/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import { Textarea } from '@workspace/ui/components/textarea'
import { UnsavedChangesDialog } from '@/components/shared/unsaved-changes-dialog'
import type { Company } from '@/lib/types'

export interface CreateProjectRequest {
  companyId: string
  name: string
  description: string
}

interface ProjectCreateDialogProps {
  open: boolean
  companyOptions?: Company[]
  fixedCompanyId?: string | null
  fixedCompanyName?: string | null
  initialCompanyId?: string | null
  submitting?: boolean
  error?: string | null
  onOpenChange: (open: boolean) => void
  onSubmit: (payload: CreateProjectRequest) => void
}

function resolveInitialCompanyId(params: {
  companyOptions: Company[]
  fixedCompanyId?: string | null
  initialCompanyId?: string | null
}): string {
  if (params.fixedCompanyId) {
    return params.fixedCompanyId
  }

  if (
    params.initialCompanyId
    && params.companyOptions.some((company) => company.id === params.initialCompanyId)
  ) {
    return params.initialCompanyId
  }

  if (params.companyOptions.length === 1) {
    return params.companyOptions[0]?.id ?? ''
  }

  return ''
}

export function ProjectCreateDialog({
  open,
  companyOptions = [],
  fixedCompanyId = null,
  fixedCompanyName = null,
  initialCompanyId = null,
  submitting = false,
  error = null,
  onOpenChange,
  onSubmit,
}: ProjectCreateDialogProps) {
  const [selectedCompanyId, setSelectedCompanyId] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false)

  const initialResolvedCompanyId = useMemo(() => resolveInitialCompanyId({
    companyOptions,
    fixedCompanyId,
    initialCompanyId,
  }), [companyOptions, fixedCompanyId, initialCompanyId])

  useEffect(() => {
    if (!open) return

    setSelectedCompanyId(initialResolvedCompanyId)
    setName('')
    setDescription('')
  }, [initialResolvedCompanyId, open])

  const resolvedCompanyId = fixedCompanyId ?? selectedCompanyId
  const resolvedCompanyName = fixedCompanyName
    ?? companyOptions.find((company) => company.id === resolvedCompanyId)?.name
    ?? null

  const isDirty = useMemo(() => {
    return (
      resolvedCompanyId !== initialResolvedCompanyId
      || name.trim().length > 0
      || description.trim().length > 0
    )
  }, [description, initialResolvedCompanyId, name, resolvedCompanyId])

  function requestClose() {
    if (!isDirty || submitting) {
      onOpenChange(false)
      return
    }

    setConfirmDiscardOpen(true)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(nextOpen) => (nextOpen ? onOpenChange(true) : requestClose())}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Nuevo proyecto</DialogTitle>
            <DialogDescription>
              {resolvedCompanyName
                ? `Creá un proyecto operativo dentro de ${resolvedCompanyName} para habilitar seguimiento, tickets y workspace desde el día uno.`
                : 'Elegí la cuenta destino y registrá el proyecto operativo para abrir su workspace inicial.'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            {!fixedCompanyId ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="project-company">Cuenta</Label>
                <Select value={selectedCompanyId || undefined} onValueChange={setSelectedCompanyId}>
                  <SelectTrigger id="project-company">
                    <SelectValue placeholder="Seleccioná una cuenta" />
                  </SelectTrigger>
                  <SelectContent>
                    {companyOptions.map((company) => (
                      <SelectItem key={company.id} value={company.id}>{company.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="project-name">Nombre</Label>
              <Input
                id="project-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ej: Portal clientes"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="project-description">Descripción</Label>
              <Textarea
                id="project-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={4}
                placeholder="Contexto operativo, objetivo o alcance inicial del proyecto."
              />
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={requestClose} disabled={submitting}>
              Cancelar
            </Button>
            <Button
              onClick={() => onSubmit({
                companyId: resolvedCompanyId,
                name: name.trim(),
                description: description.trim(),
              })}
              disabled={submitting || !resolvedCompanyId || !name.trim()}
            >
              {submitting ? 'Creando...' : 'Crear proyecto'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <UnsavedChangesDialog
        open={confirmDiscardOpen}
        onCancel={() => setConfirmDiscardOpen(false)}
        onConfirm={() => {
          setConfirmDiscardOpen(false)
          onOpenChange(false)
        }}
      />
    </>
  )
}

'use client'

import { useMemo, useState } from 'react'
import { Button } from '@workspace/ui/components/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Label } from '@workspace/ui/components/label'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import { Textarea } from '@workspace/ui/components/textarea'
import type { ProjectWorkspacePayload } from '@/lib/types'
import { getNotesForPhase, getProjectPhaseName } from '@/features/projects/lib/project-selectors'

interface ProjectInternalNotesSectionProps {
  workspace: ProjectWorkspacePayload
  onAddNote: (params: { phaseId: string | null; body: string }) => void
}

export function ProjectInternalNotesSection({ workspace, onAddNote }: ProjectInternalNotesSectionProps) {
  const [phaseId, setPhaseId] = useState<string>('global')
  const [body, setBody] = useState('')

  const groupedNotes = useMemo(() => {
    const notes = workspace.internal?.notes ?? []

    return [
      {
        key: 'global',
        title: 'Notas globales',
        notes: getNotesForPhase(notes, null),
      },
      ...workspace.phases.map((phase) => ({
        key: phase.id,
        title: phase.name,
        notes: getNotesForPhase(notes, phase.id),
      })),
    ].filter((group) => group.notes.length > 0)
  }, [workspace])

  function handleSubmit() {
    if (!body.trim()) {
      return
    }

    onAddNote({
      phaseId: phaseId === 'global' ? null : phaseId,
      body: body.trim(),
    })
    setBody('')
    setPhaseId('global')
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Registrar nota interna</CardTitle>
          <CardDescription>Podés dejar contexto general o atarlo a una fase puntual.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="internal-note-phase">Ubicación</Label>
            <Select value={phaseId} onValueChange={setPhaseId}>
              <SelectTrigger id="internal-note-phase">
                <SelectValue placeholder="Seleccioná dónde guardar la nota" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="global">Global del proyecto</SelectItem>
                  {workspace.phases.map((phase) => (
                    <SelectItem key={phase.id} value={phase.id}>
                      {phase.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="internal-note-body">Nota</Label>
            <Textarea
              id="internal-note-body"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={4}
              placeholder="Dejá el contexto operativo que después necesite ver el equipo."
            />
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSubmit} disabled={!body.trim()}>
              Agregar nota
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        {groupedNotes.map((group) => (
          <Card key={group.key}>
            <CardHeader>
              <CardTitle>{group.title}</CardTitle>
              <CardDescription>
                {group.key === 'global' ? 'Contexto transversal del proyecto.' : `Seguimiento específico de ${group.title}.`}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {group.notes.map((note) => (
                <div key={note.id} className="rounded-xl border px-3 py-3">
                  <p className="text-sm leading-6 text-foreground">{note.body}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {getProjectPhaseName(workspace, note.phaseId)} · {formatDate(note.updatedAt, true)}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

function formatDate(value: Date, withTime = false): string {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(value)
}

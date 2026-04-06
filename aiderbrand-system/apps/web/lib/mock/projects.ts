import type { Project } from '@/lib/types'
import { MOCK_PROJECT_WORKSPACES } from './project-workspaces'

export const MOCK_PROJECTS: Project[] = Object.values(MOCK_PROJECT_WORKSPACES).map(({ project }) => ({
  id: project.id,
  companyId: project.companyId,
  name: project.name,
  description: project.description,
  status: project.status,
  createdAt: project.createdAt,
  updatedAt: project.updatedAt,
}))

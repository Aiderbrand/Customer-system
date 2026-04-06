import { TabsList, TabsTrigger } from '@workspace/ui/components/tabs'
import type { ProjectSectionTab } from '@/features/projects/types'

interface ProjectSectionTabsProps {
  tabs: ProjectSectionTab[]
}

export function ProjectSectionTabs({ tabs }: ProjectSectionTabsProps) {
  return (
    <TabsList className="h-auto w-full justify-start overflow-x-auto rounded-xl bg-muted/60 p-1 lg:w-fit">
      {tabs.map((tab) => (
        <TabsTrigger key={tab.id} value={tab.id} className="shrink-0">
          {tab.label}
        </TabsTrigger>
      ))}
    </TabsList>
  )
}

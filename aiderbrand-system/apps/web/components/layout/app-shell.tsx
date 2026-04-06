'use client'

import type { ReactNode } from 'react'
import {
  SidebarProvider,
  SidebarInset,
} from '@workspace/ui/components/sidebar'
import { AppSidebar } from './app-sidebar'
import { AppHeader } from './app-header'

interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  return (
    <SidebarProvider className="min-w-0 max-w-full overflow-x-clip">
      <AppSidebar />
      <SidebarInset className="min-w-0 max-w-full overflow-x-hidden">
        <AppHeader />
        <div className="flex min-h-0 min-w-0 w-full max-w-full flex-1 flex-col overflow-hidden px-4 pb-4 pt-0 md:px-6 md:pb-6">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

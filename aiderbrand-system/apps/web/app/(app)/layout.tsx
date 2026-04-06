import type { ReactNode } from 'react'
import { AuthGuard } from '@/components/auth/auth-guard'
import { AppShell } from '@/components/layout/app-shell'

interface AppLayoutProps {
  children: ReactNode
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <AuthGuard>
      <AppShell>{children}</AppShell>
    </AuthGuard>
  )
}

'use client'

import { useAuth } from '@/contexts/auth-context'
import { ROLES } from '@/lib/constants/roles'
import { AppPage, AppPageHeader } from '@/components/layout/app-page'
import { OnboardingSubmissionView } from '@/features/profile/components/OnboardingSubmissionView'
import { Badge } from '@workspace/ui/components/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@workspace/ui/components/tabs'

export default function ProfilePage() {
  const { currentUser, currentRole } = useAuth()
  const isAccountOwner = currentRole === ROLES.ACCOUNT_OWNER

  return (
    <AppPage>
      <AppPageHeader
        title="Mi perfil"
        description={currentUser?.email}
        badge={
          currentRole ? (
            <Badge variant="secondary" className="rounded-full text-xs">
              {currentRole.replace('_', ' ')}
            </Badge>
          ) : null
        }
      />

      {isAccountOwner ? (
        <Tabs defaultValue="onboarding" className="flex flex-col gap-4">
          <TabsList className="self-start">
            <TabsTrigger value="onboarding">Formulario de onboarding</TabsTrigger>
          </TabsList>

          <TabsContent value="onboarding">
            <div className="rounded-2xl border border-[#e5e0d8] bg-white p-6 shadow-sm">
              <div className="mb-6 flex flex-col gap-1">
                <h2 className="text-base font-semibold text-[#1a1a2e]">
                  Formulario de onboarding
                </h2>
                <p className="text-sm text-[#1a1a2e]/60">
                  Esta es la información que completaste al iniciar con AIDERBRAND. Podés editarla
                  mientras no haya sido revisada por el equipo.
                </p>
              </div>
              <OnboardingSubmissionView />
            </div>
          </TabsContent>
        </Tabs>
      ) : (
        <div className="rounded-2xl border border-[#e5e0d8] bg-[#faf8f5] p-8 text-center">
          <p className="text-sm text-[#1a1a2e]/60">
            No hay información adicional para mostrar en tu perfil.
          </p>
        </div>
      )}
    </AppPage>
  )
}

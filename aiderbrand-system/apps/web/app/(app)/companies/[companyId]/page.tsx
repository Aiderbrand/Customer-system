import { AppPage } from '@/components/layout/app-page'
import { CompanyDetailPage } from '@/features/companies/components/company-detail-page'

export default async function CompanyDetailRoute({
  params,
}: {
  params: Promise<{ companyId: string }>
}) {
  const { companyId } = await params

  return (
    <AppPage>
      <CompanyDetailPage companyId={companyId} />
    </AppPage>
  )
}

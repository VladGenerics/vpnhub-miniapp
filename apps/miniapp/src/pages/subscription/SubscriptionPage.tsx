import { Page } from '../../components/Page'
import { PageError, PageSkeleton } from '../../components/States'
import { useActiveSubscription } from '../../api/queries'
import { NoSubscription } from './NoSubscription'
import { ActiveSubscription } from './ActiveSubscription'

export function SubscriptionPage() {
  const { active, isPending, isError, refetch } = useActiveSubscription()
  return (
    <Page>
      {isPending ? <PageSkeleton /> : isError ? <PageError onRetry={refetch} /> : active ? <ActiveSubscription sub={active} /> : <NoSubscription />}
    </Page>
  )
}

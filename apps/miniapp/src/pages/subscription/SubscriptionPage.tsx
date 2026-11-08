import { Page } from '../../components/Page'
import { PageError, PageSkeleton } from '../../components/States'
import { useActiveSubscription } from '../../api/queries'
import { NoSubscription } from './NoSubscription'
import { ActiveSubscription } from './ActiveSubscription'

export function SubscriptionPage() {
  const { data, active, isPending, isError, refetch } = useActiveSubscription()
  // подписка истекла, а устройства остались: оформление начинается с их числа
  const expired = data?.status === 'DISABLED' && data.slots.length > 0 ? data : undefined
  return (
    <Page wide>
      {isPending ? (
        <PageSkeleton />
      ) : isError ? (
        <PageError onRetry={refetch} />
      ) : active ? (
        <ActiveSubscription sub={active} />
      ) : (
        <NoSubscription expired={expired} />
      )}
    </Page>
  )
}

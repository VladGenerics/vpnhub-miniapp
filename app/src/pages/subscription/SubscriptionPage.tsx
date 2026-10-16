import { useApp } from '../../store/AppStore'
import { Page } from '../../components/Page'
import { NoSubscription } from './NoSubscription'
import { ActiveSubscription } from './ActiveSubscription'

export function SubscriptionPage() {
  const { hasSubscription } = useApp()
  return <Page>{hasSubscription ? <ActiveSubscription /> : <NoSubscription />}</Page>
}

import { quote, type Subscription } from '@vpnhub/shared'
import { useMe, useTariffs } from '../api/queries'

/** Сколько стоит следующее автопродление и сколько на него не хватает. null - подписки нет или данные не загрузились */
export function useRenewal(sub: Subscription | null | undefined) {
  const { data: me } = useMe()
  const { data: tariffs } = useTariffs()
  const q = sub && tariffs ? quote(tariffs, sub.slots.length, sub.auto_renewal.days) : null
  if (!sub || !me || !q) return null
  const cost = q.total
  return { cost, balance: me.balance, lacking: Math.max(0, cost - me.balance), enabled: sub.auto_renewal.is_enabled }
}

import type { Registry } from '@sub-engine/core'
import type { ScrapCaravanComponents } from '../contract.js'
import { SCHEMA } from '../contract.js'

export interface EconomyState {
  silicon: number
  iron: number
  copper: number
}

export function economySystem(registry: Registry<ScrapCaravanComponents>): Registry<ScrapCaravanComponents> {
  const storages = registry.getEntitiesWith([SCHEMA.ECONOMY_STORAGE])
  for (const storage of storages) {
    const bal = storage.EconomyStorage.balances
    const silicon = bal.silicon ?? 0
    const iron = bal.iron ?? 0
    const copper = bal.copper ?? 0

    registry.addComponent(storage.id, SCHEMA.ECONOMY_STORAGE, {
      balances: { silicon, iron, copper },
    })
  }
  return registry
}

export function addResource(
  registry: Registry<ScrapCaravanComponents>,
  resourceType: string,
  amount: number,
): void {
  const storages = registry.getEntitiesWith([SCHEMA.ECONOMY_STORAGE])
  if (storages.length === 0) return
  const s = storages[0]!
  const bal = { ...s.EconomyStorage.balances }
  bal[resourceType] = (bal[resourceType] ?? 0) + amount
  registry.addComponent(s.id, SCHEMA.ECONOMY_STORAGE, { balances: bal })
}

export function spendResource(
  registry: Registry<ScrapCaravanComponents>,
  resourceType: string,
  amount: number,
): boolean {
  const storages = registry.getEntitiesWith([SCHEMA.ECONOMY_STORAGE])
  if (storages.length === 0) return false
  const s = storages[0]!
  const bal = { ...s.EconomyStorage.balances }
  const current = bal[resourceType] ?? 0
  if (current < amount) return false
  bal[resourceType] = current - amount
  registry.addComponent(s.id, SCHEMA.ECONOMY_STORAGE, { balances: bal })
  return true
}

export function getEconomyState(registry: Registry<ScrapCaravanComponents>): EconomyState {
  const storages = registry.getEntitiesWith([SCHEMA.ECONOMY_STORAGE])
  if (storages.length === 0) return { silicon: 0, iron: 0, copper: 0 }
  const bal = storages[0]!.EconomyStorage.balances
  return {
    silicon: bal.silicon ?? 0,
    iron: bal.iron ?? 0,
    copper: bal.copper ?? 0,
  }
}

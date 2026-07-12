import type { Registry, ComponentMap } from '@sub-engine/core'
import { SCHEMA } from '../contract.js'
import type { ScrapSwarmComponents } from '../contract.js'

export interface EconomyState {
  balances: Record<string, number>
}

export function getEconomyState(registry: Registry<ScrapSwarmComponents>): EconomyState | null {
  const storages = registry.getEntitiesWith([SCHEMA.ECONOMY_STORAGE])
  if (!storages.length) return null
  return { balances: { ...storages[0]!.EconomyStorage.balances } }
}

export function addResource(registry: Registry<ScrapSwarmComponents>, type: string, amount: number): boolean {
  const storages = registry.getEntitiesWith([SCHEMA.ECONOMY_STORAGE])
  if (!storages.length) return false
  const storage = storages[0]!
  const current = storage.EconomyStorage.balances
  const key = type
  registry.addComponent(storage.id, SCHEMA.ECONOMY_STORAGE, {
    balances: { ...current, [key]: (current[key] ?? 0) + amount },
  })
  return true
}

export function spendResource(registry: Registry<ScrapSwarmComponents>, type: string, amount: number): boolean {
  const storages = registry.getEntitiesWith([SCHEMA.ECONOMY_STORAGE])
  if (!storages.length) return false
  const storage = storages[0]!
  const current = storage.EconomyStorage.balances
  const key = type
  const have = current[key] ?? 0
  if (have < amount) return false
  registry.addComponent(storage.id, SCHEMA.ECONOMY_STORAGE, {
    balances: { ...current, [key]: have - amount },
  })
  return true
}

export function economySystem<M extends ComponentMap>(registry: Registry<M>, _dt: number): Registry<M> {
  const storages = registry.getEntitiesWith([SCHEMA.ECONOMY_STORAGE])
  if (!storages.length) return registry

  const storage = storages[0]!
  const current = (storage as any)[SCHEMA.ECONOMY_STORAGE].balances as Record<string, number>
  if (isNaN(current['scrap'] ?? 0) || isNaN(current['crystal'] ?? 0) || isNaN(current['fuel'] ?? 0)) {
    throw new Error('NaN detected in economy balances')
  }

  return registry
}

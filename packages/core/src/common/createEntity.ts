import type { Registry, ComponentMap } from '../engine/types.js'

export function createEntity<M extends ComponentMap, K extends keyof M & string>(
  registry: Registry<M>,
  components: Record<K, M[K]>
): number {
  const id = registry.createEntity()
  const entries = Object.entries(components) as [K, M[K]][]
  for (const [name, data] of entries) {
    registry.addComponent(id, name, data)
  }
  return id
}

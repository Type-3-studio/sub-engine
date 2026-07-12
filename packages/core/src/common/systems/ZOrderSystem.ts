import type { Registry } from '../../engine/types.js'

export interface ZOrderDef {
  layer: number
  order: number
}

export function zOrderSystem(registry: Registry, dt: number): Registry {
  const entities = registry.getEntitiesWith(['ZOrder'])
  for (const { id, ZOrder } of entities) {
    const zo = ZOrder as ZOrderDef
    const layer = Math.round(zo.layer)
    const order = Math.round(zo.order)
    if (layer !== zo.layer || order !== zo.order) {
      registry.addComponent(id, 'ZOrder', { layer, order })
    }
  }
  return registry
}

import type { Registry } from '../../engine/types.js'

export function movementSystem(registry: Registry, dt: number): Registry {
  const stepScale = dt / 16
  const entities = registry.getEntitiesWith(['Position', 'Velocity'])
  for (const { id } of entities) {
    const pos = registry.getComponent(id, 'Position') as { x: number; y: number } | undefined
    const vel = registry.getComponent(id, 'Velocity') as { x: number; y: number } | undefined
    if (!pos || !vel) continue
    registry.addComponent(id, 'Position', {
      x: pos.x + vel.x * stepScale,
      y: pos.y + vel.y * stepScale,
    })
  }
  return registry
}

import type { Registry, ComponentMap } from '../engine/types.js'

export function setVelocity<M extends ComponentMap>(
  registry: Registry<M>,
  entityId: number,
  direction: { x: number; y: number },
  speed: number,
  dt: number,
  componentName = 'Velocity',
): void {
  registry.addComponent(entityId, componentName as keyof M & string, {
    x: direction.x * speed * (dt / 16),
    y: direction.y * speed * (dt / 16),
  } as M[keyof M & string])
}

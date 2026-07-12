import { SCHEMA } from '../contract.js'
import type { Registry } from '@sub-engine/core'
import type { GameComponents } from '../contract.js'

export function movementSystem(registry: Registry<GameComponents>, dt: number): Registry<GameComponents> {
  const stepScale = dt / 16
  const entities = registry.getEntitiesWith([SCHEMA.POSITION, SCHEMA.VELOCITY])
  for (const { id, Position, Velocity } of entities) {
    registry.addComponent(id, SCHEMA.POSITION, {
      x: Position.x + Velocity.x * stepScale,
      y: Position.y + Velocity.y * stepScale,
    })
  }
  return registry
}

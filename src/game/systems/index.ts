import { SCHEMA } from '../contract.js'
import type { Registry } from '../../engine/types.js'
import type { GameComponents } from '../contract.js'

export function movementSystem(registry: Registry<GameComponents>): Registry<GameComponents> {
  const entities = registry.getEntitiesWith([SCHEMA.POSITION, SCHEMA.VELOCITY])
  for (const { id, Position, Velocity } of entities) {
    registry.addComponent(id, SCHEMA.POSITION, {
      x: Position.x + Velocity.x,
      y: Position.y + Velocity.y,
    })
  }
  return registry
}

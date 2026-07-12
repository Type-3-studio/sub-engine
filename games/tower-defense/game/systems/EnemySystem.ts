import { SCHEMA } from '../contract.js'
import type { Registry } from '@sub-engine/core'
import type { TdComponents } from '../contract.js'

export function enemySystem(registry: Registry<TdComponents>, dt: number): Registry<TdComponents> {
  const enemies = registry.getEntitiesWith([SCHEMA.PATH_FOLLOWER, SCHEMA.POSITION])
  const toRemove: number[] = []
  const stepScale = dt / 16

  for (const enemy of enemies) {
    const pf = enemy.TdPathFollower
    const waypoints = pf.waypoints
    const target = waypoints[pf.waypointIndex]
    if (!target) {
      toRemove.push(enemy.id)
      continue
    }

    const pos = enemy.Position
    const dx = target.x - pos.x
    const dy = target.y - pos.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    let newX = pos.x
    let newY = pos.y
    let newIndex = pf.waypointIndex

    if (dist < pf.speed * stepScale) {
      newX = target.x
      newY = target.y
      newIndex = pf.waypointIndex + 1

      if (newIndex >= waypoints.length) {
        toRemove.push(enemy.id)
        const state = registry.getEntitiesWith([SCHEMA.GAME_STATE])
        if (state.length > 0) {
          const gs = state[0]!
          const gsData = gs.GameState
          registry.addComponent(gs.id, SCHEMA.GAME_STATE, {
            money: gsData.money,
            lives: gsData.lives - 1,
            wave: gsData.wave,
            phase: gsData.lives - 1 <= 0 ? 'gameover' : gsData.phase,
          })
        }
        continue
      }
    } else {
      newX = pos.x + (dx / dist) * pf.speed * stepScale
      newY = pos.y + (dy / dist) * pf.speed * stepScale
    }

    registry.addComponent(enemy.id, SCHEMA.POSITION, { x: newX, y: newY })
    registry.addComponent(enemy.id, 'TdPathFollower', {
      waypoints,
      waypointIndex: newIndex,
      speed: pf.speed,
    })
  }

  for (const id of toRemove) {
    registry.removeEntity(id)
  }

  return registry
}

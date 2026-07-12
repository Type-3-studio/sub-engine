import { SCHEMA } from '../contract.js'
import type { Registry } from '@sub-engine/core'
import type { TdComponents } from '../contract.js'

export function enemySystem(
  registry: Registry<TdComponents>,
  dt: number,
  blockedCells: Set<string>,
): Registry<TdComponents> {
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
      const cellKey = `${Math.floor(target.x)},${Math.floor(target.y)}`
      if (blockedCells.has(cellKey)) {
        newX = pos.x
        newY = pos.y
      } else {
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
      }
    } else {
      newX = pos.x + (dx / dist) * pf.speed * stepScale
      newY = pos.y + (dy / dist) * pf.speed * stepScale
      const cellKey = `${Math.floor(newX)},${Math.floor(newY)}`
      if (blockedCells.has(cellKey)) {
        newX = pos.x
        newY = pos.y
      }
    }

    registry.addComponent(enemy.id, SCHEMA.POSITION, { x: newX, y: newY })
    registry.addComponent(enemy.id, 'TdPathFollower', {
      waypoints,
      waypointIndex: newIndex,
      speed: pf.speed,
    })

    const bomber = registry.getComponent(enemy.id, SCHEMA.BOMBER)
    if (bomber) {
      const newTimer = bomber.bombTimer - dt
      if (newTimer <= 0) {
        const bomb = registry.createEntity()
        registry.addComponent(bomb, SCHEMA.BOMB, {
          damage: bomber.bombDamage,
          range: bomber.bombRange,
          placedBy: 'enemy',
          fuseTimer: bomber.bombFuse,
        })
        const bombGx = Math.floor(newX)
        const bombGy = Math.floor(newY)
        registry.addComponent(bomb, SCHEMA.POSITION, { x: bombGx + 0.5, y: bombGy + 0.5 })
        registry.addComponent(bomb, SCHEMA.LABEL, { value: 'Bomb' })
        registry.addComponent(enemy.id, SCHEMA.BOMBER, {
          ...bomber,
          bombTimer: bomber.bombInterval,
        })
      } else {
        registry.addComponent(enemy.id, SCHEMA.BOMBER, {
          ...bomber,
          bombTimer: newTimer,
        })
      }
    }
  }

  for (const id of toRemove) {
    registry.removeEntity(id)
  }

  return registry
}

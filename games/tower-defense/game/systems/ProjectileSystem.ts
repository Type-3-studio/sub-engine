import { SCHEMA } from '../contract.js'
import type { Registry } from '@sub-engine/core'
import type { TdComponents } from '../contract.js'

export function projectileSystem(registry: Registry<TdComponents>, dt: number): Registry<TdComponents> {
  const projectiles = registry.getEntitiesWith([SCHEMA.PROJECTILE, SCHEMA.POSITION])
  const toRemove: number[] = []
  const stepScale = dt / 16

  for (const proj of projectiles) {
    const p = proj.Projectile
    const targetId = p.targetEntity

    if (!registry.entityExists(targetId)) {
      toRemove.push(proj.id)
      continue
    }

    const targetPos = registry.getComponent(targetId, SCHEMA.POSITION)
    if (!targetPos) {
      toRemove.push(proj.id)
      continue
    }

    const dx = targetPos.x - proj.Position.x
    const dy = targetPos.y - proj.Position.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist < p.speed * stepScale) {
      const hp = registry.getComponent(targetId, SCHEMA.HEALTH)
      if (hp) {
        const newHp = Math.max(0, hp.current - p.damage)
        registry.addComponent(targetId, SCHEMA.HEALTH, {
          current: newHp,
          max: hp.max,
        })
        if (newHp <= 0) {
          const enemy = registry.getComponent(targetId, SCHEMA.ENEMY)
          if (enemy) {
            const state = registry.getEntitiesWith([SCHEMA.GAME_STATE])
            if (state.length > 0) {
              const gs = state[0]!
              const gsData = gs.GameState
              registry.addComponent(gs.id, SCHEMA.GAME_STATE, {
                money: gsData.money + enemy.reward,
                lives: gsData.lives,
                wave: gsData.wave,
                phase: gsData.phase,
              })
            }
          }
          registry.removeEntity(targetId)
        }
      }
      toRemove.push(proj.id)
    } else {
      registry.addComponent(proj.id, SCHEMA.POSITION, {
        x: proj.Position.x + (dx / dist) * p.speed * stepScale,
        y: proj.Position.y + (dy / dist) * p.speed * stepScale,
      })
    }
  }

  for (const id of toRemove) {
    registry.removeEntity(id)
  }

  return registry
}

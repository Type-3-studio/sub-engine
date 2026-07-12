import { SCHEMA } from '../contract.js'
import type { Registry } from '@sub-engine/core'
import type { TdComponents } from '../contract.js'

export function towerSystem(registry: Registry<TdComponents>): Registry<TdComponents> {
  const towers = registry.getEntitiesWith([SCHEMA.TOWER, SCHEMA.POSITION])
  const enemies = registry.getEntitiesWith([SCHEMA.ENEMY, SCHEMA.POSITION])
  const toRemove: number[] = []

  for (const tower of towers) {
    const t = tower.Tower
    const now = performance.now()

    let meleeDamage = 0
    for (const enemy of enemies) {
      const dx = enemy.Position.x - tower.Position.x
      const dy = enemy.Position.y - tower.Position.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < 1.0) {
        meleeDamage += 1
      }
    }

    if (meleeDamage > 0) {
      const newHp = Math.max(0, t.hp - meleeDamage)
      if (newHp <= 0) {
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
        toRemove.push(tower.id)
        continue
      }
      registry.addComponent(tower.id, SCHEMA.TOWER, { ...t, hp: newHp })
    }

    if (t.towerType === 'bomb') continue
    if (now - t.cooldown < t.fireRate) continue

    let closestEnemy: (typeof enemies)[number] | null = null
    let closestDist = Infinity

    for (const enemy of enemies) {
      const dx = enemy.Position.x - tower.Position.x
      const dy = enemy.Position.y - tower.Position.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist <= t.range && dist < closestDist) {
        closestEnemy = enemy
        closestDist = dist
      }
    }

    if (!closestEnemy) continue

    const proj = registry.createEntity()
    registry.addComponent(proj, SCHEMA.PROJECTILE, {
      targetEntity: closestEnemy.id,
      speed: t.projectileSpeed || 5,
      damage: t.damage,
    })
    registry.addComponent(proj, SCHEMA.POSITION, {
      x: tower.Position.x,
      y: tower.Position.y,
    })
    registry.addComponent(proj, SCHEMA.LABEL, { value: 'Projectile' })

    registry.addComponent(tower.id, SCHEMA.TOWER, {
      ...t,
      cooldown: now,
    })
  }

  for (const id of toRemove) {
    registry.removeEntity(id)
  }

  return registry
}

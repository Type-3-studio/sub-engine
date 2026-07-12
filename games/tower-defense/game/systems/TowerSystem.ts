import { SCHEMA } from '../contract.js'
import type { Registry } from '@sub-engine/core'
import type { TdComponents } from '../contract.js'

export function towerSystem(registry: Registry<TdComponents>): Registry<TdComponents> {
  const towers = registry.getEntitiesWith([SCHEMA.TOWER, SCHEMA.POSITION])
  const enemies = registry.getEntitiesWith([SCHEMA.ENEMY, SCHEMA.POSITION])

  for (const tower of towers) {
    const t = tower.Tower
    const now = performance.now()
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

  return registry
}

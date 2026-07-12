import { createEntity } from '@sub-engine/core'
import type { Registry } from '@sub-engine/core'
import { SCHEMA } from '../contract.js'
import type { ScrapSwarmComponents } from '../contract.js'
import { FIGHTER_DAMAGE, FIGHTER_RANGE, FIGHTER_FIRE_RATE, FIGHTER_SPEED } from '../config.js'

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)
}

export function combatSystem(registry: Registry<ScrapSwarmComponents>, dt: number): Registry<ScrapSwarmComponents> {
  const fighters = registry.getEntitiesWith([SCHEMA.FIGHTER, SCHEMA.POSITION, SCHEMA.HEALTH])
  const enemies = registry.getEntitiesWith([SCHEMA.ENEMY, SCHEMA.POSITION])

  for (const f of fighters) {
    const fighter = f.Fighter
    const pos = f.Position

    let nearestEnemy: { id: number; pos: { x: number; y: number }; dist: number } | null = null
    for (const e of enemies) {
      if (!registry.entityExists(e.id)) continue
      const d = distance(pos, e.Position)
      if (!nearestEnemy || d < nearestEnemy.dist) {
        nearestEnemy = { id: e.id, pos: e.Position, dist: d }
      }
    }

    if (nearestEnemy) {
      const dx = nearestEnemy.pos.x - pos.x
      const dy = nearestEnemy.pos.y - pos.y
      const len = Math.sqrt(dx * dx + dy * dy)

      if (len > 0.001) {
        const desiredRange = fighter.range * 0.6
        if (nearestEnemy.dist > desiredRange + 0.5) {
          const speed = FIGHTER_SPEED * (dt / 16)
          registry.addComponent(f.id, SCHEMA.VELOCITY, { x: (dx / len) * speed, y: (dy / len) * speed })
        } else if (nearestEnemy.dist < desiredRange - 0.5) {
          const speed = FIGHTER_SPEED * (dt / 16)
          registry.addComponent(f.id, SCHEMA.VELOCITY, { x: -(dx / len) * speed, y: -(dy / len) * speed })
        } else {
          registry.addComponent(f.id, SCHEMA.VELOCITY, { x: 0, y: 0 })
        }
      } else {
        registry.addComponent(f.id, SCHEMA.VELOCITY, { x: 0, y: 0 })
      }

      const newCooldown = Math.max(0, fighter.cooldown - dt)
      registry.addComponent(f.id, SCHEMA.FIGHTER, { ...fighter, cooldown: newCooldown })

      if (nearestEnemy.dist <= fighter.range && newCooldown <= 0) {
        createEntity(registry, {
          [SCHEMA.POSITION]: { x: pos.x, y: pos.y },
          [SCHEMA.PROJECTILE]: { targetId: nearestEnemy.id, speed: 0.3, damage: fighter.damage, lifetime: 2000 },
        })
        registry.addComponent(f.id, SCHEMA.FIGHTER, { ...fighter, cooldown: fighter.fireRate })
      }
    } else {
      registry.addComponent(f.id, SCHEMA.VELOCITY, { x: 0, y: 0 })
    }
  }

  return registry
}

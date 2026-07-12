import type { Registry } from '@sub-engine/core'
import { SCHEMA } from '../contract.js'
import type { ScrapSwarmComponents } from '../contract.js'
import { createEntity } from '@sub-engine/core'

export function projectileSystem(registry: Registry<ScrapSwarmComponents>, dt: number): Registry<ScrapSwarmComponents> {
  const projectiles = registry.getEntitiesWith([SCHEMA.PROJECTILE, SCHEMA.POSITION])

  for (const e of projectiles) {
    const proj = e.Projectile
    const pos = e.Position

    const newLifetime = proj.lifetime - dt
    if (newLifetime <= 0) {
      registry.removeEntity(e.id)
      continue
    }

    if (proj.targetId !== -1 && registry.entityExists(proj.targetId)) {
      const targetPos = registry.getComponent(proj.targetId, SCHEMA.POSITION) as { x: number; y: number } | undefined
      if (targetPos) {
        const dx = targetPos.x - pos.x
        const dy = targetPos.y - pos.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 0.5) {
          const hp = registry.getComponent(proj.targetId, SCHEMA.HEALTH) as { current: number; max: number } | undefined
          if (hp) {
            registry.addComponent(proj.targetId, SCHEMA.HEALTH, {
              ...hp,
              current: Math.max(0, hp.current - proj.damage),
            })
          }
          spawnHitParticles(registry, targetPos.x, targetPos.y)
          registry.removeEntity(e.id)
          continue
        }
        if (dist > 0.1) {
          const speed = proj.speed * (dt / 16)
          registry.addComponent(e.id, SCHEMA.POSITION, {
            x: pos.x + (dx / dist) * speed,
            y: pos.y + (dy / dist) * speed,
          })
        }
      }
    }

    registry.addComponent(e.id, SCHEMA.PROJECTILE, { ...proj, lifetime: newLifetime })
  }

  return registry
}

function spawnHitParticles(registry: Registry<ScrapSwarmComponents>, x: number, y: number): void {
  for (let i = 0; i < 4; i++) {
    const p = createEntity(registry, {
      [SCHEMA.POSITION]: { x, y },
      [SCHEMA.PARTICLE]: { remaining: 400, color: '#ffff88', size: 3 },
    })
  }
}

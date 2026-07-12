import type { Registry } from '@sub-engine/core'
import type { ScrapCaravanComponents } from '../contract.js'
import { SCHEMA } from '../contract.js'

export function weatherSystem(registry: Registry<ScrapCaravanComponents>, dt: number): Registry<ScrapCaravanComponents> {
  const storms = registry.getEntitiesWith([SCHEMA.STORM])
  const toRemove: number[] = []

  for (const storm of storms) {
    const s = storm.Storm
    const newElapsed = s.elapsed + dt

    if (newElapsed >= s.duration) {
      toRemove.push(storm.id)
      continue
    }

    const entities = registry.getEntitiesWith([SCHEMA.POSITION, SCHEMA.HEALTH, SCHEMA.LABEL])
    for (const entity of entities) {
      const label = entity.Label.value
      if (label !== 'drone' && label !== 'crawler') continue

      const dx = entity.Position.x - s.x
      const dy = entity.Position.y - s.y
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist <= s.radius) {
        const hp = entity.Health
        const stormDamage = s.intensity * (dt / 1000)
        registry.addComponent(entity.id, SCHEMA.HEALTH, {
          current: Math.max(0, hp.current - stormDamage),
          max: hp.max,
        })
      }
    }

    registry.addComponent(storm.id, SCHEMA.STORM, { ...s, elapsed: newElapsed })
  }

  for (const id of toRemove) {
    registry.removeEntity(id)
  }

  return registry
}

export function spawnStorm(
  registry: Registry<ScrapCaravanComponents>,
  x: number,
  y: number,
  intensity: number,
  duration: number,
  radius: number,
): number {
  const id = registry.createEntity()
  registry.addComponent(id, SCHEMA.STORM, {
    intensity,
    duration,
    elapsed: 0,
    x,
    y,
    radius,
  })
  registry.addComponent(id, SCHEMA.LABEL, { value: 'storm' })
  return id
}

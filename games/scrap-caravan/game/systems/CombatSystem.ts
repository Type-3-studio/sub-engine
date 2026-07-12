import type { Registry } from '@sub-engine/core'
import type { ScrapCaravanComponents } from '../contract.js'
import { SCHEMA } from '../contract.js'

export function combatSystem(registry: Registry<ScrapCaravanComponents>, dt: number): Registry<ScrapCaravanComponents> {
  const crawlers = registry.getEntitiesWith([SCHEMA.CRAWLER, SCHEMA.POSITION])
  const beetles = registry.getEntitiesWith([SCHEMA.SWARM_BEETLE, SCHEMA.POSITION, SCHEMA.HEALTH])
  const toRemove: number[] = []

  for (const crawler of crawlers) {
    const c = crawler.Crawler
    const now = performance.now()
    if (now - c.cooldown < c.fireRate) continue

    let closestBeetle: (typeof beetles)[number] | null = null
    let closestDist = Infinity

    for (const beetle of beetles) {
      if (toRemove.includes(beetle.id)) continue
      const dx = beetle.Position.x - crawler.Position.x
      const dy = beetle.Position.y - crawler.Position.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist <= c.range && dist < closestDist) {
        closestBeetle = beetle
        closestDist = dist
      }
    }

    if (!closestBeetle) continue

    const hp = closestBeetle.Health
    const newHp = Math.max(0, hp.current - c.damage)
    registry.addComponent(closestBeetle.id, SCHEMA.HEALTH, { current: newHp, max: hp.max })

    if (newHp <= 0) {
      toRemove.push(closestBeetle.id)
    }

    registry.addComponent(crawler.id, SCHEMA.CRAWLER, { ...c, cooldown: now })
  }

  for (const id of toRemove) {
    registry.removeEntity(id)
  }

  const movingBeetles = registry.getEntitiesWith([SCHEMA.SWARM_BEETLE, SCHEMA.POSITION, SCHEMA.VELOCITY, SCHEMA.HEALTH])
  const storages = registry.getEntitiesWith([SCHEMA.ECONOMY_STORAGE, SCHEMA.POSITION])
  let targetPos = { x: 8, y: 6 }
  if (storages.length > 0) {
    targetPos = storages[0]!.Position
  }

  for (const beetle of movingBeetles) {
    const b = beetle.SwarmBeetle
    const pos = beetle.Position
    const dx = targetPos.x - pos.x
    const dy = targetPos.y - pos.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist < 0.5) {
      registry.addComponent(beetle.id, SCHEMA.VELOCITY, { x: 0, y: 0 })
      continue
    }

    registry.addComponent(beetle.id, SCHEMA.VELOCITY, {
      x: (dx / dist) * b.speed,
      y: (dy / dist) * b.speed,
    })
  }

  return registry
}

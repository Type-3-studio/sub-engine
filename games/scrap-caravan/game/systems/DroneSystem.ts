import type { Registry } from '@sub-engine/core'
import type { ScrapCaravanComponents } from '../contract.js'
import { SCHEMA } from '../contract.js'

const STEP_SCALE_FACTOR = 16

export function droneSystem(registry: Registry<ScrapCaravanComponents>, dt: number): Registry<ScrapCaravanComponents> {
  const stepScale = dt / STEP_SCALE_FACTOR
  const drones = registry.getEntitiesWith([SCHEMA.DRONE_AI, SCHEMA.POSITION, SCHEMA.VELOCITY, SCHEMA.LABEL])

  for (const drone of drones) {
    const ai = drone.DroneAI

    if (ai.state === 'idle') {
      const nodes = registry.getEntitiesWith([SCHEMA.SCRAP_NODE, SCHEMA.POSITION])
      let closestNode: (typeof nodes)[number] | null = null
      let closestDist = Infinity

      for (const node of nodes) {
        if (node.ScrapNode.remainingUnits <= 0) continue
        const dx = node.Position.x - drone.Position.x
        const dy = node.Position.y - drone.Position.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < closestDist) {
          closestDist = dist
          closestNode = node
        }
      }

      if (closestNode) {
        const dx = closestNode.Position.x - drone.Position.x
        const dy = closestNode.Position.y - drone.Position.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        const speed = 2.5
        registry.addComponent(drone.id, SCHEMA.DRONE_AI, {
          ...ai,
          state: 'traveling',
          targetNodeId: closestNode.id,
        })
        registry.addComponent(drone.id, SCHEMA.VELOCITY, {
          x: (dx / dist) * speed * stepScale,
          y: (dy / dist) * speed * stepScale,
        })
      }
    }

    if (ai.state === 'traveling' && ai.targetNodeId !== null) {
      const node = registry.getComponent(ai.targetNodeId, SCHEMA.SCRAP_NODE)
      const nodePos = registry.getComponent(ai.targetNodeId, SCHEMA.POSITION)
      if (!node || !nodePos || node.remainingUnits <= 0) {
        registry.addComponent(drone.id, SCHEMA.DRONE_AI, { ...ai, state: 'idle', targetNodeId: null })
        registry.addComponent(drone.id, SCHEMA.VELOCITY, { x: 0, y: 0 })
        continue
      }

      const pos = drone.Position
      const dx = nodePos.x - pos.x
      const dy = nodePos.y - pos.y
      const dist = Math.sqrt(dx * dx + dy * dy)

      const moveThisTick = 2.5 * stepScale
      if (dist <= moveThisTick) {
        registry.addComponent(drone.id, SCHEMA.POSITION, { x: nodePos.x, y: nodePos.y })
        registry.addComponent(drone.id, SCHEMA.VELOCITY, { x: 0, y: 0 })
        registry.addComponent(drone.id, SCHEMA.DRONE_AI, { ...ai, state: 'mining' })
      }
    }

    if (ai.state === 'returning') {
      const storages = registry.getEntitiesWith([SCHEMA.ECONOMY_STORAGE, SCHEMA.POSITION])
      if (storages.length === 0) continue
      const storagePos = storages[0]!.Position

      const pos = drone.Position
      const dx = storagePos.x - pos.x
      const dy = storagePos.y - pos.y
      const dist = Math.sqrt(dx * dx + dy * dy)

      const moveThisTick = 3 * stepScale
      if (dist <= moveThisTick) {
        registry.addComponent(drone.id, SCHEMA.POSITION, { x: storagePos.x, y: storagePos.y })
        registry.addComponent(drone.id, SCHEMA.VELOCITY, { x: 0, y: 0 })
      } else {
        registry.addComponent(drone.id, SCHEMA.VELOCITY, {
          x: (dx / dist) * 3 * stepScale,
          y: (dy / dist) * 3 * stepScale,
        })
      }
    }
  }

  return registry
}

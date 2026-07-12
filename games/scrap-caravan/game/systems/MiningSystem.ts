import type { Registry } from '@sub-engine/core'
import type { ScrapCaravanComponents } from '../contract.js'
import { SCHEMA } from '../contract.js'
import { addResource } from './EconomySystem.js'

export function miningSystem(registry: Registry<ScrapCaravanComponents>, dt: number): Registry<ScrapCaravanComponents> {
  const drones = registry.getEntitiesWith([SCHEMA.DRONE_AI, SCHEMA.POSITION, SCHEMA.INVENTORY])
  const nodes = registry.getEntitiesWith([SCHEMA.SCRAP_NODE, SCHEMA.POSITION])

  for (const drone of drones) {
    const ai = drone.DroneAI
    const inv = drone.Inventory

    if (ai.state !== 'mining') continue
    if (ai.targetNodeId === null) continue

    const node = nodes.find(n => n.id === ai.targetNodeId)
    if (!node) {
      registry.addComponent(drone.id, SCHEMA.DRONE_AI, { ...ai, state: 'idle', targetNodeId: null })
      continue
    }

    const scrap = node.ScrapNode
    if (scrap.remainingUnits <= 0) {
      registry.addComponent(drone.id, SCHEMA.DRONE_AI, { ...ai, state: 'idle', targetNodeId: null })
      continue
    }

    const dronePos = drone.Position
    const nodePos = node.Position
    const dx = dronePos.x - nodePos.x
    const dy = dronePos.y - nodePos.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist > 1.5) continue

    const mineRate = Math.min(scrap.remainingUnits, dt / 30)
    const cargoUsed = ai.cargo.reduce((s, c) => s + c.quantity, 0)
    const spaceLeft = ai.cargoCapacity - cargoUsed
    const amount = Math.min(mineRate, spaceLeft)

    if (cargoUsed > 0 && spaceLeft < 0.5) {
      registry.addComponent(drone.id, SCHEMA.DRONE_AI, { ...ai, state: 'returning' } as any)
      continue
    }
    if (amount <= 0.01) continue

    const accumulator = (ai as any)._mineAccumulator ?? 0
    const total = accumulator + amount
    const wholeUnits = Math.floor(total)
    if (wholeUnits < 1) {
      registry.addComponent(drone.id, SCHEMA.DRONE_AI, { ...ai, _mineAccumulator: total } as any)
      continue
    }

    const newCargo = [...ai.cargo]
    const existing = newCargo.find(c => c.itemId === scrap.resourceType)
    if (existing) {
      existing.quantity += wholeUnits
    } else {
      newCargo.push({ itemId: scrap.resourceType, quantity: wholeUnits })
    }

    registry.addComponent(node.id, SCHEMA.SCRAP_NODE, {
      ...scrap,
      remainingUnits: Math.max(0, scrap.remainingUnits - wholeUnits),
    })

    registry.addComponent(drone.id, SCHEMA.DRONE_AI, {
      ...ai,
      cargo: newCargo,
      _mineAccumulator: total - wholeUnits,
      state: newCargo.reduce((s, c) => s + c.quantity, 0) >= ai.cargoCapacity ? 'returning' : 'mining',
    } as any)

    registry.addComponent(drone.id, SCHEMA.INVENTORY, {
      ...inv,
      slots: newCargo,
    })
  }

  const returningDrones = registry.getEntitiesWith([SCHEMA.DRONE_AI, SCHEMA.POSITION])
  for (const drone of returningDrones) {
    const ai = drone.DroneAI
    if (ai.state !== 'returning') continue

    const storages = registry.getEntitiesWith([SCHEMA.ECONOMY_STORAGE, SCHEMA.POSITION])
    if (storages.length === 0) continue
    const storage = storages[0]!
    const storagePos = storage.Position

    const dronePos = drone.Position
    const dx = storagePos.x - dronePos.x
    const dy = storagePos.y - dronePos.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist > 1.5) continue

    for (const item of ai.cargo) {
      addResource(registry, item.itemId, item.quantity)
    }

    registry.addComponent(drone.id, SCHEMA.DRONE_AI, {
      ...ai,
      state: 'idle',
      cargo: [],
      targetNodeId: null,
    })

    registry.addComponent(drone.id, SCHEMA.INVENTORY, {
      slots: [],
      maxWeight: ai.cargoCapacity,
      assignedCollectorId: null,
    })
  }

  return registry
}

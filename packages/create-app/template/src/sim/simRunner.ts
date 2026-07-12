/**
 * Headless Simulation Runner
 *
 * Validates game logic without a browser.
 * Run: npx tsx src/sim/simRunner.ts
 */
import { createRegistry } from '@sub-engine/core'
import { SCHEMA } from '../game/contract.js'
import type { GameComponents } from '../game/contract.js'
import { movementSystem } from '../game/systems/index.js'

const TICKS = 500
const DT = 16

function main(): void {
  const registry = createRegistry<GameComponents>()

  // Set up initial state
  const player = registry.createEntity()
  registry.addComponent(player, SCHEMA.POSITION, { x: 3, y: 4 })
  registry.addComponent(player, SCHEMA.VELOCITY, { x: 0, y: 0 })
  registry.addComponent(player, SCHEMA.LABEL, { value: 'Player' })

  for (let tick = 0; tick < TICKS; tick++) {
    movementSystem(registry, DT)

    // Validate: no NaN positions
    for (const e of registry.getAllEntitiesCopy()) {
      if (e.Position && (isNaN(e.Position.x) || isNaN(e.Position.y))) {
        throw new Error(`NaN position at tick ${tick}, entity ${e.id}`)
      }
    }
  }

  console.log(`✅ Completed ${TICKS} ticks`)
  console.log(`Final entity count: ${registry.entityCount()}`)

  // Serialization round-trip test
  const serialized = registry.serialize()
  const restored = createRegistry<GameComponents>()
  restored.deserialize(serialized)
  const match = JSON.stringify(serialized) === JSON.stringify(restored.serialize())
  console.log(`Serialization round-trip: ${match ? '✅' : '❌'}`)
}

main()

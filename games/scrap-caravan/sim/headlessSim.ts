import { createRegistry, createEntity } from '@sub-engine/core'
import type { Registry } from '@sub-engine/core'
import { SCHEMA } from '../game/contract.js'
import { economySystem, getEconomyState } from '../game/systems/EconomySystem.js'
import { miningSystem } from '../game/systems/MiningSystem.js'
import { droneSystem } from '../game/systems/DroneSystem.js'
import { combatSystem } from '../game/systems/CombatSystem.js'
import { weatherSystem } from '../game/systems/WeatherSystem.js'
import { waveSystem } from '../game/systems/WaveSystem.js'
import { DRONE_CARGO_CAPACITY, RESOURCE_DEPOSITS } from '../game/config.js'

const TICK_LIMIT = 1000
const TICK_INTERVAL = 16

function setupSimulation(registry: Registry<any>): Registry<any> {
  createEntity(registry, {
    [SCHEMA.POSITION]: { x: 0.5, y: 5.5 },
    [SCHEMA.ECONOMY_STORAGE]: { balances: { silicon: 0, iron: 20, copper: 0 } },
    [SCHEMA.LABEL]: { value: 'storage' },
  })

  for (const dep of RESOURCE_DEPOSITS) {
    createEntity(registry, {
      [SCHEMA.POSITION]: { x: dep.x + 0.5, y: dep.y + 0.5 },
      [SCHEMA.SCRAP_NODE]: { resourceType: dep.type, remainingUnits: dep.units, maxUnits: dep.units },
      [SCHEMA.LABEL]: { value: 'scrap-node' },
    })
  }

  const dronePositions = [
    { x: 1, y: 2 }, { x: 1, y: 4 }, { x: 0, y: 7 },
  ]
  for (const pos of dronePositions) {
    createEntity(registry, {
      [SCHEMA.POSITION]: { x: pos.x + 0.5, y: pos.y + 0.5 },
      [SCHEMA.VELOCITY]: { x: 0, y: 0 },
      [SCHEMA.HEALTH]: { current: 30, max: 30 },
      [SCHEMA.DRONE_AI]: {
        state: 'idle',
        targetNodeId: null,
        cargo: [],
        maxCargo: 3,
        cargoCapacity: DRONE_CARGO_CAPACITY,
      },
      [SCHEMA.INVENTORY]: { slots: [], maxWeight: DRONE_CARGO_CAPACITY, assignedCollectorId: null },
      [SCHEMA.LABEL]: { value: 'drone' },
    })
  }

  createEntity(registry, {
    [SCHEMA.POSITION]: { x: 2.5, y: 11.5 },
    [SCHEMA.HEALTH]: { current: 80, max: 80 },
    [SCHEMA.CRAWLER]: { damage: 15, range: 4, fireRate: 800, cooldown: 0 },
    [SCHEMA.LABEL]: { value: 'crawler' },
  })

  return registry
}

function runSim(): { economySnapshot: any; entityCount: number; scrapNodesDepleted: number; ticksRun: number } {
  const registry = createRegistry()
  setupSimulation(registry)

  for (let tick = 0; tick < TICK_LIMIT; tick++) {
    economySystem(registry as any)
    droneSystem(registry as any, TICK_INTERVAL)

    const stepScale = TICK_INTERVAL / 16
    const moving = registry.getEntitiesWith([SCHEMA.POSITION, SCHEMA.VELOCITY])
    for (const e of moving) {
      const pos = (e as any)[SCHEMA.POSITION]
      const vel = (e as any)[SCHEMA.VELOCITY]
      registry.addComponent(e.id, SCHEMA.POSITION, {
        x: pos.x + vel.x * stepScale,
        y: pos.y + vel.y * stepScale,
      })
    }

    miningSystem(registry as any, TICK_INTERVAL)
    combatSystem(registry as any, TICK_INTERVAL)
    weatherSystem(registry as any, TICK_INTERVAL)
    waveSystem(registry as any, TICK_INTERVAL)

    const all = registry.getAllEntities()
    for (const e of all) {
      const pos = (e as any)[SCHEMA.POSITION]
      if (pos) {
        if (isNaN(pos.x) || isNaN(pos.y)) {
          throw new Error(`NaN detected in entity ${e.id} position at tick ${tick}`)
        }
      }
    }
  }

  const storages = registry.getEntitiesWith([SCHEMA.ECONOMY_STORAGE])
  const economySnapshot = storages.length > 0 ? (storages[0] as any)[SCHEMA.ECONOMY_STORAGE] : null

  const scrapNodes = registry.getEntitiesWith([SCHEMA.SCRAP_NODE])
  const scrapNodesDepleted = (scrapNodes as any[]).filter((n: any) => n[SCHEMA.SCRAP_NODE].remainingUnits <= 0).length

  return {
    economySnapshot,
    entityCount: registry.entityCount(),
    scrapNodesDepleted,
    ticksRun: TICK_LIMIT,
  }
}

const result = runSim()

console.log('=== Headless Simulation Results ===')
console.log(`Ticks run: ${result.ticksRun}`)
console.log(`Entity count: ${result.entityCount}`)
console.log(`Scrap nodes depleted: ${result.scrapNodesDepleted}/${RESOURCE_DEPOSITS.length}`)
console.log('Economy state:', JSON.stringify(result.economySnapshot, null, 2))

const eco = result.economySnapshot?.balances ?? {}
const totalResources = (eco.silicon ?? 0) + (eco.iron ?? 0) + (eco.copper ?? 0)

console.log(`\nTotal resources harvested: ${Math.round(totalResources)}`)
console.log(`\n=== Validation ===`)
console.log(`No NaN positions: ✅ (exception thrown if any)`)
console.log(`Resources accumulated: ${totalResources > 20 ? '✅' : '❌'} (${Math.round(totalResources) > 20 ? 'got ' + Math.round(totalResources) : 'only ' + Math.round(totalResources)})`)
console.log(`Scrap depletion: ${result.scrapNodesDepleted > 0 ? '✅' : '⚠'} (${result.scrapNodesDepleted}/${RESOURCE_DEPOSITS.length})`)
console.log(`Entity count sanity: ${result.entityCount > 0 && result.entityCount < 100 ? '✅' : '❌'} (${result.entityCount})`)

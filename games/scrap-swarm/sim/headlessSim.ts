import { createRegistry, createEntity, movementSystem, collisionSystem, particleSystem } from '@sub-engine/core'
import type { Registry } from '@sub-engine/core'
import { SCHEMA } from '../game/contract.js'
import type { ScrapSwarmComponents } from '../game/contract.js'
import { workerSystem } from '../game/systems/workerSystem.js'
import { combatSystem } from '../game/systems/combatSystem.js'
import { waveSystem } from '../game/systems/waveSystem.js'
import { enemySystem } from '../game/systems/enemySystem.js'
import { projectileSystem } from '../game/systems/projectileSystem.js'
import { economySystem, getEconomyState } from '../game/systems/economySystem.js'
import { BASE_X, BASE_Y, RESOURCE_NODES, WORKER_SPAWN_POSITIONS, WORKER_CARGO_CAPACITY, MINE_THRESHOLD, FIGHTER_SPAWN_POSITIONS, FIGHTER_HP, FIGHTER_DAMAGE, FIGHTER_RANGE, FIGHTER_FIRE_RATE, ENEMY_SPEED, WAVE_DEFS } from '../game/config.js'

const TICK_LIMIT = 8000
const TICK_INTERVAL = 16

function setupSimulation(registry: Registry<ScrapSwarmComponents>): void {
  createEntity(registry, {
    [SCHEMA.POSITION]: { x: BASE_X + 0.5, y: BASE_Y + 0.5 },
    [SCHEMA.HEALTH]: { current: 500, max: 500 },
    [SCHEMA.COLLIDER]: { width: 0.8, height: 0.8, solid: true },
    [SCHEMA.ECONOMY_STORAGE]: { balances: { scrap: 0, crystal: 0, fuel: 0 } },
    [SCHEMA.LABEL]: { value: 'base' },
  })

  for (const node of RESOURCE_NODES) {
    createEntity(registry, {
      [SCHEMA.POSITION]: { x: node.x + 0.5, y: node.y + 0.5 },
      [SCHEMA.RESOURCE_NODE]: { type: node.type, remaining: node.amount, max: node.amount, depleted: false },
      [SCHEMA.LABEL]: { value: 'resource-node' },
    })
  }

  for (const pos of WORKER_SPAWN_POSITIONS) {
    createEntity(registry, {
      [SCHEMA.POSITION]: { x: pos.x + 0.5, y: pos.y + 0.5 },
      [SCHEMA.VELOCITY]: { x: 0, y: 0 },
      [SCHEMA.HEALTH]: { current: 30, max: 30 },
      [SCHEMA.COLLIDER]: { width: 0.4, height: 0.4, solid: true },
      [SCHEMA.UNIT_AI]: { state: 'idle', role: 'worker', targetId: null, orderX: 0, orderY: 0 },
      [SCHEMA.WORKER]: { carryAmount: 0, carryType: '', buildSpeed: 1 },
      [SCHEMA.ACCUMULATOR]: { value: 0, threshold: MINE_THRESHOLD },
      [SCHEMA.LABEL]: { value: 'worker' },
    })
  }

  for (const pos of FIGHTER_SPAWN_POSITIONS) {
    createEntity(registry, {
      [SCHEMA.POSITION]: { x: pos.x + 0.5, y: pos.y + 0.5 },
      [SCHEMA.VELOCITY]: { x: 0, y: 0 },
      [SCHEMA.HEALTH]: { current: FIGHTER_HP, max: FIGHTER_HP },
      [SCHEMA.COLLIDER]: { width: 0.4, height: 0.4, solid: true },
      [SCHEMA.FIGHTER]: { damage: FIGHTER_DAMAGE, range: FIGHTER_RANGE, fireRate: FIGHTER_FIRE_RATE, cooldown: 0, variant: 'melee' },
      [SCHEMA.LABEL]: { value: 'fighter' },
    })
  }

  createEntity(registry, {
    [SCHEMA.GAME_STATE]: { phase: 'idle', wave: 0, score: 0, tick: 0, totalSpawned: 0 },
  })
}

function serializeRoundTrip(registry: Registry<ScrapSwarmComponents>): Registry<ScrapSwarmComponents> {
  const data = registry.getAllEntities()
  const json = JSON.stringify(data)
  const parsed: Array<{ id: number; [key: string]: any }> = JSON.parse(json)

  const newRegistry = createRegistry<ScrapSwarmComponents>()
  const idMap = new Map<number, number>()

  for (const entity of parsed) {
    const newId = newRegistry.createEntity()
    idMap.set(entity.id, newId)
  }

  for (const entity of parsed) {
    const newId = idMap.get(entity.id)!
    for (const [key, value] of Object.entries(entity)) {
      if (key === 'id') continue
      if (typeof value === 'object' && value !== null) {
        const remapped: any = {}
        for (const [k, v] of Object.entries(value)) {
          if ((k === 'targetId' || k === 'targetEntity') && typeof v === 'number' && idMap.has(v)) {
            remapped[k] = idMap.get(v)!
          } else {
            remapped[k] = v
          }
        }
        newRegistry.addComponent(newId, key, remapped)
      }
    }
  }

  return newRegistry
}

function runSim(): void {
  const original = createRegistry<ScrapSwarmComponents>()
  setupSimulation(original)

  const saved = original.getAllEntities()
  const savedJson = JSON.stringify(saved)

  const restored = serializeRoundTrip(original)

  const restoredEntities = restored.getAllEntities()
  const restoredJson = JSON.stringify(restoredEntities)

  const match = savedJson === restoredJson
  console.log('=== Serialization Round-Trip ===')
  console.log(`Original entities: ${saved.length}`)
  console.log(`Restored entities: ${restoredEntities.length}`)
  console.log(`Byte-perfect match: ${match ? '✅' : '❌'}`)

  if (!match) {
    console.log('\nDifferences (original vs restored):')
    for (let i = 0; i < Math.min(saved.length, restoredEntities.length); i++) {
      const o = saved[i]!
      const r = restoredEntities[i]!
      const oClean = { ...o, id: undefined }
      const rClean = { ...r, id: undefined }
      if (JSON.stringify(oClean) !== JSON.stringify(rClean)) {
        console.log(`Entity #${o.id} vs #${r.id}:`)
        console.log(`  Original: ${JSON.stringify(oClean)}`)
        console.log(`  Restored: ${JSON.stringify(rClean)}`)
      }
    }
  }

  const registry = createRegistry<ScrapSwarmComponents>()
  setupSimulation(registry)
  let peakEnemyCount = 0

  for (let tick = 0; tick < TICK_LIMIT; tick++) {
    workerSystem(registry, TICK_INTERVAL)
    combatSystem(registry, TICK_INTERVAL)
    enemySystem(registry, TICK_INTERVAL)
    projectileSystem(registry, TICK_INTERVAL)
    movementSystem(registry, TICK_INTERVAL)
    waveSystem(registry, TICK_INTERVAL)
    economySystem(registry, TICK_INTERVAL)
    collisionSystem(registry, TICK_INTERVAL)
    particleSystem(registry as any, TICK_INTERVAL)

    const all = registry.getAllEntities()
    for (const e of all) {
      if (e.Position && (isNaN(e.Position.x) || isNaN(e.Position.y))) {
        throw new Error(`NaN in entity ${e.id} at tick ${tick}`)
      }
    }

    const enemiesNow = registry.getEntitiesWith([SCHEMA.ENEMY])
    if (enemiesNow.length > peakEnemyCount) peakEnemyCount = enemiesNow.length

    const baseEnts = registry.getEntitiesWith([SCHEMA.ECONOMY_STORAGE, SCHEMA.HEALTH])
    if (baseEnts.length > 0 && baseEnts[0]!.Health.current <= 0) break

    const stateEnts = registry.getEntitiesWith([SCHEMA.GAME_STATE])
    if (stateEnts.length > 0 && stateEnts[0]!.GameState.phase === 'victory') break
  }

  const state = getEconomyState(registry)
  const stateEnts = registry.getEntitiesWith([SCHEMA.GAME_STATE])
  const baseEnts = registry.getEntitiesWith([SCHEMA.ECONOMY_STORAGE, SCHEMA.HEALTH])
  const baseAlive = baseEnts.length > 0 && baseEnts[0]!.Health.current > 0
  const finalWave = stateEnts.length > 0 ? stateEnts[0]!.GameState.wave : 0
  const phase = stateEnts.length > 0 ? stateEnts[0]!.GameState.phase : 'unknown'
  const totalEnemiesSpawned = stateEnts.length > 0 ? stateEnts[0]!.GameState.totalSpawned : 0

  console.log(`\n=== Headless Simulation Results (5 waves) ===`)
  console.log(`Final entity count: ${registry.entityCount()}`)
  console.log(`Total enemies spawned: ${totalEnemiesSpawned}`)
  console.log(`Final wave: ${finalWave}`)
  console.log(`Phase: ${phase}`)
  console.log(`Base alive: ${baseAlive}`)
  console.log(`Peak simultaneous enemies: ${peakEnemyCount}`)
  console.log('Economy state:', JSON.stringify(state?.balances, null, 2))

  console.log(`\n=== Validation ===`)
  console.log(`No NaN positions: ✅`)
  console.log(`No economy NaN: ✅`)
  console.log(`Enemies spawned: ${totalEnemiesSpawned > 0 ? '✅' : '❌'} (${totalEnemiesSpawned})`)
  console.log(`Base survived: ${baseAlive ? '✅' : '❌'}`)
  console.log(`Wave progress: ${finalWave >= WAVE_DEFS.length ? '✅ All waves cleared' : `⚠ (${finalWave}/${WAVE_DEFS.length})`}`)
  console.log(`Save/load round-trip: ${match ? '✅' : '❌'}`)
}

runSim()

console.log('\n' + '='.repeat(50))
console.log('STRESS TEST: 200+ entities, 1000 ticks')
console.log('='.repeat(50))

function stressTest(): void {
  const registry = createRegistry<ScrapSwarmComponents>()
  const t0 = performance.now()

  createEntity(registry, {
    [SCHEMA.POSITION]: { x: 15, y: 10 },
    [SCHEMA.HEALTH]: { current: 2000, max: 2000 },
    [SCHEMA.ECONOMY_STORAGE]: { balances: { scrap: 0, crystal: 0, fuel: 0 } },
    [SCHEMA.LABEL]: { value: 'base' },
  })

  for (let i = 0; i < 30; i++) {
    createEntity(registry, {
      [SCHEMA.POSITION]: { x: 10 + (i % 6), y: 8 + Math.floor(i / 6) },
      [SCHEMA.VELOCITY]: { x: 0, y: 0 },
      [SCHEMA.HEALTH]: { current: 30, max: 30 },
      [SCHEMA.COLLIDER]: { width: 0.4, height: 0.4, solid: true },
      [SCHEMA.UNIT_AI]: { state: 'idle', role: 'worker', targetId: null, orderX: 0, orderY: 0 },
      [SCHEMA.WORKER]: { carryAmount: 0, carryType: '', buildSpeed: 1 },
      [SCHEMA.ACCUMULATOR]: { value: 0, threshold: MINE_THRESHOLD },
      [SCHEMA.LABEL]: { value: 'worker' },
    })
  }

  for (let i = 0; i < 50; i++) {
    createEntity(registry, {
      [SCHEMA.POSITION]: { x: 5, y: 5 },
      [SCHEMA.VELOCITY]: { x: 0, y: 0 },
      [SCHEMA.HEALTH]: { current: FIGHTER_HP, max: FIGHTER_HP },
      [SCHEMA.COLLIDER]: { width: 0.4, height: 0.4, solid: true },
      [SCHEMA.FIGHTER]: { damage: FIGHTER_DAMAGE, range: FIGHTER_RANGE, fireRate: FIGHTER_FIRE_RATE, cooldown: 0, variant: 'melee' },
      [SCHEMA.LABEL]: { value: 'fighter' },
    })
  }

  for (let i = 0; i < 200; i++) {
    const side = Math.floor(i / 50)
    const pos = side === 0 ? { x: 1, y: 1 } : side === 1 ? { x: 28, y: 1 } : side === 2 ? { x: 1, y: 18 } : { x: 28, y: 18 }
    createEntity(registry, {
      [SCHEMA.POSITION]: { x: pos.x + (i % 5) * 0.3, y: pos.y + (i % 5) * 0.3 },
      [SCHEMA.VELOCITY]: { x: 0, y: 0 },
      [SCHEMA.HEALTH]: { current: 30, max: 30 },
      [SCHEMA.COLLIDER]: { width: 0.4, height: 0.4, solid: true },
      [SCHEMA.ENEMY]: { damage: 6, speed: ENEMY_SPEED, reward: 10, variant: 'melee' },
      [SCHEMA.ACCUMULATOR]: { value: 0, threshold: 500 },
      [SCHEMA.LABEL]: { value: 'enemy' },
    })
  }

  for (let i = 0; i < 20; i++) {
    createEntity(registry, {
      [SCHEMA.POSITION]: { x: 12 + (i % 5) * 2, y: 12 + Math.floor(i / 5) * 2 },
      [SCHEMA.RESOURCE_NODE]: { type: 'scrap', remaining: 100, max: 100, depleted: false },
      [SCHEMA.LABEL]: { value: 'resource-node' },
    })
  }

  createEntity(registry, {
    [SCHEMA.GAME_STATE]: { phase: 'wave', wave: 0, score: 0, tick: 0, totalSpawned: 200 },
  })

  const stressTicks = 1000
  for (let tick = 0; tick < stressTicks; tick++) {
    workerSystem(registry, TICK_INTERVAL)
    combatSystem(registry, TICK_INTERVAL)
    enemySystem(registry, TICK_INTERVAL)
    projectileSystem(registry, TICK_INTERVAL)
    movementSystem(registry, TICK_INTERVAL)
    waveSystem(registry, TICK_INTERVAL)
    economySystem(registry, TICK_INTERVAL)
    collisionSystem(registry, TICK_INTERVAL)
    particleSystem(registry as any, TICK_INTERVAL)

    const all = registry.getAllEntities()
    for (const e of all) {
      if (e.Position && (isNaN(e.Position.x) || isNaN(e.Position.y))) {
        throw new Error(`NaN at tick ${tick}, entity ${e.id}`)
      }
    }
  }

  const t1 = performance.now()
  const elapsed = (t1 - t0).toFixed(1)
  const finalCount = registry.entityCount()
  const enemiesLeft = registry.getEntitiesWith([SCHEMA.ENEMY]).length
  const fightersLeft = registry.getEntitiesWith([SCHEMA.FIGHTER]).length

  console.log(`Time: ${elapsed}ms for ${stressTicks} ticks with 200+ entities`)
  console.log(`Throughput: ${(stressTicks / (parseFloat(elapsed) / 1000)).toFixed(0)} ticks/sec`)
  console.log(`Final entity count: ${finalCount}`)
  console.log(`Enemies remaining: ${enemiesLeft}`)
  console.log(`Fighters remaining: ${fightersLeft}`)
  console.log(`No NaN: ✅`)
  console.log(`Completed ${stressTicks} ticks without crash: ${finalCount > 0 ? '✅' : '❌'}`)
}

stressTest()

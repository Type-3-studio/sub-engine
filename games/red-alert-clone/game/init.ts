import type { Registry } from '@sub-engine/core'
import { SCHEMA } from './contract.js'
import type { RaComponents } from './contract.js'
import { MAP_W, MAP_H, TERRAIN, ORE_MAX_PER_TILE, BUILDING_DEFS, UNIT_DEFS, PLAYER_START_CREDITS, ENEMY_START_CREDITS } from './config.js'

function shuffleArray(arr: number[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!]
  }
}

function generateTerrain(): number[] {
  const tiles: number[] = new Array(MAP_W * MAP_H).fill(TERRAIN.GROUND)

  // River cross in center
  const cx = Math.floor(MAP_W / 2)
  const cy = Math.floor(MAP_H / 2)
  for (let y = 0; y < MAP_H; y++) {
    for (let d = -1; d <= 1; d++) {
      const tx = cx + d
      if (tx >= 0 && tx < MAP_W) tiles[y * MAP_W + tx] = TERRAIN.WATER
    }
  }
  for (let x = 0; x < MAP_W; x++) {
    for (let d = -1; d <= 1; d++) {
      const ty = cy + d
      if (ty >= 0 && ty < MAP_H) tiles[ty * MAP_W + x] = TERRAIN.WATER
    }
  }
  // Clear a small passage at (cx-1, cy) for bridges
  for (let d = -2; d <= 2; d++) {
    const bx = cx + d
    const by = cy
    if (bx >= 0 && bx < MAP_W) tiles[by * MAP_W + bx] = TERRAIN.GROUND
    if (bx >= 0 && bx < MAP_W) tiles[(by + 1) * MAP_W + bx] = TERRAIN.GROUND
  }

  // Scatter cliff patches at map edges
  for (let i = 0; i < 30; i++) {
    const x = Math.floor(Math.random() * MAP_W)
    const y = Math.floor(Math.random() * MAP_H)
    if (x < 5 || x > MAP_W - 6 || y < 5 || y > MAP_H - 6) {
      tiles[y * MAP_W + x] = TERRAIN.CLIFF
    }
  }

  return tiles
}

function generateOre(tiles: number[]): number[] {
  const ore: number[] = new Array(MAP_W * MAP_H).fill(0)

  // Scatter ore patches (avoiding water, cliffs, and starting base locations)
  const patches = [
    { cx: 15, cy: 15, r: 5, amount: 120 },
    { cx: 48, cy: 15, r: 6, amount: 130 },
    { cx: 15, cy: 48, r: 6, amount: 100 },
    { cx: 48, cy: 48, r: 5, amount: 110 },
    { cx: 32, cy: 10, r: 4, amount: 80 },
    { cx: 10, cy: 32, r: 4, amount: 90 },
    { cx: 50, cy: 32, r: 4, amount: 85 },
    { cx: 32, cy: 50, r: 4, amount: 95 },
  ]

  for (const patch of patches) {
    for (let dy = -patch.r; dy <= patch.r; dy++) {
      for (let dx = -patch.r; dx <= patch.r; dx++) {
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist > patch.r) continue
        const x = patch.cx + dx
        const y = patch.cy + dy
        if (x < 0 || x >= MAP_W || y < 0 || y >= MAP_H) continue
        const idx = y * MAP_W + x
        if (tiles[idx] !== TERRAIN.GROUND) continue
        const falloff = 1 - dist / patch.r
        ore[idx] = Math.floor(patch.amount * falloff * (0.7 + Math.random() * 0.3))
        if (ore[idx] > ORE_MAX_PER_TILE) ore[idx] = ORE_MAX_PER_TILE
      }
    }
  }

  // Add some random tiny patches
  const indices = Array.from({ length: MAP_W * MAP_H }, (_, i) => i)
  shuffleArray(indices)
  let placed = 0
  for (const idx of indices) {
    if (placed >= 80) break
    if (tiles[idx] !== TERRAIN.GROUND) continue
    if ((ore[idx] ?? 0) > 0) continue
    ore[idx] = Math.floor(40 + Math.random() * 60)
    placed++
  }

  return ore
}

function isAreaClear(tiles: number[], x: number, y: number, w: number, h: number): boolean {
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      const tx = x + dx
      const ty = y + dy
      if (tx < 0 || tx >= MAP_W || ty < 0 || ty >= MAP_H) return false
      if (tiles[ty * MAP_W + tx] !== TERRAIN.GROUND) return false
    }
  }
  return true
}

function clearArea(tiles: number[], ore: number[], x: number, y: number, w: number, h: number): void {
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      const tx = x + dx
      const ty = y + dy
      const idx = ty * MAP_W + tx
      if (tiles[idx] === TERRAIN.WATER) tiles[idx] = TERRAIN.GROUND
      ore[idx] = 0
    }
  }
}

export function initGame(registry: Registry<RaComponents>): void {
  // Generate map
  const tiles = generateTerrain()
  const ore = generateOre(tiles)

  // Clear areas for bases
  clearArea(tiles, ore, 4, 4, 10, 10)
  clearArea(tiles, ore, 50, 50, 10, 10)

  // Create map entity
  const mapEnt = registry.createEntity()
  registry.addComponent(mapEnt, SCHEMA.MAP_STATE, {
    width: MAP_W, height: MAP_H, tiles, ore,
  })
  registry.addComponent(mapEnt, SCHEMA.LABEL, { value: 'MapState' })

  const fogArr = new Array(MAP_W * MAP_H).fill(0)
  const revArr = new Array(MAP_W * MAP_H).fill(0)
  registry.addComponent(mapEnt, SCHEMA.FOG_STATE, {
    visible: fogArr, revealed: revArr,
  })

  // Create game state
  const gs = registry.createEntity()
  registry.addComponent(gs, SCHEMA.GAME_STATE, {
    credits: PLAYER_START_CREDITS,
    phase: 'playing',
    playerFaction: 'allied',
  })
  registry.addComponent(gs, SCHEMA.LABEL, { value: 'GameState' })

  // Player construction yard
  const cy = registry.createEntity()
  registry.addComponent(cy, SCHEMA.POSITION, { x: 6.5, y: 6.5 })
  registry.addComponent(cy, SCHEMA.HEALTH, { current: 500, max: 500 })
  registry.addComponent(cy, SCHEMA.OWNER, { faction: 'allied' })
  registry.addComponent(cy, SCHEMA.BUILDING, {
    type: 'construction_yard', state: 'active', progress: 1,
    width: 3, height: 3, powerProvided: 0, powerDrain: 0, faction: 'allied',
  })
  registry.addComponent(cy, SCHEMA.LABEL, { value: 'Building' })

  // Player power plant
  const pp = registry.createEntity()
  registry.addComponent(pp, SCHEMA.POSITION, { x: 11, y: 6 })
  registry.addComponent(pp, SCHEMA.HEALTH, { current: 200, max: 200 })
  registry.addComponent(pp, SCHEMA.OWNER, { faction: 'allied' })
  registry.addComponent(pp, SCHEMA.BUILDING, {
    type: 'power_plant', state: 'active', progress: 1,
    width: 2, height: 2, powerProvided: 100, powerDrain: 0, faction: 'allied',
  })
  registry.addComponent(pp, SCHEMA.LABEL, { value: 'Building' })

  // Player ore refinery
  const ref = registry.createEntity()
  registry.addComponent(ref, SCHEMA.POSITION, { x: 6.5, y: 11.5 })
  registry.addComponent(ref, SCHEMA.HEALTH, { current: 400, max: 400 })
  registry.addComponent(ref, SCHEMA.OWNER, { faction: 'allied' })
  registry.addComponent(ref, SCHEMA.BUILDING, {
    type: 'ore_refinery', state: 'active', progress: 1,
    width: 3, height: 3, powerProvided: 0, powerDrain: 10, faction: 'allied',
  })
  registry.addComponent(ref, SCHEMA.LABEL, { value: 'Building' })

  // Player barracks
  const br = registry.createEntity()
  registry.addComponent(br, SCHEMA.POSITION, { x: 10, y: 11 })
  registry.addComponent(br, SCHEMA.HEALTH, { current: 250, max: 250 })
  registry.addComponent(br, SCHEMA.OWNER, { faction: 'allied' })
  registry.addComponent(br, SCHEMA.BUILDING, {
    type: 'barracks', state: 'active', progress: 1,
    width: 2, height: 2, powerProvided: 0, powerDrain: 10, faction: 'allied',
  })
  registry.addComponent(br, SCHEMA.LABEL, { value: 'Building' })

  // Player harvester (spawned at refinery)
  const hvU = UNIT_DEFS.harvester!!
  const hv = registry.createEntity()
  registry.addComponent(hv, SCHEMA.POSITION, { x: 7.5, y: 14.5 })
  registry.addComponent(hv, SCHEMA.HEALTH, { current: hvU.hp, max: hvU.hp })
  registry.addComponent(hv, SCHEMA.OWNER, { faction: 'allied' })
  registry.addComponent(hv, SCHEMA.UNIT, {
    type: 'harvester', state: 'idle',
    payload: 0, payloadCapacity: hvU.payloadCapacity,
    attackCooldown: 0, attackRange: 0, damage: 0,
    moveSpeed: hvU.speed, buildTime: hvU.buildTime, cost: hvU.cost,
    faction: 'allied',
  })
  registry.addComponent(hv, SCHEMA.LABEL, { value: 'Unit' })

  // ===== ENEMY BASE =====
  const ef = 'soviet'

  // Enemy construction yard
  const ecy = registry.createEntity()
  registry.addComponent(ecy, SCHEMA.POSITION, { x: 52.5, y: 52.5 })
  registry.addComponent(ecy, SCHEMA.HEALTH, { current: 500, max: 500 })
  registry.addComponent(ecy, SCHEMA.OWNER, { faction: ef })
  registry.addComponent(ecy, SCHEMA.BUILDING, {
    type: 'construction_yard', state: 'active', progress: 1,
    width: 3, height: 3, powerProvided: 0, powerDrain: 0, faction: ef,
  })
  registry.addComponent(ecy, SCHEMA.LABEL, { value: 'Building' })

  // Enemy power plant
  const epp = registry.createEntity()
  registry.addComponent(epp, SCHEMA.POSITION, { x: 57, y: 54 })
  registry.addComponent(epp, SCHEMA.HEALTH, { current: 200, max: 200 })
  registry.addComponent(epp, SCHEMA.OWNER, { faction: ef })
  registry.addComponent(epp, SCHEMA.BUILDING, {
    type: 'power_plant', state: 'active', progress: 1,
    width: 2, height: 2, powerProvided: 100, powerDrain: 0, faction: ef,
  })
  registry.addComponent(epp, SCHEMA.LABEL, { value: 'Building' })

  // Enemy ore refinery + harvester
  const eref = registry.createEntity()
  registry.addComponent(eref, SCHEMA.POSITION, { x: 52.5, y: 57.5 })
  registry.addComponent(eref, SCHEMA.HEALTH, { current: 400, max: 400 })
  registry.addComponent(eref, SCHEMA.OWNER, { faction: ef })
  registry.addComponent(eref, SCHEMA.BUILDING, {
    type: 'ore_refinery', state: 'active', progress: 1,
    width: 3, height: 3, powerProvided: 0, powerDrain: 10, faction: ef,
  })
  registry.addComponent(eref, SCHEMA.LABEL, { value: 'Building' })

  const ehv = registry.createEntity()
  registry.addComponent(ehv, SCHEMA.POSITION, { x: 53.5, y: 60.5 })
  registry.addComponent(ehv, SCHEMA.HEALTH, { current: hvU.hp, max: hvU.hp })
  registry.addComponent(ehv, SCHEMA.OWNER, { faction: ef })
  registry.addComponent(ehv, SCHEMA.UNIT, {
    type: 'harvester', state: 'idle',
    payload: 0, payloadCapacity: hvU.payloadCapacity,
    attackCooldown: 0, attackRange: 0, damage: 0,
    moveSpeed: hvU.speed, buildTime: hvU.buildTime, cost: hvU.cost,
    faction: ef,
  })
  registry.addComponent(ehv, SCHEMA.LABEL, { value: 'Unit' })

  // Enemy barracks
  const ebr = registry.createEntity()
  registry.addComponent(ebr, SCHEMA.POSITION, { x: 55, y: 50 })
  registry.addComponent(ebr, SCHEMA.HEALTH, { current: 250, max: 250 })
  registry.addComponent(ebr, SCHEMA.OWNER, { faction: ef })
  registry.addComponent(ebr, SCHEMA.BUILDING, {
    type: 'barracks', state: 'active', progress: 1,
    width: 2, height: 2, powerProvided: 0, powerDrain: 10, faction: ef,
  })
  registry.addComponent(ebr, SCHEMA.LABEL, { value: 'Building' })

  // Enemy war factory
  const ewf = registry.createEntity()
  registry.addComponent(ewf, SCHEMA.POSITION, { x: 57.5, y: 50.5 })
  registry.addComponent(ewf, SCHEMA.HEALTH, { current: 350, max: 350 })
  registry.addComponent(ewf, SCHEMA.OWNER, { faction: ef })
  registry.addComponent(ewf, SCHEMA.BUILDING, {
    type: 'war_factory', state: 'active', progress: 1,
    width: 3, height: 3, powerProvided: 0, powerDrain: 20, faction: ef,
  })
  registry.addComponent(ewf, SCHEMA.LABEL, { value: 'Building' })

  // Enemy turrets around base
  const turretPositions: Array<[number, number]> = [[49, 49], [58, 48], [59, 58], [48, 59]]
  for (const [tx, ty] of turretPositions) {
    const tur = registry.createEntity()
    registry.addComponent(tur, SCHEMA.POSITION, { x: tx + 0.5, y: ty + 0.5 })
    registry.addComponent(tur, SCHEMA.HEALTH, { current: 300, max: 300 })
    registry.addComponent(tur, SCHEMA.OWNER, { faction: ef })
    registry.addComponent(tur, SCHEMA.BUILDING, {
      type: 'turret', state: 'active', progress: 1,
      width: 1, height: 1, powerProvided: 0, powerDrain: 25, faction: ef,
    })
    registry.addComponent(tur, SCHEMA.TARGET_SCANNER, {
      range: 5, damage: 20, fireRate: 600, cooldownRemaining: 0, ownerFaction: ef,
    })
    registry.addComponent(tur, SCHEMA.LABEL, { value: 'Building' })
  }

  // Enemy initial units
  const eU = UNIT_DEFS.heavy_grenadier!
  for (let i = 0; i < 3; i++) {
    const e = registry.createEntity()
    registry.addComponent(e, SCHEMA.POSITION, { x: 48 + i * 0.8, y: 50 })
    registry.addComponent(e, SCHEMA.HEALTH, { current: eU.hp, max: eU.hp })
    registry.addComponent(e, SCHEMA.OWNER, { faction: ef })
    registry.addComponent(e, SCHEMA.UNIT, {
      type: 'heavy_grenadier', state: 'idle',
      payload: 0, payloadCapacity: 0,
      attackCooldown: 0, attackRange: eU.attackRange,
      damage: eU.damage, moveSpeed: eU.speed,
      buildTime: eU.buildTime, cost: eU.cost, faction: ef,
    })
    registry.addComponent(e, SCHEMA.TARGET_SCANNER, {
      range: 8, damage: eU.damage, fireRate: eU.attackCooldown,
      cooldownRemaining: 0, ownerFaction: ef,
    })
    registry.addComponent(e, SCHEMA.LABEL, { value: 'Unit' })
  }

  const eT = UNIT_DEFS.heavy_tank!
  for (let i = 0; i < 2; i++) {
    const e = registry.createEntity()
    registry.addComponent(e, SCHEMA.POSITION, { x: 53, y: 48 + i * 1.5 })
    registry.addComponent(e, SCHEMA.HEALTH, { current: eT.hp, max: eT.hp })
    registry.addComponent(e, SCHEMA.OWNER, { faction: ef })
    registry.addComponent(e, SCHEMA.UNIT, {
      type: 'heavy_tank', state: 'idle',
      payload: 0, payloadCapacity: 0,
      attackCooldown: 0, attackRange: eT.attackRange,
      damage: eT.damage, moveSpeed: eT.speed,
      buildTime: eT.buildTime, cost: eT.cost, faction: ef,
    })
    registry.addComponent(e, SCHEMA.TARGET_SCANNER, {
      range: 8, damage: eT.damage, fireRate: eT.attackCooldown,
      cooldownRemaining: 0, ownerFaction: ef,
    })
    registry.addComponent(e, SCHEMA.LABEL, { value: 'Unit' })
  }
}

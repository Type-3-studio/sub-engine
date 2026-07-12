import type { Registry } from '@sub-engine/core'
import { SCHEMA } from './contract.js'
import type { RaComponents } from './contract.js'
import {
  MAP_W, MAP_H, TERRAIN, ORE_MAX_PER_TILE, ORE_REGROW_RATE, ORE_SPREAD_CHANCE, ORE_SPREAD_THRESHOLD,
  HARVEST_AMOUNT_PER_TICK, HARVESTER_PAYLOAD_CREDITS, UNIT_DEFS, BUILDING_DEFS,
} from './config.js'

// ==============================
// PRODUCTION SYSTEM
// Completes building construction and unit production queues
// ==============================
export function productionSystem(registry: Registry<RaComponents>, dt: number): void {
  const gsEnts = registry.getEntitiesWith([SCHEMA.GAME_STATE])
  if (!gsEnts.length) return
  const gs = gsEnts[0]!
  const state = gs.GameState

  const allBldgs = registry.getEntitiesWith([SCHEMA.BUILDING])
  let totalProvided = 0
  let totalDrain = 0
  for (const b of allBldgs) {
    if (b.Building.state === 'active' || b.Building.state === 'building') {
      totalProvided += b.Building.powerProvided
      totalDrain += b.Building.powerDrain
    }
  }
  const hasPower = totalProvided >= totalDrain
  const productionMultiplier = hasPower ? 1 : 0.5

  // Complete building construction
  for (const b of allBldgs) {
    if (b.Building.state !== 'building') continue
    if (b.Building.type === 'construction_yard') continue

    const buildDef = BUILDING_DEFS[b.Building.type]
    if (!buildDef) continue

    const progress = b.Building.progress + (dt / buildDef.buildTime) * productionMultiplier
    if (progress >= 1) {
      registry.addComponent(b.id, SCHEMA.BUILDING, {
        ...b.Building, state: 'active', progress: 1,
      })
      const hp = registry.getComponent(b.id, SCHEMA.HEALTH)
      if (hp) {
        registry.addComponent(b.id, SCHEMA.HEALTH, { current: hp.max, max: hp.max })
      }
    } else {
      registry.addComponent(b.id, SCHEMA.BUILDING, { ...b.Building, progress })
    }
  }

  // Process unit build queues
  const queues = registry.getEntitiesWith([SCHEMA.BUILD_QUEUE])
  for (const qEnt of queues) {
    const queue = qEnt.BuildQueue
    if (!queue.items.length) continue

    const item = queue.items[0]!
    item.progress += dt * productionMultiplier

    if (item.progress >= item.totalTime) {
      const bPos = registry.getComponent(qEnt.id, SCHEMA.POSITION)
      const bldg = registry.getComponent(qEnt.id, SCHEMA.BUILDING)
      if (bPos && bldg) {
        const unitDef = UNIT_DEFS[item.type]
        if (unitDef) {
          const spawnX = bPos.x + bldg.width / 2 + 1.5
          const spawnY = bPos.y
          const unit = registry.createEntity()
          registry.addComponent(unit, SCHEMA.POSITION, { x: spawnX, y: spawnY })
          registry.addComponent(unit, SCHEMA.HEALTH, { current: unitDef.hp, max: unitDef.hp })
          registry.addComponent(unit, SCHEMA.OWNER, { faction: bldg.faction })
          registry.addComponent(unit, SCHEMA.UNIT, {
            type: unitDef.id, state: 'idle',
            payload: 0, payloadCapacity: unitDef.payloadCapacity,
            attackCooldown: 0, attackRange: unitDef.attackRange,
            damage: unitDef.damage, moveSpeed: unitDef.speed,
            buildTime: unitDef.buildTime, cost: unitDef.cost, faction: bldg.faction,
          })
          registry.addComponent(unit, SCHEMA.LABEL, { value: 'Unit' })
          if (unitDef.damage > 0) {
            registry.addComponent(unit, SCHEMA.TARGET_SCANNER, {
              range: Math.max(unitDef.attackRange, 5),
              damage: unitDef.damage,
              fireRate: unitDef.attackCooldown,
              cooldownRemaining: 0,
              ownerFaction: bldg.faction,
            })
          }
        }
      }
      queue.items.shift()
      registry.addComponent(qEnt.id, SCHEMA.BUILD_QUEUE, { items: [...queue.items] })
    } else {
      registry.addComponent(qEnt.id, SCHEMA.BUILD_QUEUE, { items: [...queue.items] })
    }
  }
}

// ==============================
// HARVESTER SYSTEM
// AI loop: idle → move_to_ore → harvest → return → unload → idle
// Uses position-distance checks (NOT PathFollower completion) for state transitions
// to avoid timing issues with the snapshot-based system order.
// ==============================
export function harvesterSystem(registry: Registry<RaComponents>, dt: number): void {
  const mapEnts = registry.getEntitiesWith([SCHEMA.MAP_STATE])
  if (!mapEnts.length) return
  const mapData = mapEnts[0]!.MapState

  const entities = registry.getAllEntities()
  const harvesters = entities.filter(e => e.Unit && e.Unit.type === 'harvester' && e.Position)
  const buildings = entities.filter(e => e.Building && e.Position && e.Building.state === 'active')

  const ARRIVE_DIST = 0.7

  for (const hEnt of harvesters) {
    let unit = hEnt.Unit as RaComponents['Unit']
    const pos = hEnt.Position as RaComponents['Position']
    const pf = registry.getComponent(hEnt.id, SCHEMA.PATH_FOLLOWER)

    if (unit.state === 'idle' && unit.payload === 0) {
      let bestDist = Infinity
      let bestX = -1
      let bestY = -1
      for (let y = 0; y < MAP_H; y++) {
        for (let x = 0; x < MAP_W; x++) {
          const idx = y * MAP_W + x
          if (mapData.ore[idx]! > 5) {
            const dx = x + 0.5 - pos.x
            const dy = y + 0.5 - pos.y
            const dist = dx * dx + dy * dy
            if (dist < bestDist) {
              bestDist = dist
              bestX = x
              bestY = y
            }
          }
        }
      }
      if (bestX >= 0 && bestY >= 0) {
        registry.addComponent(hEnt.id, SCHEMA.UNIT, { ...unit, state: 'moving_to_ore' })
        registry.addComponent(hEnt.id, SCHEMA.PATH_FOLLOWER, {
          path: [{ x: bestX + 0.5, y: bestY + 0.5 }],
          index: 0, speed: unit.moveSpeed, loop: false,
        })
        registry.addComponent(hEnt.id, SCHEMA.VELOCITY, { x: 0, y: 0 })
      }
    }
    else if (unit.state === 'moving_to_ore') {
      const target = pf && pf.path.length > 0 ? pf.path[0] : null
      const arrived = !pf || pf.index >= pf.path.length
      const tileX = Math.round(pos.x - 0.5)
      const tileY = Math.round(pos.y - 0.5)
      const distToTarget = target ? Math.sqrt((pos.x - target.x) ** 2 + (pos.y - target.y) ** 2) : 999
      if (arrived || (target && distToTarget < ARRIVE_DIST)) {
        const idx = tileY * MAP_W + tileX
        const hasOre = tileX >= 0 && tileX < MAP_W && tileY >= 0 && tileY < MAP_H && (mapData.ore[idx] ?? 0) > 0
        if (hasOre) {
          registry.addComponent(hEnt.id, SCHEMA.UNIT, { ...unit, state: 'harvesting' })
          registry.addComponent(hEnt.id, SCHEMA.VELOCITY, { x: 0, y: 0 })
          if (pf) registry.removeComponent(hEnt.id, SCHEMA.PATH_FOLLOWER)
        } else {
          registry.addComponent(hEnt.id, SCHEMA.UNIT, { ...unit, state: 'idle' })
          registry.addComponent(hEnt.id, SCHEMA.VELOCITY, { x: 0, y: 0 })
          if (pf) registry.removeComponent(hEnt.id, SCHEMA.PATH_FOLLOWER)
        }
      }
    }
    else if (unit.state === 'harvesting') {
      const tileX = Math.round(pos.x - 0.5)
      const tileY = Math.round(pos.y - 0.5)
      const idx = tileY * MAP_W + tileX
      let currentOre = (tileX >= 0 && tileX < MAP_W && tileY >= 0 && tileY < MAP_H) ? (mapData.ore[idx] ?? 0) : 0
      let payload = unit.payload

      if (currentOre > 0 && payload < unit.payloadCapacity) {
        const harvestAmount = Math.min(HARVEST_AMOUNT_PER_TICK * (dt / 16), currentOre, unit.payloadCapacity - payload)
        mapData.ore[idx] = Math.max(0, currentOre - harvestAmount)
        payload += harvestAmount
        currentOre = mapData.ore[idx] ?? 0
      }

      if (payload >= unit.payloadCapacity || currentOre <= 0) {
        let bestDist = Infinity
        let bestRefPos = { x: 0, y: 0 }
        for (const b of buildings) {
          const bB = b.Building!
          const bP = b.Position!
          if (bB.type === 'ore_refinery' && bB.faction === unit.faction) {
            const dx = bP.x - pos.x
            const dy = bP.y - pos.y
            const dist = dx * dx + dy * dy
            if (dist < bestDist) {
              bestDist = dist
              bestRefPos = { x: bP.x, y: bP.y }
            }
          }
        }
        const newState = bestDist < Infinity ? 'returning' : 'idle'
        registry.addComponent(hEnt.id, SCHEMA.UNIT, { ...unit, state: newState, payload })
        if (bestDist < Infinity) {
          registry.addComponent(hEnt.id, SCHEMA.PATH_FOLLOWER, {
            path: [{ x: bestRefPos.x, y: bestRefPos.y + 2 }],
            index: 0, speed: unit.moveSpeed, loop: false,
          })
        }
      } else {
        registry.addComponent(hEnt.id, SCHEMA.UNIT, { ...unit, payload })
      }
    }
    else if (unit.state === 'returning') {
      let docked = false
      for (const b of buildings) {
        const bB = b.Building!
        const bP = b.Position!
        if (bB.type === 'ore_refinery' && bB.faction === unit.faction) {
          const dx = pos.x - bP.x
          const dy = pos.y - (bP.y + 2)
          if (Math.abs(dx) < 2.5 && Math.abs(dy) < 2.5) {
            docked = true
            break
          }
        }
      }

      if (docked) {
        const gsEnts = registry.getEntitiesWith([SCHEMA.GAME_STATE])
        if (gsEnts.length) {
          const gs = gsEnts[0]!
          const creditGain = unit.payload * HARVESTER_PAYLOAD_CREDITS
          registry.addComponent(gs.id, SCHEMA.GAME_STATE, {
            ...gs.GameState,
            credits: gs.GameState.credits + creditGain,
          })
        }
        registry.addComponent(hEnt.id, SCHEMA.UNIT, { ...unit, state: 'idle', payload: 0 })
        registry.addComponent(hEnt.id, SCHEMA.VELOCITY, { x: 0, y: 0 })
        if (pf) registry.removeComponent(hEnt.id, SCHEMA.PATH_FOLLOWER)
      }
    }
  }

  registry.addComponent(mapEnts[0]!.id, SCHEMA.MAP_STATE, { ...mapData })
}

// ==============================
// COMBAT SYSTEM (auto-target + fire)
// ==============================
export function combatSystem(registry: Registry<RaComponents>, dt: number): void {
  const attackers = registry.getEntitiesWith([SCHEMA.TARGET_SCANNER, SCHEMA.POSITION])
  if (!attackers.length) return

  const allBldgs = registry.getEntitiesWith([SCHEMA.BUILDING])
  let totalProvided = 0
  let totalDrain = 0
  for (const b of allBldgs) {
    if (b.Building.state === 'active' || b.Building.state === 'building') {
      totalProvided += b.Building.powerProvided
      totalDrain += b.Building.powerDrain
    }
  }
  const hasPower = totalProvided >= totalDrain

  // Cache all potential targets
  const allUnits = registry.getEntitiesWith([SCHEMA.UNIT, SCHEMA.POSITION, SCHEMA.HEALTH])
  const allTargetBuildings = registry.getEntitiesWith([SCHEMA.BUILDING, SCHEMA.POSITION, SCHEMA.HEALTH])

  for (const a of attackers) {
    const scanner = a.TargetScanner
    const aPos = a.Position

    // Turrets need power
    const bldg = registry.getComponent(a.id, SCHEMA.BUILDING)
    if (bldg && bldg.type === 'turret' && !hasPower) {
      continue
    }

    const cooldownRemaining = scanner.cooldownRemaining ?? 0
    if (cooldownRemaining > 0) {
      registry.addComponent(a.id, SCHEMA.TARGET_SCANNER, {
        ...scanner, cooldownRemaining: Math.max(0, cooldownRemaining - dt),
      })
      continue
    }

    // Validate current target
    const targetId = scanner.targetEntity
    let validTarget = false
    if (targetId !== undefined && registry.entityExists(targetId)) {
      const targetPos = registry.getComponent(targetId, SCHEMA.POSITION)
      if (targetPos) {
        const dx = aPos.x - targetPos.x
        const dy = aPos.y - targetPos.y
        if (Math.sqrt(dx * dx + dy * dy) <= scanner.range) {
          validTarget = true
        }
      }
    }

    if (!validTarget) {
      let bestDist = Infinity
      let bestTarget: number | null = null
      const candidates = [...allUnits, ...allTargetBuildings] as Array<{
        id: number; Position: { x: number; y: number }
      }>
      for (const e of candidates) {
        const owner = registry.getComponent(e.id, SCHEMA.OWNER)
        if (!owner || owner.faction === scanner.ownerFaction) continue
        const dx = aPos.x - e.Position.x
        const dy = aPos.y - e.Position.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist <= scanner.range && dist < bestDist) {
          bestDist = dist
          bestTarget = e.id
        }
      }
      if (bestTarget !== null) {
        registry.addComponent(a.id, SCHEMA.TARGET_SCANNER, { ...scanner, targetEntity: bestTarget })
        continue
      }
    }

    if (validTarget && targetId !== undefined) {
      const targetPos = registry.getComponent(targetId, SCHEMA.POSITION)
      if (targetPos) {
        const proj = registry.createEntity()
        registry.addComponent(proj, SCHEMA.PROJECTILE, {
          targetX: targetPos.x, targetY: targetPos.y,
          startX: aPos.x, startY: aPos.y,
          speed: 5, damage: scanner.damage ?? 10,
          ownerFaction: scanner.ownerFaction ?? '',
        })
        registry.addComponent(proj, SCHEMA.POSITION, { x: aPos.x, y: aPos.y })
        registry.addComponent(proj, SCHEMA.LABEL, { value: 'Projectile' })
        registry.addComponent(a.id, SCHEMA.TARGET_SCANNER, {
          ...scanner, cooldownRemaining: scanner.fireRate ?? 500,
        })
      }
    }
  }
}

// ==============================
// PROJECTILE SYSTEM
// ==============================
export function projectileSystem(registry: Registry<RaComponents>, dt: number): void {
  const stepScale = dt / 16
  const projectiles = registry.getEntitiesWith([SCHEMA.PROJECTILE, SCHEMA.POSITION])
  const toRemove: number[] = []

  for (const pEnt of projectiles) {
    const p = pEnt.Projectile
    const pos = pEnt.Position
    const dx = p.targetX - pos.x
    const dy = p.targetY - pos.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist < p.speed * stepScale) {
      const targets = registry.getEntitiesWith([SCHEMA.HEALTH, SCHEMA.POSITION])
      let closestDist = Infinity
      let closestId: number | null = null
      for (const t of targets) {
        const owner = registry.getComponent(t.id, SCHEMA.OWNER)
        if (!owner || owner.faction === p.ownerFaction) continue
        const tdx = t.Position.x - p.targetX
        const tdy = t.Position.y - p.targetY
        const tdist = Math.sqrt(tdx * tdx + tdy * tdy)
        if (tdist < 1.5 && tdist < closestDist) {
          closestDist = tdist
          closestId = t.id
        }
      }
      if (closestId !== null) {
        const hp = registry.getComponent(closestId, SCHEMA.HEALTH)!
        const newHp = Math.max(0, hp.current - p.damage)
        registry.addComponent(closestId, SCHEMA.HEALTH, { current: newHp, max: hp.max })
      }
      toRemove.push(pEnt.id)
    } else {
      registry.addComponent(pEnt.id, SCHEMA.POSITION, {
        x: pos.x + (dx / dist) * p.speed * stepScale,
        y: pos.y + (dy / dist) * p.speed * stepScale,
      })
    }
  }

  for (const id of toRemove) {
    registry.removeEntity(id)
  }
}

// ==============================
// UNIT MOVEMENT SYSTEM
// Follows PathFollower waypoints → sets Velocity
// ==============================
export function unitMovementSystem(registry: Registry<RaComponents>, dt: number): void {
  const stepScale = dt / 16
  const followers = registry.getEntitiesWith([SCHEMA.PATH_FOLLOWER, SCHEMA.POSITION, SCHEMA.UNIT])

  for (const e of followers) {
    const pf = e.PathFollower
    const pos = e.Position
    const unit = e.Unit

    if (unit.state === 'harvesting' || unit.state === 'unloading') continue

    if (pf.index >= pf.path.length) {
      registry.addComponent(e.id, SCHEMA.VELOCITY, { x: 0, y: 0 })
      if (unit.type !== 'harvester') {
        registry.addComponent(e.id, SCHEMA.UNIT, { ...unit, state: 'idle' })
      }
      continue
    }

    const target = pf.path[pf.index]!
    const dx = target.x - pos.x
    const dy = target.y - pos.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    const moveThisTick = unit.moveSpeed * stepScale

    if (dist <= moveThisTick) {
      registry.addComponent(e.id, SCHEMA.POSITION, { x: target.x, y: target.y })
      registry.addComponent(e.id, SCHEMA.PATH_FOLLOWER, { ...pf, index: pf.index + 1 })
      registry.addComponent(e.id, SCHEMA.VELOCITY, { x: 0, y: 0 })
      continue
    }

    registry.addComponent(e.id, SCHEMA.VELOCITY, {
      x: (dx / dist) * unit.moveSpeed,
      y: (dy / dist) * unit.moveSpeed,
    })
    if (unit.type !== 'harvester') {
      registry.addComponent(e.id, SCHEMA.UNIT, { ...unit, state: 'moving' })
    }
  }
}

// ==============================
// MOVEMENT SYSTEM (apply Velocity → Position)
// ==============================
export function movementSystem(registry: Registry<RaComponents>, dt: number): void {
  const stepScale = dt / 16
  const entities = registry.getEntitiesWith([SCHEMA.POSITION, SCHEMA.VELOCITY])
  for (const e of entities) {
    const pos = e.Position
    const vel = e.Velocity
    registry.addComponent(e.id, SCHEMA.POSITION, {
      x: pos.x + vel.x * stepScale,
      y: pos.y + vel.y * stepScale,
    })
  }
}

// ==============================
// ORE REGENERATION SYSTEM
// ==============================
export function oreSystem(registry: Registry<RaComponents>, dt: number): void {
  const mapEnts = registry.getEntitiesWith([SCHEMA.MAP_STATE])
  if (!mapEnts.length) return
  const mapData = mapEnts[0]!.MapState
  const tiles = mapData.tiles
  const ore = mapData.ore
  let changed = false

  for (let i = 0; i < ore.length; i++) {
    if (tiles[i] !== TERRAIN.GROUND) continue
    if (ore[i]! > 0 && ore[i]! < ORE_MAX_PER_TILE) {
      ore[i] = Math.min(ORE_MAX_PER_TILE, ore[i]! + ORE_REGROW_RATE * (dt / 1000))
      changed = true
    }
  }

  if (Math.random() < ORE_SPREAD_CHANCE * (dt / 16)) {
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        const idx = y * MAP_W + x
        if (tiles[idx] !== TERRAIN.GROUND) continue
        if (ore[idx]! >= ORE_SPREAD_THRESHOLD) {
          const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]]
          for (const d of dirs) {
            const nx = x + d[0]!
            const ny = y + d[1]!
            if (nx < 0 || nx >= MAP_W || ny < 0 || ny >= MAP_H) continue
            const nidx = ny * MAP_W + nx
            if (tiles[nidx] !== TERRAIN.GROUND) continue
            if (ore[nidx]! === 0) {
              ore[nidx] = 20
              ore[idx] = Math.max(0, ore[idx]! - 20)
              changed = true
              break
            }
          }
        }
      }
    }
  }

  if (changed) {
    registry.addComponent(mapEnts[0]!.id, SCHEMA.MAP_STATE, { ...mapData })
  }
}

// ==============================
// FOG OF WAR SYSTEM
// ==============================
export function fogSystem(registry: Registry<RaComponents>): void {
  const mapEnts = registry.getEntitiesWith([SCHEMA.MAP_STATE, SCHEMA.FOG_STATE])
  if (!mapEnts.length) return
  const mapData = mapEnts[0]!.MapState
  const fog = mapEnts[0]!.FogState
  const fogVisible = fog.visible
  const fogRevealed = fog.revealed
  const VISION_RANGE = 6

  // Reset
  for (let i = 0; i < fogVisible.length; i++) {
    fogVisible[i] = 0
  }

  // Units reveal
  const units = registry.getEntitiesWith([SCHEMA.POSITION, SCHEMA.OWNER])
  for (const u of units) {
    const tx = Math.round(u.Position.x - 0.5)
    const ty = Math.round(u.Position.y - 0.5)
    for (let dy = -VISION_RANGE; dy <= VISION_RANGE; dy++) {
      for (let dx = -VISION_RANGE; dx <= VISION_RANGE; dx++) {
        if (dx * dx + dy * dy > VISION_RANGE * VISION_RANGE) continue
        const vx = tx + dx
        const vy = ty + dy
        if (vx < 0 || vx >= MAP_W || vy < 0 || vy >= MAP_H) continue
        fogVisible[vy * MAP_W + vx]!++
      }
    }
  }

  // Buildings reveal
  const buildings = registry.getEntitiesWith([SCHEMA.BUILDING, SCHEMA.POSITION, SCHEMA.OWNER])
  for (const b of buildings) {
    if (b.Building.state !== 'active') continue
    const tx = Math.round(b.Position.x - 0.5)
    const ty = Math.round(b.Position.y - 0.5)
    for (let dy = -5; dy <= 5; dy++) {
      for (let dx = -5; dx <= 5; dx++) {
        if (dx * dx + dy * dy > 25) continue
        const vx = tx + dx
        const vy = ty + dy
        if (vx < 0 || vx >= MAP_W || vy < 0 || vy >= MAP_H) continue
        fogVisible[vy * MAP_W + vx]!++
      }
    }
  }

  for (let i = 0; i < fogVisible.length; i++) {
    if (fogVisible[i]! > 0 && fogRevealed[i]! === 0) {
      fogRevealed[i] = 1
    }
  }

  registry.addComponent(mapEnts[0]!.id, SCHEMA.FOG_STATE, { visible: [...fogVisible], revealed: [...fogRevealed] })
}

// ==============================
// VICTORY SYSTEM
// ==============================
export function victorySystem(registry: Registry<RaComponents>): void {
  const gsEnts = registry.getEntitiesWith([SCHEMA.GAME_STATE])
  if (!gsEnts.length) return
  const gs = gsEnts[0]!
  if (gs.GameState.phase !== 'playing') return

  const allEntities = registry.getAllEntities()
  let alliedUnits = 0
  let sovietUnits = 0

  for (const e of allEntities) {
    const owner = e.Owner
    if (!owner) continue
    if (owner.faction === 'allied') alliedUnits++
    else if (owner.faction === 'soviet') sovietUnits++
  }

  if (sovietUnits === 0) {
    registry.addComponent(gs.id, SCHEMA.GAME_STATE, { ...gs.GameState, phase: 'victory' })
  } else if (alliedUnits === 0) {
    registry.addComponent(gs.id, SCHEMA.GAME_STATE, { ...gs.GameState, phase: 'defeated' })
  }
}

// ==============================
// ENEMY AI SYSTEM
// Periodically spawns units for the enemy
// ==============================
export function enemyAISystem(registry: Registry<RaComponents>, dt: number): void {
  const buildings = registry.getEntitiesWith([SCHEMA.BUILDING, SCHEMA.POSITION])
  const enemyBldgs = buildings.filter(b => b.Building.faction === 'soviet' && b.Building.state === 'active')
  const barrack = enemyBldgs.find(b => b.Building.type === 'barracks')
  const warFactory = enemyBldgs.find(b => b.Building.type === 'war_factory')

  if (!barrack && !warFactory) return

  const units = registry.getEntitiesWith([SCHEMA.UNIT, SCHEMA.OWNER])
  const enemyUnits = units.filter(u => u.Owner.faction === 'soviet')
  const infantryCount = enemyUnits.filter(u => u.Unit.type === 'heavy_grenadier').length
  const tankCount = enemyUnits.filter(u => u.Unit.type === 'heavy_tank').length

  // AI timer entity
  const aiEnts = registry.getEntitiesWith([SCHEMA.AI_TIMER])
  let timer = 0
  if (aiEnts.length > 0) {
    timer = aiEnts[0]!.AITimer.timer
  }

  timer += dt

  if (timer >= 8000) {
    timer = 0
    if (barrack && infantryCount < 6) {
      const def = UNIT_DEFS.heavy_grenadier!
      const barrackPos = barrack.Position!
      const e = registry.createEntity()
      registry.addComponent(e, SCHEMA.POSITION, { x: barrackPos.x + 2, y: barrackPos.y })
      registry.addComponent(e, SCHEMA.HEALTH, { current: def.hp, max: def.hp })
      registry.addComponent(e, SCHEMA.OWNER, { faction: 'soviet' })
      registry.addComponent(e, SCHEMA.UNIT, {
        type: def.id, state: 'idle', payload: 0, payloadCapacity: 0,
        attackCooldown: 0, attackRange: def.attackRange,
        damage: def.damage, moveSpeed: def.speed,
        buildTime: def.buildTime, cost: def.cost, faction: 'soviet',
      })
      registry.addComponent(e, SCHEMA.TARGET_SCANNER, {
        range: 8, damage: def.damage, fireRate: def.attackCooldown,
        cooldownRemaining: 0, ownerFaction: 'soviet',
      })
      registry.addComponent(e, SCHEMA.LABEL, { value: 'Unit' })
    }
    if (warFactory && tankCount < 4) {
      const def = UNIT_DEFS.heavy_tank!
      const wfPos = warFactory.Position!
      const e = registry.createEntity()
      registry.addComponent(e, SCHEMA.POSITION, { x: wfPos.x + 2, y: wfPos.y })
      registry.addComponent(e, SCHEMA.HEALTH, { current: def.hp, max: def.hp })
      registry.addComponent(e, SCHEMA.OWNER, { faction: 'soviet' })
      registry.addComponent(e, SCHEMA.UNIT, {
        type: def.id, state: 'idle', payload: 0, payloadCapacity: 0,
        attackCooldown: 0, attackRange: def.attackRange,
        damage: def.damage, moveSpeed: def.speed,
        buildTime: def.buildTime, cost: def.cost, faction: 'soviet',
      })
      registry.addComponent(e, SCHEMA.TARGET_SCANNER, {
        range: 8, damage: def.damage, fireRate: def.attackCooldown,
        cooldownRemaining: 0, ownerFaction: 'soviet',
      })
      registry.addComponent(e, SCHEMA.LABEL, { value: 'Unit' })
    }
  }

  // Update timer entity
  if (aiEnts.length > 0) {
    registry.addComponent(aiEnts[0]!.id, SCHEMA.AI_TIMER, { timer })
  } else {
    const t = registry.createEntity()
    registry.addComponent(t, SCHEMA.AI_TIMER, { timer })
    registry.addComponent(t, SCHEMA.LABEL, { value: 'AITimer' })
  }
}

// ==============================
// DEAD ENTITY CLEANUP
// ==============================
export function cleanupSystem(registry: Registry<RaComponents>): void {
  const dead = registry.getEntitiesWith([SCHEMA.HEALTH])
  for (const e of dead) {
    if (e.Health.current <= 0) {
      registry.removeEntity(e.id)
    }
  }
}

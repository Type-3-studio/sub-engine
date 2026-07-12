import { Container, Graphics, Text, Application, FederatedPointerEvent, Point } from 'pixi.js'
import { createRegistry, createGameLoop } from '@sub-engine/core'
import type { GameLoop } from '@sub-engine/core'
import type { EntitySnapshot } from '@sub-engine/pixi'
import { SCHEMA } from '../game/contract.js'
import type { RaComponents } from '../game/contract.js'
import { initGame } from '../game/init.js'
import {
  productionSystem, harvesterSystem, combatSystem, projectileSystem,
  unitMovementSystem, movementSystem, oreSystem, fogSystem,
  victorySystem, enemyAISystem, cleanupSystem,
} from '../game/systems.js'
import {
  TILE_SIZE, MAP_W, MAP_H, SIDEBAR_W, TERRAIN, BUILDING_DEFS, UNIT_DEFS,
} from '../game/config.js'

const WORLD_W = MAP_W * TILE_SIZE
const WORLD_H = MAP_H * TILE_SIZE

interface VisualEntry {
  container: Container
  prevX: number
  prevY: number
  curX: number
  curY: number
  first: boolean
  payloadGfx: Graphics | null
  hpFillGfx: Graphics | null
  hpBgGfx: Graphics | null
}

export function createGameScene(container: Container, app: Application, gameW: number, gameH: number) {
  const registry = createRegistry<RaComponents>()
  const viewW = gameW - SIDEBAR_W
  const viewH = gameH

  // Layers
  const worldLayer = new Container()
  const mapLayer = new Container()
  const terrainLayer = new Container()
  const oreLayer = new Container()
  const entityLayer = new Container()
  const overlayLayer = new Container()
  const ghostLayer = new Container()
  const selectionBoxLayer = new Container()

  worldLayer.addChild(terrainLayer)
  worldLayer.addChild(oreLayer)
  worldLayer.addChild(entityLayer)
  worldLayer.addChild(overlayLayer)
  worldLayer.addChild(ghostLayer)
  worldLayer.addChild(selectionBoxLayer)
  container.addChild(worldLayer)

  // Camera
  const camera = { x: 0, y: 0, targetX: 0, targetY: 0 }

  // Selection state
  let selectedIds: number[] = []
  let selectionStart: { x: number; y: number } | null = null
  let selectionRect: Graphics | null = null

  // Placement mode
  let placementType: string | null = null

  // Visual entities
  const visuals = new Map<number, VisualEntry>()

  // Map data cache
  let mapTiles: number[] = []
  let mapOre: number[] = []
  let terrainDrawn = false

  // Input state
  const keys: Record<string, boolean> = {}
  let paused = false

  // UI callback
  let _onStateChange: ((state: any) => void) | null = null

  // ===== MAP DRAWING =====
  function drawTerrain(): void {
    terrainLayer.removeChildren()
    const gfx = new Graphics()
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        const idx = y * MAP_W + x
        const tile = mapTiles[idx] ?? TERRAIN.GROUND
        let color = 0x3a6a2a
        if (tile === TERRAIN.WATER) color = 0x2266aa
        else if (tile === TERRAIN.CLIFF) color = 0x554433
        gfx.rect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE)
        gfx.fill(color)
        gfx.rect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE)
        gfx.stroke({ color: 0x000000, width: 0.5, alpha: 0.2 })
      }
    }
    terrainLayer.addChild(gfx)
  }

  function drawOre(): void {
    oreLayer.removeChildren()
    const gfx = new Graphics()
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        const idx = y * MAP_W + x
        const amount = mapOre[idx] ?? 0
        if (amount > 0) {
          const brightness = Math.min(1, amount / 150)
          const r = Math.floor(200 + 55 * brightness)
          const g = Math.floor(200 * brightness)
          const b = Math.floor(50 * brightness)
          const color = (r << 16) | (g << 8) | b
          const size = Math.max(2, TILE_SIZE * 0.3 * brightness)
          gfx.circle(x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + TILE_SIZE / 2, size)
          gfx.fill(color)
        }
      }
    }
    oreLayer.addChild(gfx)
  }

  function redrawMap(): void {
    drawTerrain()
    drawOre()
    terrainDrawn = true
  }

  // ===== VISUAL SYNC =====
  function createVisual(eid: number): VisualEntry | null {
    const unit = registry.getComponent(eid, SCHEMA.UNIT)
    const building = registry.getComponent(eid, SCHEMA.BUILDING)
    const proj = registry.getComponent(eid, SCHEMA.PROJECTILE)
    const pos = registry.getComponent(eid, SCHEMA.POSITION)

    if (!pos) return null

    const c = new Container()

    if (unit) {
      const color = unit.faction === 'allied' ? 0x4488ff : 0xff4444
      const isHarvester = unit.type === 'harvester'
      const isInfantry = unit.type === 'rifleman' || unit.type === 'heavy_grenadier'

      let payloadGfx: Graphics | null = null
      if (isHarvester) {
        const gfx = new Graphics()
        gfx.rect(-12, -8, 24, 16)
        gfx.fill(0xcccc44)
        gfx.rect(-12, -8, 24, 16)
        gfx.stroke({ color: 0x888822, width: 1 })
        c.addChild(gfx)
        payloadGfx = new Graphics()
        payloadGfx.rect(-10, -6, 20 * (unit.payload / Math.max(1, unit.payloadCapacity)), 12)
        payloadGfx.fill({ color: 0xffff44, alpha: 0.5 })
        c.addChild(payloadGfx)
      } else if (isInfantry) {
        const gfx = new Graphics()
        gfx.circle(0, 0, 5)
        gfx.fill(color)
        c.addChild(gfx)
        // Direction indicator
        const dir = new Graphics()
        dir.circle(0, -7, 2)
        dir.fill(0xffffff)
        c.addChild(dir)
      } else {
        // Vehicle
        const gfx = new Graphics()
        gfx.rect(-8, -6, 16, 12)
        gfx.fill(color)
        gfx.rect(-8, -6, 16, 12)
        gfx.stroke({ color: 0xffffff, width: 0.5, alpha: 0.5 })
        c.addChild(gfx)
        // Turret dot
        const tur = new Graphics()
        tur.circle(3, 0, 3)
        tur.fill(0xffffff)
        c.addChild(tur)
      }

      // Health bar
      let hpFillGfx: Graphics | null = null
      let hpBgGfx: Graphics | null = null
      const hp = registry.getComponent(eid, SCHEMA.HEALTH)
      if (hp) {
        const bw = 20
        hpBgGfx = new Graphics()
        hpBgGfx.rect(-bw / 2, -14, bw, 3)
        hpBgGfx.fill(0x222222)
        c.addChild(hpBgGfx)
        hpFillGfx = new Graphics()
        hpFillGfx.rect(-bw / 2, -14, bw * (hp.current / hp.max), 3)
        hpFillGfx.fill(0x44ff44)
        c.addChild(hpFillGfx)
      }

      // Selection ring
      c.eventMode = 'static'
      c.cursor = 'pointer'

      entityLayer.addChild(c)
      return {
        container: c, first: true,
        prevX: pos.x * TILE_SIZE, prevY: pos.y * TILE_SIZE,
        curX: pos.x * TILE_SIZE, curY: pos.y * TILE_SIZE,
        payloadGfx, hpFillGfx, hpBgGfx,
      }
    }

    if (building) {
      const bDef = BUILDING_DEFS[building.type]
      const w = building.width * TILE_SIZE
      const h = building.height * TILE_SIZE
      const color = building.faction === 'allied' ? 0x4488ff : 0xff4444
      const alpha = building.state === 'building' ? 0.5 : 1

      const gfx = new Graphics()
      gfx.rect(-w / 2, -h / 2, w, h)
      gfx.fill({ color, alpha })
      gfx.rect(-w / 2, -h / 2, w, h)
      gfx.stroke({ color: 0xffffff, width: 1, alpha: building.state === 'active' ? 1 : 0.3 })
      c.addChild(gfx)

      // Building type label
      const label = new Text({
        text: building.type.replace('_', '\n'),
        style: { fill: 0xffffff, fontSize: 8, fontFamily: 'monospace', align: 'center' },
      })
      label.anchor = { x: 0.5, y: 0.5 }
      c.addChild(label)

      // Health bar
      const hp = registry.getComponent(eid, SCHEMA.HEALTH)
      let hpFillGfx: Graphics | null = null
      let hpBgGfx: Graphics | null = null
      if (hp) {
        const bw = w * 0.8
        hpBgGfx = new Graphics()
        hpBgGfx.rect(-bw / 2, -h / 2 - 8, bw, 4)
        hpBgGfx.fill(0x222222)
        c.addChild(hpBgGfx)
        hpFillGfx = new Graphics()
        hpFillGfx.rect(-bw / 2, -h / 2 - 8, bw * (hp.current / hp.max), 4)
        hpFillGfx.fill(0x44ff44)
        c.addChild(hpFillGfx)
        if (building.state === 'building') {
          const pBar = new Graphics()
          pBar.rect(-bw / 2, -h / 2 - 14, bw * building.progress, 4)
          pBar.fill(0x88aaff)
          c.addChild(pBar)
        }
      }

      c.eventMode = 'static'
      c.cursor = 'pointer'

      entityLayer.addChild(c)
      return {
        container: c, first: true,
        prevX: pos.x * TILE_SIZE, prevY: pos.y * TILE_SIZE,
        curX: pos.x * TILE_SIZE, curY: pos.y * TILE_SIZE,
        payloadGfx: null, hpFillGfx, hpBgGfx,
      }
    }

    if (proj) {
      const gfx = new Graphics()
      gfx.circle(0, 0, 2)
      gfx.fill(0xffff88)
      c.addChild(gfx)
      entityLayer.addChild(c)
      return {
        container: c, first: true,
        prevX: pos.x * TILE_SIZE, prevY: pos.y * TILE_SIZE,
        curX: pos.x * TILE_SIZE, curY: pos.y * TILE_SIZE,
        payloadGfx: null, hpFillGfx: null, hpBgGfx: null,
      }
    }

    return null
  }

  function syncVisuals(): void {
    const all = registry.getAllEntities()
    const active = new Set<number>()

    for (const e of all) {
      active.add(e.id)
      if (!visuals.has(e.id)) {
        const vis = createVisual(e.id)
        if (vis) visuals.set(e.id, vis)
      }
      const entry = visuals.get(e.id)
      if (entry && e.Position) {
        if (entry.first) {
          entry.prevX = e.Position.x * TILE_SIZE
          entry.prevY = e.Position.y * TILE_SIZE
          entry.curX = e.Position.x * TILE_SIZE
          entry.curY = e.Position.y * TILE_SIZE
          entry.first = false
        } else {
          entry.prevX = entry.curX
          entry.prevY = entry.curY
          entry.curX = e.Position.x * TILE_SIZE
          entry.curY = e.Position.y * TILE_SIZE
        }

        // Update payload bar in-place (no destroy/recreate)
        const unit = e.Unit
        const hp = e.Health
        if (unit && entry.payloadGfx && unit.payloadCapacity > 0) {
          const w = 20 * (unit.payload / unit.payloadCapacity)
          entry.payloadGfx.clear()
          entry.payloadGfx.rect(-10, -6, w, 12)
          entry.payloadGfx.fill({ color: 0xffff44, alpha: 0.5 })
        }
        if (hp && entry.hpFillGfx) {
          const bw = 20
          entry.hpFillGfx.clear()
          entry.hpFillGfx.rect(-bw / 2, -14, bw * (hp.current / hp.max), 3)
          entry.hpFillGfx.fill(hp.current / hp.max > 0.5 ? 0x44ff44 : hp.current / hp.max > 0.25 ? 0xffaa00 : 0xff2222)
        }
      }
    }

    for (const [id, entry] of visuals) {
      if (!active.has(id)) {
        entityLayer.removeChild(entry.container)
        entry.container.destroy({ children: true })
        visuals.delete(id)
      }
    }
  }

  function renderInterpolated(alpha: number): void {
    for (const [, entry] of visuals) {
      entry.container.x = entry.prevX + (entry.curX - entry.prevX) * alpha
      entry.container.y = entry.prevY + (entry.curY - entry.prevY) * alpha
    }
  }

  // ===== SELECTION =====
  function clearSelection(): void {
    overlayLayer.removeChildren()
    selectedIds = []
  }

  function drawSelectionRing(eid: number): void {
    const pos = registry.getComponent(eid, SCHEMA.POSITION)
    if (!pos) return
    const gfx = new Graphics()
    gfx.circle(pos.x * TILE_SIZE, pos.y * TILE_SIZE, 16)
    gfx.stroke({ color: 0x44ff44, width: 2, alpha: 0.7 })
    overlayLayer.addChild(gfx)
  }

  function selectEntity(eid: number): void {
    clearSelection()
    selectedIds = [eid]
    drawSelectionRing(eid)
  }

  function selectEntities(ids: number[]): void {
    clearSelection()
    selectedIds = ids
    for (const id of ids) {
      drawSelectionRing(id)
    }
  }

  function getEntityAt(px: number, py: number): number | null {
    // Convert pixel to tile coords
    const tx = px / TILE_SIZE
    const ty = py / TILE_SIZE
    const all = registry.getAllEntities()
    for (const e of all) {
      const pos = e.Position
      if (!pos) continue
      const dx = pos.x - tx
      const dy = pos.y - ty
      const bldg = e.Building
      const hitDist = bldg ? Math.max(bldg.width, bldg.height) / 2 + 0.3 : 1
      if (Math.abs(dx) < hitDist && Math.abs(dy) < hitDist) {
        if (!bldg || bldg.state !== 'building') {
          return e.id
        }
      }
    }
    return null
  }

  function getEntitiesInRect(x1: number, y1: number, x2: number, y2: number): number[] {
    const minX = Math.min(x1, x2) / TILE_SIZE
    const maxX = Math.max(x1, x2) / TILE_SIZE
    const minY = Math.min(y1, y2) / TILE_SIZE
    const maxY = Math.max(y1, y2) / TILE_SIZE
    const result: number[] = []
    const all = registry.getEntitiesWith([SCHEMA.POSITION, SCHEMA.OWNER])
    for (const e of all) {
      if (e.Owner.faction !== 'allied') continue
      if (e.Position.x >= minX && e.Position.x <= maxX && e.Position.y >= minY && e.Position.y <= maxY) {
        result.push(e.id)
      }
    }
    return result
  }

  // ===== RIGHT CLICK ACTIONS =====
  function handleRightClick(worldX: number, worldY: number): void {
    if (selectedIds.length === 0) return
    const tx = worldX / TILE_SIZE
    const ty = worldY / TILE_SIZE

    // Check if clicked on an enemy
    const all = registry.getAllEntities()
    let targetEnemy: number | null = null
    let targetBuilding: number | null = null
    let targetOre = false

    for (const e of all) {
      const pos = e.Position
      if (!pos) continue
      const dx = pos.x - tx
      const dy = pos.y - ty
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist > 1.5) continue

      const owner = e.Owner
      if (owner && owner.faction !== 'allied') {
        if (e.Unit) targetEnemy = e.id
        if (e.Building) targetBuilding = e.id
      }
    }

    // Check for ore (check 3x3 area around click)
    const mapEnts = registry.getEntitiesWith([SCHEMA.MAP_STATE])
    if (mapEnts.length) {
      const mapData = mapEnts[0]!.MapState
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const gx = Math.round(tx - 0.5) + dx
          const gy = Math.round(ty - 0.5) + dy
          if (gx >= 0 && gx < MAP_W && gy >= 0 && gy < MAP_H) {
            const idx = gy * MAP_W + gx
            if (mapData.ore[idx]! > 0) targetOre = true
          }
        }
      }
    }

    for (const id of selectedIds) {
      const unit = registry.getComponent(id, SCHEMA.UNIT)
      if (!unit) continue

      if (unit.type === 'harvester') {
        if (targetOre) {
          // Find nearest ore tile in 3x3 area around click
          const mapEnts2 = registry.getEntitiesWith([SCHEMA.MAP_STATE])
          let bestDist = Infinity
          let oreX = Math.round(tx - 0.5)
          let oreY = Math.round(ty - 0.5)
          if (mapEnts2.length) {
            const md = mapEnts2[0]!.MapState
            for (let dy = -1; dy <= 1; dy++) {
              for (let dx = -1; dx <= 1; dx++) {
                const gx = Math.round(tx - 0.5) + dx
                const gy = Math.round(ty - 0.5) + dy
                if (gx < 0 || gx >= MAP_W || gy < 0 || gy >= MAP_H) continue
                const idx = gy * MAP_W + gx
                if (md.ore[idx]! > 0) {
                  const d = dx * dx + dy * dy
                  if (d < bestDist) { bestDist = d; oreX = gx; oreY = gy }
                }
              }
            }
          }
          registry.addComponent(id, SCHEMA.UNIT, { ...unit, state: 'moving_to_ore' })
          registry.addComponent(id, SCHEMA.PATH_FOLLOWER, {
            path: [{ x: oreX + 0.5, y: oreY + 0.5 }],
            index: 0, speed: unit.moveSpeed, loop: false,
          })
          continue
        }

        // Check if clicking on a refinery
        for (const e of all) {
          const pos = e.Position
          const b = e.Building
          if (!pos || !b) continue
          if (b.type === 'ore_refinery' && b.faction === 'allied') {
            const dx = pos.x - tx
            const dy = pos.y - ty
            if (Math.abs(dx) < 2 && Math.abs(dy) < 2) {
              registry.addComponent(id, SCHEMA.UNIT, { ...unit, state: 'returning' })
              registry.addComponent(id, SCHEMA.PATH_FOLLOWER, {
                path: [{ x: pos.x, y: pos.y + 2 }],
                index: 0, speed: unit.moveSpeed, loop: false,
              })
            }
          }
        }
      }

      // Attack enemy
      if (targetEnemy !== null && unit.damage > 0) {
        registry.addComponent(id, SCHEMA.TARGET_SCANNER, {
          range: Math.max(unit.attackRange, 5),
          damage: unit.damage,
          fireRate: unit.attackCooldown,
          cooldownRemaining: 0,
          ownerFaction: 'allied',
          targetEntity: targetEnemy,
        })
        continue
      }

      // Move to position
      if (unit.damage > 0 || unit.type === 'harvester') {
        registry.addComponent(id, SCHEMA.UNIT, { ...unit, state: 'moving' })
        registry.addComponent(id, SCHEMA.PATH_FOLLOWER, {
          path: [{ x: tx, y: ty }],
          index: 0, speed: unit.moveSpeed, loop: false,
        })
        registry.addComponent(id, SCHEMA.VELOCITY, { x: 0, y: 0 })
        // Clear combat target
        if (registry.hasComponent(id, SCHEMA.TARGET_SCANNER)) {
          registry.addComponent(id, SCHEMA.TARGET_SCANNER, {
            range: Math.max(unit.attackRange, 5),
            damage: unit.damage,
            fireRate: unit.attackCooldown,
            cooldownRemaining: 0,
            ownerFaction: 'allied',
            targetEntity: undefined,
          })
        }
      }
    }
  }

  // ===== BUILDING PLACEMENT =====
  function getGhostPosition(worldX: number, worldY: number): { gx: number; gy: number } | null {
    if (!placementType) return null
    const bDef = BUILDING_DEFS[placementType]
    if (!bDef) return null
    const gx = Math.floor(worldX / TILE_SIZE) - Math.floor(bDef.width / 2)
    const gy = Math.floor(worldY / TILE_SIZE) - Math.floor(bDef.height / 2)
    return { gx, gy }
  }

  function canPlaceBuilding(gx: number, gy: number, w: number, h: number): boolean {
    const mapEnts = registry.getEntitiesWith([SCHEMA.MAP_STATE])
    if (!mapEnts.length) return false
    const tiles = mapEnts[0]!.MapState.tiles

    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        const tx = gx + dx
        const ty = gy + dy
        if (tx < 0 || tx >= MAP_W || ty < 0 || ty >= MAP_H) return false
        if (tiles[ty * MAP_W + tx] !== TERRAIN.GROUND) return false
        // Check no other building overlaps
        const allBldgs = registry.getEntitiesWith([SCHEMA.BUILDING, SCHEMA.POSITION])
        for (const b of allBldgs) {
          const bw = b.Building.width
          const bh = b.Building.height
          const bx = Math.round(b.Position.x - 0.5 - (bw - 1) / 2)
          const by = Math.round(b.Position.y - 0.5 - (bh - 1) / 2)
          if (tx >= bx && tx < bx + bw && ty >= by && ty < by + bh) return false
        }
      }
    }
    return true
  }

  function updateGhost(worldX: number, worldY: number): void {
    ghostLayer.removeChildren()
    if (!placementType) return

    const bDef = BUILDING_DEFS[placementType]
    if (!bDef) return
    const gp = getGhostPosition(worldX, worldY)
    if (!gp) return

    const valid = canPlaceBuilding(gp.gx, gp.gy, bDef.width, bDef.height)
    const color = valid ? 0x44ff44 : 0xff4444

    const gfx = new Graphics()
    const px = (gp.gx + bDef.width / 2) * TILE_SIZE
    const py = (gp.gy + bDef.height / 2) * TILE_SIZE
    const w = bDef.width * TILE_SIZE
    const h = bDef.height * TILE_SIZE
    gfx.rect(px - w / 2, py - h / 2, w, h)
    gfx.fill({ color, alpha: 0.3 })
    gfx.rect(px - w / 2, py - h / 2, w, h)
    gfx.stroke({ color, width: 2, alpha: 0.6 })
    ghostLayer.addChild(gfx)
  }

  function placeBuilding(worldX: number, worldY: number): boolean {
    if (!placementType) return false
    const bDef = BUILDING_DEFS[placementType]
    if (!bDef) return false
    const gp = getGhostPosition(worldX, worldY)
    if (!gp) return false
    if (!canPlaceBuilding(gp.gx, gp.gy, bDef.width, bDef.height)) return false

    // Check credits
    const gsEnts = registry.getEntitiesWith([SCHEMA.GAME_STATE])
    if (!gsEnts.length) return false
    const gs = gsEnts[0]!
    if (gs.GameState.credits < bDef.cost) return false

    // Deduct credits
    registry.addComponent(gs.id, SCHEMA.GAME_STATE, {
      ...gs.GameState,
      credits: gs.GameState.credits - bDef.cost,
    })

    // Create building
    const cx = gp.gx + bDef.width / 2
    const cy = gp.gy + bDef.height / 2
    const bid = registry.createEntity()
    registry.addComponent(bid, SCHEMA.POSITION, { x: cx, y: cy })
    registry.addComponent(bid, SCHEMA.HEALTH, { current: 1, max: bDef.hp })
    registry.addComponent(bid, SCHEMA.OWNER, { faction: 'allied' })
    registry.addComponent(bid, SCHEMA.BUILDING, {
      type: bDef.id, state: 'building', progress: 0,
      width: bDef.width, height: bDef.height,
      powerProvided: bDef.powerProvided, powerDrain: bDef.powerDrain,
      faction: 'allied',
    })
    registry.addComponent(bid, SCHEMA.LABEL, { value: 'Building' })

    // Turrets get target scanner
    if (bDef.isTurret && bDef.turretRange) {
      registry.addComponent(bid, SCHEMA.TARGET_SCANNER, {
        range: bDef.turretRange, damage: bDef.turretDamage ?? 20,
        fireRate: bDef.turretCooldown ?? 600, cooldownRemaining: 0, ownerFaction: 'allied',
      })
    }

    placementType = null
    ghostLayer.removeChildren()
    syncVisuals()
    emitStateUpdate()
    return true
  }

  // ===== STATE MANAGEMENT =====
  function emitStateUpdate(): void {
    const gsEnts = registry.getEntitiesWith([SCHEMA.GAME_STATE])
    if (gsEnts.length && _onStateChange) {
      _onStateChange(gsEnts[0]!.GameState)
    }
  }

  function getSnapshot(): EntitySnapshot[] {
    const all = registry.getAllEntities()
    return all.map(e => ({ id: e.id, Label: e.Label }))
  }

  function togglePause(): void {
    paused = !paused
    if (paused) loop.pause()
    else loop.resume()
  }

  // ===== GAME LOOP =====
  const loop: GameLoop = createGameLoop({
    tickRate: 62.5,
    maxFrameMs: 100,
    onStep: (dt) => {
      if (paused) return
      // Update map cache
      const mapEnts = registry.getEntitiesWith([SCHEMA.MAP_STATE])
      if (mapEnts.length) {
        const md = mapEnts[0]!.MapState
        mapTiles = md.tiles
        mapOre = md.ore
      }
      if (!terrainDrawn) redrawMap()

      productionSystem(registry, dt)
      harvesterSystem(registry, dt)
      enemyAISystem(registry, dt)
      combatSystem(registry, dt)
      projectileSystem(registry, dt)
      unitMovementSystem(registry, dt)
      movementSystem(registry, dt)
      oreSystem(registry, dt)
      fogSystem(registry)
      victorySystem(registry)
      cleanupSystem(registry)
      syncVisuals()
      emitStateUpdate()
    },
    onFrame: (alpha) => {
      // Camera scroll
      const scrollSpeed = 6
      if (keys['w'] || keys['arrowup']) camera.y -= scrollSpeed
      if (keys['s'] || keys['arrowdown']) camera.y += scrollSpeed
      if (keys['a'] || keys['arrowleft']) camera.x -= scrollSpeed
      if (keys['d'] || keys['arrowright']) camera.x += scrollSpeed

      // Clamp camera
      camera.x = Math.max(0, Math.min(WORLD_W - viewW, camera.x))
      camera.y = Math.max(0, Math.min(WORLD_H - viewH, camera.y))

      worldLayer.x = -camera.x
      worldLayer.y = -camera.y

      renderInterpolated(alpha)
    },
  })

  // ===== INPUT HANDLING =====
  // Keyboard
  window.addEventListener('keydown', (e: KeyboardEvent) => {
    keys[e.key.toLowerCase()] = true
  })
  window.addEventListener('keyup', (e: KeyboardEvent) => {
    keys[e.key.toLowerCase()] = false
  })

  // Pointer
  app.stage.eventMode = 'static'
  app.stage.hitArea = app.screen
  let pointerDownPos = { x: 0, y: 0 }
  let isDragging = false

  app.stage.on('pointerdown', (e: FederatedPointerEvent) => {
    const local = worldLayer.toLocal(new Point(e.clientX, e.clientY), app.stage)
    pointerDownPos = { x: local.x, y: local.y }

    if (e.button === 0) {
      // Left click
      isDragging = false
    }
  })

  app.stage.on('pointermove', (e: FederatedPointerEvent) => {
    const local = worldLayer.toLocal(new Point(e.clientX, e.clientY), app.stage)

    // Update building ghost
    updateGhost(local.x, local.y)

    // Selection box
    if (e.buttons & 1) {
      const dx = local.x - pointerDownPos.x
      const dy = local.y - pointerDownPos.y
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        isDragging = true
        selectionBoxLayer.removeChildren()
        const rect = new Graphics()
        rect.rect(pointerDownPos.x, pointerDownPos.y, dx, dy)
        rect.fill({ color: 0x44ff44, alpha: 0.1 })
        rect.rect(pointerDownPos.x, pointerDownPos.y, dx, dy)
        rect.stroke({ color: 0x44ff44, width: 1, alpha: 0.5 })
        selectionBoxLayer.addChild(rect)
      }
    }
  })

  app.stage.on('pointerup', (e: FederatedPointerEvent) => {
    const local = worldLayer.toLocal(new Point(e.clientX, e.clientY), app.stage)

    if (e.button === 0) {
      // Left click release
      if (isDragging) {
        // Box select
        const ids = getEntitiesInRect(pointerDownPos.x, pointerDownPos.y, local.x, local.y)
        if (ids.length > 0) selectEntities(ids)
        else clearSelection()
      } else if (placementType) {
        // Try to place building
        placeBuilding(local.x, local.y)
      } else {
        // Single click select
        const hit = getEntityAt(local.x / TILE_SIZE, local.y / TILE_SIZE)
        if (hit !== null) {
          const owner = registry.getComponent(hit, SCHEMA.OWNER)
          if (owner && owner.faction === 'allied') {
            if (e.shiftKey) {
              // Add to selection
              if (!selectedIds.includes(hit)) {
                selectedIds.push(hit)
                selectEntities(selectedIds)
              }
            } else {
              selectEntity(hit)
            }
          } else {
            clearSelection()
          }
        } else {
          clearSelection()
        }
      }

      selectionBoxLayer.removeChildren()
      isDragging = false
    }

    if (e.button === 2) {
      // Right click
      if (placementType) {
        placementType = null
        ghostLayer.removeChildren()
      } else {
        handleRightClick(local.x, local.y)
      }
    }
  })

  // Prevent context menu
  app.canvas.addEventListener('contextmenu', (e: Event) => e.preventDefault())

  // ===== INIT =====
  initGame(registry)

  // Cache initial map
  const mapEnts = registry.getEntitiesWith([SCHEMA.MAP_STATE])
  if (mapEnts.length) {
    const md = mapEnts[0]!.MapState
    mapTiles = md.tiles
    mapOre = md.ore
  }
  redrawMap()
  syncVisuals()

  // Camera to player base
  camera.x = 6 * TILE_SIZE - viewW / 3
  camera.y = 6 * TILE_SIZE - viewH / 3
  camera.x = Math.max(0, Math.min(WORLD_W - viewW, camera.x))
  camera.y = Math.max(0, Math.min(WORLD_H - viewH, camera.y))

  // Start loop
  loop.start()

  // Also tick immediately to show initial state
  emitStateUpdate()

  // ===== PUBLIC API =====
  return {
    selectBuilding(type: string | null) {
      if (type) {
        placementType = type
        // Cancel any selection
        clearSelection()
      } else {
        placementType = null
        ghostLayer.removeChildren()
      }
    },
    queueUnit(type: string): boolean {
      const gsEnts = registry.getEntitiesWith([SCHEMA.GAME_STATE])
      if (!gsEnts.length) return false
      const gs = gsEnts[0]!
      const state = gs.GameState

      const unitDef = UNIT_DEFS[type]
      if (!unitDef) return false
      if (state.credits < unitDef.cost) return false

      // Find appropriate production building
      const buildings = registry.getEntitiesWith([SCHEMA.BUILDING, SCHEMA.POSITION])
      const isInfantry = type === 'rifleman' || type === 'heavy_grenadier'
      const prodType = isInfantry ? 'barracks' : 'war_factory' // or harvester

      // For harvester, use war factory
      const targetType = type === 'harvester' ? 'war_factory' : prodType

      const prodBldg = buildings.find(b =>
        b.Building.type === targetType && b.Building.faction === 'allied' && b.Building.state === 'active'
      )

      if (!prodBldg) return false

      // Deduct credits
      registry.addComponent(gs.id, SCHEMA.GAME_STATE, {
        ...state, credits: state.credits - unitDef.cost,
      })

      // Add to queue
      const existingQueue = registry.getComponent(prodBldg.id, SCHEMA.BUILD_QUEUE)
      const items = existingQueue ? [...existingQueue.items] : []
      items.push({ type, progress: 0, totalTime: unitDef.buildTime, cost: unitDef.cost })
      registry.addComponent(prodBldg.id, SCHEMA.BUILD_QUEUE, { items })

      emitStateUpdate()
      return true
    },
    getState() {
      const gsEnts = registry.getEntitiesWith([SCHEMA.GAME_STATE])
      return gsEnts.length ? gsEnts[0]!.GameState : null
    },
    canProduceUnit(type: string): boolean {
      const isInfantry = type === 'rifleman' || type === 'heavy_grenadier'
      const targetType = type === 'harvester' ? 'war_factory' : isInfantry ? 'barracks' : 'war_factory'
      const buildings = registry.getEntitiesWith([SCHEMA.BUILDING, SCHEMA.POSITION])
      return buildings.some(b =>
        b.Building.type === targetType && b.Building.faction === 'allied' && b.Building.state === 'active'
      )
    },
    getBuildQueues() {
      const queues = registry.getEntitiesWith([SCHEMA.BUILD_QUEUE])
      return queues.flatMap(q => q.BuildQueue.items)
    },
    getSelectedInfo() {
      return selectedIds.map(id => {
        const unit = registry.getComponent(id, SCHEMA.UNIT)
        const building = registry.getComponent(id, SCHEMA.BUILDING)
        const hp = registry.getComponent(id, SCHEMA.HEALTH)
        const owner = registry.getComponent(id, SCHEMA.OWNER)
        return { id, unit, building, hp, owner }
      })
    },
    togglePause,
    getSnapshot,
    set onStateChange(cb: ((state: any) => void) | null) {
      _onStateChange = cb
    },
  }
}

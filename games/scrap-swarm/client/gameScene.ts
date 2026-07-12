import { Container, Graphics, Text, Application, Point, FederatedPointerEvent } from 'pixi.js'
import { createRegistry, createEntity, cameraSystem, movementSystem, collisionSystem, particleSystem, createGameLoop } from '@sub-engine/core'
import type { Registry } from '@sub-engine/core'
import { createEntityRenderer } from '@sub-engine/pixi'
import { SCHEMA } from '../game/contract.js'
import type { ScrapSwarmComponents } from '../game/contract.js'
import { workerSystem } from '../game/systems/workerSystem.js'
import { combatSystem } from '../game/systems/combatSystem.js'
import { waveSystem } from '../game/systems/waveSystem.js'
import { enemySystem } from '../game/systems/enemySystem.js'
import { projectileSystem } from '../game/systems/projectileSystem.js'
import { economySystem, getEconomyState } from '../game/systems/economySystem.js'
import { MAP_COLS, MAP_ROWS, TILE_SIZE, HUD_H, GAME_W, GAME_H, BASE_X, BASE_Y, RESOURCE_NODES, WORKER_SPAWN_POSITIONS, MINE_THRESHOLD, FIGHTER_SPAWN_POSITIONS, FIGHTER_DAMAGE, FIGHTER_RANGE, FIGHTER_FIRE_RATE, FIGHTER_HP } from '../game/config.js'
import { createMinimap } from './minimap.js'
import type { MinimapState } from './minimap.js'
import { createInputHandler } from './inputHandler.js'
import type { InputHandler } from './inputHandler.js'

const MAP_OFFSET_Y = HUD_H
const LOD_DISTANCE = 30
const TICK_MS = 16

const NODE_COLORS: Record<string, number> = {
  scrap: 0x88aaff,
  crystal: 0xcc44ff,
  fuel: 0xff8844,
}

let cameraEntity = -1
let manualCamera = false

export interface UIHandle {
  update(state: { balances: Record<string, number> } | null, info: {
    workers: number; fighters: number; enemies: number; wave: number; phase: string
    selectedId: number | null
  }): void
}

export interface UnitInfo {
  id: number
  label: string
  hp: { current: number; max: number } | null
  state: string | null
  cargo: number | null
  position: { x: number; y: number }
}

export function createGameScene(container: Container, app: Application) {
  let registry: Registry<ScrapSwarmComponents> = createRegistry<ScrapSwarmComponents>()
  let uiRef: UIHandle | null = null
  let selectedEntityId: number | null = null

  const cameraContainer = new Container()
  container.addChild(cameraContainer)

  const mapLayer = new Container()
  mapLayer.y = MAP_OFFSET_Y
  const entityLayer = new Container()
  entityLayer.y = MAP_OFFSET_Y
  const overlayLayer = new Container()
  overlayLayer.y = MAP_OFFSET_Y

  cameraContainer.addChild(mapLayer)
  cameraContainer.addChild(entityLayer)
  cameraContainer.addChild(overlayLayer)

  const entityRenderer = createEntityRenderer(entityLayer, (e: any) => createEntityVisual(e), {
    snapToGrid: true,
    gridSize: TILE_SIZE,
    interactive: true,
  })

  const input = createInputHandler()
  let entityClickBubble = -1
  const damageFlash = new Map<number, number>()
  const hpSnapshots = new Map<number, number>()

  const minimap = createMinimap()
  document.body.appendChild(minimap.getElement())

  entityRenderer.onEntityClick((entityId: number) => {
    entityClickBubble = entityId
  })

  function createHealthBar(c: Container, entity: any): void {
    if (!entity.Health) return
    const bw = TILE_SIZE / 2.5
    const by = entity.Label?.value === 'base' ? -TILE_SIZE / 2.5 : -TILE_SIZE / 3
    const fill = new Graphics()
    fill.rect(-bw / 2, by, bw * (entity.Health.current / entity.Health.max), 3).fill(0x44ff44)
    c.addChild(new Graphics().rect(-bw / 2, by, bw, 3).fill(0x222222))
    c.addChild(fill)
    ;(c as any).__hpFill = fill
    ;(c as any).__hpBw = bw
    ;(c as any).__hpBy = by
  }

  function createEntityVisual(entity: { id: number; [key: string]: any }): Container {
    const c = new Container()
    const label = entity.Label?.value ?? ''

    if (label === 'base') {
      c.addChild(new Graphics().rect(-TILE_SIZE / 3, -TILE_SIZE / 3, TILE_SIZE / 1.5, TILE_SIZE / 1.5).fill(0x44aaff))
      const t = new Text({ text: 'Base', style: { fill: 0xffffff, fontSize: 10, fontFamily: 'monospace' } })
      t.anchor = { x: 0.5, y: 0 }; t.y = TILE_SIZE / 3
      c.addChild(t)
      createHealthBar(c, entity)
    } else if (label === 'resource-node') {
      const node = entity.ResourceNode
      const color = node ? NODE_COLORS[node.type] ?? 0xaaaaaa : 0xaaaaaa
      const r = (TILE_SIZE / 5) * (0.3 + 0.7 * ((node?.remaining ?? 1) / (node?.max ?? 1)))
      c.addChild(new Graphics().circle(0, 0, r).fill(color))
    } else if (label === 'worker') {
      const ai = entity.UnitAI
      const color = ai?.state === 'returning' ? 0xffdd44 : ai?.state === 'mining' ? 0xff8844 : 0x44ff88
      c.addChild(new Graphics().circle(0, 0, TILE_SIZE / 6).fill(color))
      if (entity.Worker?.carryAmount > 0) {
        c.addChild(new Graphics().circle(0, 0, TILE_SIZE / 8).fill(0xffff88))
      }
      createHealthBar(c, entity)
    } else if (label === 'fighter') {
      c.addChild(new Graphics().circle(0, 0, TILE_SIZE / 5).fill(0xff4444))
      createHealthBar(c, entity)
    } else if (label === 'enemy') {
      c.addChild(new Graphics().circle(0, 0, TILE_SIZE / 5).fill(0xff8844))
      createHealthBar(c, entity)
    } else if (label === 'projectile') {
      c.addChild(new Graphics().circle(0, 0, 3).fill(0xffff88))
    }

    const flash = new Graphics().circle(0, 0, TILE_SIZE / 4).fill({ color: 0xffffff, alpha: 0.4 })
    flash.visible = false
    c.addChild(flash)
    ;(c as any).__flashGfx = flash
    return c
  }

  function toGrid(e: FederatedPointerEvent): { gx: number; gy: number } {
    const p = container.toLocal(new Point(e.clientX, e.clientY), app.stage)
    return { gx: Math.floor(p.x / TILE_SIZE), gy: Math.floor((p.y - MAP_OFFSET_Y) / TILE_SIZE) }
  }

  app.stage.eventMode = 'static'
  app.stage.hitArea = app.screen

  app.stage.on('pointerdown', (e: FederatedPointerEvent) => {
    if (e.button === 1) {
      const cam = getCam()
      if (cam) dragStart = { x: e.clientX, y: e.clientY, camX: cam.x, camY: cam.y }
      return
    }
    const { gx, gy } = toGrid(e)
    if (gx < 0 || gx >= MAP_COLS || gy < 0 || gy >= MAP_ROWS) return

    if (entityClickBubble > 0) {
      const id = entityClickBubble; entityClickBubble = -1
      const ent = registry.getAllEntities().find(a => a.id === id)
      if (ent) {
        const l = ent.Label?.value ?? ''
        if (l === 'worker' || l === 'fighter') { selectEntity(id); return }
        if (l === 'enemy' && e.button === 0) { orderFightersAttack(id); return }
      }
    }
    if (e.button === 0) { orderFightersMove(gx + 0.5, gy + 0.5); deselectEntity() }
    else if (e.button === 2) { orderWorkersHarvest(gx, gy) }
  })

  let dragStart: { x: number; y: number; camX: number; camY: number } | null = null

  app.stage.on('pointermove', (e: FederatedPointerEvent) => {
    if (!dragStart) return
    const cam = getCam()
    if (!cam) return
    manualCamera = true
    const dx = (dragStart.x - e.clientX) / TILE_SIZE
    const dy = (dragStart.y - e.clientY) / TILE_SIZE
    registry.addComponent(cameraEntity, SCHEMA.CAMERA, {
      ...cam, targetEntity: undefined,
      x: Math.max(cam.minX ?? 0, Math.min((cam.maxX ?? MAP_COLS) - cam.width, dragStart.camX + dx)),
      y: Math.max(cam.minY ?? 0, Math.min((cam.maxY ?? MAP_ROWS) - cam.height, dragStart.camY + dy)),
    })
  })

  app.stage.on('pointerup', () => { dragStart = null })

  app.stage.on('wheel', (e: any) => {
    const cam = getCam()
    if (!cam) return
    registry.addComponent(cameraEntity, SCHEMA.CAMERA, {
      ...cam, zoom: Math.max(0.3, Math.min(3, cam.zoom * (e.deltaY > 0 ? 0.9 : 1.1))),
    })
  })

  function getCam(): ScrapSwarmComponents['Camera'] | undefined {
    return registry.getComponent(cameraEntity, SCHEMA.CAMERA) as ScrapSwarmComponents['Camera'] | undefined
  }

  function selectEntity(id: number): void { selectedEntityId = id }
  function deselectEntity(): void { selectedEntityId = null }

  function orderFightersMove(tx: number, ty: number): void {
    for (const f of registry.getEntitiesWith([SCHEMA.FIGHTER, SCHEMA.UNIT_AI])) {
      registry.addComponent(f.id, SCHEMA.UNIT_AI, { ...f.UnitAI, state: 'traveling', targetId: null, orderX: tx, orderY: ty })
    }
  }

  function orderFightersAttack(targetId: number): void {
    for (const f of registry.getEntitiesWith([SCHEMA.FIGHTER, SCHEMA.UNIT_AI])) {
      registry.addComponent(f.id, SCHEMA.UNIT_AI, { ...f.UnitAI, state: 'traveling', targetId, orderX: 0, orderY: 0 })
    }
  }

  function orderWorkersHarvest(gx: number, gy: number): void {
    const workers = registry.getEntitiesWith([SCHEMA.WORKER, SCHEMA.UNIT_AI, SCHEMA.POSITION])
    const nodes = registry.getEntitiesWith([SCHEMA.RESOURCE_NODE, SCHEMA.POSITION])
    let nearest: typeof nodes[0] | null = null
    let minDist = Infinity
    for (const n of nodes) {
      if (n.ResourceNode.depleted) continue
      const d = Math.sqrt((n.Position.x - gx) ** 2 + (n.Position.y - gy) ** 2)
      if (d < minDist) { minDist = d; nearest = n }
    }
    for (const w of workers) {
      if (nearest) {
        registry.addComponent(w.id, SCHEMA.UNIT_AI, {
          ...w.UnitAI, state: 'traveling', targetId: nearest.id, orderX: nearest.Position.x, orderY: nearest.Position.y,
        })
      }
    }
  }

  function getSelectedUnitInfo(): UnitInfo | null {
    if (selectedEntityId === null) return null
    const ent = registry.getAllEntities().find(e => e.id === selectedEntityId)
    if (!ent) return null
    return {
      id: ent.id, label: ent.Label?.value ?? '',
      hp: ent.Health ? { current: ent.Health.current, max: ent.Health.max } : null,
      state: ent.UnitAI?.state ?? (ent.Fighter ? 'idle' : null),
      cargo: ent.Worker?.carryAmount ?? null,
      position: ent.Position ? { x: ent.Position.x, y: ent.Position.y } : { x: 0, y: 0 },
    }
  }

  function drawMap(): void {
    for (let y = 0; y < MAP_ROWS; y++) {
      for (let x = 0; x < MAP_COLS; x++) {
        const shade = ((x + y) % 2 === 0) ? 0x1a1a2e : 0x16162a
        const cell = new Graphics().rect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE).fill(shade)
        cell.rect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE).stroke({ color: 0x222244, width: 1 })
        mapLayer.addChild(cell)
      }
    }
  }

  function setupScene(): void {
    createEntity(registry, {
      [SCHEMA.POSITION]: { x: BASE_X + 0.5, y: BASE_Y + 0.5 },
      [SCHEMA.HEALTH]: { current: 500, max: 500 },
      [SCHEMA.COLLIDER]: { width: 0.8, height: 0.8, solid: true },
      [SCHEMA.ECONOMY_STORAGE]: { balances: { scrap: 0, crystal: 0, fuel: 0 } },
      [SCHEMA.LABEL]: { value: 'base' },
    })
    for (const n of RESOURCE_NODES) {
      createEntity(registry, {
        [SCHEMA.POSITION]: { x: n.x + 0.5, y: n.y + 0.5 },
        [SCHEMA.RESOURCE_NODE]: { type: n.type, remaining: n.amount, max: n.amount, depleted: false },
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
    const baseEntity = registry.getEntitiesWith([SCHEMA.ECONOMY_STORAGE])[0]?.id ?? -1
    cameraEntity = createEntity(registry, {
      [SCHEMA.CAMERA]: {
        x: 0, y: 0, width: GAME_W / TILE_SIZE, height: GAME_H / TILE_SIZE, zoom: 1,
        targetEntity: baseEntity, minX: 0, minY: 0, maxX: MAP_COLS, maxY: MAP_ROWS,
      },
    })
  }

  function applyCamera(): void {
    const cam = getCam()
    if (!cam) return
    const z = cam.zoom
    cameraContainer.scale.set(z)
    cameraContainer.x = -cam.x * TILE_SIZE * z
    cameraContainer.y = -cam.y * TILE_SIZE * z - MAP_OFFSET_Y * z
  }

  function handleCameraInput(): void {
    const cam = getCam()
    if (!cam) return
    let dx = 0, dy = 0
    const speed = 0.5 / cam.zoom
    if (input.isDown('ArrowUp') || input.isDown('w') || input.isDown('W')) dy = -speed
    if (input.isDown('ArrowDown') || input.isDown('s') || input.isDown('S')) dy = speed
    if (input.isDown('ArrowLeft') || input.isDown('a') || input.isDown('A')) dx = -speed
    if (input.isDown('ArrowRight') || input.isDown('d') || input.isDown('D')) dx = speed

    if (dx !== 0 || dy !== 0) {
      manualCamera = true
      registry.addComponent(cameraEntity, SCHEMA.CAMERA, {
        ...cam, targetEntity: undefined,
        x: Math.max(cam.minX ?? 0, Math.min((cam.maxX ?? MAP_COLS) - cam.width, cam.x + dx)),
        y: Math.max(cam.minY ?? 0, Math.min((cam.maxY ?? MAP_ROWS) - cam.height, cam.y + dy)),
      })
    }

    if (input.isDown('r') || input.isDown('R')) {
      manualCamera = false
      const base = registry.getEntitiesWith([SCHEMA.ECONOMY_STORAGE])[0]
      if (base) {
        registry.addComponent(cameraEntity, SCHEMA.CAMERA, {
          ...cam, targetEntity: base.id,
        })
      }
    }
  }

  function handleDeath(): void {
    const toRemove: number[] = []
    for (const e of registry.getAllEntities()) {
      if (!e.Health || e.Health.current > 0) continue
      const label = e.Label?.value ?? ''
      if (label === 'enemy') {
        const bases = registry.getEntitiesWith([SCHEMA.ECONOMY_STORAGE])
        if (bases.length > 0) {
          const bal = bases[0]!.EconomyStorage.balances
          registry.addComponent(bases[0]!.id, SCHEMA.ECONOMY_STORAGE, {
            balances: { ...bal, scrap: (bal.scrap ?? 0) + (e.Enemy?.reward ?? 10) },
          })
        }
        for (let i = 0; i < 3; i++) {
          createEntity(registry, {
            [SCHEMA.POSITION]: { x: e.Position?.x ?? 0, y: e.Position?.y ?? 0 },
            [SCHEMA.PARTICLE]: { remaining: 300, color: '#ff6644', size: 3 },
          })
        }
      }
      if (selectedEntityId === e.id) selectedEntityId = null
      toRemove.push(e.id)
    }
    for (const id of toRemove) registry.removeEntity(id)
  }

  function snapshotHP(): void {
    hpSnapshots.clear()
    for (const e of registry.getAllEntities()) {
      if (e.Health) hpSnapshots.set(e.id, e.Health.current)
    }
  }

  function detectDamage(): void {
    for (const e of registry.getAllEntities()) {
      if (!e.Health) continue
      const prev = hpSnapshots.get(e.id)
      if (prev !== undefined && prev > e.Health.current) damageFlash.set(e.id, 150)
    }
  }

  function getSnapshot(): Array<{ id: number; [key: string]: any }> {
    return registry.getAllEntities()
  }

  function saveGame(): void {
    try { localStorage.setItem('scrap-swarm-save', JSON.stringify(registry.getAllEntities())) }
    catch { console.error('Save failed') }
  }

  function loadGame(json: string): void {
    try {
      const data: Array<{ id: number; [key: string]: any }> = JSON.parse(json)
      const nr = createRegistry<ScrapSwarmComponents>()
      const idMap = new Map<number, number>()
      for (const e of data) idMap.set(e.id, nr.createEntity())
      for (const e of data) {
        const nid = idMap.get(e.id)!
        for (const [k, v] of Object.entries(e)) {
          if (k === 'id') continue
          if (typeof v === 'object' && v !== null) {
            const r: any = {}
            for (const [kk, vv] of Object.entries(v)) {
              r[kk] = ((kk === 'targetId' || kk === 'targetEntity') && typeof vv === 'number' && idMap.has(vv)) ? idMap.get(vv) : vv
            }
            nr.addComponent(nid, k, r)
          }
        }
      }
      registry = nr
      cameraEntity = registry.getEntitiesWith([SCHEMA.CAMERA])[0]?.id ?? -1
      selectedEntityId = null
      manualCamera = false
    } catch { console.error('Load failed') }
  }

  function tick(): void {
    snapshotHP()
    workerSystem(registry, TICK_MS)
    combatSystem(registry, TICK_MS)
    enemySystem(registry, TICK_MS)
    projectileSystem(registry, TICK_MS)
    movementSystem(registry, TICK_MS)
    waveSystem(registry, TICK_MS)
    economySystem(registry, TICK_MS)
    collisionSystem(registry, TICK_MS)
    particleSystem(registry as any, TICK_MS)
    handleDeath()
    detectDamage()
    handleCameraInput()
    cameraSystem(registry, TICK_MS)
    entityRenderer.sync(registry.getAllEntities())
  }

  function onFrame(alpha: number): void {
    entityRenderer.render(alpha)
    applyCamera()

    const cam = getCam()
    const cx = cam ? cam.x + cam.width / 2 : 0
    const cy = cam ? cam.y + cam.height / 2 : 0

    const allEntities = registry.getAllEntities()

    for (const e of allEntities) {
      const c = entityRenderer.getContainer(e.id)
      if (!c || !e.Position) continue
      const dist = Math.sqrt((e.Position.x - cx) ** 2 + (e.Position.y - cy) ** 2)
      c.alpha = dist > LOD_DISTANCE ? 0.4 : 1

      if (e.Health && (c as any).__hpFill) {
        const f = (c as any).__hpFill as Graphics
        const r = e.Health.current / e.Health.max
        f.clear().rect(-(c as any).__hpBw / 2, (c as any).__hpBy, (c as any).__hpBw * r, 3).fill(r > 0.3 ? 0x44ff44 : 0xff4444)
      }
      const fl = (c as any).__flashGfx as Graphics | undefined
      if (fl) fl.visible = (damageFlash.get(e.id) ?? 0) > 0
    }

    for (const [id, rem] of damageFlash) {
      const nv = rem - TICK_MS
      if (nv <= 0) damageFlash.delete(id); else damageFlash.set(id, nv)
    }

    const oldOverlays = overlayLayer.removeChildren()
    for (const child of oldOverlays) child.destroy()
    if (selectedEntityId !== null) {
      const ent = allEntities.find(e => e.id === selectedEntityId)
      if (ent?.Position) {
        overlayLayer.addChild(
          new Graphics()
            .circle(ent.Position.x * TILE_SIZE, ent.Position.y * TILE_SIZE, TILE_SIZE / 4)
            .stroke({ color: 0xffff00, width: 2, alpha: 0.8 })
        )
      }
    }

    const state = getEconomyState(registry)
    const ws = registry.getEntitiesWith([SCHEMA.WORKER])
    const fs = registry.getEntitiesWith([SCHEMA.FIGHTER])
    const es = registry.getEntitiesWith([SCHEMA.ENEMY])
    const gs = registry.getEntitiesWith([SCHEMA.GAME_STATE])
    uiRef?.update(state, {
      workers: ws.length, fighters: fs.length, enemies: es.length,
      wave: gs.length ? gs[0]!.GameState.wave + 1 : 0,
      phase: gs.length ? gs[0]!.GameState.phase : 'idle',
      selectedId: selectedEntityId,
    })

    if (cam) {
      minimap.update({
        entities: allEntities.filter(e => e.Label && e.Position).map(e => ({ label: e.Label!.value, x: e.Position!.x, y: e.Position!.y })),
        camX: cam.x, camY: cam.y, camW: cam.width, camH: cam.height,
      })
    }
  }

  drawMap()
  setupScene()
  entityRenderer.sync(registry.getAllEntities())
  applyCamera()

  const gameLoop = createGameLoop({
    tickRate: 1000 / TICK_MS,
    maxFrameMs: 100,
    onStep: tick,
    onFrame,
  })
  gameLoop.start()

  window.addEventListener('contextmenu', (e: Event) => e.preventDefault())

  function togglePause(): void {
    if (gameLoop.isPaused()) gameLoop.resume()
    else gameLoop.pause()
  }

  return {
    getSnapshot,
    togglePause,
    getRegistry: () => registry,
    setUI(ui: UIHandle) { uiRef = ui },
    saveGame,
    loadGame,
    getSelectedUnitInfo,
  }
}

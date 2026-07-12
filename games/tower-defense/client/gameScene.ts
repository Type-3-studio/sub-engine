import { Container, Graphics, Text, Point, Application, FederatedPointerEvent } from 'pixi.js'
import { createRegistry } from '@sub-engine/core'
import { SCHEMA } from '../game/contract.js'
import type { TdComponents } from '../game/contract.js'
import type { Registry } from '@sub-engine/core'
import { enemySystem } from '../game/systems/EnemySystem.js'
import { towerSystem } from '../game/systems/TowerSystem.js'
import { projectileSystem } from '../game/systems/ProjectileSystem.js'
import { waveSystem } from '../game/systems/WaveSystem.js'
import { bombSystem } from '../game/systems/BombSystem.js'
import { TOWERS, WAVES, WAYPOINTS, MAP_COLS, MAP_ROWS, TILE_SIZE, STARTING_MONEY, STARTING_LIVES } from '../game/config/towerDefense.js'
import type { TowerDef } from '../game/config/towerDefense.js'

const HUD_H = 50
const MAP_OFFSET_Y = HUD_H

function getPathCells(waypoints: { x: number; y: number }[]): Set<string> {
  const cells = new Set<string>()
  for (let i = 0; i < waypoints.length - 1; i++) {
    const a = waypoints[i]!
    const b = waypoints[i + 1]!
    const dx = Math.sign(b.x - a.x)
    const dy = Math.sign(b.y - a.y)
    let x = a.x, y = a.y
    while (x !== b.x || y !== b.y) {
      cells.add(`${x},${y}`)
      x += dx
      y += dy
    }
  }
  cells.add(`${waypoints[waypoints.length - 1]!.x},${waypoints[waypoints.length - 1]!.y}`)
  return cells
}

interface VisualEntry {
  container: Container
  prevX: number
  prevY: number
  curX: number
  curY: number
  first: boolean
}

interface UIHandle {
  update(state: TdComponents['GameState'] | null): void
}

export function createGameScene(container: Container, app: Application, gameW: number, gameH: number) {
  const registry: Registry<TdComponents> = createRegistry<TdComponents>()
  const pathCells = getPathCells(WAYPOINTS)
  const blockedCells = new Set<string>()
  const TICK_INTERVAL = 16

  const entities = new Map<number, VisualEntry>()
  const mapLayer = new Container()
  const entityLayer = new Container()
  const ghostLayer = new Container()
  const overlayLayer = new Container()

  mapLayer.y = MAP_OFFSET_Y
  entityLayer.y = MAP_OFFSET_Y
  ghostLayer.y = MAP_OFFSET_Y
  overlayLayer.y = MAP_OFFSET_Y

  container.addChild(mapLayer)
  container.addChild(entityLayer)
  container.addChild(ghostLayer)
  container.addChild(overlayLayer)

  let selectedTower: TowerDef | null = null
  let uiRef: UIHandle | null = null
  let tickAcc = 0
  let running = true

  function drawMap(): void {
    for (let y = 0; y < MAP_ROWS; y++) {
      for (let x = 0; x < MAP_COLS; x++) {
        const cell = new Graphics()
        const isPath = pathCells.has(`${x},${y}`)
        if (isPath) {
          cell.rect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE)
          cell.fill(0x8b7355)
          cell.rect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE)
          cell.stroke({ color: 0x7a6345, width: 1 })
        } else {
          cell.rect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE)
          cell.fill(0x3a5a2a)
          cell.rect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE)
          cell.stroke({ color: 0x2d4a1f, width: 1 })
        }
        mapLayer.addChild(cell)
      }
    }
  }

  function isBuildable(gx: number, gy: number): boolean {
    if (gx < 0 || gx >= MAP_COLS || gy < 0 || gy >= MAP_ROWS) return false
    if (pathCells.has(`${gx},${gy}`)) return false
    const towers = registry.getEntitiesWith([SCHEMA.TOWER])
    for (const t of towers) {
      const pos = registry.getComponent(t.id, SCHEMA.POSITION)
      if (pos && Math.floor(pos.x) === gx && Math.floor(pos.y) === gy) return false
    }
    return true
  }

  function canPlaceBomb(gx: number, gy: number): boolean {
    if (gx < 0 || gx >= MAP_COLS || gy < 0 || gy >= MAP_ROWS) return false
    if (blockedCells.has(`${gx},${gy}`)) return false
    const all = registry.getAllEntities()
    for (const e of all) {
      const pos = e.Position
      if (pos && Math.floor(pos.x) === gx && Math.floor(pos.y) === gy) {
        if (e.Label?.value === 'Tower' || e.Label?.value === 'Bomb') return false
      }
    }
    return true
  }

  function createVisual(entity: TdComponents & { id: number }): VisualEntry {
    const c = new Container()
    const label = entity.Label?.value ?? ''

    if (label === 'Enemy') {
      const gfx = new Graphics()
      gfx.circle(0, 0, TILE_SIZE / 5)
      gfx.fill(0xff6644)
      c.addChild(gfx)
      const hp = entity.Health
      if (hp) {
        const bw = TILE_SIZE / 2.5
        const bg = new Graphics()
        bg.rect(-bw / 2, -TILE_SIZE / 3, bw, 3)
        bg.fill(0x222222)
        c.addChild(bg)
        const fill = new Graphics()
        fill.rect(-bw / 2, -TILE_SIZE / 3, bw * (hp.current / hp.max), 3)
        fill.fill(0xff4444)
        c.addChild(fill)
      }
    } else if (label === 'Projectile') {
      const gfx = new Graphics()
      gfx.circle(0, 0, 3)
      gfx.fill(0xffff88)
      c.addChild(gfx)
    } else if (label === 'Tower') {
      const tw = entity.Tower
      if (tw) {
        const tDef = TOWERS.find(t => t.id === tw.towerType)
        const color = tDef ? tDef.color : 0x888888
        const gfx = new Graphics()
        gfx.rect(-TILE_SIZE / 3, -TILE_SIZE / 3, TILE_SIZE / 1.5, TILE_SIZE / 1.5)
        gfx.fill(color)
        c.addChild(gfx)
        if (tw.maxHp > 0) {
          const bw = TILE_SIZE / 1.5
          const bg = new Graphics()
          bg.rect(-bw / 2, -TILE_SIZE / 3, bw, 3)
          bg.fill(0x222222)
          c.addChild(bg)
          const fill = new Graphics()
          fill.rect(-bw / 2, -TILE_SIZE / 3, bw * (tw.hp / tw.maxHp), 3)
          fill.fill(0x44ff44)
          c.addChild(fill)
        }
      }
    } else if (label === 'Bomb') {
      const bombComp = entity.Bomb
      const isPlayer = bombComp?.placedBy === 'player'
      const gfx = new Graphics()
      gfx.circle(0, 0, TILE_SIZE / 4)
      gfx.fill(isPlayer ? 0x444444 : 0x662222)
      c.addChild(gfx)
      const inner = new Graphics()
      inner.circle(0, 0, TILE_SIZE / 8)
      inner.fill(isPlayer ? 0xff4444 : 0xff8844)
      c.addChild(inner)
    }

    entityLayer.addChild(c)
    const pos = entity.Position
    return {
      container: c,
      prevX: pos ? pos.x * TILE_SIZE : 0,
      prevY: pos ? pos.y * TILE_SIZE : 0,
      curX: pos ? pos.x * TILE_SIZE : 0,
      curY: pos ? pos.y * TILE_SIZE : 0,
      first: true,
    }
  }

  function sync(): void {
    const all = registry.getAllEntities()
    const active = new Set<number>()
    for (const e of all) {
      active.add(e.id)
      let entry = entities.get(e.id)
      if (!entry) {
        entry = createVisual(e as TdComponents & { id: number })
        entities.set(e.id, entry)
      }
      if (e.Position) {
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
      }
    }
    for (const [id] of entities) {
      if (!active.has(id)) {
        entityLayer.removeChild(entities.get(id)!.container)
        entities.delete(id)
      }
    }
  }

  function render(alpha: number): void {
    for (const [, entry] of entities) {
      entry.container.x = entry.prevX + (entry.curX - entry.prevX) * alpha
      entry.container.y = entry.prevY + (entry.curY - entry.prevY) * alpha
    }
  }

  function updateGhost(gx: number, gy: number): void {
    ghostLayer.removeChildren()
    if (!selectedTower) return
    const isBomb = selectedTower.id === 'bomb'
    const placeable = isBomb ? canPlaceBomb(gx, gy) : isBuildable(gx, gy)
    if (!placeable) return
    const g = new Graphics()
    if (isBomb) {
      g.circle((gx + 0.5) * TILE_SIZE, (gy + 0.5) * TILE_SIZE, TILE_SIZE / 4)
      g.fill({ color: selectedTower.color, alpha: 0.4 })
    } else {
      g.rect(gx * TILE_SIZE + 2, gy * TILE_SIZE + 2, TILE_SIZE - 4, TILE_SIZE - 4)
      g.fill({ color: selectedTower.color, alpha: 0.4 })
    }
    ghostLayer.addChild(g)
    const rg = new Graphics()
    rg.circle((gx + 0.5) * TILE_SIZE, (gy + 0.5) * TILE_SIZE, selectedTower.range * TILE_SIZE)
    rg.stroke({ color: 0xffffff, alpha: 0.3, width: 1 })
    ghostLayer.addChild(rg)
  }

  function placeBomb(gx: number, gy: number): boolean {
    if (!selectedTower || selectedTower.id !== 'bomb' || !canPlaceBomb(gx, gy)) return false
    const st = registry.getEntitiesWith([SCHEMA.GAME_STATE])
    if (!st.length) return false
    const gs = st[0]!
    if (gs.GameState.money < selectedTower.cost) return false

    registry.addComponent(gs.id, SCHEMA.GAME_STATE, {
      ...gs.GameState,
      money: gs.GameState.money - selectedTower.cost,
    })
    const b = registry.createEntity()
    registry.addComponent(b, SCHEMA.POSITION, { x: gx + 0.5, y: gy + 0.5 })
    registry.addComponent(b, SCHEMA.BOMB, {
      damage: selectedTower.damage,
      range: selectedTower.range,
      placedBy: 'player',
      fuseTimer: 0,
    })
    registry.addComponent(b, SCHEMA.LABEL, { value: 'Bomb' })
    blockedCells.add(`${gx},${gy}`)
    sync()
    uiRef?.update(getState())
    return true
  }

  function placeTower(gx: number, gy: number): boolean {
    if (!selectedTower) return false
    if (selectedTower.id === 'bomb') return placeBomb(gx, gy)
    if (!isBuildable(gx, gy)) return false
    const st = registry.getEntitiesWith([SCHEMA.GAME_STATE])
    if (!st.length) return false
    const gs = st[0]!
    if (gs.GameState.money < selectedTower.cost) return false

    registry.addComponent(gs.id, SCHEMA.GAME_STATE, {
      ...gs.GameState,
      money: gs.GameState.money - selectedTower.cost,
    })
    const tw = registry.createEntity()
    registry.addComponent(tw, SCHEMA.POSITION, { x: gx + 0.5, y: gy + 0.5 })
    registry.addComponent(tw, SCHEMA.TOWER, {
      range: selectedTower.range,
      damage: selectedTower.damage,
      fireRate: selectedTower.fireRate,
      cooldown: 0,
      towerType: selectedTower.id,
      projectileSpeed: selectedTower.projectileSpeed,
      cost: selectedTower.cost,
      hp: selectedTower.hp,
      maxHp: selectedTower.hp,
    })
    registry.addComponent(tw, SCHEMA.LABEL, { value: 'Tower' })
    sync()
    uiRef?.update(getState())
    return true
  }

  function startWave(): void {
    const st = registry.getEntitiesWith([SCHEMA.GAME_STATE])
    if (!st.length) return
    const s = st[0]!.GameState
    if (s.phase !== 'building' || s.wave >= WAVES.length) return
    const wd = WAVES[s.wave]!
    const w = registry.createEntity()
    registry.addComponent(w, SCHEMA.WAVE_CONFIG, {
      count: wd.count,
      spawned: 0,
      waypoints: WAYPOINTS.map(p => ({ x: p.x + 0.5, y: p.y + 0.5 })),
      enemySpeed: wd.enemySpeed,
      enemyHealth: wd.enemyHealth,
      spawnInterval: wd.spawnInterval,
      reward: wd.reward,
      spawnTimer: 0,
      maxWave: WAVES.length,
      hasBomber: wd.hasBomber ?? false,
    })
    registry.addComponent(st[0]!.id, SCHEMA.GAME_STATE, { ...s, phase: 'wave' })
    uiRef?.update(getState())
  }

  function getState(): TdComponents['GameState'] | null {
    const st = registry.getEntitiesWith([SCHEMA.GAME_STATE])
    return st.length ? st[0]!.GameState : null
  }

  function tick(): void {
    if (!running) return
    const st = registry.getEntitiesWith([SCHEMA.GAME_STATE])
    if (!st.length) return
    const prev = { ...st[0]!.GameState }
    if (prev.phase === 'wave') {
      waveSystem(registry)
      towerSystem(registry)
      projectileSystem(registry, TICK_INTERVAL)
      bombSystem(registry, TICK_INTERVAL, blockedCells)
      enemySystem(registry, TICK_INTERVAL, blockedCells)
    }
    const cur = registry.getComponent(st[0]!.id, SCHEMA.GAME_STATE)
    if (cur && (cur.phase !== prev.phase || cur.money !== prev.money || cur.lives !== prev.lives)) {
      uiRef?.update(cur)
    }
    sync()
    if (cur?.phase === 'gameover' && prev.phase !== 'gameover') {
      showGameOver()
      running = false
    }
  }

  function showGameOver(): void {
    const ov = new Graphics()
    ov.rect(0, 0, MAP_COLS * TILE_SIZE, MAP_ROWS * TILE_SIZE)
    ov.fill({ color: 0x000000, alpha: 0.6 })
    overlayLayer.addChild(ov)
    const t = new Text({
      text: 'GAME OVER',
      style: { fill: 0xff4444, fontSize: 48, fontFamily: 'monospace', fontWeight: 'bold' },
    })
    t.anchor = { x: 0.5, y: 0.5 }
    t.x = (MAP_COLS * TILE_SIZE) / 2
    t.y = (MAP_ROWS * TILE_SIZE) / 2
    overlayLayer.addChild(t)
    const st = registry.getEntitiesWith([SCHEMA.GAME_STATE])
    if (st.length) {
      const sub = new Text({
        text: `Reached Wave ${st[0]!.GameState.wave}`,
        style: { fill: 0xcccccc, fontSize: 20, fontFamily: 'monospace' },
      })
      sub.anchor = { x: 0.5, y: 0.5 }
      sub.x = (MAP_COLS * TILE_SIZE) / 2
      sub.y = (MAP_ROWS * TILE_SIZE) / 2 + 40
      overlayLayer.addChild(sub)
    }
  }

  const si = registry.createEntity()
  registry.addComponent(si, SCHEMA.GAME_STATE, { money: STARTING_MONEY, lives: STARTING_LIVES, wave: 0, phase: 'building' })

  drawMap()
  sync()

  let lastT = performance.now()
  function loop(t: number): void {
    const dt = t - lastT
    lastT = t
    tickAcc += dt
    while (tickAcc >= TICK_INTERVAL) {
      tick()
      tickAcc -= TICK_INTERVAL
    }
    render(tickAcc / TICK_INTERVAL)
    requestAnimationFrame(loop)
  }
  requestAnimationFrame(loop)

  const mapW = MAP_COLS * TILE_SIZE
  const mapH = MAP_ROWS * TILE_SIZE

  function toGrid(e: FederatedPointerEvent): { gx: number; gy: number } {
    const p = container.toLocal(new Point(e.clientX, e.clientY), app.stage)
    return {
      gx: Math.floor(p.x / TILE_SIZE),
      gy: Math.floor((p.y - MAP_OFFSET_Y) / TILE_SIZE),
    }
  }

  function inMap(gx: number, gy: number): boolean {
    return gx >= 0 && gx < MAP_COLS && gy >= 0 && gy < MAP_ROWS
  }

  app.stage.eventMode = 'static'
  app.stage.hitArea = app.screen

  app.stage.on('pointermove', (e: FederatedPointerEvent) => {
    const { gx, gy } = toGrid(e)
    if (inMap(gx, gy)) updateGhost(gx, gy)
    else ghostLayer.removeChildren()
  })

  app.stage.on('pointerdown', (e: FederatedPointerEvent) => {
    const { gx, gy } = toGrid(e)
    if (inMap(gx, gy)) placeTower(gx, gy)
  })

  return {
    selectTower(tw: TowerDef) { selectedTower = tw; ghostLayer.removeChildren() },
    clearSelection() { selectedTower = null; ghostLayer.removeChildren() },
    startWave,
    getState,
    setUI(ui: UIHandle) { uiRef = ui },
  }
}

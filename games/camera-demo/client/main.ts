import { Application, Graphics, Text, Container, Point, FederatedPointerEvent } from 'pixi.js'
import { createRegistry, createEntity, movementSystem, cameraSystem, collisionSystem, zOrderSystem } from '@sub-engine/core'
import { createResponsiveContainer } from '@sub-engine/pixi'
import { SCHEMA } from '../game/contract.js'
import type { CameraDemoComponents } from '../game/contract.js'

const TILE = 48
const COLS = 30
const ROWS = 30
const WORLD_W = COLS * TILE
const WORLD_H = ROWS * TILE
const GAME_W = 800
const GAME_H = 600
const PLAYER_SPEED = 3

const edge = (x: number, y: number): boolean =>
  x === 0 || y === 0 || x === COLS - 1 || y === ROWS - 1

const obstacles = [
  { x: 8, y: 8 }, { x: 9, y: 8 }, { x: 10, y: 8 },
  { x: 20, y: 15 }, { x: 21, y: 15 }, { x: 22, y: 15 },
  { x: 12, y: 22 }, { x: 13, y: 22 }, { x: 14, y: 22 },
  { x: 18, y: 5 }, { x: 18, y: 6 },
  { x: 5, y: 18 }, { x: 6, y: 18 },
  { x: 25, y: 25 },
]

function isWallCol(gx: number, gy: number): boolean {
  if (edge(gx, gy)) return true
  return obstacles.some(o => o.x === gx && o.y === gy)
}

export async function init(): Promise<void> {
  const app = new Application()
  await app.init({ resizeTo: window, backgroundColor: 0x1a1a2e, antialias: true })
  const appContainer = document.getElementById('app')
  if (!appContainer) throw new Error('#app element not found')
  appContainer.appendChild(app.canvas as HTMLCanvasElement)

  const root = createResponsiveContainer(app, GAME_W, GAME_H)
  const cameraContainer = new Container()
  root.addChild(cameraContainer)

  const registry = createRegistry<CameraDemoComponents>()

  const player = createEntity(registry, {
    Position: { x: 5 * TILE, y: 5 * TILE },
    Velocity: { x: 0, y: 0 },
    Label: { value: 'Player' },
    Collider: { width: TILE * 0.6, height: TILE * 0.6, solid: true },
    ZOrder: { layer: 0, order: 10 },
  })

  const camEntity = createEntity(registry, {
    Camera: {
      x: 0, y: 0,
      width: GAME_W, height: GAME_H,
      zoom: 1,
      targetEntity: player,
      minX: 0, minY: 0,
      maxX: WORLD_W, maxY: WORLD_H,
    },
  })

  const bgLayer = new Container()
  cameraContainer.addChild(bgLayer)

  const entityLayer = new Container()
  cameraContainer.addChild(entityLayer)

  const overlayLayer = new Container()
  cameraContainer.addChild(overlayLayer)

  function drawMap(): void {
    const gfx = new Graphics()
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (edge(x, y)) {
          gfx.fill(0x2a2a4a)
        } else if (obstacles.some(o => o.x === x && o.y === y)) {
          gfx.fill(0x3a2a1a)
        } else {
          const shade = (x + y) % 2 === 0 ? 0x1e1e36 : 0x222244
          gfx.fill(shade)
        }
        gfx.rect(x * TILE, y * TILE, TILE, TILE)
        gfx.fill()
      }
    }
    bgLayer.addChild(gfx)
  }
  drawMap()

  const wallEntities: number[] = []
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (isWallCol(x, y)) {
        const id = createEntity(registry, {
          Position: { x: x * TILE + TILE / 2, y: y * TILE + TILE / 2 },
          Collider: { width: TILE, height: TILE, solid: true },
          ZOrder: { layer: -1, order: 0 },
        })
        wallEntities.push(id)
      }
    }
  }

  const visGfx = new Map<number, Graphics>()
  function syncVisuals(): void {
    const all = registry.getAllEntities()
    const active = new Set<number>()

    for (const e of all) {
      if (!e.Position || !e.ZOrder) continue
      active.add(e.id)
      let gfx = visGfx.get(e.id)
      if (!gfx) {
        gfx = new Graphics()
        entityLayer.addChild(gfx)
        visGfx.set(e.id, gfx)
      }

      gfx.clear()
      if (e.Label?.value === 'Player') {
        gfx.fill(0x44ff44)
        gfx.circle(e.Position.x, e.Position.y, TILE * 0.25)
        gfx.fill()
      } else if (isWallCol(Math.floor(e.Position.x / TILE), Math.floor(e.Position.y / TILE))) {
        continue
      } else {
        gfx.fill(0xff8844)
        gfx.circle(e.Position.x, e.Position.y, 4)
        gfx.fill()
      }

      gfx.x = 0
      gfx.y = 0
    }

    for (const [id, gfx] of visGfx) {
      if (!active.has(id)) {
        entityLayer.removeChild(gfx)
        visGfx.delete(id)
      }
    }
  }

  const infoText = new Text({
    text: '',
    style: { fill: 0xcccccc, fontSize: 12, fontFamily: 'monospace' },
  })
  infoText.y = 4
  root.addChild(infoText)

  const controlsText = new Text({
    text: 'Arrow/WASD: Move  Z: Zoom In  X: Zoom Out  R: Reset Zoom',
    style: { fill: 0x666666, fontSize: 10, fontFamily: 'monospace' },
  })
  controlsText.y = GAME_H - 14
  root.addChild(controlsText)

  const keys: Record<string, boolean> = {}
  window.addEventListener('keydown', (e: KeyboardEvent) => {
    keys[e.key] = true
    if (e.key === 'z' || e.key === 'Z') {
      const cam = registry.getComponent(camEntity, SCHEMA.CAMERA) as CameraDemoComponents['Camera']
      if (cam) registry.addComponent(camEntity, SCHEMA.CAMERA, { ...cam, zoom: Math.min(cam.zoom * 1.2, 3) })
    }
    if (e.key === 'x' || e.key === 'X') {
      const cam = registry.getComponent(camEntity, SCHEMA.CAMERA) as CameraDemoComponents['Camera']
      if (cam) registry.addComponent(camEntity, SCHEMA.CAMERA, { ...cam, zoom: Math.max(cam.zoom / 1.2, 0.3) })
    }
    if (e.key === 'r' || e.key === 'R') {
      const cam = registry.getComponent(camEntity, SCHEMA.CAMERA) as CameraDemoComponents['Camera']
      if (cam) registry.addComponent(camEntity, SCHEMA.CAMERA, { ...cam, zoom: 1 })
    }
  })
  window.addEventListener('keyup', (e: KeyboardEvent) => { keys[e.key] = false })

  function update(): void {
    let dx = 0, dy = 0
    if (keys['ArrowUp'] || keys['w'] || keys['W']) dy = -1
    if (keys['ArrowDown'] || keys['s'] || keys['S']) dy = 1
    if (keys['ArrowLeft'] || keys['a'] || keys['A']) dx = -1
    if (keys['ArrowRight'] || keys['d'] || keys['D']) dx = 1

    if (dx !== 0 || dy !== 0) {
      const len = Math.sqrt(dx * dx + dy * dy)
      registry.addComponent(player, SCHEMA.VELOCITY, {
        x: (dx / len) * PLAYER_SPEED,
        y: (dy / len) * PLAYER_SPEED,
      })
    } else {
      registry.addComponent(player, SCHEMA.VELOCITY, { x: 0, y: 0 })
    }
  }

  function applyCamera(): void {
    const cam = registry.getComponent(camEntity, SCHEMA.CAMERA) as CameraDemoComponents['Camera'] | undefined
    if (!cam) return
    cameraContainer.x = -cam.x * cam.zoom
    cameraContainer.y = -cam.y * cam.zoom
    cameraContainer.scale.set(cam.zoom)

    infoText.text =
      `Pos: ${Math.round((registry.getComponent(player, SCHEMA.POSITION) as any)?.x ?? 0)},${Math.round((registry.getComponent(player, SCHEMA.POSITION) as any)?.y ?? 0)}` +
      `  Zoom: ${cam.zoom.toFixed(2)}x` +
      `  Cam: ${Math.round(cam.x)},${Math.round(cam.y)}` +
      `  Entities: ${registry.entityCount()}`
  }

  function loop(): void {
    update()
    movementSystem(registry, 16)
    collisionSystem(registry, 16)
    cameraSystem(registry, 16)
    zOrderSystem(registry, 16)
    syncVisuals()
    applyCamera()
    requestAnimationFrame(loop)
  }

  syncVisuals()
  applyCamera()

  app.stage.eventMode = 'static'
  app.stage.hitArea = app.screen
  app.stage.on('pointerdown', (e: FederatedPointerEvent) => {
    const p = root.toLocal(new Point(e.clientX, e.clientY), app.stage)
  })

  requestAnimationFrame(loop)
}

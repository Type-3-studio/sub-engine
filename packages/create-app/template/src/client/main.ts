import { Application, Graphics, Text } from 'pixi.js'
import { createRegistry, createGameLoop, movementSystem } from '@sub-engine/core'
import { createResponsiveContainer, DebugOverlay } from '@sub-engine/pixi'
import { SCHEMA } from '../game/contract.js'
import { TILE, COLS, ROWS, MAP } from '../game/config/index.js'
import type { GameComponents } from '../game/contract.js'

export async function init(): Promise<void> {
  const app = new Application()
  await app.init({ resizeTo: window, backgroundColor: 0x111122, antialias: true })
  const el = document.getElementById('app')
  if (!el) throw new Error('#app not found')
  el.appendChild(app.canvas as HTMLCanvasElement)

  const container = createResponsiveContainer(app, COLS * TILE, ROWS * TILE)

  const registry = createRegistry<GameComponents>()

  const player = registry.createEntity()
  registry.addComponent(player, SCHEMA.POSITION, { x: 3, y: 4 })
  registry.addComponent(player, SCHEMA.VELOCITY, { x: 0, y: 0 })
  registry.addComponent(player, SCHEMA.LABEL, { value: 'Player' })

  const bg = new Graphics()
  container.addChild(bg)

  const fg = new Graphics()
  container.addChild(fg)

  const text = new Text({
    text: 'Arrow keys: move  |  F12: debug overlay',
    style: { fill: 0x888888, fontSize: 14, fontFamily: 'monospace' },
  })
  container.addChild(text)

  const overlay = new DebugOverlay(app, () => registry.getAllEntitiesCopy() as any[])

  function isWalkable(x: number, y: number): boolean {
    if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return false
    return MAP[y]![x] === 0
  }

  function draw(): void {
    bg.clear()
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const wall = !isWalkable(x, y)
        bg.fill(wall ? 0x334466 : 0x1a1a2e)
        bg.rect(x * TILE, y * TILE, TILE, TILE)
        bg.fill()
        bg.stroke({ width: 1, color: 0x222244 })
        bg.rect(x * TILE, y * TILE, TILE, TILE)
        bg.stroke()
      }
    }
    const pos = registry.getComponent(player, SCHEMA.POSITION)
    if (pos) {
      fg.clear()
      fg.fill(0x44ff44)
      fg.circle(pos.x * TILE + TILE / 2, pos.y * TILE + TILE / 2, 10)
      fg.fill()
    }
  }

  draw()

  const keys: Record<string, boolean> = {}

  window.addEventListener('keydown', (e: KeyboardEvent) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault()
      keys[e.key] = true
    }
  })

  window.addEventListener('keyup', (e: KeyboardEvent) => {
    keys[e.key] = false
  })

  const gameLoop = createGameLoop({
    tickRate: 10,
    maxFrameMs: 100,
    onStep: () => {
      let dx = 0, dy = 0
      if (keys['ArrowUp']) dy = -1
      else if (keys['ArrowDown']) dy = 1
      else if (keys['ArrowLeft']) dx = -1
      else if (keys['ArrowRight']) dx = 1
      if (dx === 0 && dy === 0) return
      const pos = registry.getComponent(player, SCHEMA.POSITION)
      if (!pos) return
      const nx = pos.x + dx
      const ny = pos.y + dy
      if (!isWalkable(nx, ny)) return
      registry.addComponent(player, SCHEMA.POSITION, { x: nx, y: ny })
      draw()
    },
    onFrame: () => {},
  })
  gameLoop.start()

  app.ticker.add(() => overlay.update())
}

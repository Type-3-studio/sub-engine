import { Application, Graphics, Text, FederatedPointerEvent } from 'pixi.js'
import { createMapFromMatrix, computeFlowField } from '../../../src/engine/index.js'
import { createResponsiveContainer } from '../../../src/common/responsive.js'

const TILE = 48
const COLS = 12
const ROWS = 8

const INITIAL: number[][] = [
  [0,0,0,0,0,0,0,0,0,0,0,0],
  [0,1,1,0,0,0,0,0,0,1,1,0],
  [0,1,0,0,0,0,0,0,0,0,1,0],
  [0,0,0,0,1,1,1,1,0,0,0,0],
  [0,0,0,0,1,1,1,1,0,0,0,0],
  [0,1,0,0,0,0,0,0,0,0,1,0],
  [0,1,1,0,0,0,0,0,0,1,1,0],
  [0,0,0,0,0,0,0,0,0,0,0,0],
]

export async function init(): Promise<void> {
  const app = new Application()
  await app.init({ resizeTo: window, backgroundColor: 0x0a0a1a, antialias: true })
  const appContainer = document.getElementById('app')
  if (!appContainer) throw new Error('#app element not found')
  appContainer.appendChild(app.canvas as HTMLCanvasElement)

  const container = createResponsiveContainer(app, COLS * TILE, ROWS * TILE)

  const gfx = new Graphics()
  container.addChild(gfx)

  const info = new Text({
    text: 'Click cells to toggle walls',
    style: { fill: 0xaaaaaa, fontSize: 14, fontFamily: 'monospace' },
  })
  container.addChild(info)

  let matrix = INITIAL.map(row => [...row])
  let map = createMapFromMatrix(matrix)
  const targetX = COLS - 1
  const targetY = ROWS - 1
  let flowField = computeFlowField(map, targetX, targetY)

  function rebuild(): void {
    map = createMapFromMatrix(matrix)
    flowField = computeFlowField(map, targetX, targetY)
    draw()
  }

  function draw(): void {
    gfx.clear()
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const wall = matrix[y]![x] === 1
        if (wall) {
          gfx.fill(0x445566)
          gfx.rect(x * TILE, y * TILE, TILE, TILE)
          gfx.fill()
        } else {
          const cost = flowField.getCost(x, y)
          const intensity = Math.min(1, cost / 20)
          const r = Math.floor(0 + intensity * 60)
          const g = Math.floor(40 + (1 - intensity) * 80)
          const b = Math.floor(80 + (1 - intensity) * 120)
          gfx.fill((r << 16) | (g << 8) | b)
          gfx.rect(x * TILE, y * TILE, TILE, TILE)
          gfx.fill()

          const v = flowField.getVector(x, y)
          if (v.x !== 0 || v.y !== 0) {
            const cx = x * TILE + TILE / 2
            const cy = y * TILE + TILE / 2
            gfx.stroke({ width: 1.5, color: 0xffffff })
            gfx.moveTo(cx, cy)
            gfx.lineTo(cx + v.x * TILE * 0.35, cy + v.y * TILE * 0.35)
            gfx.stroke()
          }
        }
      }
    }

    gfx.fill(0xffff44)
    gfx.circle(targetX * TILE + TILE / 2, targetY * TILE + TILE / 2, 6)
    gfx.fill()
  }

  draw()

  app.stage.eventMode = 'static'

  app.stage.on('pointerdown', (e: FederatedPointerEvent) => {
    const local = container.toLocal(e.global)
    const gx = Math.floor(local.x / TILE)
    const gy = Math.floor(local.y / TILE)
    if (gx < 0 || gx >= COLS || gy < 0 || gy >= ROWS) return
    if (gx === targetX && gy === targetY) return
    matrix[gy]![gx] = matrix[gy]![gx] === 1 ? 0 : 1
    rebuild()
  })
}

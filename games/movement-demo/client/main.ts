import { Application, Graphics, Text } from 'pixi.js'
import { createRegistry, createMapFromMatrix, computeFlowField } from '../../../src/engine/index.js'
import { movementSystem } from '../../../src/common/index.js'
import { createResponsiveContainer } from '../../../src/common/responsive.js'
import { SCHEMA } from '../game/contract.js'
import type { MovementComponents } from '../game/contract.js'

const TILE = 48
const COLS = 15
const ROWS = 10
const SPEED = 2

const MAP = [
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,1,1,1,1,1,1,1,0,0,0,0],
  [0,0,0,0,1,0,0,0,0,0,1,0,0,0,0],
  [0,1,1,1,1,0,0,0,0,0,1,1,1,1,0],
  [0,1,0,0,0,0,0,0,0,0,0,0,0,1,0],
  [0,1,0,0,0,0,0,0,0,0,0,0,0,1,0],
  [0,1,1,1,1,0,0,0,0,0,1,1,1,1,0],
  [0,0,0,0,1,0,0,0,0,0,1,0,0,0,0],
  [0,0,0,0,1,1,1,1,1,1,1,0,0,0,0],
]

export async function init(): Promise<void> {
  const app = new Application()
  await app.init({ resizeTo: window, backgroundColor: 0x111122, antialias: true })
  const appContainer = document.getElementById('app')
  if (!appContainer) throw new Error('#app element not found')
  appContainer.appendChild(app.canvas as HTMLCanvasElement)

  const container = createResponsiveContainer(app, COLS * TILE, ROWS * TILE)

  const map = createMapFromMatrix(MAP)
  const registry = createRegistry<MovementComponents>()

  const player = registry.createEntity()
  registry.addComponent(player, SCHEMA.POSITION, { x: 1, y: 1 })
  registry.addComponent(player, SCHEMA.VELOCITY, { x: 0, y: 0 })
  registry.addComponent(player, SCHEMA.LABEL, { value: 'Player' })

  let targetX = 13
  let targetY = 8
  let flowField = computeFlowField(map, targetX, targetY)

  const bg = new Graphics()
  container.addChild(bg)

  const playerGfx = new Graphics()
  container.addChild(playerGfx)

  const targetGfx = new Graphics()
  container.addChild(targetGfx)

  const infoText = new Text({
    text: 'Arrow keys: move target',
    style: { fill: 0xaaaaaa, fontSize: 14, fontFamily: 'monospace' },
  })
  container.addChild(infoText)

  function drawGrid(): void {
    bg.clear()
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const wall = !map.isWalkable(x, y)
        bg.fill(wall ? 0x334466 : 0x1a1a2e)
        bg.rect(x * TILE, y * TILE, TILE, TILE)
        bg.fill()
        bg.stroke({ width: 1, color: 0x222244 })
        bg.rect(x * TILE, y * TILE, TILE, TILE)
        bg.stroke()
      }
    }
  }

  function drawFlowField(): void {
    bg.clear()
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const wall = !map.isWalkable(x, y)
        bg.fill(wall ? 0x334466 : 0x1a1a2e)
        bg.rect(x * TILE, y * TILE, TILE, TILE)
        bg.fill()
        if (!wall) {
          const v = flowField.getVector(x, y)
          if (v.x !== 0 || v.y !== 0) {
            const cx = x * TILE + TILE / 2
            const cy = y * TILE + TILE / 2
            const len = TILE * 0.35
            bg.stroke({ width: 1.5, color: 0x4488ff })
            bg.moveTo(cx, cy)
            bg.lineTo(cx + v.x * len, cy + v.y * len)
            bg.stroke()
          }
        }
      }
    }
  }

  drawFlowField()

  function drawTarget(): void {
    targetGfx.clear()
    targetGfx.fill(0xff4444)
    targetGfx.circle(targetX * TILE + TILE / 2, targetY * TILE + TILE / 2, 8)
    targetGfx.fill()
  }

  function drawPlayer(): void {
    const pos = registry.getComponent(player, SCHEMA.POSITION)
    if (!pos) return
    playerGfx.clear()
    playerGfx.fill(0x44ff44)
    playerGfx.circle(pos.x * TILE + TILE / 2, pos.y * TILE + TILE / 2, 10)
    playerGfx.fill()
  }

  drawTarget()
  drawPlayer()

  window.addEventListener('keydown', (e: KeyboardEvent) => {
    let dx = 0, dy = 0
    if (e.key === 'ArrowUp') dy = -1
    else if (e.key === 'ArrowDown') dy = 1
    else if (e.key === 'ArrowLeft') dx = -1
    else if (e.key === 'ArrowRight') dx = 1
    else return

    e.preventDefault()
    const nx = targetX + dx
    const ny = targetY + dy
    if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) return
    targetX = nx
    targetY = ny
    flowField = computeFlowField(map, targetX, targetY)
    drawFlowField()
    drawTarget()
  })

  function tick(): void {
    const pos = registry.getComponent(player, SCHEMA.POSITION)
    if (!pos) return
    const v = flowField.getVector(Math.round(pos.x), Math.round(pos.y))
    registry.addComponent(player, SCHEMA.VELOCITY, { x: v.x * SPEED * 0.05, y: v.y * SPEED * 0.05 })
    movementSystem(registry)
    drawPlayer()
  }

  app.ticker.add(tick)
}

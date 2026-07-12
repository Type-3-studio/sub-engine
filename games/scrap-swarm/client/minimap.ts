import { MAP_COLS, MAP_ROWS, TILE_SIZE } from '../game/config.js'

const MINI_W = 180
const MINI_H = 120
const SCALE_X = MINI_W / MAP_COLS
const SCALE_Y = MINI_H / MAP_ROWS
const PAD = 4

const COLORS: Record<string, string> = {
  base: '#44aaff',
  worker: '#44ff88',
  fighter: '#ff4444',
  enemy: '#ff8844',
  'resource-node': '#88aaff',
}

export interface MinimapState {
  entities: Array<{ label: string; x: number; y: number }>
  camX: number
  camY: number
  camW: number
  camH: number
}

export function createMinimap(): { update(state: MinimapState): void; getElement(): HTMLElement } {
  const container = document.createElement('div')
  container.style.cssText = `position:fixed;bottom:${PAD}px;right:${PAD}px;width:${MINI_W}px;height:${MINI_H}px;background:#0a0a1a;border:1px solid #333;border-radius:4px;overflow:hidden;z-index:100;`

  const canvas = document.createElement('canvas')
  canvas.width = MINI_W
  canvas.height = MINI_H
  canvas.style.cssText = 'width:100%;height:100%;'
  container.appendChild(canvas)

  const ctx = canvas.getContext('2d')!

  function update(state: MinimapState): void {
    ctx.clearRect(0, 0, MINI_W, MINI_H)

    ctx.fillStyle = '#111122'
    ctx.fillRect(0, 0, MINI_W, MINI_H)

    for (const e of state.entities) {
      const color = COLORS[e.label] || '#888'
      const px = e.x * SCALE_X
      const py = e.y * SCALE_Y
      ctx.fillStyle = color
      if (e.label === 'base') {
        ctx.fillRect(px - 2, py - 2, 4, 4)
      } else {
        ctx.fillRect(px - 1, py - 1, 2, 2)
      }
    }

    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 1
    ctx.globalAlpha = 0.5
    ctx.strokeRect(
      state.camX * SCALE_X,
      state.camY * SCALE_Y,
      state.camW * SCALE_X,
      state.camH * SCALE_Y,
    )
    ctx.globalAlpha = 1
  }

  return { update, getElement: () => container }
}

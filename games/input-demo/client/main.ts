import { Application, Graphics, Text, FederatedPointerEvent } from 'pixi.js'
import { createResponsiveContainer } from '../../../src/common/responsive.js'

const W = 640
const H = 480

interface Rect {
  x: number
  y: number
  w: number
  h: number
  color: number
  label: string
}

export async function init(): Promise<void> {
  const app = new Application()
  await app.init({ resizeTo: window, backgroundColor: 0x1a1a2e, antialias: true })
  const appContainer = document.getElementById('app')
  if (!appContainer) throw new Error('#app element not found')
  appContainer.appendChild(app.canvas as HTMLCanvasElement)

  const container = createResponsiveContainer(app, W, H)

  const gfx = new Graphics()
  container.addChild(gfx)

  const log = new Text({
    text: 'Click / drag on the canvas',
    style: { fill: 0xffffff, fontSize: 14, fontFamily: 'monospace' },
  })
  log.x = 10
  log.y = 10
  container.addChild(log)

  const coordText = new Text({
    text: '',
    style: { fill: 0xaaaaaa, fontSize: 12, fontFamily: 'monospace' },
  })
  coordText.x = 10
  coordText.y = 30
  container.addChild(coordText)

  const rects: Rect[] = [
    { x: 80, y: 80, w: 80, h: 80, color: 0x44aaff, label: 'Drag me' },
    { x: 240, y: 160, w: 80, h: 80, color: 0xff6644, label: 'Drop here' },
    { x: 420, y: 300, w: 80, h: 80, color: 0x44ff88, label: 'Click me' },
  ]

  let dragging: Rect | null = null
  let dragOffset = { x: 0, y: 0 }

  function draw(): void {
    gfx.clear()
    for (const r of rects) {
      gfx.fill(r.color)
      gfx.rect(r.x, r.y, r.w, r.h)
      gfx.fill()
      gfx.stroke({ width: 2, color: 0xffffff })
      gfx.rect(r.x, r.y, r.w, r.h)
      gfx.stroke()
    }

    gfx.stroke({ width: 1, color: 0x334466 })
    for (let x = 0; x <= W; x += 40) {
      gfx.moveTo(x, 0); gfx.lineTo(x, H)
    }
    for (let y = 0; y <= H; y += 40) {
      gfx.moveTo(0, y); gfx.lineTo(W, y)
    }
    gfx.stroke()
  }

  draw()

  app.stage.eventMode = 'static'
  app.stage.hitArea = app.screen

  app.stage.on('pointerdown', (e: FederatedPointerEvent) => {
    const local = container.toLocal(e.global)
    for (const r of rects) {
      if (local.x >= r.x && local.x <= r.x + r.w && local.y >= r.y && local.y <= r.y + r.h) {
        dragging = r
        dragOffset.x = local.x - r.x
        dragOffset.y = local.y - r.y
        coordText.text = `Started dragging at (${Math.round(local.x)}, ${Math.round(local.y)})`
        break
      }
    }
    log.text = `pointerdown  local=(${Math.round(local.x)}, ${Math.round(local.y)})  global=(${Math.round(e.global.x)}, ${Math.round(e.global.y)})`
  })

  app.stage.on('pointermove', (e: FederatedPointerEvent) => {
    const local = container.toLocal(e.global)
    if (dragging) {
      dragging.x = local.x - dragOffset.x
      dragging.y = local.y - dragOffset.y
      coordText.text = `Dragging at (${Math.round(local.x)}, ${Math.round(local.y)})`
      draw()
    }
  })

  app.stage.on('pointerup', (e: FederatedPointerEvent) => {
    const local = container.toLocal(e.global)
    if (dragging) {
      coordText.text = `Dropped at (${Math.round(local.x)}, ${Math.round(local.y)})`
      dragging = null
    }
    log.text = `pointerup  local=(${Math.round(local.x)}, ${Math.round(local.y)})`
  })
}

import { Container, Graphics, Text } from 'pixi.js'
import type { ScrapCaravanComponents } from '../game/contract.js'
import { TILE_SIZE } from '../game/config.js'

const TYPE_COLORS: Record<string, number> = {
  drone: 0x44aaff,
  crawler: 0xff8844,
  beetle: 0xff4466,
  storage: 0x66cc88,
}

const TYPE_LABELS: Record<string, string> = {
  drone: 'DRONE',
  crawler: 'CRAWLER',
  beetle: 'BEETLE',
  storage: 'STORAGE',
  'scrap-node': 'SCRAP',
  storm: 'STORM',
}

const RESOURCE_COLORS: Record<string, number> = {
  silicon: 0x8888cc,
  iron: 0xcc8844,
  copper: 0xcc6633,
}

const STORM_ALPHA = 0.25

function addLabel(c: Container, text: string, yOffset: number): void {
  const t = new Text({
    text,
    style: { fill: 0xffffff, fontSize: 8, fontFamily: 'monospace', fontWeight: 'bold' },
  })
  t.anchor = { x: 0.5, y: 1 }
  t.x = 0
  t.y = yOffset
  c.addChild(t)
}

function addHealthBar(c: Container, current: number, max: number, width: number, yOffset: number, color: number): void {
  const bg = new Graphics()
  bg.rect(-width / 2, yOffset, width, 3)
  bg.fill(0x222222)
  c.addChild(bg)
  const fill = new Graphics()
  fill.rect(-width / 2, yOffset, width * (current / max), 3)
  fill.fill(color)
  c.addChild(fill)
}

export function createEntityVisual(entity: ScrapCaravanComponents & { id: number }): Container {
  const c = new Container()
  const label = entity.Label?.value ?? ''

  if (label === 'drone') {
    const gfx = new Graphics()
    gfx.circle(0, 0, TILE_SIZE / 6)
    gfx.fill(TYPE_COLORS.drone)
    c.addChild(gfx)

    const ai = entity.DroneAI
    if (ai) {
      const cargoTotal = ai.cargo.reduce((s, item) => s + item.quantity, 0)
      if (cargoTotal > 0) {
        const cargoGfx = new Graphics()
        cargoGfx.circle(0, 0, 4)
        cargoGfx.fill(0xffdd44)
        c.addChild(cargoGfx)
      }
      if (ai.state === 'returning') {
        const arrow = new Graphics()
        arrow.poly([-4, -6, 4, -6, 0, -10])
        arrow.fill(0x44ff44)
        c.addChild(arrow)
      }
    }

    const hp = entity.Health
    if (hp) {
      addHealthBar(c, hp.current, hp.max, TILE_SIZE / 3, -TILE_SIZE / 4 - 12, 0x44ff44)
    }
    addLabel(c, TYPE_LABELS.drone!, -TILE_SIZE / 4 - 2)
  } else if (label === 'crawler') {
    const chassis = new Graphics()
    chassis.rect(-TILE_SIZE / 4, -TILE_SIZE / 5, TILE_SIZE / 2, TILE_SIZE / 2.5)
    chassis.fill(TYPE_COLORS.crawler)
    c.addChild(chassis)

    const cv = entity.CompositeVisual
    if (cv && cv.attachmentAsset) {
      const turret = new Graphics()
      turret.circle(0, -TILE_SIZE / 6, TILE_SIZE / 8)
      turret.fill(0xcc6633)
      c.addChild(turret)
    }

    const hp = entity.Health
    if (hp) {
      addHealthBar(c, hp.current, hp.max, TILE_SIZE / 2, -TILE_SIZE / 3 - 12, 0xff4444)
    }
    addLabel(c, TYPE_LABELS.crawler!, -TILE_SIZE / 3 - 2)
  } else if (label === 'beetle') {
    const gfx = new Graphics()
    gfx.circle(0, 0, TILE_SIZE / 7)
    gfx.fill(TYPE_COLORS.beetle)
    gfx.circle(-4, -3, 2)
    gfx.fill(0xcc3344)
    gfx.circle(4, -3, 2)
    gfx.fill(0xcc3344)
    c.addChild(gfx)

    const hp = entity.Health
    if (hp) {
      addHealthBar(c, hp.current, hp.max, TILE_SIZE / 3, -TILE_SIZE / 3 - 12, 0xff4444)
    }
    addLabel(c, TYPE_LABELS.beetle!, -TILE_SIZE / 3 - 2)
  } else if (label === 'storage') {
    const gfx = new Graphics()
    gfx.rect(-TILE_SIZE / 3, -TILE_SIZE / 3, TILE_SIZE / 1.5, TILE_SIZE / 1.5)
    gfx.fill(TYPE_COLORS.storage)
    gfx.rect(-TILE_SIZE / 3, -TILE_SIZE / 3, TILE_SIZE / 1.5, TILE_SIZE / 1.5)
    gfx.stroke({ color: 0x44aa66, width: 2 })
    c.addChild(gfx)
    addLabel(c, TYPE_LABELS.storage!, -TILE_SIZE / 3 - 2)
  } else if (label === 'scrap-node') {
    const sn = entity.ScrapNode
    const color = RESOURCE_COLORS[sn?.resourceType ?? 'silicon'] ?? 0x888888
    const gfx = new Graphics()
    gfx.poly([0, -TILE_SIZE / 4, TILE_SIZE / 4, 0, 0, TILE_SIZE / 4, -TILE_SIZE / 4, 0])
    gfx.fill(color)
    gfx.fill({ color: 0xffffff, alpha: 0.1 })
    c.addChild(gfx)
    addLabel(c, TYPE_LABELS['scrap-node']!, -TILE_SIZE / 4 - 2)
  } else if (label === 'storm') {
    const s = entity.Storm
    if (s) {
      const radius = s.radius * TILE_SIZE
      const gfx = new Graphics()
      gfx.circle(0, 0, radius)
      gfx.fill({ color: 0x8888ff, alpha: STORM_ALPHA })
      gfx.circle(0, 0, radius)
      gfx.stroke({ color: 0xaaaaff, alpha: 0.5, width: 2 })
      c.addChild(gfx)

      const intensity = Math.round(s.intensity)
      for (let i = 0; i < intensity; i++) {
        const bolt = new Graphics()
        const angle = (Math.PI * 2 * i) / intensity
        const len = radius * (0.3 + Math.random() * 0.4)
        bolt.moveTo(0, 0)
        bolt.lineTo(Math.cos(angle) * len, Math.sin(angle) * len)
        bolt.stroke({ color: 0xaaaaff, alpha: 0.4 + Math.random() * 0.3, width: 2 })
        c.addChild(bolt)
      }
    }
  }

  return c
}

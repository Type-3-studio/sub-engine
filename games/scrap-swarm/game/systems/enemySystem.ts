import { computeFlowField, createEntity } from '@sub-engine/core'
import type { Registry, GameMap, FlowField, Vec2 } from '@sub-engine/core'
import { SCHEMA } from '../contract.js'
import type { ScrapSwarmComponents } from '../contract.js'
import { BASE_X, BASE_Y, MAP_COLS, MAP_ROWS } from '../config.js'

class EnemyGrid implements GameMap {
  readonly width: number
  readonly height: number
  constructor() {
    this.width = MAP_COLS
    this.height = MAP_ROWS
  }
  getTile(x: number, y: number): number {
    return this.isWalkable(x, y) ? 0 : 1
  }
  isWalkable(x: number, y: number): boolean {
    return x >= 0 && x < this.width && y >= 0 && y < this.height
  }
  serialize(): number[][] {
    return Array.from({ length: this.height }, () => Array(this.width).fill(0))
  }
}

const enemyGrid = new EnemyGrid()
let enemyFlowCache: { tx: number; ty: number; ff: FlowField } | null = null

function getEnemyFlowField(tx: number, ty: number): FlowField {
  if (enemyFlowCache && enemyFlowCache.tx === tx && enemyFlowCache.ty === ty) {
    return enemyFlowCache.ff
  }
  const ff = computeFlowField(enemyGrid, tx, ty)
  enemyFlowCache = { tx, ty, ff }
  return ff
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)
}

export function enemySystem(registry: Registry<ScrapSwarmComponents>, dt: number): Registry<ScrapSwarmComponents> {
  const enemies = registry.getEntitiesWith([SCHEMA.ENEMY, SCHEMA.POSITION, SCHEMA.HEALTH, SCHEMA.ACCUMULATOR])
  const baseEntities = registry.getEntitiesWith([SCHEMA.ECONOMY_STORAGE, SCHEMA.POSITION])
  const basePos = baseEntities.length > 0 ? baseEntities[0]!.Position : { x: BASE_X + 0.5, y: BASE_Y + 0.5 }
  const baseEntityId = baseEntities.length > 0 ? baseEntities[0]!.id : -1
  const fighters = registry.getEntitiesWith([SCHEMA.FIGHTER, SCHEMA.POSITION])

  const removed: number[] = []

  for (const e of enemies) {
    const enemy = e.Enemy
    const pos = e.Position
    const hp = e.Health

    if (hp.current <= 0) {
      const baseEnts = registry.getEntitiesWith([SCHEMA.ECONOMY_STORAGE])
      if (baseEnts.length > 0) {
        const storage = baseEnts[0]!
        const bal = storage.EconomyStorage.balances
        registry.addComponent(storage.id, SCHEMA.ECONOMY_STORAGE, {
          balances: { ...bal, scrap: (bal.scrap ?? 0) + enemy.reward },
        })
      }
      for (let i = 0; i < 3; i++) {
        createEntity(registry, {
          [SCHEMA.POSITION]: { x: pos.x, y: pos.y },
          [SCHEMA.PARTICLE]: { remaining: 300, color: '#ff6644', size: 3 },
        })
      }
      removed.push(e.id)
      continue
    }

    let targetPos = { x: basePos.x, y: basePos.y }
    let targetId = baseEntityId

    for (const f of fighters) {
      const fPos = f.Position
      if (distance(pos, fPos) < 3) {
        targetPos = { x: fPos.x, y: fPos.y }
        targetId = f.id
        break
      }
    }

    const gx = Math.round(pos.x)
    const gy = Math.round(pos.y)
    const tx = Math.round(targetPos.x)
    const ty = Math.round(targetPos.y)
    let vec: Vec2
    try {
      const ff = getEnemyFlowField(tx, ty)
      vec = ff.getVector(gx, gy)
    } catch {
      vec = { x: 0, y: 0 }
    }
    if (vec.x === 0 && vec.y === 0) {
      const dx = targetPos.x - pos.x
      const dy = targetPos.y - pos.y
      const len = Math.sqrt(dx * dx + dy * dy)
      if (len > 0) vec = { x: dx / len, y: dy / len }
    }

    const speed = enemy.speed * (dt / 16)
    registry.addComponent(e.id, SCHEMA.VELOCITY, { x: vec.x * speed, y: vec.y * speed })

    if (targetId !== -1 && registry.entityExists(targetId)) {
      const tPos = registry.getComponent(targetId, SCHEMA.POSITION) as { x: number; y: number } | undefined
      if (tPos && distance(pos, tPos) < 0.8) {
        const acc = e.Accumulator
        if (acc.value >= acc.threshold && dt > 0) {
          const tHp = registry.getComponent(targetId, SCHEMA.HEALTH) as { current: number; max: number } | undefined
          if (tHp) {
            registry.addComponent(targetId, SCHEMA.HEALTH, {
              ...tHp,
              current: Math.max(0, tHp.current - enemy.damage),
            })
          }
          registry.addComponent(e.id, SCHEMA.ACCUMULATOR, { ...acc, value: 0 })
        } else {
          registry.addComponent(e.id, SCHEMA.ACCUMULATOR, { ...acc, value: acc.value + dt })
        }
      }
    }
  }

  for (const id of removed) {
    registry.removeEntity(id)
  }

  return registry
}

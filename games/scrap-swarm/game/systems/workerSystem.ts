import { computeFlowField } from '@sub-engine/core'
import type { Registry, GameMap, FlowField, Vec2 } from '@sub-engine/core'
import { SCHEMA } from '../contract.js'
import type { ScrapSwarmComponents } from '../contract.js'
import { BASE_X, BASE_Y, WORKER_SPEED, WORKER_CARGO_CAPACITY, MINE_THRESHOLD, MAP_COLS, MAP_ROWS, RESOURCE_NODES } from '../config.js'

const DIRS_4: [number, number][] = [[0, -1], [0, 1], [-1, 0], [1, 0]]

class WalkableGrid implements GameMap {
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

const walkableMap = new WalkableGrid()
const flowCache = new Map<string, FlowField>()

function getCachedFlowField(tx: number, ty: number): FlowField {
  const key = `${tx},${ty}`
  let ff = flowCache.get(key)
  if (!ff) {
    ff = computeFlowField(walkableMap, tx, ty)
    flowCache.set(key, ff)
  }
  return ff
}

function clearFlowCache(): void {
  flowCache.clear()
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)
}

function findNearestNode(
  registry: Registry<ScrapSwarmComponents>,
  pos: { x: number; y: number },
): { id: number; x: number; y: number } | null {
  const nodes = registry.getEntitiesWith([SCHEMA.RESOURCE_NODE, SCHEMA.POSITION])
  let best: { id: number; x: number; y: number; dist: number } | null = null
  for (const e of nodes) {
    if (e.ResourceNode.depleted) continue
    const d = distance(pos, e.Position)
    if (!best || d < best.dist) {
      best = { id: e.id, x: e.Position.x, y: e.Position.y, dist: d }
    }
  }
  return best ? { id: best.id, x: best.x, y: best.y } : null
}

export function workerSystem(registry: Registry<ScrapSwarmComponents>, dt: number): Registry<ScrapSwarmComponents> {
  const workers = registry.getEntitiesWith([SCHEMA.UNIT_AI, SCHEMA.WORKER, SCHEMA.POSITION, SCHEMA.ACCUMULATOR])

  for (const e of workers) {
    const ai = e.UnitAI
    const worker = e.Worker
    const pos = e.Position
    const acc = e.Accumulator

    switch (ai.state) {
      case 'idle': {
        const target = findNearestNode(registry, pos)
        if (!target) break
        registry.addComponent(e.id, SCHEMA.UNIT_AI, {
          ...ai, state: 'traveling', targetId: target.id, orderX: target.x, orderY: target.y,
        })
        break
      }

      case 'traveling': {
        if (ai.targetId === null || !registry.entityExists(ai.targetId)) {
          registry.addComponent(e.id, SCHEMA.UNIT_AI, { ...ai, state: 'idle', targetId: null, orderX: 0, orderY: 0 })
          registry.addComponent(e.id, SCHEMA.VELOCITY, { x: 0, y: 0 })
          break
        }
        const targetPos = registry.getComponent(ai.targetId, SCHEMA.POSITION) as { x: number; y: number } | undefined
        if (!targetPos) {
          registry.addComponent(e.id, SCHEMA.UNIT_AI, { ...ai, state: 'idle', targetId: null, orderX: 0, orderY: 0 })
          registry.addComponent(e.id, SCHEMA.VELOCITY, { x: 0, y: 0 })
          break
        }
        const gx = Math.round(pos.x)
        const gy = Math.round(pos.y)
        let vec: Vec2
        try {
          const ff = getCachedFlowField(Math.round(targetPos.x), Math.round(targetPos.y))
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
        registry.addComponent(e.id, SCHEMA.VELOCITY, { x: vec.x * WORKER_SPEED * (dt / 16), y: vec.y * WORKER_SPEED * (dt / 16) })

        if (distance(pos, targetPos) < 0.6) {
          registry.addComponent(e.id, SCHEMA.UNIT_AI, { ...ai, state: 'mining', targetId: ai.targetId, orderX: ai.orderX, orderY: ai.orderY })
          registry.addComponent(e.id, SCHEMA.VELOCITY, { x: 0, y: 0 })
          registry.addComponent(e.id, SCHEMA.ACCUMULATOR, { ...acc, value: 0 })
        }
        break
      }

      case 'mining': {
        if (ai.targetId === null || !registry.entityExists(ai.targetId)) {
          registry.addComponent(e.id, SCHEMA.UNIT_AI, { ...ai, state: 'idle', targetId: null, orderX: 0, orderY: 0 })
          registry.addComponent(e.id, SCHEMA.VELOCITY, { x: 0, y: 0 })
          break
        }
        const nodeComp = registry.getComponent(ai.targetId, SCHEMA.RESOURCE_NODE) as ScrapSwarmComponents['ResourceNode'] | undefined
        if (!nodeComp || nodeComp.depleted) {
          registry.addComponent(e.id, SCHEMA.UNIT_AI, { ...ai, state: 'idle', targetId: null, orderX: 0, orderY: 0 })
          registry.addComponent(e.id, SCHEMA.VELOCITY, { x: 0, y: 0 })
          break
        }
        const newValue = acc.value + dt
        registry.addComponent(e.id, SCHEMA.ACCUMULATOR, { ...acc, value: newValue })

        if (newValue >= MINE_THRESHOLD) {
          const remaining = nodeComp.remaining - 1
          registry.addComponent(ai.targetId, SCHEMA.RESOURCE_NODE, {
            ...nodeComp, remaining, depleted: remaining <= 0,
          })
          const newCarry = worker.carryAmount + 1
          registry.addComponent(e.id, SCHEMA.WORKER, { ...worker, carryAmount: newCarry, carryType: nodeComp.type })
          registry.addComponent(e.id, SCHEMA.ACCUMULATOR, { ...acc, value: newValue - MINE_THRESHOLD })

          if (newCarry >= WORKER_CARGO_CAPACITY) {
            registry.addComponent(e.id, SCHEMA.UNIT_AI, { ...ai, state: 'returning', targetId: null, orderX: BASE_X + 0.5, orderY: BASE_Y + 0.5 })
          }
        }
        break
      }

      case 'returning': {
        const gx = Math.round(pos.x)
        const gy = Math.round(pos.y)
        const tx = Math.round(BASE_X + 0.5)
        const ty = Math.round(BASE_Y + 0.5)
        let vec: Vec2
        try {
          const ff = getCachedFlowField(tx, ty)
          vec = ff.getVector(gx, gy)
        } catch {
          vec = { x: 0, y: 0 }
        }
        if (vec.x === 0 && vec.y === 0) {
          const dx = (BASE_X + 0.5) - pos.x
          const dy = (BASE_Y + 0.5) - pos.y
          const len = Math.sqrt(dx * dx + dy * dy)
          if (len > 0) vec = { x: dx / len, y: dy / len }
        }
        registry.addComponent(e.id, SCHEMA.VELOCITY, { x: vec.x * WORKER_SPEED * (dt / 16), y: vec.y * WORKER_SPEED * (dt / 16) })

        if (distance(pos, { x: BASE_X + 0.5, y: BASE_Y + 0.5 }) < 0.8) {
          const storages = registry.getEntitiesWith([SCHEMA.ECONOMY_STORAGE])
          if (storages.length > 0) {
            const storage = storages[0]!
            const current = storage.EconomyStorage.balances
            const newBalances = { ...current }
            const key = worker.carryType || 'scrap'
            newBalances[key] = (newBalances[key] ?? 0) + worker.carryAmount
            registry.addComponent(storage.id, SCHEMA.ECONOMY_STORAGE, { balances: newBalances })
          }
          registry.addComponent(e.id, SCHEMA.WORKER, { ...worker, carryAmount: 0, carryType: '' })
          registry.addComponent(e.id, SCHEMA.UNIT_AI, { ...ai, state: 'idle', targetId: null, orderX: 0, orderY: 0 })
          registry.addComponent(e.id, SCHEMA.VELOCITY, { x: 0, y: 0 })
          registry.addComponent(e.id, SCHEMA.ACCUMULATOR, { ...acc, value: 0 })
        }
        break
      }
    }
  }

  return registry
}

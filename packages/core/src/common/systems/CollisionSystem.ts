import type { Registry } from '../../engine/types.js'
import { SpatialGrid } from '../SpatialGrid.js'

export interface ColliderDef {
  width: number
  height: number
  offsetX?: number
  offsetY?: number
  solid?: boolean
  group?: number
  mask?: number
}

export interface AABB {
  left: number
  top: number
  right: number
  bottom: number
}

const GROUP_ALL = 0xffff

function getAABB(pos: { x: number; y: number }, col: ColliderDef): AABB {
  const ox = col.offsetX ?? 0
  const oy = col.offsetY ?? 0
  const halfW = col.width / 2
  const halfH = col.height / 2
  return {
    left: pos.x + ox - halfW,
    top: pos.y + oy - halfH,
    right: pos.x + ox + halfW,
    bottom: pos.y + oy + halfH,
  }
}

function overlap(a: AABB, b: AABB): { x: number; y: number } | null {
  const overlapX = Math.min(a.right, b.right) - Math.max(a.left, b.left)
  if (overlapX <= 0) return null
  const overlapY = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)
  if (overlapY <= 0) return null
  return { x: overlapX, y: overlapY }
}

function collides(aGroup: number, aMask: number, bGroup: number, bMask: number): boolean {
  return (aGroup & bMask) !== 0 && (bGroup & aMask) !== 0
}

export function collisionSystem(registry: Registry, dt: number): Registry {
  const entities = registry.getEntitiesWith(['Position', 'Collider'])
  if (entities.length < 2) return registry

  const bodies = entities.map(e => {
    const pos = e.Position as { x: number; y: number }
    const col = e.Collider as ColliderDef
    return {
      id: e.id,
      pos,
      col,
      aabb: getAABB(pos, col),
      group: col.group ?? GROUP_ALL,
      mask: col.mask ?? GROUP_ALL,
      solid: col.solid ?? true,
    }
  })

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const b of bodies) {
    if (b.aabb.left < minX) minX = b.aabb.left
    if (b.aabb.top < minY) minY = b.aabb.top
    if (b.aabb.right > maxX) maxX = b.aabb.right
    if (b.aabb.bottom > maxY) maxY = b.aabb.bottom
  }
  const worldW = Math.max(maxX - minX + 1, 1)
  const worldH = Math.max(maxY - minY + 1, 1)
  const cellSize = Math.max(32, Math.ceil(Math.max(worldW, worldH) / Math.max(bodies.length, 1)) * 4)

  const grid = new SpatialGrid(cellSize, worldW, worldH)
  for (const b of bodies) {
    grid.insert(b.id, b.aabb)
  }

  const bodyMap = new Map<number, typeof bodies[0]>()
  for (const b of bodies) {
    bodyMap.set(b.id, b)
  }

  for (const a of bodies) {
    const nearby = grid.getNearbyAABB(a.aabb)
    for (const entry of nearby) {
      const b = bodyMap.get(entry.id)
      if (!b || b.id <= a.id) continue
      if (!a.solid && !b.solid) continue
      if (!collides(a.group, a.mask, b.group, b.mask)) continue

      const ov = overlap(a.aabb, b.aabb)
      if (!ov) continue

      if (a.solid && b.solid) {
        if (ov.x <= ov.y) {
          const sign = a.aabb.left < b.aabb.left ? -1 : 1
          a.pos.x += sign * (ov.x / 2)
          b.pos.x -= sign * (ov.x / 2)
        } else {
          const sign = a.aabb.top < b.aabb.top ? -1 : 1
          a.pos.y += sign * (ov.y / 2)
          b.pos.y -= sign * (ov.y / 2)
        }
        a.aabb = getAABB(a.pos, a.col)
        b.aabb = getAABB(b.pos, b.col)
      } else if (a.solid) {
        if (ov.x <= ov.y) {
          const sign = a.aabb.left < b.aabb.left ? 1 : -1
          b.pos.x += sign * ov.x
        } else {
          const sign = a.aabb.top < b.aabb.top ? 1 : -1
          b.pos.y += sign * ov.y
        }
        b.aabb = getAABB(b.pos, b.col)
      } else {
        if (ov.x <= ov.y) {
          const sign = a.aabb.left < b.aabb.left ? -1 : 1
          a.pos.x += sign * ov.x
        } else {
          const sign = a.aabb.top < b.aabb.top ? -1 : 1
          a.pos.y += sign * ov.y
        }
        a.aabb = getAABB(a.pos, a.col)
      }

      registry.addComponent(a.id, 'Position', { x: a.pos.x, y: a.pos.y })
      registry.addComponent(b.id, 'Position', { x: b.pos.x, y: b.pos.y })
    }
  }

  return registry
}

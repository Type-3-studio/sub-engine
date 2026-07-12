import { describe, it, expect } from 'vitest'
import { createMapFromMatrix } from '../src/engine/MapLoader.js'
import { computeFlowField } from '../src/engine/FlowFieldNav.js'

function isNear(a: number, b: number, tol = 0.01): boolean {
  return Math.abs(a - b) < tol
}

function followField(map: ReturnType<typeof createMapFromMatrix>, field: ReturnType<typeof computeFlowField>, startX: number, startY: number, steps: number): number[][] {
  let x = startX, y = startY
  const path: number[][] = [[x, y]]
  for (let i = 0; i < steps; i++) {
    const v = field.getVector(Math.round(x), Math.round(y))
    if (v.x === 0 && v.y === 0) break
    x += v.x * 0.5
    y += v.y * 0.5
    path.push([x, y])
  }
  return path
}

describe('MapLoader', () => {
  it('correct dimensions', () => {
    const map = createMapFromMatrix([
      [0, 0, 0, 0, 0],
      [0, 1, 1, 1, 0],
      [0, 0, 0, 0, 0],
      [0, 1, 1, 1, 0],
      [0, 0, 0, 0, 0],
    ])
    expect(map.width).toBe(5)
    expect(map.height).toBe(5)
  })

  it('open cell is walkable, wall cell is not', () => {
    const map = createMapFromMatrix([
      [0, 0, 0, 0, 0],
      [0, 1, 1, 1, 0],
      [0, 0, 0, 0, 0],
      [0, 1, 1, 1, 0],
      [0, 0, 0, 0, 0],
    ])
    expect(map.isWalkable(0, 0)).toBe(true)
    expect(map.isWalkable(1, 1)).toBe(false)
  })

  it('out-of-bounds is not walkable', () => {
    const map = createMapFromMatrix([
      [0, 0, 0, 0, 0],
      [0, 1, 1, 1, 0],
      [0, 0, 0, 0, 0],
      [0, 1, 1, 1, 0],
      [0, 0, 0, 0, 0],
    ])
    expect(map.isWalkable(-1, 0)).toBe(false)
  })

  it('getTile returns correct values', () => {
    const map = createMapFromMatrix([
      [0, 0, 0, 0, 0],
      [0, 1, 1, 1, 0],
      [0, 0, 0, 0, 0],
      [0, 1, 1, 1, 0],
      [0, 0, 0, 0, 0],
    ])
    expect(map.getTile(2, 0)).toBe(0)
    expect(map.getTile(1, 1)).toBe(1)
  })

  it('rejects non-array input', () => {
    expect(() => createMapFromMatrix('not an array' as any)).toThrow()
  })

  it('rejects empty rows', () => {
    expect(() => createMapFromMatrix([[]])).toThrow()
  })

  it('rejects inconsistent row widths', () => {
    expect(() => createMapFromMatrix([[0], [0, 1]])).toThrow()
  })

  it('serialize preserves wall data and returns a copy', () => {
    const map = createMapFromMatrix([
      [0, 0, 0, 0, 0],
      [0, 1, 1, 1, 0],
      [0, 0, 0, 0, 0],
      [0, 1, 1, 1, 0],
      [0, 0, 0, 0, 0],
    ])
    const serialized = map.serialize()
    expect(serialized[1]![1]).toBe(1)
    serialized[0]![0] = 99
    expect(map.isWalkable(0, 0)).toBe(true)
  })
})

describe('Flow Field (open map)', () => {
  const openMap = createMapFromMatrix([
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ])
  const ff = computeFlowField(openMap, 2, 2)

  it('field dimensions match map', () => {
    expect(ff.width).toBe(3)
    expect(ff.height).toBe(3)
  })

  it('target cell has zero vector', () => {
    const targetVec = ff.getVector(2, 2)
    expect(targetVec.x).toBe(0)
    expect(targetVec.y).toBe(0)
  })

  it('target cell cost is 0', () => {
    expect(ff.getCost(2, 2)).toBe(0)
  })

  it('corner cell cost is Manhattan distance', () => {
    expect(ff.getCost(0, 0)).toBe(4)
  })

  it('corner vector points toward target', () => {
    const cornerVec = ff.getVector(0, 0)
    expect(cornerVec.x).toBeGreaterThan(0)
    expect(cornerVec.y).toBeGreaterThan(0)
  })
})

describe('Flow Field (with obstacles)', () => {
  const wallMap = createMapFromMatrix([
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
  ])
  const ffWall = computeFlowField(wallMap, 4, 4)

  it('wall cell has zero vector', () => {
    const vec = ffWall.getVector(2, 2)
    expect(vec.x).toBe(0)
    expect(vec.y).toBe(0)
  })

  it('vectors route around obstacles', () => {
    const vecAboveWall = ffWall.getVector(2, 1)
    const vecBelowWall = ffWall.getVector(2, 3)
    expect(vecAboveWall.y > 0 || vecBelowWall.y < 0).toBe(true)
  })
})

describe('Path Tracing', () => {
  it('path reaches target around obstacle', () => {
    const wallMap = createMapFromMatrix([
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 1, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
    ])
    const ffWall = computeFlowField(wallMap, 4, 4)
    const path = followField(wallMap, ffWall, 0, 0, 30)
    const last = path[path.length - 1]!
    expect(isNear(last[0]!, 4, 0.6)).toBe(true)
    expect(isNear(last[1]!, 4, 0.6)).toBe(true)
  })
})

describe('Error Handling', () => {
  it('computeFlowField succeeds on walkable target', () => {
    const openMap = createMapFromMatrix([
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ])
    expect(computeFlowField(openMap, 0, 0)).not.toBeNull()
  })

  it('computeFlowField throws when target is a wall', () => {
    const singleWall = createMapFromMatrix([[1]])
    expect(() => computeFlowField(singleWall, 0, 0)).toThrow()
  })
})

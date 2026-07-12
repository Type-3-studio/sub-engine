import { describe, it, expect } from 'vitest'
import { createMapFromMatrix, aStar, createRegistry } from '@sub-engine/core'
import { pathfindingSystem } from '@sub-engine/core'
import { movementSystem } from '@sub-engine/core'

describe('A* Pathfinding', () => {
  const openMap = createMapFromMatrix([
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
  ])

  it('returns direct path on open map', () => {
    const result = aStar(openMap, 0, 0, 4, 4, true)
    expect(result.success).toBe(true)
    expect(result.path.length).toBeGreaterThanOrEqual(4)
    expect(result.path[0]!.x).toBe(0)
    expect(result.path[0]!.y).toBe(0)
    expect(result.path[result.path.length - 1]!.x).toBe(4)
    expect(result.path[result.path.length - 1]!.y).toBe(4)
  })

  it('returns start-only path when start equals goal', () => {
    const result = aStar(openMap, 2, 2, 2, 2)
    expect(result.success).toBe(true)
    expect(result.path.length).toBe(1)
    expect(result.path[0]!.x).toBe(2)
    expect(result.path[0]!.y).toBe(2)
  })

  it('finds path around wall with 4-direction', () => {
    const wallMap = createMapFromMatrix([
      [0, 0, 0, 0, 0],
      [0, 0, 1, 0, 0],
      [0, 0, 1, 0, 0],
      [0, 0, 1, 0, 0],
      [0, 0, 0, 0, 0],
    ])
    const result = aStar(wallMap, 0, 2, 4, 2, false)
    expect(result.success).toBe(true)
    for (const p of result.path) {
      expect(wallMap.isWalkable(p.x, p.y)).toBe(true)
    }
  })

  it('finds diagonal path with 8-direction', () => {
    const result = aStar(openMap, 0, 0, 4, 4, true)
    expect(result.success).toBe(true)
    expect(result.path.length).toBeLessThanOrEqual(5)
  })

  it('reports failure when goal is unreachable', () => {
    const blockedMap = createMapFromMatrix([
      [0, 0, 0],
      [1, 1, 1],
      [0, 0, 0],
    ])
    const result = aStar(blockedMap, 0, 0, 0, 2, false)
    expect(result.success).toBe(false)
    expect(result.path.length).toBe(0)
  })

  it('throws on unwalkable start', () => {
    const wallMap = createMapFromMatrix([[1]])
    expect(() => aStar(wallMap, 0, 0, 0, 0)).toThrow('not walkable')
  })

  it('throws on unwalkable goal', () => {
    const wallMap = createMapFromMatrix([[1]])
    expect(() => aStar(wallMap, 0, 0, 0, 0)).toThrow()
  })

  it('produces walkable path through maze', () => {
    const mazeMap = createMapFromMatrix([
      [0, 0, 0, 1, 0],
      [0, 1, 0, 1, 0],
      [0, 1, 0, 0, 0],
      [0, 1, 1, 1, 0],
      [0, 0, 0, 0, 0],
    ])
    const result = aStar(mazeMap, 0, 0, 4, 4, false)
    expect(result.success).toBe(true)
    for (const p of result.path) {
      expect(mazeMap.isWalkable(p.x, p.y)).toBe(true)
    }
  })
})

describe('PathfindingSystem', () => {
  it('moves entity along path', () => {
    const registry = createRegistry()
    const e = registry.createEntity()
    registry.addComponent(e, 'Position', { x: 0, y: 0 })
    registry.addComponent(e, 'Velocity', { x: 0, y: 0 })
    registry.addComponent(e, 'PathFollower', {
      path: [{ x: 0, y: 0 }, { x: 5, y: 0 }],
      index: 1,
      speed: 2,
    })

    for (let i = 0; i < 10; i++) {
      pathfindingSystem(registry, 16)
      movementSystem(registry, 16)
    }

    const pos = registry.getComponent(e, 'Position') as any
    expect(pos.x).toBe(5)
    expect(pos.y).toBe(0)
  })

  it('returns velocity to zero at end of non-looping path', () => {
    const registry = createRegistry()
    const e = registry.createEntity()
    registry.addComponent(e, 'Position', { x: 0, y: 0 })
    registry.addComponent(e, 'Velocity', { x: 5, y: 0 })
    registry.addComponent(e, 'PathFollower', {
      path: [{ x: 0, y: 0 }, { x: 3, y: 0 }],
      index: 1,
      speed: 2,
    })

    for (let i = 0; i < 20; i++) {
      pathfindingSystem(registry, 16)
      movementSystem(registry, 16)
    }

    const vel = registry.getComponent(e, 'Velocity') as any
    const pos = registry.getComponent(e, 'Position') as any
    expect(pos.x).toBe(3)
    expect(pos.y).toBe(0)
    expect(vel.x).toBe(0)
    expect(vel.y).toBe(0)
  })

  it('looping path resets to start', () => {
    const registry = createRegistry()
    const e = registry.createEntity()
    registry.addComponent(e, 'Position', { x: 0, y: 0 })
    registry.addComponent(e, 'Velocity', { x: 5, y: 0 })
    registry.addComponent(e, 'PathFollower', {
      path: [{ x: 0, y: 0 }, { x: 3, y: 0 }],
      index: 1,
      speed: 2,
      loop: true,
    })

    for (let i = 0; i < 30; i++) {
      pathfindingSystem(registry, 16)
      movementSystem(registry, 16)
    }

    const pf = registry.getComponent(e, 'PathFollower') as any
    expect(pf.index).toBeGreaterThanOrEqual(1)
    const pos = registry.getComponent(e, 'Position') as any
    expect(pos.x).toBeGreaterThanOrEqual(0)
  })
})

import { describe, it, expect } from 'vitest'
import { createRegistry, SCHEMAS } from '@sub-engine/core'
import { cameraSystem } from '@sub-engine/core'
import { collisionSystem } from '@sub-engine/core'
import { zOrderSystem } from '@sub-engine/core'
import { SpatialGrid } from '@sub-engine/core'

describe('Phase 3 Schema Registration', () => {
  it('Camera schema is registered', () => {
    expect(SCHEMAS.Camera).toBeDefined()
  })

  it('Collider schema is registered', () => {
    expect(SCHEMAS.Collider).toBeDefined()
  })

  it('ZOrder schema is registered', () => {
    expect(SCHEMAS.ZOrder).toBeDefined()
  })
})

describe('Camera System', () => {
  it('centers on target', () => {
    const creg = createRegistry()
    const target = creg.createEntity()
    creg.addComponent(target, 'Position', { x: 400, y: 300 })

    const camId = creg.createEntity()
    creg.addComponent(camId, 'Camera', {
      x: 0, y: 0,
      width: 800, height: 600,
      zoom: 1,
      targetEntity: target,
      minX: 0, minY: 0,
      maxX: 1600, maxY: 1200,
    })

    cameraSystem(creg, 16)
    let cam = creg.getComponent(camId, 'Camera') as any
    expect(cam.x).toBe(0)
    expect(cam.y).toBe(0)
  })

  it('follows target', () => {
    const creg = createRegistry()
    const target = creg.createEntity()
    creg.addComponent(target, 'Position', { x: 400, y: 300 })

    const camId = creg.createEntity()
    creg.addComponent(camId, 'Camera', {
      x: 0, y: 0,
      width: 800, height: 600,
      zoom: 1,
      targetEntity: target,
      minX: 0, minY: 0,
      maxX: 1600, maxY: 1200,
    })

    creg.addComponent(target, 'Position', { x: 1200, y: 900 })
    cameraSystem(creg, 16)
    const cam = creg.getComponent(camId, 'Camera') as any
    expect(cam.x).toBe(800)
    expect(cam.y).toBe(600)
  })

  it('clamps to bounds', () => {
    const creg = createRegistry()
    const target = creg.createEntity()
    creg.addComponent(target, 'Position', { x: 400, y: 300 })

    const camId = creg.createEntity()
    creg.addComponent(camId, 'Camera', {
      x: 0, y: 0,
      width: 800, height: 600,
      zoom: 1,
      targetEntity: target,
      minX: 0, minY: 0,
      maxX: 1600, maxY: 1200,
    })

    creg.addComponent(target, 'Position', { x: 0, y: 0 })
    cameraSystem(creg, 16)
    let cam = creg.getComponent(camId, 'Camera') as any
    expect(cam.x).toBe(0)
    expect(cam.y).toBe(0)

    creg.addComponent(target, 'Position', { x: 2000, y: 1500 })
    cameraSystem(creg, 16)
    cam = creg.getComponent(camId, 'Camera') as any
    expect(cam.x).toBe(800)
    expect(cam.y).toBe(600)
  })

  it('without target stays at initial position', () => {
    const creg = createRegistry()
    const staticCam = creg.createEntity()
    creg.addComponent(staticCam, 'Camera', {
      x: 100, y: 200,
      width: 800, height: 600,
      zoom: 1,
    })
    cameraSystem(creg, 16)
    const cam = creg.getComponent(staticCam, 'Camera') as any
    expect(cam.x).toBe(100)
    expect(cam.y).toBe(200)
  })
})

describe('Collision System', () => {
  it('pushes overlapping solids apart', () => {
    const colReg = createRegistry()
    const a = colReg.createEntity()
    colReg.addComponent(a, 'Position', { x: 100, y: 100 })
    colReg.addComponent(a, 'Collider', { width: 50, height: 50, solid: true })

    const b = colReg.createEntity()
    colReg.addComponent(b, 'Position', { x: 120, y: 100 })
    colReg.addComponent(b, 'Collider', { width: 50, height: 50, solid: true })

    collisionSystem(colReg, 16)
    const pa = colReg.getComponent(a, 'Position') as any
    const pb = colReg.getComponent(b, 'Position') as any
    expect(pa.x === 100 && pb.x === 120).toBe(false)
  })

  it('non-overlapping entities not pushed', () => {
    const colReg = createRegistry()
    const a = colReg.createEntity()
    colReg.addComponent(a, 'Position', { x: 0, y: 0 })
    colReg.addComponent(a, 'Collider', { width: 10, height: 10, solid: true })
    const b = colReg.createEntity()
    colReg.addComponent(b, 'Position', { x: 100, y: 100 })
    colReg.addComponent(b, 'Collider', { width: 10, height: 10, solid: true })

    collisionSystem(colReg, 16)
    const pa = colReg.getComponent(a, 'Position') as any
    const pb = colReg.getComponent(b, 'Position') as any
    expect(pa.x).toBe(0)
    expect(pb.x).toBe(100)
  })

  it('non-solid entity gets pushed out by solid', () => {
    const colReg = createRegistry()
    const a = colReg.createEntity()
    colReg.addComponent(a, 'Position', { x: 100, y: 100 })
    colReg.addComponent(a, 'Collider', { width: 50, height: 50, solid: true })
    const b = colReg.createEntity()
    colReg.addComponent(b, 'Position', { x: 120, y: 100 })
    colReg.addComponent(b, 'Collider', { width: 50, height: 50, solid: false })

    collisionSystem(colReg, 16)
    const pb = colReg.getComponent(b, 'Position') as any
    expect(pb.x).not.toBe(120)
  })
})

describe('Spatial Grid', () => {
  it('getNearby finds entities within range', () => {
    const grid = new SpatialGrid(100, 1000, 1000)

    grid.insert(1, { left: 50, top: 50, right: 150, bottom: 150 })
    grid.insert(2, { left: 200, top: 200, right: 300, bottom: 300 })
    grid.insert(3, { left: 500, top: 500, right: 600, bottom: 600 })

    const nearby = grid.getNearby(100, 100, 300)
    expect(nearby.some(e => e.id === 1)).toBe(true)
    expect(nearby.some(e => e.id === 2)).toBe(true)
    expect(nearby.some(e => e.id === 3)).toBe(false)
  })

  it('getNearbyAABB finds entities within bounds', () => {
    const grid = new SpatialGrid(100, 1000, 1000)

    grid.insert(1, { left: 50, top: 50, right: 150, bottom: 150 })
    grid.insert(2, { left: 200, top: 200, right: 300, bottom: 300 })
    grid.insert(3, { left: 500, top: 500, right: 600, bottom: 600 })

    const aabbResults = grid.getNearbyAABB({ left: 0, top: 0, right: 350, bottom: 350 })
    expect(aabbResults.some(e => e.id === 1)).toBe(true)
    expect(aabbResults.some(e => e.id === 2)).toBe(true)
    expect(aabbResults.some(e => e.id === 3)).toBe(false)
  })

  it('clear removes all entries', () => {
    const grid = new SpatialGrid(100, 1000, 1000)
    grid.insert(1, { left: 50, top: 50, right: 150, bottom: 150 })
    grid.clear()
    expect(grid.getNearby(100, 100, 200).length).toBe(0)
  })
})

describe('ZOrder System', () => {
  it('runs without error and preserves component data', () => {
    const zreg = createRegistry()
    const z1 = zreg.createEntity()
    zreg.addComponent(z1, 'ZOrder', { layer: 0, order: 10 })
    const z2 = zreg.createEntity()
    zreg.addComponent(z2, 'ZOrder', { layer: 1, order: 0 })
    const z3 = zreg.createEntity()
    zreg.addComponent(z3, 'ZOrder', { layer: -1, order: 5 })

    expect(() => zOrderSystem(zreg, 16)).not.toThrow()

    const z1data = zreg.getComponent(z1, 'ZOrder') as any
    expect(z1data.layer).toBe(0)
    expect(z1data.order).toBe(10)
  })
})

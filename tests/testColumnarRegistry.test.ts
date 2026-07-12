import { describe, it, expect } from 'vitest'
import { createColumnarRegistry, schemaExists } from '../src/engine/index.js'
import { createEntity } from '../src/common/createEntity.js'

describe('Schema Validation', () => {
  it('built-in schemas exist', () => {
    expect(schemaExists('Position')).toBe(true)
    expect(schemaExists('Velocity')).toBe(true)
    expect(schemaExists('Health')).toBe(true)
  })
})

describe('Registry Lifecycle', () => {
  it('fresh registry has 0 entities', () => {
    const reg = createColumnarRegistry()
    expect(reg.entityCount()).toBe(0)
  })

  it('createEntity returns positive integer', () => {
    const reg = createColumnarRegistry()
    const e1 = reg.createEntity()
    expect(typeof e1).toBe('number')
    expect(e1).toBeGreaterThan(0)
  })

  it('entities get unique IDs', () => {
    const reg = createColumnarRegistry()
    const e1 = reg.createEntity()
    const e2 = reg.createEntity()
    expect(e2).not.toBe(e1)
  })

  it('entityCount reflects creation', () => {
    const reg = createColumnarRegistry()
    reg.createEntity()
    reg.createEntity()
    expect(reg.entityCount()).toBe(2)
  })

  it('entityExists works', () => {
    const reg = createColumnarRegistry()
    const e1 = reg.createEntity()
    expect(reg.entityExists(e1)).toBe(true)
    expect(reg.entityExists(999)).toBe(false)
  })
})

describe('Add / Get Components', () => {
  it('stores and retrieves component data', () => {
    const reg = createColumnarRegistry()
    const e1 = reg.createEntity()
    reg.addComponent(e1, 'Position', { x: 10, y: 20 })
    const pos = reg.getComponent(e1, 'Position')
    expect(pos!.x).toBe(10)
    expect(pos!.y).toBe(20)
  })

  it('Health component stores correctly', () => {
    const reg = createColumnarRegistry()
    const e1 = reg.createEntity()
    reg.addComponent(e1, 'Health', { current: 100, max: 100 })
    const hp = reg.getComponent(e1, 'Health')
    expect(hp!.current).toBe(100)
  })

  it('hasComponent works', () => {
    const reg = createColumnarRegistry()
    const e1 = reg.createEntity()
    reg.addComponent(e1, 'Position', { x: 0, y: 0 })
    expect(reg.hasComponent(e1, 'Position')).toBe(true)
    expect(reg.hasComponent(e1, 'Velocity')).toBe(false)
  })
})

describe('Validation', () => {
  it('rejects missing required field', () => {
    const reg = createColumnarRegistry()
    const e1 = reg.createEntity()
    expect(() => reg.addComponent(e1, 'Position', {} as any)).toThrow()
  })

  it('rejects wrong type', () => {
    const reg = createColumnarRegistry()
    const e1 = reg.createEntity()
    expect(() => reg.addComponent(e1, 'Position', { x: 'abc', y: 0 } as any)).toThrow()
  })

  it('rejects unregistered name', () => {
    const reg = createColumnarRegistry()
    const e1 = reg.createEntity()
    expect(() => reg.addComponent(e1, 'UnknownComp', {})).toThrow()
  })

  it('rejects non-existent entity', () => {
    const reg = createColumnarRegistry()
    expect(() => reg.addComponent(999, 'Position', { x: 0, y: 0 })).toThrow()
  })
})

describe('Remove Components', () => {
  it('removeComponent works', () => {
    const reg = createColumnarRegistry()
    const e1 = reg.createEntity()
    reg.addComponent(e1, 'Health', { current: 100, max: 100 })
    reg.removeComponent(e1, 'Health')
    expect(reg.hasComponent(e1, 'Health')).toBe(false)
  })

  it('other components remain', () => {
    const reg = createColumnarRegistry()
    const e1 = reg.createEntity()
    reg.addComponent(e1, 'Position', { x: 0, y: 0 })
    reg.addComponent(e1, 'Health', { current: 100, max: 100 })
    reg.removeComponent(e1, 'Health')
    expect(reg.hasComponent(e1, 'Position')).toBe(true)
  })

  it('removeComponent throws on already-removed', () => {
    const reg = createColumnarRegistry()
    const e1 = reg.createEntity()
    reg.addComponent(e1, 'Health', { current: 100, max: 100 })
    reg.removeComponent(e1, 'Health')
    expect(() => reg.removeComponent(e1, 'Health')).toThrow()
  })

  it('removeComponent throws on non-existent entity', () => {
    const reg = createColumnarRegistry()
    expect(() => reg.removeComponent(999, 'Position')).toThrow()
  })
})

describe('Queries', () => {
  it('getEntitiesWith single name', () => {
    const reg = createColumnarRegistry()
    const e1 = reg.createEntity()
    reg.addComponent(e1, 'Position', { x: 10, y: 20 })
    reg.createEntity()
    reg.createEntity()
    const e3 = reg.createEntity()
    reg.addComponent(e3, 'Position', { x: 5, y: 5 })
    reg.addComponent(e3, 'Velocity', { x: 1, y: 0 })
    const e4 = reg.createEntity()
    reg.addComponent(e4, 'Position', { x: 0, y: 0 })
    reg.addComponent(e4, 'Health', { current: 50, max: 50 })
    expect(reg.getEntitiesWith('Position').length).toBe(3)
  })

  it('getEntitiesWith multiple names', () => {
    const reg = createColumnarRegistry()
    const e3 = reg.createEntity()
    reg.addComponent(e3, 'Position', { x: 5, y: 5 })
    reg.addComponent(e3, 'Velocity', { x: 1, y: 0 })
    reg.createEntity()
    const results = reg.getEntitiesWith(['Position', 'Velocity'])
    expect(results.length).toBe(1)
    expect(results[0]!.id).toBe(e3)
    expect((results[0] as any).Position.x).toBe(5)
    expect((results[0] as any).Velocity.x).toBe(1)
  })

  it('3-name query matches nothing', () => {
    const reg = createColumnarRegistry()
    reg.createEntity()
    reg.createEntity()
    const e3 = reg.createEntity()
    reg.addComponent(e3, 'Position', { x: 5, y: 5 })
    reg.addComponent(e3, 'Velocity', { x: 1, y: 0 })
    reg.createEntity()
    expect(reg.getEntitiesWith(['Position', 'Health', 'Velocity']).length).toBe(0)
  })
})

describe('Snapshot', () => {
  it('getAllEntities returns array with correct count', () => {
    const reg = createColumnarRegistry()
    reg.createEntity()
    reg.createEntity()
    reg.createEntity()
    reg.createEntity()
    expect(Array.isArray(reg.getAllEntities())).toBe(true)
    expect(reg.getAllEntities().length).toBe(4)
  })
})

describe('Remove Entity', () => {
  it('removeEntity works and updates count', () => {
    const reg = createColumnarRegistry()
    const e1 = reg.createEntity()
    const e2 = reg.createEntity()
    reg.createEntity()
    reg.removeEntity(e2)
    expect(reg.entityExists(e2)).toBe(false)
    expect(reg.entityCount()).toBe(2)
  })

  it('removeEntity throws on already-removed', () => {
    const reg = createColumnarRegistry()
    const e1 = reg.createEntity()
    reg.removeEntity(e1)
    expect(() => reg.removeEntity(e1)).toThrow()
  })
})

describe('Clear', () => {
  it('clear removes all and resets ID', () => {
    const reg = createColumnarRegistry()
    reg.createEntity()
    reg.createEntity()
    reg.createEntity()
    expect(reg.entityCount()).toBe(3)
    reg.clear()
    expect(reg.entityCount()).toBe(0)
    expect(reg.createEntity()).toBe(1)
  })
})

describe('Events', () => {
  it('entity:created fires', () => {
    const ereg = createColumnarRegistry()
    const events: string[] = []
    ereg.on('entity:created', (e) => events.push(`created:${e.entityId}`))
    ereg.createEntity()
    ereg.createEntity()
    expect(events.length).toBe(2)
  })

  it('component:added fires', () => {
    const ereg = createColumnarRegistry()
    const events: string[] = []
    ereg.on('entity:created', (e) => events.push(`created:${e.entityId}`))
    const ee1 = ereg.createEntity()
    ereg.on('component:added', (e) => events.push(`added:${e.entityId}:${e.componentName}`))
    ereg.addComponent(ee1, 'Position', { x: 1, y: 2 })
    expect(events[events.length - 1]).toBe(`added:${ee1}:Position`)
  })

  it('component:changed fires on overwrite', () => {
    const ereg = createColumnarRegistry()
    const ee1 = ereg.createEntity()
    ereg.addComponent(ee1, 'Position', { x: 1, y: 2 })
    let changedEvent: any = null
    ereg.on('component:changed', (e) => { changedEvent = { id: e.entityId, name: e.componentName } })
    ereg.addComponent(ee1, 'Position', { x: 5, y: 5 })
    expect(changedEvent).not.toBeNull()
    expect(changedEvent!.id).toBe(ee1)
    expect(changedEvent!.name).toBe('Position')
  })

  it('entity:removed fires', () => {
    const ereg = createColumnarRegistry()
    const ee1 = ereg.createEntity()
    let removedId: number | null = null
    ereg.on('entity:removed', (e) => { removedId = e.entityId })
    ereg.removeEntity(ee1)
    expect(removedId).toBe(ee1)
  })

  it('component:removed fires', () => {
    const ereg = createColumnarRegistry()
    const ee1 = ereg.createEntity()
    ereg.addComponent(ee1, 'Position', { x: 1, y: 2 })
    let removedComp: any = null
    ereg.on('component:removed', (e) => { removedComp = { id: e.entityId, name: e.componentName } })
    ereg.removeComponent(ee1, 'Position')
    expect(removedComp).not.toBeNull()
    expect(removedComp!.id).toBe(ee1)
    expect(removedComp!.name).toBe('Position')
  })

  it('off() removes listener', () => {
    const ereg = createColumnarRegistry()
    let offCount = 0
    const offFn = () => { offCount++ }
    ereg.on('entity:created', offFn)
    ereg.off('entity:created', offFn)
    ereg.createEntity()
    expect(offCount).toBe(0)
  })
})

describe('Serialize / Deserialize', () => {
  it('serialize and deserialize round-trip', () => {
    const sreg = createColumnarRegistry()
    const se1 = sreg.createEntity()
    sreg.addComponent(se1, 'Position', { x: 10, y: 20 })
    sreg.addComponent(se1, 'Health', { current: 75, max: 100 })
    sreg.createEntity()
    sreg.addComponent(se1, 'Velocity', { x: -1, y: 0.5 })

    const serial = sreg.serialize()
    expect(serial.version).toBe(1)
    expect(serial.entities.length).toBe(2)

    const sreg2 = createColumnarRegistry()
    sreg2.deserialize(serial)
    expect(sreg2.entityCount()).toBe(2)
    const p1 = sreg2.getComponent(se1, 'Position')
    expect(p1).toBeDefined()
    expect((p1 as any).x).toBe(10)
    expect(JSON.stringify(serial)).toBe(JSON.stringify(sreg2.serialize()))
  })
})

describe('createEntity Factory', () => {
  it('creates entity with components', () => {
    const freg = createColumnarRegistry()
    const fid = createEntity(freg, { Position: { x: 100, y: 200 }, Health: { current: 50, max: 50 } })
    expect(typeof fid).toBe('number')
    expect(fid).toBeGreaterThan(0)
    expect(freg.entityExists(fid)).toBe(true)
    const fpos = freg.getComponent(fid, 'Position')
    expect(fpos).toBeDefined()
    expect((fpos as any).x).toBe(100)
  })

  it('validates required fields', () => {
    const freg = createColumnarRegistry()
    expect(() => createEntity(freg, { Position: {} as any })).toThrow()
  })
})

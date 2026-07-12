import { describe, it, expect, beforeEach } from 'vitest'
import { createRegistry, registerSchema, defineSchema, validateAllSchemas, schemaExists, SCHEMAS } from '@sub-engine/core'
import { createEntity } from '@sub-engine/core'
import { createGameLoop } from '@sub-engine/core'

describe('Schema Validation', () => {
  it('built-in schemas are registered', () => {
    expect(SCHEMAS.Position).toBeDefined()
    expect(SCHEMAS.Velocity).toBeDefined()
    expect(SCHEMAS.Health).toBeDefined()
    expect(SCHEMAS.TargetScanner).toBeDefined()
    expect(SCHEMAS.Camera).toBeDefined()
    expect(SCHEMAS.Collider).toBeDefined()
    expect(SCHEMAS.ZOrder).toBeDefined()
  })

  it('registerSchema rejects duplicate names', () => {
    expect(() => registerSchema('Position', { x: { type: 'number', required: true } })).toThrow()
  })

  it('registerSchema rejects unknown types', () => {
    expect(() => registerSchema('BadType', { f: { type: 'unknown' as any, required: true } })).toThrow()
  })

  it('registerSchema rejects empty name', () => {
    expect(() => registerSchema('', { f: { type: 'number', required: true } })).toThrow()
  })

  it('can register a custom schema', () => {
    expect(() => registerSchema('Tag', {})).not.toThrow()
  })
})

describe('Object Schema Type', () => {
  it('accepts object data for object-typed fields', () => {
    registerSchema('WithObject', {
      nested: { type: 'object', required: true },
      label: { type: 'string', required: true },
    })
    const reg = createRegistry()
    const e = reg.createEntity()
    expect(() => reg.addComponent(e, 'WithObject', { nested: { a: 1, b: 2 }, label: 'test' })).not.toThrow()
  })

  it('rejects non-object data for object-typed fields', () => {
    const reg = createRegistry()
    const e = reg.createEntity()
    expect(() => reg.addComponent(e, 'WithObject', { nested: 'not-an-object', label: 'test' } as any)).toThrow()
  })

  it('rejects null for required object field', () => {
    const reg = createRegistry()
    const e = reg.createEntity()
    expect(() => reg.addComponent(e, 'WithObject', { nested: null, label: 'test' } as any)).toThrow()
  })

  it('rejects array for object-typed field', () => {
    const reg = createRegistry()
    const e = reg.createEntity()
    expect(() => reg.addComponent(e, 'WithObject', { nested: [1, 2, 3], label: 'test' } as any)).toThrow()
  })
})

describe('Any Schema Type', () => {
  it('accepts all data types for any-typed fields', () => {
    registerSchema('WithAny', {
      flexible: { type: 'any', required: true },
    })
    const reg = createRegistry()
    const e = reg.createEntity()
    expect(() => reg.addComponent(e, 'WithAny', { flexible: 42 })).not.toThrow()
    reg.removeComponent(e, 'WithAny')
    expect(() => reg.addComponent(e, 'WithAny', { flexible: 'hello' })).not.toThrow()
    reg.removeComponent(e, 'WithAny')
    expect(() => reg.addComponent(e, 'WithAny', { flexible: { a: 1 } })).not.toThrow()
    reg.removeComponent(e, 'WithAny')
    expect(() => reg.addComponent(e, 'WithAny', { flexible: [1, 2, 3] })).not.toThrow()
    reg.removeComponent(e, 'WithAny')
    expect(() => reg.addComponent(e, 'WithAny', { flexible: true })).not.toThrow()
  })

  it('accepts any for optional fields', () => {
    registerSchema('OptionalAny', {
      maybe: { type: 'any', required: false },
    })
    const reg = createRegistry()
    const e = reg.createEntity()
    expect(() => reg.addComponent(e, 'OptionalAny', {})).not.toThrow()
    expect(() => reg.addComponent(e, 'OptionalAny', { maybe: 'anything' })).not.toThrow()
    reg.removeComponent(e, 'OptionalAny')
    expect(() => reg.addComponent(e, 'OptionalAny', { maybe: null })).not.toThrow()
  })
})

describe('defineSchema type-safe wrapper', () => {
  it('registers schema and returns RegisteredSchema', () => {
    const schema = defineSchema<{ name: string; count: number }>('DefineTest1', {
      name: { type: 'string', required: true },
      count: { type: 'number', required: true },
    })
    expect(schema.name).toBe('DefineTest1')
    expect(schema.fields.name).toEqual({ type: 'string', required: true })
  })

  it('works with optional fields', () => {
    defineSchema<{ id: number; tag?: string }>('DefineTest2', {
      id: { type: 'number', required: true },
      tag: { type: 'string', required: false },
    })
    expect(schemaExists('DefineTest2')).toBe(true)
  })

  it('validates at runtime like registerSchema (rejects bad data)', () => {
    defineSchema<{ value: number }>('DefineTest3', {
      value: { type: 'number', required: true },
    })
    const reg = createRegistry()
    const e = reg.createEntity()
    expect(() => reg.addComponent(e, 'DefineTest3', { value: 'not-a-number' } as any)).toThrow()
  })
})

describe('Registry Lifecycle', () => {
  it('fresh registry has 0 entities', () => {
    const reg = createRegistry()
    expect(reg.entityCount()).toBe(0)
  })

  it('createEntity returns a positive integer', () => {
    const reg = createRegistry()
    const e1 = reg.createEntity()
    expect(typeof e1).toBe('number')
    expect(e1).toBeGreaterThan(0)
  })

  it('each entity gets a unique ID', () => {
    const reg = createRegistry()
    const e1 = reg.createEntity()
    const e2 = reg.createEntity()
    expect(e2).not.toBe(e1)
  })

  it('entityCount reflects creation', () => {
    const reg = createRegistry()
    reg.createEntity()
    reg.createEntity()
    expect(reg.entityCount()).toBe(2)
  })

  it('entityExists returns true for created entities', () => {
    const reg = createRegistry()
    const e1 = reg.createEntity()
    expect(reg.entityExists(e1)).toBe(true)
  })

  it('entityExists returns false for non-existent entities', () => {
    const reg = createRegistry()
    expect(reg.entityExists(999)).toBe(false)
  })
})

describe('Add / Get Components', () => {
  it('addComponent + getComponent stores and retrieves Position', () => {
    const reg = createRegistry()
    const e1 = reg.createEntity()
    reg.addComponent(e1, 'Position', { x: 10, y: 20 })
    const pos = reg.getComponent(e1, 'Position')
    expect(pos!.x).toBe(10)
    expect(pos!.y).toBe(20)
  })

  it('Health component stored correctly', () => {
    const reg = createRegistry()
    const e1 = reg.createEntity()
    reg.addComponent(e1, 'Health', { current: 100, max: 100 })
    const hp = reg.getComponent(e1, 'Health')
    expect(hp!.current).toBe(100)
  })

  it('hasComponent returns true for existing component', () => {
    const reg = createRegistry()
    const e1 = reg.createEntity()
    reg.addComponent(e1, 'Position', { x: 0, y: 0 })
    expect(reg.hasComponent(e1, 'Position')).toBe(true)
  })

  it('hasComponent returns false for missing component', () => {
    const reg = createRegistry()
    const e1 = reg.createEntity()
    expect(reg.hasComponent(e1, 'Velocity')).toBe(false)
  })
})

describe('Add Validation', () => {
  it('rejects missing required field', () => {
    const reg = createRegistry()
    const e1 = reg.createEntity()
    expect(() => reg.addComponent(e1, 'Position', {} as any)).toThrow()
  })

  it('rejects wrong field type', () => {
    const reg = createRegistry()
    const e1 = reg.createEntity()
    expect(() => reg.addComponent(e1, 'Position', { x: 'abc', y: 0 } as any)).toThrow()
  })

  it('rejects unregistered component name', () => {
    const reg = createRegistry()
    const e1 = reg.createEntity()
    expect(() => reg.addComponent(e1, 'UnknownComp', {})).toThrow()
  })

  it('rejects null data', () => {
    const reg = createRegistry()
    const e1 = reg.createEntity()
    expect(() => reg.addComponent(e1, 'Position', null as any)).toThrow()
  })

  it('rejects addComponent on non-existent entity', () => {
    const reg = createRegistry()
    expect(() => reg.addComponent(999, 'Position', { x: 0, y: 0 })).toThrow()
  })
})

describe('Remove Components', () => {
  it('removeComponent removes the component', () => {
    const reg = createRegistry()
    const e1 = reg.createEntity()
    reg.addComponent(e1, 'Health', { current: 100, max: 100 })
    reg.removeComponent(e1, 'Health')
    expect(reg.hasComponent(e1, 'Health')).toBe(false)
  })

  it('other components remain intact after removal', () => {
    const reg = createRegistry()
    const e1 = reg.createEntity()
    reg.addComponent(e1, 'Position', { x: 0, y: 0 })
    reg.addComponent(e1, 'Health', { current: 100, max: 100 })
    reg.removeComponent(e1, 'Health')
    expect(reg.hasComponent(e1, 'Position')).toBe(true)
  })

  it('removeComponent throws removing already-removed component', () => {
    const reg = createRegistry()
    const e1 = reg.createEntity()
    reg.addComponent(e1, 'Health', { current: 100, max: 100 })
    reg.removeComponent(e1, 'Health')
    expect(() => reg.removeComponent(e1, 'Health')).toThrow()
  })

  it('removeComponent throws on non-existent entity', () => {
    const reg = createRegistry()
    expect(() => reg.removeComponent(999, 'Position')).toThrow()
  })
})

describe('Queries', () => {
  it('getEntitiesWith single name returns correct count', () => {
    const reg = createRegistry()
    const e1 = reg.createEntity()
    reg.addComponent(e1, 'Position', { x: 10, y: 20 })
    const e2 = reg.createEntity()
    reg.addComponent(e2, 'Position', { x: 0, y: 0 })
    const e3 = reg.createEntity()
    reg.addComponent(e3, 'Position', { x: 5, y: 5 })
    expect(reg.getEntitiesWith('Position').length).toBe(3)
  })

  it('getEntitiesWith multiple names returns correct count', () => {
    const reg = createRegistry()
    const e1 = reg.createEntity()
    reg.addComponent(e1, 'Position', { x: 10, y: 20 })
    const e2 = reg.createEntity()
    reg.addComponent(e2, 'Position', { x: 0, y: 0 })
    const e3 = reg.createEntity()
    reg.addComponent(e3, 'Position', { x: 5, y: 5 })
    reg.addComponent(e3, 'Velocity', { x: 1, y: 0 })
    const results = reg.getEntitiesWith(['Position', 'Velocity'])
    expect(results.length).toBe(1)
    expect(results[0]!.id).toBe(e3)
  })

  it('matched entity includes all requested components', () => {
    const reg = createRegistry()
    const e3 = reg.createEntity()
    reg.addComponent(e3, 'Position', { x: 5, y: 5 })
    reg.addComponent(e3, 'Velocity', { x: 1, y: 0 })
    const results = reg.getEntitiesWith(['Position', 'Velocity'])
    expect((results[0] as any).Position.x).toBe(5)
    expect((results[0] as any).Velocity.x).toBe(1)
  })

  it('query with three components matches nothing when no entity has all', () => {
    const reg = createRegistry()
    const e1 = reg.createEntity()
    reg.addComponent(e1, 'Position', { x: 10, y: 20 })
    const e2 = reg.createEntity()
    reg.addComponent(e2, 'Position', { x: 0, y: 0 })
    reg.addComponent(e2, 'Health', { current: 50, max: 50 })
    const e3 = reg.createEntity()
    reg.addComponent(e3, 'Position', { x: 5, y: 5 })
    reg.addComponent(e3, 'Velocity', { x: 1, y: 0 })
    expect(reg.getEntitiesWith(['Position', 'Health', 'Velocity']).length).toBe(0)
  })
})

describe('Snapshot', () => {
  it('getAllEntities returns an array', () => {
    const reg = createRegistry()
    reg.createEntity()
    expect(Array.isArray(reg.getAllEntities())).toBe(true)
  })

  it('snapshot has all entities', () => {
    const reg = createRegistry()
    reg.createEntity()
    reg.createEntity()
    reg.createEntity()
    reg.createEntity()
    expect(reg.getAllEntities().length).toBe(4)
  })

  it('snapshot is JSON-serializable', () => {
    const reg = createRegistry()
    const e1 = reg.createEntity()
    reg.addComponent(e1, 'Position', { x: 10, y: 20 })
    const json = JSON.stringify(reg.getAllEntities())
    expect(typeof json).toBe('string')
    expect(json).toContain('"id"')
    expect(json).toContain('"Position"')
  })

  it('snapshot returns deep copies (mutating snapshot does not affect registry)', () => {
    const reg = createRegistry()
    const e1 = reg.createEntity()
    reg.addComponent(e1, 'Position', { x: 10, y: 20 })
    const snapshot = reg.getAllEntities()
    snapshot[0]!.Position!.x = 999
    const posAfter = reg.getComponent(e1, 'Position')
    expect(posAfter!.x).toBe(10)
  })
})

describe('Remove Entity', () => {
  it('removeEntity removes entity', () => {
    const reg = createRegistry()
    const e1 = reg.createEntity()
    reg.removeEntity(e1)
    expect(reg.entityExists(e1)).toBe(false)
  })

  it('entityCount updated after removal', () => {
    const reg = createRegistry()
    reg.createEntity()
    const e2 = reg.createEntity()
    reg.createEntity()
    reg.removeEntity(e2)
    expect(reg.entityCount()).toBe(2)
  })

  it('removeEntity throws on already-removed entity', () => {
    const reg = createRegistry()
    const e1 = reg.createEntity()
    reg.removeEntity(e1)
    expect(() => reg.removeEntity(e1)).toThrow()
  })

  it('addComponent throws on removed entity', () => {
    const reg = createRegistry()
    const e1 = reg.createEntity()
    reg.removeEntity(e1)
    expect(() => reg.addComponent(e1, 'Position', { x: 0, y: 0 })).toThrow()
  })
})

describe('Clear', () => {
  it('clear removes all entities', () => {
    const reg = createRegistry()
    reg.createEntity()
    reg.createEntity()
    reg.createEntity()
    reg.clear()
    expect(reg.entityCount()).toBe(0)
  })

  it('clear resets ID counter to 1', () => {
    const reg = createRegistry()
    reg.createEntity()
    reg.createEntity()
    reg.clear()
    expect(reg.createEntity()).toBe(1)
  })
})

describe('Event System', () => {
  it('entity:created fires on createEntity', () => {
    const ereg = createRegistry()
    const events: string[] = []
    ereg.on('entity:created', (e) => events.push(`created:${e.entityId}`))
    const ee1 = ereg.createEntity()
    expect(events.length).toBe(1)
    expect(events[0]).toBe(`created:${ee1}`)
  })

  it('entity:created fires for each creation', () => {
    const ereg = createRegistry()
    const events: string[] = []
    ereg.on('entity:created', (e) => events.push(`created:${e.entityId}`))
    ereg.createEntity()
    ereg.createEntity()
    expect(events.length).toBe(2)
  })

  it('component:added fires on addComponent', () => {
    const ereg = createRegistry()
    const events: string[] = []
    ereg.on('entity:created', (e) => events.push(`created:${e.entityId}`))
    const ee1 = ereg.createEntity()
    ereg.on('component:added', (e) => events.push(`added:${e.entityId}:${e.componentName}`))
    ereg.addComponent(ee1, 'Position', { x: 1, y: 2 })
    expect(events[events.length - 1]).toBe(`added:${ee1}:Position`)
  })

  it('component:changed fires when overwriting', () => {
    const ereg = createRegistry()
    const ee1 = ereg.createEntity()
    ereg.addComponent(ee1, 'Position', { x: 1, y: 2 })
    let changedEvent: any = null
    ereg.on('component:changed', (e) => { changedEvent = { id: e.entityId, name: e.componentName } })
    ereg.addComponent(ee1, 'Position', { x: 5, y: 5 })
    expect(changedEvent).not.toBeNull()
    expect(changedEvent!.id).toBe(ee1)
    expect(changedEvent!.name).toBe('Position')
  })

  it('entity:removed fires on removeEntity', () => {
    const ereg = createRegistry()
    const ee1 = ereg.createEntity()
    let removedEntityId: number | null = null
    ereg.on('entity:removed', (e) => { removedEntityId = e.entityId })
    ereg.removeEntity(ee1)
    expect(removedEntityId).toBe(ee1)
  })

  it('component:removed fires on removeComponent', () => {
    const ereg = createRegistry()
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
    const ereg = createRegistry()
    let offCount = 0
    const offFn = () => { offCount++ }
    ereg.on('entity:created', offFn)
    ereg.off('entity:created', offFn)
    ereg.createEntity()
    expect(offCount).toBe(0)
  })
})

describe('Serialize / Deserialize', () => {
  it('fresh registry serializes to version 1 with empty entities', () => {
    const sreg = createRegistry()
    const serial = sreg.serialize()
    expect(serial.version).toBe(1)
    expect(Array.isArray(serial.entities)).toBe(true)
    expect(serial.entities.length).toBe(0)
  })

  it('serialize captures all entities', () => {
    const sreg = createRegistry()
    const se1 = sreg.createEntity()
    sreg.addComponent(se1, 'Position', { x: 10, y: 20 })
    sreg.addComponent(se1, 'Health', { current: 75, max: 100 })
    sreg.createEntity()
    const serial = sreg.serialize()
    expect(serial.entities.length).toBe(2)
    expect(serial.nextId).toBeGreaterThan(1)
  })

  it('deserialize restores entity count and component data', () => {
    const sreg = createRegistry()
    const se1 = sreg.createEntity()
    sreg.addComponent(se1, 'Position', { x: 10, y: 20 })
    sreg.addComponent(se1, 'Health', { current: 75, max: 100 })
    const se2 = sreg.createEntity()
    sreg.addComponent(se2, 'Velocity', { x: -1, y: 0.5 })
    const serial = sreg.serialize()

    const sreg2 = createRegistry()
    sreg2.deserialize(serial)
    expect(sreg2.entityCount()).toBe(2)
    const p1 = sreg2.getComponent(se1, 'Position')
    expect(p1).toBeDefined()
    expect((p1 as any).x).toBe(10)
    const h1 = sreg2.getComponent(se1, 'Health')
    expect(h1).toBeDefined()
    expect((h1 as any).current).toBe(75)
  })

  it('round-trip serialize → deserialize → serialize preserves all data exactly', () => {
    const sreg = createRegistry()
    const se1 = sreg.createEntity()
    sreg.addComponent(se1, 'Position', { x: 10, y: 20 })
    sreg.addComponent(se1, 'Health', { current: 75, max: 100 })
    const se2 = sreg.createEntity()
    sreg.addComponent(se2, 'Velocity', { x: -1, y: 0.5 })
    const serial = sreg.serialize()

    const sreg2 = createRegistry()
    sreg2.deserialize(serial)
    const serial2 = sreg2.serialize()
    expect(JSON.stringify(serial)).toBe(JSON.stringify(serial2))
  })

  it('deserialize validates schemas — throws on unknown component', () => {
    const sreg = createRegistry()
    const corrupt = { version: 1, entities: [{ id: 1, components: { UnknownComp: { x: 1 } } }], nextId: 2 }
    expect(() => sreg.deserialize(corrupt as any)).toThrow()
  })
})

describe('Schema Validation Helpers', () => {
  it('schemaExists returns true for registered schema', () => {
    expect(schemaExists('Position')).toBe(true)
  })

  it('schemaExists returns false for unregistered schema', () => {
    expect(schemaExists('NonExistent')).toBe(false)
  })

  it('validateAllSchemas does not throw when all exist', () => {
    expect(() => validateAllSchemas(['Position', 'Velocity'])).not.toThrow()
  })

  it('validateAllSchemas throws on missing schemas', () => {
    expect(() => validateAllSchemas(['Position', 'MadeUpSchema'])).toThrow(/MadeUpSchema/)
  })
})

describe('createEntity Factory', () => {
  it('returns a valid entity ID and stores components', () => {
    const freg = createRegistry()
    const fid = createEntity(freg, {
      Position: { x: 100, y: 200 },
      Health: { current: 50, max: 50 },
    })
    expect(typeof fid).toBe('number')
    expect(fid).toBeGreaterThan(0)
    expect(freg.entityExists(fid)).toBe(true)
    const fpos = freg.getComponent(fid, 'Position')
    expect(fpos).toBeDefined()
    expect((fpos as any).x).toBe(100)
    const fhp = freg.getComponent(fid, 'Health')
    expect(fhp).toBeDefined()
    expect((fhp as any).current).toBe(50)
  })

  it('validates required fields — throws on missing', () => {
    const freg = createRegistry()
    expect(() => createEntity(freg, { Position: {} as any })).toThrow()
  })
})

describe('GameLoop', () => {
  it('has start, stop, step, isRunning', () => {
    const lreg = createRegistry()
    const loop = createGameLoop(lreg, [
      (reg, _dt) => { return reg },
    ])
    expect(typeof loop.start).toBe('function')
    expect(typeof loop.stop).toBe('function')
    expect(typeof loop.step).toBe('function')
    expect(typeof loop.isRunning).toBe('function')
  })

  it('not running initially', () => {
    const lreg = createRegistry()
    const loop = createGameLoop(lreg, [
      (reg, _dt) => { return reg },
    ])
    expect(loop.isRunning()).toBe(false)
  })

  it('step invokes system once', () => {
    const lreg = createRegistry()
    let callCount = 0
    const loop = createGameLoop(lreg, [
      (reg, _dt) => { callCount++; return reg },
    ])
    loop.step()
    expect(callCount).toBe(1)
  })

  it('step works for multiple calls', () => {
    const lreg = createRegistry()
    let callCount = 0
    const loop = createGameLoop(lreg, [
      (reg, _dt) => { callCount++; return reg },
    ])
    loop.step()
    loop.step()
    loop.step()
    expect(callCount).toBe(3)
  })
})

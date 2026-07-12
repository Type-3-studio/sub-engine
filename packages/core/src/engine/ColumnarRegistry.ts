import { validate, getRegisteredSchema } from './schemas.js'
import type { Registry, ComponentMap, EventType, EventCallback, RegistryEvent, RegisteredSchema, SchemaFieldDef, SerializedRegistry, SerializedEntity } from './types.js'

export interface ColumnarRegistry<M extends ComponentMap = Record<string, any>> extends Registry<M> {
  getFieldArray(componentName: string, fieldName: string): Float64Array | Int32Array | any[] | undefined
  getEntityIdsWithComponent(componentName: string): number[]
}

type ColumnCollection = Map<string, Float64Array | Int32Array | any[]>

type ComponentStore = {
  schema: RegisteredSchema
  columns: ColumnCollection
  presence: boolean[]
}

const ARRAY_INIT = 64

function makeColumn(field: SchemaFieldDef): Float64Array | Int32Array | any[] {
  switch (field.type) {
    case 'number': return new Float64Array(ARRAY_INIT)
    case 'integer': return new Int32Array(ARRAY_INIT)
    default: return new Array(ARRAY_INIT)
  }
}

function growColumn(col: Float64Array | Int32Array | any[], min: number): Float64Array | Int32Array | any[] {
  if (Array.isArray(col)) {
    col.length = Math.max(min, col.length * 2)
    return col
  }
  const newLen = Math.max(min, col.length * 2)
  const Ctor = col.constructor as new (n: number) => any
  const next = new Ctor(newLen)
  next.set(col as any)
  return next
}

function readValue(col: Float64Array | Int32Array | any[], idx: number): unknown {
  return col[idx]
}

function writeValue(col: Float64Array | Int32Array | any[], idx: number, val: unknown): void {
  col[idx] = val as any
}

export function createColumnarRegistry<M extends ComponentMap = Record<string, any>>(): ColumnarRegistry<M> {
  const stores = new Map<string, ComponentStore>()
  const entityComponents = new Map<number, string[]>()
  const exists: boolean[] = []
  let nextId = 1
  let count = 0

  const eventListeners: Record<EventType, EventCallback[]> = {
    'entity:created': [],
    'entity:removed': [],
    'component:added': [],
    'component:removed': [],
    'component:changed': [],
  }

  function emit(type: EventType, entityId: number, componentName?: string, data?: Record<string, unknown>): void {
    const event: RegistryEvent = { type, entityId, componentName, data }
    const cbs = eventListeners[type]
    for (let i = 0; i < cbs.length; i++) {
      cbs[i]!(event)
    }
  }

  function on(type: EventType, callback: EventCallback): void {
    eventListeners[type].push(callback)
  }

  function off(type: EventType, callback: EventCallback): void {
    const cbs = eventListeners[type]
    const idx = cbs.indexOf(callback)
    if (idx !== -1) cbs.splice(idx, 1)
  }

  function row(entityId: number): number {
    return entityId - 1
  }

  function ensureRow(entityId: number): void {
    const r = row(entityId)
    while (exists.length <= r) exists.push(false)
  }

  function getOrCreateStore(name: string): ComponentStore {
    let store = stores.get(name)
    if (!store) {
      const schema = getRegisteredSchema(name)
      if (!schema) throw new Error(`No schema registered for component "${name}"`)
      const columns: ColumnCollection = new Map()
      for (const [fieldName, def] of Object.entries(schema.fields)) {
        columns.set(fieldName, makeColumn(def))
      }
      store = { schema, columns, presence: [] }
      stores.set(name, store)
    }
    return store
  }

  function ensureStoreCapacity(store: ComponentStore, entityId: number): void {
    const r = row(entityId)
    while (store.presence.length <= r) store.presence.push(false)
    for (const [name, col] of store.columns) {
      if (col.length <= r) {
        store.columns.set(name, growColumn(col, r + 1))
      }
    }
  }

  function createEntity(): number {
    const id = nextId++
    ensureRow(id)
    exists[row(id)] = true
    count++
    emit('entity:created', id)
    return id
  }

  function removeEntity(entityId: number): void {
    const r = row(entityId)
    if (r < 0 || r >= exists.length || !exists[r]) {
      throw new Error(`Entity ${entityId} does not exist`)
    }
    exists[r] = false
    count--

    const comps = entityComponents.get(entityId)
    if (comps) {
      for (const name of comps) {
        const store = stores.get(name)
        if (store) store.presence[r] = false
      }
      entityComponents.delete(entityId)
    }

    emit('entity:removed', entityId)
  }

  function entityExists(entityId: number): boolean {
    const r = row(entityId)
    return r >= 0 && r < exists.length && !!exists[r]
  }

  function addComponent(entityId: number, componentName: string, data: Record<string, unknown>): void {
    const r = row(entityId)
    if (r < 0 || r >= exists.length || !exists[r]) {
      throw new Error(`Entity ${entityId} does not exist`)
    }
    validate(componentName, data)

    const store = getOrCreateStore(componentName)
    ensureStoreCapacity(store, entityId)

    const had = store.presence[r]
    store.presence[r] = true
    for (const [fieldName, col] of store.columns) {
      writeValue(col, r, data[fieldName])
    }

    if (!had) {
      let comps = entityComponents.get(entityId)
      if (!comps) {
        comps = []
        entityComponents.set(entityId, comps)
      }
      comps.push(componentName)
    }

    if (had) {
      emit('component:changed', entityId, componentName, data)
    } else {
      emit('component:added', entityId, componentName, data)
    }
  }

  function removeComponent(entityId: number, componentName: string): void {
    const r = row(entityId)
    if (r < 0 || r >= exists.length || !exists[r]) {
      throw new Error(`Entity ${entityId} does not exist`)
    }
    const store = stores.get(componentName)
    if (!store || !store.presence[r]) {
      throw new Error(`Entity ${entityId} does not have component "${componentName}"`)
    }
    store.presence[r] = false

    const comps = entityComponents.get(entityId)
    if (comps) {
      const idx = comps.indexOf(componentName)
      if (idx !== -1) comps.splice(idx, 1)
      if (comps.length === 0) entityComponents.delete(entityId)
    }

    emit('component:removed', entityId, componentName)
  }

  function hasComponent(entityId: number, componentName: string): boolean {
    const r = row(entityId)
    if (r < 0 || r >= exists.length || !exists[r]) return false
    const store = stores.get(componentName)
    if (!store) return false
    return !!store.presence[r]
  }

  function buildComponentData(entityId: number, componentName: string): Record<string, unknown> | undefined {
    const r = row(entityId)
    const store = stores.get(componentName)
    if (!store || !store.presence[r]) return undefined
    const data: Record<string, unknown> = {}
    for (const [fieldName, col] of store.columns) {
      data[fieldName] = readValue(col, r)
    }
    return data
  }

  function getComponent(entityId: number, componentName: string): Record<string, unknown> | undefined {
    return buildComponentData(entityId, componentName)
  }

  function getComponentReadonly(entityId: number, componentName: string): Record<string, unknown> | undefined {
    return buildComponentData(entityId, componentName)
  }

  function getEntitiesWith(componentNames: string | string[]): any[] {
    const names = Array.isArray(componentNames) ? componentNames : [componentNames]
    const result: any[] = []

    for (let eid = 1; eid < nextId; eid++) {
      const r = row(eid)
      if (!exists[r]) continue
      let match = true
      for (const name of names) {
        const store = stores.get(name)
        if (!store || !store.presence[r]) {
          match = false
          break
        }
      }
      if (!match) continue

      const entity: Record<string, any> = { id: eid }
      for (const name of names) {
        entity[name] = buildComponentData(eid, name)
      }
      result.push(entity)
    }
    return result
  }

  function getAllEntitiesCopy(): any[] {
    const result: any[] = []
    for (let eid = 1; eid < nextId; eid++) {
      const r = row(eid)
      if (!exists[r]) continue
      const entity: Record<string, any> = { id: eid }
      const comps = entityComponents.get(eid)
      if (comps) {
        for (const name of comps) {
          entity[name] = buildComponentData(eid, name)
        }
      }
      result.push(entity)
    }
    return result
  }

  function getAllEntitiesReadonly(): any[] {
    const result: any[] = []
    for (let eid = 1; eid < nextId; eid++) {
      const r = row(eid)
      if (!exists[r]) continue
      const entity: Record<string, any> = { id: eid }
      const comps = entityComponents.get(eid)
      if (comps) {
        for (const name of comps) {
          const store = stores.get(name)
          if (store && store.presence[r]) {
            const data: Record<string, unknown> = {}
            for (const [fieldName, col] of store.columns) {
              data[fieldName] = readValue(col, r)
            }
            entity[name] = data
          }
        }
      }
      result.push(entity)
    }
    return result
  }

  const getAllEntities = getAllEntitiesCopy

  function serialize(): SerializedRegistry {
    const entities: SerializedEntity[] = []
    for (let eid = 1; eid < nextId; eid++) {
      const r = row(eid)
      if (!exists[r]) continue
      const components: Record<string, Record<string, unknown>> = {}
      const comps = entityComponents.get(eid)
      if (comps) {
        for (const name of comps) {
          const data = buildComponentData(eid, name)
          if (data) components[name] = data
        }
      }
      entities.push({ id: eid, components })
    }
    return { version: 1, entities, nextId }
  }

  function deserialize(data: SerializedRegistry): void {
    clear()
    nextId = data.nextId
    for (const entity of data.entities) {
      const id = entity.id
      ensureRow(id)
      exists[row(id)] = true
      count++

      for (const [name, compData] of Object.entries(entity.components)) {
        validate(name, compData)
        const store = getOrCreateStore(name)
        ensureStoreCapacity(store, id)
        const r = row(id)
        store.presence[r] = true
        for (const [fieldName, col] of store.columns) {
          writeValue(col, r, compData[fieldName])
        }
        let comps = entityComponents.get(id)
        if (!comps) {
          comps = []
          entityComponents.set(id, comps)
        }
        comps.push(name)
      }
    }
  }

  function clear(): void {
    exists.length = 0
    stores.clear()
    entityComponents.clear()
    nextId = 1
    count = 0
  }

  function entityCount(): number {
    return count
  }

  function getFieldArray(componentName: string, fieldName: string): Float64Array | Int32Array | any[] | undefined {
    const store = stores.get(componentName)
    if (!store) return undefined
    return store.columns.get(fieldName)
  }

  function getEntityIdsWithComponent(componentName: string): number[] {
    const store = stores.get(componentName)
    if (!store) return []
    const ids: number[] = []
    for (let eid = 1; eid < nextId; eid++) {
      const r = row(eid)
      if (exists[r] && store.presence[r]) ids.push(eid)
    }
    return ids
  }

  return {
    createEntity,
    removeEntity,
    entityExists,
    addComponent: addComponent as Registry<M>['addComponent'],
    removeComponent: removeComponent as Registry<M>['removeComponent'],
    hasComponent: hasComponent as Registry<M>['hasComponent'],
    getComponent: getComponent as Registry<M>['getComponent'],
    getComponentReadonly: getComponentReadonly as Registry<M>['getComponentReadonly'],
    getEntitiesWith: getEntitiesWith as Registry<M>['getEntitiesWith'],
    getAllEntitiesCopy: getAllEntitiesCopy as Registry<M>['getAllEntitiesCopy'],
    getAllEntitiesReadonly: getAllEntitiesReadonly as Registry<M>['getAllEntitiesReadonly'],
    getAllEntities: getAllEntities as Registry<M>['getAllEntities'],
    clear,
    entityCount,
    on,
    off,
    serialize,
    deserialize,
    getFieldArray,
    getEntityIdsWithComponent,
  }
}

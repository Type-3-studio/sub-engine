import { validate } from './schemas.js'
import type { Registry, ComponentMap, EventType, EventCallback, RegistryEvent, SerializedRegistry, SerializedEntity } from './types.js'

export function createRegistry<M extends ComponentMap = Record<string, any>>(): Registry<M> {
  const entities = new Map<number, Map<string, Record<string, unknown>>>()
  let nextId = 1

  const eventListeners: Record<EventType, EventCallback[]> = {
    'entity:created': [],
    'entity:removed': [],
    'component:added': [],
    'component:removed': [],
    'component:changed': [],
  }

  function emit(type: EventType, entityId: number, componentName?: string, data?: Record<string, unknown>): void {
    const event: RegistryEvent = { type, entityId, componentName, data }
    const cbs = eventListeners[type]!
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

  function createEntity(): number {
    const id = nextId++
    entities.set(id, new Map())
    emit('entity:created', id)
    return id
  }

  function removeEntity(entityId: number): void {
    if (!entities.has(entityId)) {
      throw new Error(`Entity ${entityId} does not exist`)
    }
    entities.delete(entityId)
    emit('entity:removed', entityId)
  }

  function entityExists(entityId: number): boolean {
    return entities.has(entityId)
  }

  function addComponent(entityId: number, componentName: string, data: Record<string, unknown>): void {
    const components = entities.get(entityId)
    if (!components) {
      throw new Error(`Entity ${entityId} does not exist`)
    }
    validate(componentName, data)
    const exists = components.has(componentName)
    components.set(componentName, { ...data })
    if (exists) {
      emit('component:changed', entityId, componentName, data)
    } else {
      emit('component:added', entityId, componentName, data)
    }
  }

  function removeComponent(entityId: number, componentName: string): void {
    const components = entities.get(entityId)
    if (!components) {
      throw new Error(`Entity ${entityId} does not exist`)
    }
    if (!components.has(componentName)) {
      throw new Error(`Entity ${entityId} does not have component "${componentName}"`)
    }
    components.delete(componentName)
    emit('component:removed', entityId, componentName)
  }

  function hasComponent(entityId: number, componentName: string): boolean {
    const components = entities.get(entityId)
    if (!components) return false
    return components.has(componentName)
  }

  function getComponent(entityId: number, componentName: string): Record<string, unknown> | undefined {
    const components = entities.get(entityId)
    if (!components) return undefined
    const data = components.get(componentName)
    return data ? { ...data } : undefined
  }

  function getComponentReadonly(entityId: number, componentName: string): Record<string, unknown> | undefined {
    const components = entities.get(entityId)
    if (!components) return undefined
    const data = components.get(componentName)
    return data ? data : undefined
  }

  function getEntitiesWith(componentNames: string | string[]): any[] {
    const names = Array.isArray(componentNames) ? componentNames : [componentNames]
    const result: any[] = []
    for (const [id, components] of entities) {
      let match = true
      for (const name of names) {
        if (!components.has(name)) {
          match = false
          break
        }
      }
      if (match) {
        const entity: Record<string, any> = { id }
        for (const [compName, compData] of components) {
          entity[compName] = { ...compData }
        }
        result.push(entity)
      }
    }
    return result
  }

  function getAllEntities(): any[] {
    const result: any[] = []
    for (const [id, components] of entities) {
      const entity: Record<string, any> = { id }
      for (const [compName, compData] of components) {
        entity[compName] = { ...compData }
      }
      result.push(entity)
    }
    return result
  }

  function serialize(): SerializedRegistry {
    const serializedEntities: SerializedEntity[] = []
    for (const [id, components] of entities) {
      const comps: Record<string, Record<string, unknown>> = {}
      for (const [name, data] of components) {
        comps[name] = { ...data }
      }
      serializedEntities.push({ id, components: comps })
    }
    return {
      version: 1,
      entities: serializedEntities,
      nextId,
    }
  }

  function deserialize(data: SerializedRegistry): void {
    clear()
    nextId = data.nextId
    for (const entity of data.entities) {
      const comps = new Map<string, Record<string, unknown>>()
      for (const [name, compData] of Object.entries(entity.components)) {
        validate(name, compData)
        comps.set(name, { ...compData })
      }
      entities.set(entity.id, comps)
    }
  }

  function clear(): void {
    entities.clear()
    nextId = 1
  }

  function entityCount(): number {
    return entities.size
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
    getAllEntities: getAllEntities as Registry<M>['getAllEntities'],
    clear,
    entityCount,
    on,
    off,
    serialize,
    deserialize,
  }
}

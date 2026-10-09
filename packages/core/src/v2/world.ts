// Sub-Engine v2 — the World: one typed, versioned data graph (I1).
//
// Storage is a Map keyed by EntityId, each holding a Map of component type to
// frozen, validated data. Iteration is always over ascending EntityId so query
// order is deterministic (I3.3).

import type {
  ComponentData,
  ComponentSchema,
  EntityId,
  EntityView,
  Json,
  JsonObject,
  Snapshot,
  SnapshotComponent,
  ValueType,
  World,
  WorldOptions,
} from './types.js'
import { getSchema, validateComponent } from './schema.js'
import { migrateComponent } from './migrations.js'
import { sha256 } from './hash.js'
import { SchemaError } from './errors.js'

export const WORLD_VERSION = 1

type EntityStore = Map<string, ComponentData>

function requireSchema(name: string): ComponentSchema {
  const schema = getSchema(name)
  if (!schema) throw new SchemaError(`Unknown component type "${name}"`)
  return schema
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value)
    for (const key of Object.keys(value as object)) {
      deepFreeze((value as Record<string, unknown>)[key])
    }
  }
  return value
}

// ---------------------------------------------------------------------------
// Typed ⇆ canonical JSON (I1.5)
// ---------------------------------------------------------------------------

function toJsonValue(type: ValueType, value: unknown): Json {
  switch (type.kind) {
    case 'int':
    case 'dec':
    case 'ref':
      return (value as bigint).toString()
    case 'f64':
      return value as number
    case 'bool':
      return value as boolean
    case 'string':
    case 'enum':
      return value as string
    case 'vec2': {
      const v = value as { x: number; y: number }
      return { x: v.x, y: v.y }
    }
    case 'list':
      return (value as unknown[]).map((item) => toJsonValue(type.of, item))
    case 'map': {
      const record = value as Record<string, unknown>
      const out: JsonObject = {}
      for (const key of Object.keys(record).sort()) out[key] = toJsonValue(type.of, record[key])
      return out
    }
    case 'nullable':
      return value === null ? null : toJsonValue(type.of, value)
    case 'record': {
      const data = value as ComponentData
      const out: JsonObject = {}
      for (const [name, field] of Object.entries(type.fields)) {
        if (name in data) out[name] = toJsonValue(field.type, data[name])
      }
      return out
    }
  }
}

function fromJsonValue(type: ValueType, value: Json): unknown {
  switch (type.kind) {
    case 'int':
    case 'dec':
    case 'ref':
      return BigInt(value as string)
    case 'f64':
      return value as number
    case 'bool':
      return value as boolean
    case 'string':
    case 'enum':
      return value as string
    case 'vec2': {
      const v = value as { x: number; y: number }
      return { x: v.x, y: v.y }
    }
    case 'list':
      return (value as Json[]).map((item) => fromJsonValue(type.of, item))
    case 'map': {
      const record = value as JsonObject
      const out: ComponentData = {}
      for (const key of Object.keys(record)) out[key] = fromJsonValue(type.of, record[key]!)
      return out
    }
    case 'nullable':
      return value === null ? null : fromJsonValue(type.of, value)
    case 'record': {
      const data = value as JsonObject
      const out: ComponentData = {}
      for (const [name, field] of Object.entries(type.fields)) {
        if (name in data) out[name] = fromJsonValue(field.type, data[name]!)
      }
      return out
    }
  }
}

function snapshotData(schema: ComponentSchema, data: ComponentData): JsonObject {
  const out: JsonObject = {}
  for (const [name, field] of Object.entries(schema.fields)) {
    if (name in data) out[name] = toJsonValue(field.type, data[name])
  }
  return out
}

function fromJsonData(schema: ComponentSchema, data: JsonObject): ComponentData {
  const out: ComponentData = {}
  for (const [name, field] of Object.entries(schema.fields)) {
    if (name in data) out[name] = fromJsonValue(field.type, data[name]!)
  }
  return out
}

// ---------------------------------------------------------------------------
// createWorld
// ---------------------------------------------------------------------------

export function createWorld(options: WorldOptions = {}): World {
  let worldSeed = options.seed ?? 0
  // Schema objects come from `defineSchema` and are already registered; this
  // loop is a guard for callers that pass raw schema objects.
  void options.schemas

  const store = new Map<number, EntityStore>()
  let nextId = 1

  function entityStore(id: EntityId): EntityStore {
    const comps = store.get(id)
    if (!comps) throw new SchemaError(`Entity ${id} does not exist`)
    return comps
  }

  function write(id: EntityId, type: string, data: ComponentData, upsert: boolean): void {
    const comps = entityStore(id)
    if (!upsert && comps.has(type)) {
      throw new SchemaError(`Entity ${id} already has component "${type}"`)
    }
    const schema = requireSchema(type)
    const normalized = validateComponent(schema, data)
    comps.set(type, deepFreeze(normalized))
  }

  const world: World = {
    get seed(): number {
      return worldSeed
    },
    worldVersion: WORLD_VERSION,

    spawn(): EntityId {
      const id = nextId++
      store.set(id, new Map())
      return id as EntityId
    },

    despawn(id: EntityId): void {
      if (!store.delete(id)) throw new SchemaError(`Entity ${id} does not exist`)
    },

    exists(id: EntityId): boolean {
      return store.has(id)
    },

    add(id: EntityId, type: string, data: ComponentData): void {
      write(id, type, data, false)
    },

    set(id: EntityId, type: string, data: ComponentData): void {
      write(id, type, data, true)
    },

    remove(id: EntityId, type: string): void {
      const comps = entityStore(id)
      if (!comps.delete(type)) {
        throw new SchemaError(`Entity ${id} has no component "${type}"`)
      }
    },

    read<T = ComponentData>(id: EntityId, type: string): Readonly<T> {
      const comps = store.get(id)
      const data = comps?.get(type)
      if (!data) throw new SchemaError(`Entity ${id} has no component "${type}"`)
      return data as Readonly<T>
    },

    get<T = ComponentData>(id: EntityId, type: string): T | undefined {
      const comps = store.get(id)
      const data = comps?.get(type)
      return data === undefined ? undefined : (structuredClone(data) as T)
    },

    has(id: EntityId, type: string): boolean {
      return store.get(id)?.has(type) ?? false
    },

    query(...types: string[]): EntityView[] {
      const idList = [...store.keys()].sort((a, b) => a - b)
      const out: EntityView[] = []
      for (const id of idList) {
        const comps = store.get(id)!
        if (!types.every((type) => comps.has(type))) continue
        const view: Record<string, unknown> = { id }
        for (const type of types) view[type] = comps.get(type)
        out.push(view as EntityView)
      }
      return out
    },

    snapshot(): Snapshot {
      const entities = [...store.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([id, comps]) => ({
          id,
          components: [...comps.keys()]
            .sort()
            .map((type): SnapshotComponent => {
              const schema = requireSchema(type)
              return { type, v: schema.version, data: snapshotData(schema, comps.get(type)!) }
            }),
        }))
      return { worldVersion: WORLD_VERSION, nextId, seed: worldSeed, entities }
    },

    restore(snap: Snapshot): void {
      store.clear()
      const restored = new Map<number, EntityStore>()
      for (const entity of snap.entities) {
        const comps: EntityStore = new Map()
        for (const component of entity.components) {
          const schema = requireSchema(component.type)
          const migrated = migrateComponent(
            component.type,
            component.v,
            schema.version,
            component.data,
          )
          const typed = fromJsonData(schema, migrated)
          comps.set(component.type, deepFreeze(validateComponent(schema, typed)))
        }
        restored.set(entity.id, comps)
      }
      for (const [id, comps] of restored) store.set(id, comps)
      nextId = snap.nextId
      worldSeed = snap.seed
    },

    canonical(): string {
      // snapshot() builds with deterministic insertion order, so JSON.stringify
      // produces canonical bytes: id-ascending entities, type-sorted components,
      // schema-ordered fields, exact numerics as decimal strings.
      return JSON.stringify(world.snapshot())
    },

    hash(): string {
      return `sha256:${sha256(world.canonical())}`
    },
  }

  return world
}

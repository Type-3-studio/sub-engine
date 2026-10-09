// Sub-Engine v2 — I1 World Model types.
//
// A World is one typed, versioned data graph: entities with schema-typed
// components. There is no behavior on entities and no hidden state.
//
// Terms: see private-docs/plan/CONTEXT.md. Invariants: CONSTITUTION.md.

/**
 * An entity identifier. Deterministic, allocated from the world's counter,
 * and never reused. Branded so a raw number cannot be passed by accident.
 */
export type EntityId = number & { readonly __brand: 'EntityId' }

/** A JSON-safe value (no bigint — `int`/`dec` canonicalise to decimal strings). */
export type Json = null | boolean | number | string | Json[] | { [key: string]: Json }
export type JsonObject = { [key: string]: Json }

/**
 * The value types a field may hold. `int` and `dec` are exact (bigint-backed);
 * `f64` is IEEE-754 and only deterministic for `+ - * /` and `Math.sqrt`.
 */
export type ValueType =
  | { kind: 'int' }
  | { kind: 'dec'; scale: number }
  | { kind: 'f64' }
  | { kind: 'bool' }
  | { kind: 'string' }
  | { kind: 'enum'; values: readonly string[] }
  | { kind: 'vec2' }
  | { kind: 'ref' }
  | { kind: 'list'; of: ValueType }
  | { kind: 'map'; key: 'string'; of: ValueType }
  | { kind: 'nullable'; of: ValueType }
  | { kind: 'record'; fields: FieldSet }

/** A single typed key inside a component. */
export interface FieldDef {
  type: ValueType
  required?: boolean
  default?: Json
  min?: Json
  max?: Json
}

export type FieldSet = Record<string, FieldDef>

/** The field definitions for a component type, registered once and versioned. */
export interface ComponentSchema {
  name: string
  version: number
  fields: FieldSet
}

/** A component's data as stored internally: `int`/`dec` fields are bigint. */
export type ComponentData = Record<string, unknown>

/** A read-only view of one entity and its components, as returned by `query`. */
export interface EntityView {
  readonly id: EntityId
  readonly [componentType: string]: Readonly<ComponentData> | EntityId
}

// ---------------------------------------------------------------------------
// Canonical snapshot (I1.5)
// ---------------------------------------------------------------------------

export interface SnapshotComponent {
  type: string
  v: number
  data: JsonObject
}

export interface SnapshotEntity {
  id: number
  components: SnapshotComponent[]
}

export interface Snapshot {
  worldVersion: number
  nextId: number
  seed: number
  entities: SnapshotEntity[]
}

// ---------------------------------------------------------------------------
// World API (I1.3)
// ---------------------------------------------------------------------------

export interface WorldOptions {
  /** Schemas to make available to this world. Registered globally by name. */
  schemas?: readonly ComponentSchema[]
  /** Seed for the world's RNG streams. Snapshotted. */
  seed?: number
}

export interface World {
  readonly seed: number
  readonly worldVersion: number

  // lifecycle
  spawn(): EntityId
  despawn(id: EntityId): void
  exists(id: EntityId): boolean

  // write (validates + clones)
  add(id: EntityId, type: string, data: ComponentData): void
  set(id: EntityId, type: string, data: ComponentData): void
  remove(id: EntityId, type: string): void

  // read
  read<T = ComponentData>(id: EntityId, type: string): Readonly<T>
  get<T = ComponentData>(id: EntityId, type: string): T | undefined
  has(id: EntityId, type: string): boolean

  // query — deterministic order (ascending EntityId)
  query(...types: string[]): EntityView[]

  // canonical
  snapshot(): Snapshot
  restore(snap: Snapshot): void
  canonical(): string
  hash(): string
}

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
// I3 Determinism Kit
// ---------------------------------------------------------------------------

/** A seeded random stream. Never `Math.random` (I3.5). */
export interface Rng {
  /** Next raw 32-bit unsigned integer. */
  uint32(): number
  /** Next value in `[0, 1)` — exact in f64 (`uint32 / 2^32`). */
  next(): number
  /** Uniform integer in `[min, maxExclusive)`. */
  int(min: number, maxExclusive: number): number
  bool(p: number): boolean
  pick<T>(items: readonly T[]): T
  /** Derive an independent, named stream. */
  fork(label: string): Rng
}

/** Injected simulation time. `elapsedMs = tick * dt` — there is no other source. */
export interface SimTime {
  readonly tick: number
  readonly dt: number
}

// ---------------------------------------------------------------------------
// I2 System Contract
// ---------------------------------------------------------------------------

/** Queues an event during a tick; delivered at the tick boundary (I2.3). */
export interface EventWriter {
  emit(type: string, payload?: JsonObject): void
}

export interface SystemContext {
  readonly world: World
  readonly rng: Rng
  readonly events: EventWriter
  readonly time: SimTime
}

/**
 * A pure function over the world with a declared `reads / writes / emits`
 * contract. The scheduler orders systems from these declarations (I2.2);
 * strict mode enforces they are accurate (I2.4).
 */
export interface SystemDef {
  readonly name: string
  readonly version: number
  readonly reads: readonly string[]
  readonly writes: readonly string[]
  readonly emits: readonly string[]
  run(ctx: SystemContext, dt: number): void
}

/** An emitted event, as delivered to handlers at the tick boundary. */
export interface GameEvent {
  readonly type: string
  readonly payload: JsonObject
}

export type EventHandler = (ctx: SystemContext, event: GameEvent) => void

export interface AppOptions {
  schemas?: readonly ComponentSchema[]
  seed?: number
  /**
   * Enforce system access contracts. Defaults to true in tests/dev; set false
   * for production builds (I2.4, zero overhead).
   */
  strict?: boolean
}

/** A running world: fixed system set, events, injected time (I2.5). */
export interface App {
  readonly world: World
  readonly tick: number
  use(system: SystemDef): void
  on(type: string, handler: EventHandler): void
  /** Advance the world by one tick of duration `dt` (ms). */
  step(dt: number): void
  /** Deterministic execution order (computed once). */
  systemOrder(): string[]
  hash(): string
}


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

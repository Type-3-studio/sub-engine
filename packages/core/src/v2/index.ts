// Sub-Engine v2 — public surface.
//
// Phase 1 (I1 World Model, I2 System Contract, I3 Determinism Kit) is built here.
// Until v2 reaches parity on the first game slice, these exports live behind the
// `@sub-engine/core/v2` subpath alongside the v1 engine.

export { createWorld, WORLD_VERSION } from './world.js'
export {
  defineSchema,
  registerSchema,
  getSchema,
  listSchemas,
  describeSchema,
  validateComponent,
  t,
} from './schema.js'
export { registerMigration, migrateComponent, clearMigrations } from './migrations.js'
export { createRng } from './rng.js'
export { defineSystem } from './system.js'
export { orderSystems } from './scheduler.js'
export { createApp } from './app.js'
export { sha256 } from './hash.js'
export { canonicalValue, canonicalData } from './canonical.js'
export { ValidationError, SchemaError, formatPath } from './errors.js'

export type {
  EntityId,
  EntityView,
  Json,
  JsonObject,
  ComponentData,
  ComponentSchema,
  FieldDef,
  FieldSet,
  ValueType,
  Snapshot,
  SnapshotComponent,
  SnapshotEntity,
  World,
  WorldOptions,
  Rng,
  SimTime,
  EventWriter,
  SystemContext,
  SystemDef,
  GameEvent,
  EventHandler,
  AppOptions,
  App,
} from './types.js'

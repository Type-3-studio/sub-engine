// Sub-Engine v2 — component schema migrations (I1.6, Article 10).
//
// A migration is a pure transform from one schema version to the next. Restore
// walks the chain; a missing step for a newer version throws rather than
// silently coercing.

import type { JsonObject } from './types.js'
import { SchemaError } from './errors.js'

export type MigrationFn = (data: JsonObject) => JsonObject

const migrations = new Map<string, MigrationFn>()

function key(type: string, from: number): string {
  return `${type}@${from}`
}

/**
 * Register a transform from schema version `from` to `from + 1` for `type`.
 * Registering the same step twice throws (it would be ambiguous).
 */
export function registerMigration(
  type: string,
  from: number,
  to: number,
  fn: MigrationFn,
): void {
  if (to !== from + 1) {
    throw new SchemaError(
      `Migration for "${type}" must step by one version (got ${from} → ${to})`,
    )
  }
  const k = key(type, from)
  if (migrations.has(k)) {
    throw new SchemaError(`Migration "${type}" ${from} → ${to} is already registered`)
  }
  migrations.set(k, fn)
}

/**
 * Run the migration chain for a component from `fromVersion` to `toVersion`.
 * Throws if any step is missing.
 */
export function migrateComponent(
  type: string,
  fromVersion: number,
  toVersion: number,
  data: JsonObject,
): JsonObject {
  let current = data
  for (let v = fromVersion; v < toVersion; v++) {
    const fn = migrations.get(key(type, v))
    if (!fn) {
      throw new SchemaError(
        `No migration registered for "${type}" from v${v} to v${v + 1}`,
      )
    }
    current = fn(current)
  }
  return current
}

/** Test seam: clear all registered migrations. */
export function clearMigrations(): void {
  migrations.clear()
}

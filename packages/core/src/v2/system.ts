// Sub-Engine v2 — I2.1 system definition.

import type { SystemDef } from './types.js'
import { SchemaError } from './errors.js'

/**
 * Define a system. Validates and copies the contract arrays so a system's
 * declared access cannot be mutated after registration.
 */
export function defineSystem(def: SystemDef): SystemDef {
  if (!def.name) throw new SchemaError('System must have a name')
  if (!Number.isInteger(def.version) || def.version < 1) {
    throw new SchemaError(`System "${def.name}" must have an integer version >= 1`)
  }
  for (const key of ['reads', 'writes', 'emits'] as const) {
    if (!Array.isArray(def[key])) {
      throw new SchemaError(`System "${def.name}" must declare ${key} as an array`)
    }
  }
  return {
    name: def.name,
    version: def.version,
    reads: [...def.reads],
    writes: [...def.writes],
    emits: [...def.emits],
    run: def.run,
  }
}

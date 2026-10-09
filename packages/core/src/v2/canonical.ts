// Sub-Engine v2 — canonical serialization (I1.5).
//
// One byte-exact form: entities sorted by id, components sorted by type, fields
// in schema declaration order, `int`/`dec`/`ref` as decimal strings, `f64` via
// the ECMAScript Number::toString algorithm, `-0` normalised to `0`.

import type { ComponentData, ComponentSchema, ValueType } from './types.js'

/** Serialize a single typed value to its canonical JSON fragment. */
export function canonicalValue(type: ValueType, value: unknown): string {
  switch (type.kind) {
    case 'int':
    case 'dec':
    case 'ref':
      return JSON.stringify((value as bigint).toString())
    case 'f64':
      return JSON.stringify(value as number)
    case 'bool':
      return (value as boolean) ? 'true' : 'false'
    case 'string':
    case 'enum':
      return JSON.stringify(value as string)
    case 'vec2': {
      const v = value as { x: number; y: number }
      return `{"x":${JSON.stringify(v.x)},"y":${JSON.stringify(v.y)}}`
    }
    case 'list': {
      const items = value as unknown[]
      return `[${items.map((item) => canonicalValue(type.of, item)).join(',')}]`
    }
    case 'map': {
      const record = value as Record<string, unknown>
      const keys = Object.keys(record).sort()
      return `{${keys
        .map((k) => `${JSON.stringify(k)}:${canonicalValue(type.of, record[k])}`)
        .join(',')}}`
    }
    case 'nullable': {
      if (value === null) return 'null'
      return canonicalValue(type.of, value)
    }
    case 'record': {
      const data = value as ComponentData
      const parts: string[] = []
      for (const [name, field] of Object.entries(type.fields)) {
        if (!(name in data)) continue
        parts.push(`${JSON.stringify(name)}:${canonicalValue(field.type, data[name])}`)
      }
      return `{${parts.join(',')}}`
    }
  }
}

/** Serialize a component's `data` object with fields in schema declaration order. */
export function canonicalData(schema: ComponentSchema, data: ComponentData): string {
  const parts: string[] = []
  for (const [name, field] of Object.entries(schema.fields)) {
    if (!(name in data)) continue
    parts.push(`${JSON.stringify(name)}:${canonicalValue(field.type, data[name])}`)
  }
  return `{${parts.join(',')}}`
}

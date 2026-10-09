// Sub-Engine v2 — I1.2 value & schema types, registration, and validation.
//
// A schema is the runtime truth for a component type. Registration is
// idempotent for an identical definition and throws on a conflicting one.

import type {
  ComponentData,
  ComponentSchema,
  FieldDef,
  FieldSet,
  ValueType,
} from './types.js'
import { SchemaError, ValidationError } from './errors.js'

// ---------------------------------------------------------------------------
// Value-type constructors
// ---------------------------------------------------------------------------

export const t = {
  int: (): ValueType => ({ kind: 'int' }),
  /** Exact fixed-point decimal, backed by a bigint mantissa at `scale`. */
  dec: (scale = 1_000_000_000): ValueType => ({ kind: 'dec', scale }),
  f64: (): ValueType => ({ kind: 'f64' }),
  bool: (): ValueType => ({ kind: 'bool' }),
  string: (): ValueType => ({ kind: 'string' }),
  enum: (values: readonly string[]): ValueType => ({ kind: 'enum', values }),
  vec2: (): ValueType => ({ kind: 'vec2' }),
  ref: (): ValueType => ({ kind: 'ref' }),
  list: (of: ValueType): ValueType => ({ kind: 'list', of }),
  map: (of: ValueType): ValueType => ({ kind: 'map', key: 'string', of }),
  nullable: (of: ValueType): ValueType => ({ kind: 'nullable', of }),
  record: (fields: FieldSet): ValueType => ({ kind: 'record', fields }),
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

const registry = new Map<string, ComponentSchema>()

function normalizeField(field: FieldDef | ValueType): FieldDef {
  if ('kind' in field) return { type: field, required: true }
  return {
    type: field.type,
    required: field.required ?? true,
    default: field.default,
    min: field.min,
    max: field.max,
  }
}

function normalizeFields(fields: FieldSet): FieldSet {
  const out: FieldSet = {}
  for (const [name, field] of Object.entries(fields)) {
    out[name] = normalizeField(field as FieldDef | ValueType)
  }
  return out
}

/**
 * Define and register a component schema. Identical re-registration is a no-op;
 * a conflicting definition under the same name throws (I1.7).
 */
export function defineSchema(
  name: string,
  fields: FieldSet,
  version = 1,
): ComponentSchema {
  const schema: ComponentSchema = { name, version, fields: normalizeFields(fields) }
  const existing = registry.get(name)
  if (existing && JSON.stringify(existing) !== JSON.stringify(schema)) {
    throw new SchemaError(
      `Component schema "${name}" is already registered with a different definition`,
    )
  }
  registry.set(name, schema)
  return schema
}

/** Alias for {@link defineSchema} (reads better at call sites). */
export const registerSchema = defineSchema

export function getSchema(name: string): ComponentSchema | undefined {
  return registry.get(name)
}

export function listSchemas(): string[] {
  return [...registry.keys()].sort()
}

/** Introspection (I1 / Control Plane): describe a registered schema. */
export function describeSchema(name: string): ComponentSchema {
  const schema = registry.get(name)
  if (!schema) throw new SchemaError(`Unknown component type "${name}"`)
  return schema
}

// ---------------------------------------------------------------------------
// Validation + coercion (Article 4)
// ---------------------------------------------------------------------------

function rejectType(expected: string, value: unknown, path: readonly (string | number)[]): never {
  throw new ValidationError(`expected ${expected}, got ${describe(value)}`, path)
}

function describe(value: unknown): string {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  if (typeof value === 'bigint') return 'bigint'
  return typeof value
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function normalizeInt(value: unknown, path: readonly (string | number)[]): bigint {
  if (typeof value === 'bigint') return value
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) rejectType('a finite integer', value, path)
    if (!Number.isInteger(value)) rejectType('an integer', value, path)
    return BigInt(value)
  }
  return rejectType('an integer (number or bigint)', value, path)
}

function normalizeDec(
  value: unknown,
  scale: number,
  path: readonly (string | number)[],
): bigint {
  if (typeof value === 'bigint') return value
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) rejectType('a finite number', value, path)
    return BigInt(Math.round(value * scale))
  }
  return rejectType('a decimal (number or bigint mantissa)', value, path)
}

function normalizeF64(value: unknown, path: readonly (string | number)[]): number {
  if (!isFiniteNumber(value)) rejectType('a finite number', value, path)
  return value === 0 ? 0 : value // normalise -0 → 0
}

function checkBounds(
  value: bigint | number,
  field: Pick<FieldDef, 'min' | 'max'>,
  path: readonly (string | number)[],
): void {
  if (field.min === undefined && field.max === undefined) return
  const asBig = typeof value === 'bigint' ? value : BigInt(Math.round(value))
  if (field.min !== undefined) {
    const min = typeof field.min === 'bigint' ? field.min : BigInt(field.min as number)
    if (asBig < min) throw new ValidationError(`must be >= ${min}`, path)
  }
  if (field.max !== undefined) {
    const max = typeof field.max === 'bigint' ? field.max : BigInt(field.max as number)
    if (asBig > max) throw new ValidationError(`must be <= ${max}`, path)
  }
}

function validateValue(
  type: ValueType,
  value: unknown,
  path: readonly (string | number)[],
  field: Pick<FieldDef, 'min' | 'max'> = {},
): unknown {
  switch (type.kind) {
    case 'int':
    case 'ref': {
      const n = normalizeInt(value, path)
      checkBounds(n, field, path)
      return n
    }
    case 'dec': {
      const n = normalizeDec(value, type.scale, path)
      checkBounds(n, field, path)
      return n
    }
    case 'f64': {
      const n = normalizeF64(value, path)
      checkBounds(n, field, path)
      return n
    }
    case 'bool':
      if (typeof value !== 'boolean') rejectType('a boolean', value, path)
      return value
    case 'string':
      if (typeof value !== 'string') rejectType('a string', value, path)
      return value
    case 'enum':
      if (typeof value !== 'string') rejectType('a string', value, path)
      if (!type.values.includes(value)) {
        throw new ValidationError(`must be one of ${type.values.join(' | ')}`, path)
      }
      return value
    case 'vec2': {
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        rejectType('a { x, y } vector', value, path)
      }
      const v = value as { x?: unknown; y?: unknown }
      return {
        x: normalizeF64(v.x, [...path, 'x']),
        y: normalizeF64(v.y, [...path, 'y']),
      }
    }
    case 'list': {
      if (!Array.isArray(value)) rejectType('a list', value, path)
      return value.map((item, i) => validateValue(type.of, item, [...path, i], {}))
    }
    case 'map': {
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        rejectType('a map', value, path)
      }
      const out: ComponentData = {}
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        out[k] = validateValue(type.of, v, [...path, k], {})
      }
      return out
    }
    case 'nullable': {
      if (value === null) return null
      return validateValue(type.of, value, path, field)
    }
    case 'record': {
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        rejectType('a record', value, path)
      }
      return validateFields(
        type.fields,
        value as Record<string, unknown>,
        path,
      )
    }
  }
}

function validateFields(
  fields: FieldSet,
  data: Record<string, unknown>,
  path: readonly (string | number)[],
): ComponentData {
  for (const key of Object.keys(data)) {
    if (!(key in fields)) {
      throw new ValidationError(`unknown field`, [...path, key])
    }
  }
  const out: ComponentData = {}
  for (const [name, field] of Object.entries(fields)) {
    const raw = data[name]
    if (raw === undefined) {
      if (field.default !== undefined) {
        out[name] = validateValue(field.type, field.default, [...path, name], field)
        continue
      }
      if (field.required) {
        throw new ValidationError('missing required field', [...path, name])
      }
      continue
    }
    out[name] = validateValue(field.type, raw, [...path, name], field)
  }
  return out
}

/**
 * Validate a component write against its schema, returning the normalized
 * (coerced) data with `int`/`dec`/`ref` fields as bigint.
 */
export function validateComponent(
  schema: ComponentSchema,
  data: ComponentData,
): ComponentData {
  return validateFields(schema.fields, data, [schema.name])
}

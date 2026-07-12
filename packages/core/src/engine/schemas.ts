import type { SchemaFieldDef, RegisteredSchema } from './types.js'

const SCHEMAS: Record<string, RegisteredSchema> = {}

const TYPES: Record<string, (v: unknown) => boolean> = {
  number: (v): v is number => typeof v === 'number' && !Number.isNaN(v),
  string: (v): v is string => typeof v === 'string',
  boolean: (v): v is boolean => typeof v === 'boolean',
  integer: (v): v is number => Number.isInteger(v),
  array: (v): boolean => Array.isArray(v),
}

export function registerSchema(name: string, fields: Record<string, SchemaFieldDef>): RegisteredSchema {
  if (SCHEMAS[name]) {
    throw new Error(`Schema "${name}" is already registered`)
  }
  if (!name || typeof name !== 'string') {
    throw new Error('Schema name must be a non-empty string')
  }
  if (!fields || typeof fields !== 'object' || Array.isArray(fields)) {
    throw new Error('Schema fields must be a plain object')
  }
  for (const [key, def] of Object.entries(fields)) {
    if (!def.type || !TYPES[def.type]) {
      throw new Error(`Schema "${name}": field "${key}" has unknown type "${def.type}"`)
    }
  }
  SCHEMAS[name] = { name, fields }
  return SCHEMAS[name]!
}

export function validate(componentName: string, data: Record<string, unknown>): boolean {
  const schema = SCHEMAS[componentName]
  if (!schema) {
    throw new Error(`No schema registered for component "${componentName}"`)
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error(`Component "${componentName}" data must be a plain object`)
  }
  for (const [key, def] of Object.entries(schema.fields)) {
    const value = data[key]
    if (def.required && (value === undefined || value === null)) {
      throw new Error(`Component "${componentName}": required field "${key}" is missing`)
    }
    if (value !== undefined && value !== null && !TYPES[def.type]!(value)) {
      throw new Error(`Component "${componentName}": field "${key}" must be of type ${def.type}, got ${typeof value}`)
    }
  }
  return true
}

export function getRegisteredSchema(name: string): RegisteredSchema | undefined {
  return SCHEMAS[name]
}

export function getRegisteredSchemaNames(): string[] {
  return Object.keys(SCHEMAS)
}

export function schemaExists(name: string): boolean {
  return !!SCHEMAS[name]
}

export function validateAllSchemas(requiredSchemas: string[]): void {
  const missing: string[] = []
  for (const name of requiredSchemas) {
    if (!SCHEMAS[name]) {
      missing.push(name)
    }
  }
  if (missing.length > 0) {
    const registered = Object.keys(SCHEMAS).join(', ') || '(none)'
    throw new Error(
      `Missing schema(s): ${missing.join(', ')}\n` +
      `Registered schemas: ${registered}\n` +
      `Add registerSchema('${missing[0]}', { ... }) before use.`
    )
  }
}

export { SCHEMAS }

registerSchema('Position', {
  x: { type: 'number', required: true },
  y: { type: 'number', required: true },
})

registerSchema('Velocity', {
  x: { type: 'number', required: true },
  y: { type: 'number', required: true },
})

registerSchema('Health', {
  current: { type: 'number', required: true },
  max: { type: 'number', required: true },
})

registerSchema('TargetScanner', {
  range: { type: 'number', required: true },
  targetEntity: { type: 'number', required: false },
})

registerSchema('Camera', {
  x: { type: 'number', required: true },
  y: { type: 'number', required: true },
  width: { type: 'number', required: true },
  height: { type: 'number', required: true },
  zoom: { type: 'number', required: true },
  targetEntity: { type: 'number', required: false },
  minX: { type: 'number', required: false },
  minY: { type: 'number', required: false },
  maxX: { type: 'number', required: false },
  maxY: { type: 'number', required: false },
})

registerSchema('Collider', {
  width: { type: 'number', required: true },
  height: { type: 'number', required: true },
  offsetX: { type: 'number', required: false },
  offsetY: { type: 'number', required: false },
  solid: { type: 'boolean', required: false },
  group: { type: 'number', required: false },
  mask: { type: 'number', required: false },
})

registerSchema('ZOrder', {
  layer: { type: 'number', required: true },
  order: { type: 'number', required: true },
})

registerSchema('PathFollower', {
  path: { type: 'array', required: true },
  index: { type: 'number', required: true },
  speed: { type: 'number', required: true },
  loop: { type: 'boolean', required: false },
})

registerSchema('AudioSource', {
  src: { type: 'string', required: true },
  volume: { type: 'number', required: true },
  loop: { type: 'boolean', required: true },
  spatial: { type: 'boolean', required: true },
})

registerSchema('ParticleEmitter', {
  rate: { type: 'number', required: true },
  lifetime: { type: 'number', required: true },
  speed: { type: 'number', required: true },
  color: { type: 'string', required: true },
  size: { type: 'number', required: true },
  active: { type: 'boolean', required: true },
})

registerSchema('Particle', {
  remaining: { type: 'number', required: true },
  color: { type: 'string', required: true },
  size: { type: 'number', required: true },
})

// Sub-Engine v2 — I3.7 golden replay.
//
// A golden replay pins (seed, engineVersion, dt, ticks, intents) to the world
// hash those produce. CI re-runs it forever: a hash mismatch with a matching
// engine version is a determinism bug; an engine-version mismatch is an invalid
// replay (re-record it).

import type { App, JsonObject } from './types.js'
import { getSchema, listSchemas } from './schema.js'
import { sha256 } from './hash.js'
import { SchemaError } from './errors.js'

export interface GoldenIntent {
  tick: number
  intent: JsonObject
}

export interface GoldenReplay {
  name: string
  engineVersion: string
  seed: number
  dt: number
  ticks: number
  intents: GoldenIntent[]
  hash: string
}

/**
 * The engine version is the ordered hash of `(name, version)` for every system
 * in execution order plus every registered schema version (I2.6).
 */
export function engineVersion(app: App): string {
  const systems = app
    .systems()
    .map((s) => `${s.name}@${s.version}`)
    .join(',')
  const schemas = listSchemas()
    .map((name) => `${name}@${getSchema(name)?.version ?? 0}`)
    .join(',')
  return `sha256:${sha256(`systems[${systems}]schemas[${schemas}]`)}`
}

export interface RecordMeta {
  name: string
  dt: number
  ticks: number
  intents?: GoldenIntent[]
}

/** Capture the current app state as a golden replay record. */
export function recordGolden(app: App, meta: RecordMeta): GoldenReplay {
  return {
    name: meta.name,
    engineVersion: engineVersion(app),
    seed: app.world.seed,
    dt: meta.dt,
    ticks: meta.ticks,
    intents: meta.intents ?? [],
    hash: app.hash(),
  }
}

/**
 * Re-run a golden replay against a freshly built app and assert the hash.
 * Throws on an engine-version mismatch (invalid replay) or a hash mismatch
 * (determinism bug).
 */
export function verifyGolden(
  golden: GoldenReplay,
  createAppForReplay: () => App,
  applyIntent?: (app: App, intent: JsonObject) => void,
): void {
  const app = createAppForReplay()
  const version = engineVersion(app)
  if (version !== golden.engineVersion) {
    throw new SchemaError(
      `Invalid replay "${golden.name}": engine version mismatch ` +
        `(recorded ${golden.engineVersion}, current ${version}). Re-record it.`,
    )
  }
  if (app.world.seed !== golden.seed) {
    throw new SchemaError(
      `Invalid replay "${golden.name}": seed mismatch ` +
        `(recorded ${golden.seed}, got ${app.world.seed}).`,
    )
  }

  const intentsByTick = new Map<number, JsonObject[]>()
  for (const { tick, intent } of golden.intents) {
    const list = intentsByTick.get(tick) ?? []
    list.push(intent)
    intentsByTick.set(tick, list)
  }

  for (let tick = 0; tick < golden.ticks; tick++) {
    for (const intent of intentsByTick.get(tick) ?? []) applyIntent?.(app, intent)
    app.step(golden.dt)
  }

  const actual = app.hash()
  if (actual !== golden.hash) {
    throw new SchemaError(
      `Determinism bug in replay "${golden.name}": ` +
        `expected ${golden.hash}, got ${actual}`,
    )
  }
}

// Sub-Engine v2 — I3.5 determinism guard.
//
// In dev/test (strict mode) the wall clock, `Math.random`, and transcendental
// `Math.*` throw while a tick is executing. These are the leaks that make a run
// irreproducible. The `**` operator and `new Date()` are covered by a lint rule
// rather than this runtime guard.

import { SchemaError } from './errors.js'

const BANNED_MATH = [
  'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'atan2',
  'exp', 'log', 'log2', 'log10', 'pow', 'cbrt', 'hypot',
] as const

type AnyFn = (...args: unknown[]) => unknown

let depth = 0

interface Patch {
  restore: () => void
  leak: (api: string) => never
}

function makeGuard(label: string): Patch {
  const restores: Array<() => void> = []
  const leak = (api: string): never => {
    throw new SchemaError(
      `Determinism leak: ${api} called inside system "${label}". ` +
        `Use ctx.time / ctx.rng instead.`,
    )
  }

  const patchMath = (name: string): void => {
    const original = (Math as unknown as Record<string, AnyFn>)[name]
    if (typeof original !== 'function') return
    ;(Math as unknown as Record<string, AnyFn>)[name] = () => leak(`Math.${name}()`)
    restores.push(() => {
      ;(Math as unknown as Record<string, AnyFn>)[name] = original
    })
  }
  for (const name of BANNED_MATH) patchMath(name)
  patchMath('random')

  const originalDateNow = Date.now
  Date.now = () => leak('Date.now()')
  restores.push(() => {
    Date.now = originalDateNow
  })

  const perf = globalThis.performance as unknown as { now?: AnyFn } | undefined
  if (perf && typeof perf.now === 'function') {
    const original = perf.now
    perf.now = () => leak('performance.now()')
    restores.push(() => {
      perf.now = original
    })
  }

  const cryptoObj = globalThis.crypto as unknown as { randomUUID?: AnyFn } | undefined
  if (cryptoObj && typeof cryptoObj.randomUUID === 'function') {
    const original = cryptoObj.randomUUID
    cryptoObj.randomUUID = () => leak('crypto.randomUUID()')
    restores.push(() => {
      cryptoObj.randomUUID = original
    })
  }

  return {
    leak,
    restore: () => {
      for (const restore of restores.reverse()) restore()
    },
  }
}

/** Run `fn` with banned APIs stubbed to throw. Reentrant-safe. */
export function withDeterminismGuard<T>(label: string, fn: () => T): T {
  if (depth > 0) return fn() // an outer guard already covers this call
  depth = 1
  const patch = makeGuard(label)
  try {
    return fn()
  } finally {
    patch.restore()
    depth = 0
  }
}

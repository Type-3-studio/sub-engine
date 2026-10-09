import { describe, it, expect } from 'vitest'
import { defineSystem, createApp } from '@sub-engine/core/v2'

function appWith(body: () => void, strict = true) {
  const app = createApp({ schemas: [], strict })
  app.use(
    defineSystem({
      name: 'leaky',
      version: 1,
      reads: [],
      writes: [],
      emits: [],
      run: body,
    }),
  )
  return app
}

describe('I3.5 determinism guard', () => {
  it('throws when a system calls Date.now()', () => {
    const app = appWith(() => Date.now())
    expect(() => app.step(16)).toThrow(/leaky/)
    expect(() => app.step(16)).toThrow(/Date\.now/)
  })

  it('throws when a system calls Math.random()', () => {
    const app = appWith(() => Math.random())
    expect(() => app.step(16)).toThrow(/Math\.random/)
  })

  it('throws when a system calls a transcendental Math function', () => {
    const app = appWith(() => Math.sin(1))
    expect(() => app.step(16)).toThrow(/Math\.sin/)
  })

  it('restores the globals after the step', () => {
    const app = appWith(() => Date.now())
    expect(() => app.step(16)).toThrow()
    // Guard must not leak: real APIs work again outside the tick.
    expect(typeof Date.now()).toBe('number')
    expect(Math.sin(0)).toBe(0)
    expect(Math.random()).toBeGreaterThanOrEqual(0)
  })

  it('does not guard when strict is off (production)', () => {
    const app = appWith(() => Date.now(), false)
    expect(() => app.step(16)).not.toThrow()
  })
})

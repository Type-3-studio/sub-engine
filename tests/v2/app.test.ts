import { describe, it, expect } from 'vitest'
import {
  createApp,
  defineSystem,
  defineSchema,
  t,
  type SystemContext,
} from '@sub-engine/core/v2'

const Counter = defineSchema('SysCounter', {
  value: { type: t.int(), required: true },
})
const Other = defineSchema('SysOther', {
  value: { type: t.int(), required: true },
})

function makeCounter(app: ReturnType<typeof createApp>) {
  const e = app.world.spawn()
  app.world.add(e, 'SysCounter', { value: 0n })
  return e
}

describe('I2.2 scheduler', () => {
  it('orders systems by declared dependency regardless of registration order', () => {
    const writes = defineSystem({
      name: 'writer',
      version: 1,
      reads: [],
      writes: ['SysCounter'],
      emits: [],
      run: () => {},
    })
    const reads = defineSystem({
      name: 'reader',
      version: 1,
      reads: ['SysCounter'],
      writes: [],
      emits: [],
      run: () => {},
    })
    const app = createApp({ schemas: [Counter] })
    app.use(reads) // registered first...
    app.use(writes) // ...but must run first
    expect(app.systemOrder()).toEqual(['writer', 'reader'])
  })

  it('resolves a write-write conflict by registration index without cycling', () => {
    const a = defineSystem({
      name: 'a',
      version: 1,
      reads: ['SysCounter'],
      writes: ['SysCounter'],
      emits: [],
      run: () => {},
    })
    const b = defineSystem({
      name: 'b',
      version: 1,
      reads: ['SysCounter'],
      writes: ['SysCounter'],
      emits: [],
      run: () => {},
    })
    const app = createApp({ schemas: [Counter] })
    app.use(a)
    app.use(b)
    expect(app.systemOrder()).toEqual(['a', 'b'])
  })

  it('throws and prints the cycle for a genuine dependency cycle', () => {
    const a = defineSystem({
      name: 'cycleA',
      version: 1,
      reads: ['SysOther'],
      writes: ['SysCounter'],
      emits: [],
      run: () => {},
    })
    const b = defineSystem({
      name: 'cycleB',
      version: 1,
      reads: ['SysCounter'],
      writes: ['SysOther'],
      emits: [],
      run: () => {},
    })
    const app = createApp({ schemas: [Counter, Other] })
    app.use(a)
    app.use(b)
    expect(() => app.systemOrder()).toThrow(/cycle/i)
  })

  it('rejects duplicate system names', () => {
    const s = defineSystem({
      name: 'dup',
      version: 1,
      reads: [],
      writes: [],
      emits: [],
      run: () => {},
    })
    const app = createApp({ schemas: [] })
    app.use(s)
    expect(() => app.use(s)).toThrow(/dup/)
  })
})

describe('I2.4 strict access enforcement', () => {
  it('throws when a system writes a component outside its contract', () => {
    const illegal = defineSystem({
      name: 'illegalWriter',
      version: 1,
      reads: [],
      writes: [],
      emits: [],
      run: (ctx) => {
        ctx.world.set(1 as never, 'SysCounter', { value: 1n })
      },
    })
    const app = createApp({ schemas: [Counter], strict: true })
    app.use(illegal)
    expect(() => app.step(16)).toThrow(/illegalWriter/)
  })

  it('throws when a system reads a component outside its contract', () => {
    const illegal = defineSystem({
      name: 'illegalReader',
      version: 1,
      reads: [],
      writes: [],
      emits: [],
      run: (ctx) => {
        ctx.world.read(1 as never, 'SysCounter')
      },
    })
    const app = createApp({ schemas: [Counter], strict: true })
    app.use(illegal)
    expect(() => app.step(16)).toThrow(/illegalReader/)
  })
})

describe('I2.3 events and SimTime', () => {
  it('delivers events after all systems run, in handler registration order', () => {
    const order: string[] = []
    const emitter = defineSystem({
      name: 'emitter',
      version: 1,
      reads: [],
      writes: [],
      emits: ['ping'],
      run: (ctx) => {
        order.push('system')
        ctx.events.emit('ping', { n: 1 })
      },
    })
    const app = createApp({ schemas: [], strict: true })
    app.use(emitter)
    app.on('ping', () => order.push('h1'))
    app.on('ping', () => order.push('h2'))
    app.step(16)
    expect(order).toEqual(['system', 'h1', 'h2'])
  })

  it('rejects emitting an undeclared event type in strict mode', () => {
    const bad = defineSystem({
      name: 'badEmit',
      version: 1,
      reads: [],
      writes: [],
      emits: [],
      run: (ctx) => ctx.events.emit('rogue'),
    })
    const app = createApp({ schemas: [], strict: true })
    app.use(bad)
    expect(() => app.step(16)).toThrow(/badEmit/)
  })

  it('advances tick and passes dt into systems', () => {
    const seen: Array<{ tick: number; dt: number }> = []
    const s = defineSystem({
      name: 'clock',
      version: 1,
      reads: [],
      writes: [],
      emits: [],
      run: (ctx: SystemContext, dt: number) => {
        seen.push({ tick: ctx.time.tick, dt })
      },
    })
    const app = createApp({ schemas: [] })
    app.use(s)
    app.step(16)
    app.step(16)
    expect(seen).toEqual([
      { tick: 0, dt: 16 },
      { tick: 1, dt: 16 },
    ])
    expect(app.tick).toBe(2)
  })
})

describe('I3.4 deterministic step', () => {
  it('produces an identical hash for the same seed and systems', () => {
    const build = () => {
      const app = createApp({ schemas: [Counter], seed: 9001 })
      const e = makeCounter(app)
      app.use(
        defineSystem({
          name: 'random',
          version: 1,
          reads: ['SysCounter'],
          writes: ['SysCounter'],
          emits: [],
          run: (ctx) => {
            const v = ctx.rng.int(0, 1_000_000)
            ctx.world.set(e, 'SysCounter', { value: BigInt(v) })
          },
        }),
      )
      for (let i = 0; i < 200; i++) app.step(16)
      return app
    }
    expect(build().hash()).toBe(build().hash())
  })

  it('differs for different seeds', () => {
    const run = (seed: number) => {
      const app = createApp({ schemas: [Counter], seed })
      const e = makeCounter(app)
      app.use(
        defineSystem({
          name: 'random',
          version: 1,
          reads: ['SysCounter'],
          writes: ['SysCounter'],
          emits: [],
          run: (ctx) => {
            ctx.world.set(e, 'SysCounter', { value: BigInt(ctx.rng.int(0, 1_000_000)) })
          },
        }),
      )
      for (let i = 0; i < 50; i++) app.step(16)
      return app.hash()
    }
    expect(run(1)).not.toBe(run(2))
  })
})

import { describe, it, expect } from 'vitest'
import {
  createApp,
  defineSchema,
  defineSystem,
  recordGolden,
  verifyGolden,
  engineVersion,
  t,
  type App,
  type ComponentData,
} from '@sub-engine/core/v2'

const GoldenCounter = defineSchema('GoldenCounter', {
  value: { type: t.int(), required: true },
})

function factory(): App {
  const app = createApp({ schemas: [GoldenCounter], seed: 424242 })
  const e = app.world.spawn()
  app.world.add(e, 'GoldenCounter', { value: 0n })
  app.use(
    defineSystem({
      name: 'grow',
      version: 1,
      reads: ['GoldenCounter'],
      writes: ['GoldenCounter'],
      emits: [],
      run: (ctx) => {
        for (const view of ctx.world.query('GoldenCounter')) {
          const current = (view.GoldenCounter as Readonly<ComponentData>).value as bigint
          ctx.world.set(view.id, 'GoldenCounter', {
            value: current + BigInt(ctx.rng.int(1, 4)),
          })
        }
      },
    }),
  )
  return app
}

function runAndRecord() {
  const app = factory()
  for (let i = 0; i < 100; i++) app.step(16)
  const golden = recordGolden(app, { name: 'idle-smoke', dt: 16, ticks: 100 })
  return { app, golden }
}

describe('I3.7 golden replay', () => {
  it('reproduces its hash', () => {
    const { golden } = runAndRecord()
    expect(() => verifyGolden(golden, factory)).not.toThrow()
  })

  it('pins the engine version (systems + schemas)', () => {
    const { golden } = runAndRecord()
    expect(golden.engineVersion).toBe(engineVersion(factory()))
    expect(golden.seed).toBe(424242)
  })

  it('rejects a tampered engine version as an invalid replay', () => {
    const { golden } = runAndRecord()
    expect(() =>
      verifyGolden({ ...golden, engineVersion: 'sha256:deadbeef' }, factory),
    ).toThrow(/Invalid replay/)
  })

  it('rejects a tampered seed as an invalid replay', () => {
    const { golden } = runAndRecord()
    expect(() => verifyGolden({ ...golden, seed: 1 }, factory)).toThrow(/Invalid replay/)
  })

  it('reports a hash mismatch as a determinism bug', () => {
    const { golden } = runAndRecord()
    expect(() =>
      verifyGolden({ ...golden, hash: 'sha256:0000' }, factory),
    ).toThrow(/Determinism bug/)
  })
})

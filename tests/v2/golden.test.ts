import { describe, it, expect } from 'vitest'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { recordGolden, verifyGolden, type GoldenReplay } from '@sub-engine/core/v2'
import { createIdleSmokeApp, DEMO_DT, DEMO_TICKS } from './fixtures/idleSmoke.js'

const here = dirname(fileURLToPath(import.meta.url))
const goldenPath = join(here, '..', 'golden', 'v2', 'idle-smoke.json')

// `RECORD_GOLDEN=1 vitest run tests/v2/golden.test.ts` re-records the fixture.
// CI never sets this; it only verifies.
if (process.env.RECORD_GOLDEN) {
  const app = createIdleSmokeApp()
  for (let tick = 0; tick < DEMO_TICKS; tick++) app.step(DEMO_DT)
  const golden = recordGolden(app, { name: 'idle-smoke', dt: DEMO_DT, ticks: DEMO_TICKS })
  mkdirSync(dirname(goldenPath), { recursive: true })
  writeFileSync(goldenPath, `${JSON.stringify(golden, null, 2)}\n`)
}

describe('golden replay: idle-smoke', () => {
  it('is committed and well-formed', () => {
    const golden = JSON.parse(readFileSync(goldenPath, 'utf8')) as GoldenReplay
    expect(golden.name).toBe('idle-smoke')
    expect(golden.ticks).toBe(DEMO_TICKS)
    expect(golden.hash).toMatch(/^sha256:[0-9a-f]{64}$/)
  })

  it('re-runs deterministically to its recorded hash', () => {
    const golden = JSON.parse(readFileSync(goldenPath, 'utf8')) as GoldenReplay
    expect(() => verifyGolden(golden, createIdleSmokeApp)).not.toThrow()
  })
})

import { describe, it, expect } from 'vitest'
import { createRng } from '@sub-engine/core/v2'

describe('I3.2 seeded, streamed RNG', () => {
  it('is reproducible for a given seed', () => {
    const a = createRng(12345)
    const b = createRng(12345)
    const seqA = Array.from({ length: 32 }, () => a.uint32())
    const seqB = Array.from({ length: 32 }, () => b.uint32())
    expect(seqA).toEqual(seqB)
  })

  it('differs across seeds', () => {
    const a = createRng(1)
    const b = createRng(2)
    expect(a.uint32()).not.toBe(b.uint32())
  })

  it('uint32 stays a uint32 and next stays in [0,1)', () => {
    const rng = createRng(7)
    for (let i = 0; i < 1000; i++) {
      const u = rng.uint32()
      expect(Number.isInteger(u)).toBe(true)
      expect(u).toBeGreaterThanOrEqual(0)
      expect(u).toBeLessThanOrEqual(0xffffffff)
      const n = rng.next()
      expect(n).toBeGreaterThanOrEqual(0)
      expect(n).toBeLessThan(1)
    }
  })

  it('int is bounded and bool respects its probability', () => {
    const rng = createRng(99)
    for (let i = 0; i < 500; i++) {
      const v = rng.int(5, 10)
      expect(v).toBeGreaterThanOrEqual(5)
      expect(v).toBeLessThan(10)
    }
    const always = createRng(3)
    expect(always.bool(1)).toBe(true)
    const never = createRng(3)
    expect(never.bool(0)).toBe(false)
  })

  it('fork streams are isolated from each other and from parent draws', () => {
    // Drawing from one stream must not perturb another.
    const a = createRng(42)
    const loot1 = a.fork('loot').uint32()
    const _combat = a.fork('combat').uint32()
    const loot2 = a.fork('loot').uint32()
    expect(loot2).toBe(loot1)

    // A fresh world with the same seed produces the same stream.
    const fresh = createRng(42)
    expect(fresh.fork('loot').uint32()).toBe(loot1)
  })

  it('fork is stable no matter how many parent draws happened', () => {
    const a = createRng(7)
    const before = a.fork('x').uint32()
    a.uint32()
    a.uint32()
    expect(a.fork('x').uint32()).toBe(before)
  })
})

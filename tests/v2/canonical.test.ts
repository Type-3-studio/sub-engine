import { describe, it, expect, beforeAll } from 'vitest'
import {
  createWorld,
  defineSchema,
  registerMigration,
  clearMigrations,
  canonicalValue,
  t,
} from '@sub-engine/core/v2'

const CanonWallet = defineSchema('CanonWallet', {
  coins: { type: t.int(), required: true },
  rate: { type: t.dec(1_000_000_000), required: true },
})

const CanonLabel = defineSchema('CanonLabel', {
  value: { type: t.string(), required: true },
})

const CanonPos = defineSchema('CanonPos', {
  x: { type: t.f64(), required: true },
  y: { type: t.f64(), required: true },
})

describe('I1.5 canonical snapshot, restore and hash', () => {
  const build = () => {
    const w = createWorld({ schemas: [CanonWallet, CanonLabel, CanonPos], seed: 12345 })
    const a = w.spawn()
    const b = w.spawn()
    w.add(a, 'CanonWallet', { coins: 1500n, rate: 1.5 })
    w.add(a, 'CanonPos', { x: 2.5, y: -0 })
    w.add(b, 'CanonLabel', { value: 'town' })
    return { w, a, b }
  }

  it('serializes exact numerics as decimal strings and normalises -0', () => {
    const { w } = build()
    const snap = w.snapshot()
    expect(snap.worldVersion).toBe(1)
    expect(snap.seed).toBe(12345)
    const wallet = snap.entities[0]!.components.find((c) => c.type === 'CanonWallet')!
    expect(wallet.v).toBe(1)
    expect(wallet.data).toEqual({ coins: '1500', rate: '1500000000' })
    const pos = snap.entities[0]!.components.find((c) => c.type === 'CanonPos')!
    expect(pos.data).toEqual({ x: 2.5, y: 0 })
  })

  it('produces byte-identical canonical output across runs', () => {
    const a = build().w.canonical()
    const b = build().w.canonical()
    expect(a).toBe(b)
  })

  it('sorts components by type regardless of write order', () => {
    const w1 = createWorld({ schemas: [CanonWallet, CanonLabel], seed: 1 })
    const e1 = w1.spawn()
    w1.add(e1, 'CanonWallet', { coins: 1n, rate: 0 })
    w1.add(e1, 'CanonLabel', { value: 'x' })

    const w2 = createWorld({ schemas: [CanonWallet, CanonLabel], seed: 1 })
    const e2 = w2.spawn()
    w2.add(e2, 'CanonLabel', { value: 'x' })
    w2.add(e2, 'CanonWallet', { coins: 1n, rate: 0 })

    expect(w1.canonical()).toBe(w2.canonical())
    expect(w1.hash()).toBe(w2.hash())
  })

  it('round-trips: hash(restore(snapshot)) === hash(original)', () => {
    const { w } = build()
    const target = createWorld({ schemas: [CanonWallet, CanonLabel, CanonPos] })
    target.restore(w.snapshot())
    expect(target.hash()).toBe(w.hash())
    expect(target.canonical()).toBe(w.canonical())
  })

  it('restores nextId so ids are never reused', () => {
    const { w, b } = build()
    const target = createWorld({ schemas: [CanonWallet, CanonLabel, CanonPos] })
    target.restore(w.snapshot())
    const next = target.spawn()
    expect(next).toBeGreaterThan(b)
  })

  it('hashes with a sha256: prefix', () => {
    expect(build().w.hash()).toMatch(/^sha256:[0-9a-f]{64}$/)
  })
})

describe('I1.2 canonicalValue', () => {
  it('serializes each value kind deterministically', () => {
    expect(canonicalValue(t.int(), 42n)).toBe('"42"')
    expect(canonicalValue(t.dec(1000), 1500n)).toBe('"1500"')
    expect(canonicalValue(t.f64(), -0)).toBe('0')
    expect(canonicalValue(t.bool(), true)).toBe('true')
    expect(canonicalValue(t.string(), 'a"b')).toBe('"a\\"b"')
    expect(canonicalValue(t.enum(['a', 'b']), 'b')).toBe('"b"')
    expect(canonicalValue(t.vec2(), { x: 1, y: 2 })).toBe('{"x":1,"y":2}')
    expect(canonicalValue(t.list(t.int()), [1n, 2n])).toBe('["1","2"]')
    expect(canonicalValue(t.map(t.int()), { b: 2n, a: 1n })).toBe('{"a":"1","b":"2"}')
    expect(canonicalValue(t.nullable(t.int()), null)).toBe('null')
  })
})

describe('I1.6 migrations', () => {
  beforeAll(() => clearMigrations())

  const MigThing = defineSchema(
    'MigThing',
    {
      a: { type: t.int(), required: true },
      b: { type: t.string(), required: true },
      c: { type: t.bool(), required: true },
    },
    3,
  )

  it('runs the migration chain from the snapshot version to current', () => {
    registerMigration('MigThing', 1, 2, (d) => ({ ...d, b: 'added' }))
    registerMigration('MigThing', 2, 3, (d) => ({ ...d, c: true }))

    const w = createWorld({ schemas: [MigThing], seed: 0 })
    w.restore({
      worldVersion: 1,
      nextId: 2,
      seed: 0,
      entities: [{ id: 1, components: [{ type: 'MigThing', v: 1, data: { a: '7' } }] }],
    })
    const data = w.read<{ a: bigint; b: string; c: boolean }>(1 as never, 'MigThing')
    expect(data.a).toBe(7n)
    expect(data.b).toBe('added')
    expect(data.c).toBe(true)
  })

  it('throws when a required migration step is missing', () => {
    const MigMissing = defineSchema(
      'MigMissing',
      { a: { type: t.int(), required: true }, b: { type: t.string(), required: true } },
      2,
    )
    const w = createWorld({ schemas: [MigMissing], seed: 0 })
    expect(() =>
      w.restore({
        worldVersion: 1,
        nextId: 2,
        seed: 0,
        entities: [{ id: 1, components: [{ type: 'MigMissing', v: 1, data: { a: '1' } }] }],
      }),
    ).toThrow(/MigMissing.*v1/)
  })
})

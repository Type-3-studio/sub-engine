import { describe, it, expect } from 'vitest'
import { createWorld, defineSchema, t } from '@sub-engine/core/v2'

const Wallet = defineSchema('Wallet', {
  coins: { type: t.int(), required: true },
})

const Label = defineSchema('Label', {
  value: { type: t.string(), required: true },
})

describe('I1 World Model — lifecycle, CRUD, validation', () => {
  const makeWorld = () => createWorld({ schemas: [Wallet, Label], seed: 1 })

  it('spawns sequential, never-reused entity ids', () => {
    const w = makeWorld()
    const a = w.spawn()
    const b = w.spawn()
    expect(b).toBeGreaterThan(a)
    expect(w.exists(a)).toBe(true)
    w.despawn(a)
    expect(w.exists(a)).toBe(false)
    expect(w.exists(b)).toBe(true)
    // ids are never reused
    const c = w.spawn()
    expect(c).not.toBe(a)
    expect(c).toBeGreaterThan(b)
  })

  it('adds, reads, gets and tests components', () => {
    const w = makeWorld()
    const e = w.spawn()
    w.add(e, 'Wallet', { coins: 1500n })

    expect(w.has(e, 'Wallet')).toBe(true)
    const read = w.read(e, 'Wallet') as { coins: bigint }
    expect(read.coins).toBe(1500n)

    const copy = w.get<{ coins: bigint }>(e, 'Wallet')
    expect(copy?.coins).toBe(1500n)
    // get is a structural copy — mutating it must not touch the world
    if (copy) copy.coins = 0n
    expect((w.read(e, 'Wallet') as { coins: bigint }).coins).toBe(1500n)
  })

  it('read returns a frozen reference (accidental mutation throws)', () => {
    const w = makeWorld()
    const e = w.spawn()
    w.add(e, 'Wallet', { coins: 1n })
    const read = w.read<{ coins: bigint }>(e, 'Wallet')
    expect(read.coins).toBe(1n)
    expect(() => {
      // @ts-expect-error read values are readonly
      read.coins = 2n
    }).toThrow()
  })

  it('throws when writing to an entity that does not exist', () => {
    const w = makeWorld()
    expect(() => w.add(999 as never, 'Wallet', { coins: 1n })).toThrow(/999/)
  })

  it('throws when despawning a nonexistent entity', () => {
    const w = makeWorld()
    expect(() => w.despawn(42 as never)).toThrow(/42/)
  })

  it('rejects an unregistered component type, naming it', () => {
    const w = makeWorld()
    const e = w.spawn()
    expect(() => w.add(e, 'Nope', {})).toThrow(/Nope/)
  })

  it('rejects a missing required field with the full path', () => {
    const w = makeWorld()
    const e = w.spawn()
    expect(() => w.add(e, 'Wallet', {})).toThrow(/Wallet\.coins/)
  })

  it('rejects a type mismatch rather than coercing', () => {
    const w = makeWorld()
    const e = w.spawn()
    expect(() => w.add(e, 'Wallet', { coins: 'lots' })).toThrow(/coins/)
    expect(() => w.add(e, 'Wallet', { coins: 1.5 })).toThrow(/coins/)
  })

  it('rejects NaN and Infinity in numeric fields', () => {
    const Floaty = defineSchema('Floaty', { x: { type: t.f64(), required: true } })
    const w = createWorld({ schemas: [Floaty], seed: 1 })
    const e = w.spawn()
    expect(() => w.add(e, 'Floaty', { x: NaN })).toThrow(/x/)
    expect(() => w.add(e, 'Floaty', { x: Infinity })).toThrow(/x/)
  })

  it('queries in ascending id order regardless of spawn order', () => {
    const w = makeWorld()
    const ids = [w.spawn(), w.spawn(), w.spawn()]
    for (const id of ids) w.add(id, 'Wallet', { coins: 1n })
    // Give non-ascending write order, but query must be ascending.
    const result = w.query('Wallet').map((e) => e.id)
    expect(result).toEqual([...ids].sort((a, b) => a - b))
  })

  it('query filters on all requested component types', () => {
    const w = makeWorld()
    const withLabel = w.spawn()
    const walletOnly = w.spawn()
    w.add(withLabel, 'Wallet', { coins: 1n })
    w.add(withLabel, 'Label', { value: 'hi' })
    w.add(walletOnly, 'Wallet', { coins: 2n })

    expect(w.query('Wallet').map((e) => e.id)).toContain(walletOnly)
    expect(w.query('Wallet', 'Label').map((e) => e.id)).toEqual([withLabel])
  })
})

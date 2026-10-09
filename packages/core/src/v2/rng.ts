// Sub-Engine v2 — I3.2 seeded, streamed RNG (PCG32).
//
// Pure 64-bit integer math via bigint: identical on every engine/platform.
// Streams are forked from a label so unrelated systems cannot perturb each
// other's sequence — critical for long-term determinism as code evolves.

import type { Rng } from './types.js'

const MASK64 = (1n << 64n) - 1n
const MULTIPLIER = 6364136223846793005n
const FNV_OFFSET = 0xcbf29ce484222325n
const FNV_PRIME = 0x100000001b3n

/** 64-bit FNV-1a over a UTF-16 string, used to derive stream seeds. */
function fnv1a64(text: string): bigint {
  let hash = FNV_OFFSET
  for (let i = 0; i < text.length; i++) {
    hash ^= BigInt(text.charCodeAt(i))
    hash = (hash * FNV_PRIME) & MASK64
  }
  return hash
}

function rotateRight32(value: number, rot: number): number {
  return ((value >>> rot) | (value << ((32 - rot) & 31))) >>> 0
}

/**
 * Create an RNG stream from an integer seed. The same seed always yields the
 * same sequence; `fork(label)` derives an independent stream.
 */
export function createRng(seed: number | bigint, streamLabel = ''): Rng {
  const baseSeed = typeof seed === 'bigint' ? seed & MASK64 : BigInt(seed) & MASK64
  const streamSeed = streamLabel === '' ? baseSeed : (baseSeed ^ fnv1a64(streamLabel)) & MASK64
  const increment = ((streamSeed << 1n) | 1n) & MASK64

  let state = 0n
  // PCG32 seeding: warm the state, add the seed, then warm again.
  state = (state * MULTIPLIER + increment) & MASK64
  state = (state + streamSeed) & MASK64
  state = (state * MULTIPLIER + increment) & MASK64

  function uint32(): number {
    const old = state
    state = (old * MULTIPLIER + increment) & MASK64
    const xorshifted = Number(((old >> 18n) ^ old) >> 27n) & 0xffffffff
    const rot = Number(old >> 59n)
    return rotateRight32(xorshifted, rot)
  }

  return {
    uint32,
    next: () => uint32() / 0x1_0000_0000,
    int(min: number, maxExclusive: number): number {
      if (maxExclusive <= min) {
        throw new RangeError(`rng.int: empty range [${min}, ${maxExclusive})`)
      }
      return min + (uint32() % (maxExclusive - min))
    },
    bool: (p: number): boolean => uint32() / 0x1_0000_0000 < p,
    pick<T>(items: readonly T[]): T {
      if (items.length === 0) throw new RangeError('rng.pick: empty list')
      return items[uint32() % items.length]!
    },
    fork(label: string): Rng {
      return createRng(streamSeed, label)
    },
  }
}

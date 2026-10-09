// A deterministic demo world used by the golden-replay test and the headless
// hello script. Three systems exercise I1/I2/I3: production, an upgrade loop,
// and a read-only audit that emits an event.

import {
  createApp,
  defineSchema,
  defineSystem,
  t,
  type ComponentData,
  type App,
} from '@sub-engine/core/v2'

export const IdleWallet = defineSchema('IdleWallet', {
  coins: { type: t.int(), required: true },
})

export const IdleGenerator = defineSchema('IdleGenerator', {
  rate: { type: t.int(), required: true },
  count: { type: t.int(), required: true },
})

function field<T>(view: unknown, component: string, key: string): T {
  return (view as Record<string, Readonly<ComponentData>>)[component]![key] as T
}

export const DEMO_TICKS = 100
export const DEMO_DT = 16
export const DEMO_SEED = 12345

export function createIdleSmokeApp(seed = DEMO_SEED): App {
  const app = createApp({ schemas: [IdleWallet, IdleGenerator], seed })
  const wallet = app.world.spawn()
  app.world.add(wallet, 'IdleWallet', { coins: 0n })
  const generator = app.world.spawn()
  app.world.add(generator, 'IdleGenerator', { rate: 1n, count: 0n })

  app.use(
    defineSystem({
      name: 'produce',
      version: 1,
      reads: ['IdleWallet', 'IdleGenerator'],
      writes: ['IdleWallet'],
      emits: [],
      run: (ctx) => {
        let income = 0n
        for (const g of ctx.world.query('IdleGenerator')) {
          income += field<bigint>(g, 'IdleGenerator', 'rate') * field<bigint>(g, 'IdleGenerator', 'count')
        }
        // A small deterministic windfall exercises the seeded RNG stream.
        income += BigInt(ctx.rng.int(0, 2))
        for (const w of ctx.world.query('IdleWallet')) {
          ctx.world.set(w.id, 'IdleWallet', {
            coins: field<bigint>(w, 'IdleWallet', 'coins') + income,
          })
        }
      },
    }),
  )

  app.use(
    defineSystem({
      name: 'upgrade',
      version: 1,
      reads: ['IdleWallet', 'IdleGenerator'],
      writes: ['IdleWallet', 'IdleGenerator'],
      emits: [],
      run: (ctx) => {
        const w = ctx.world.query('IdleWallet')[0]
        const g = ctx.world.query('IdleGenerator')[0]
        if (!w || !g) return
        const coins = field<bigint>(w, 'IdleWallet', 'coins')
        const rate = field<bigint>(g, 'IdleGenerator', 'rate')
        const count = field<bigint>(g, 'IdleGenerator', 'count')
        const cost = (count + 1n) * 10n
        if (coins >= cost) {
          ctx.world.set(w.id, 'IdleWallet', { coins: coins - cost })
          ctx.world.set(g.id, 'IdleGenerator', { rate, count: count + 1n })
        }
      },
    }),
  )

  app.use(
    defineSystem({
      name: 'audit',
      version: 1,
      reads: ['IdleWallet', 'IdleGenerator'],
      writes: [],
      emits: ['audit'],
      run: (ctx) => {
        let coins = 0n
        for (const w of ctx.world.query('IdleWallet')) {
          coins += field<bigint>(w, 'IdleWallet', 'coins')
        }
        ctx.events.emit('audit', { coins: coins.toString() })
      },
    }),
  )

  return app
}

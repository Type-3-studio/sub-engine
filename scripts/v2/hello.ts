// Headless hello world for Sub-Engine v2.
//
// Runs the deterministic idle-smoke world in Node with no browser, no PIXI and
// no DOM — the Phase 0/1 definition of done. Run with:
//
//   npm run v2:hello
//
import { engineVersion } from '@sub-engine/core/v2'
import {
  createIdleSmokeApp,
  DEMO_DT,
  DEMO_TICKS,
} from '../../tests/v2/fixtures/idleSmoke'

const app = createIdleSmokeApp()

let lastAudit = ''
app.on('audit', (_ctx, event) => {
  lastAudit = String(event.payload.coins)
})

for (let tick = 0; tick < DEMO_TICKS; tick++) app.step(DEMO_DT)

const snapshot = app.world.snapshot()
const generator = snapshot.entities
  .flatMap((e) => e.components)
  .find((c) => c.type === 'IdleGenerator')

console.log('Sub-Engine v2 — headless hello')
console.log('  seed:          ', app.world.seed)
console.log('  engineVersion: ', engineVersion(app))
console.log('  systems:       ', app.systemOrder().join(' → '))
console.log('  ticks:         ', DEMO_TICKS)
console.log('  generator:     ', JSON.stringify(generator?.data))
console.log('  last audit:    ', lastAudit)
console.log('  world hash:    ', app.hash())

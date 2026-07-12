import { describe, it, expect } from 'vitest'
import { createRegistry, registerSchema } from '@sub-engine/core'
import { createMapFromMatrix } from '@sub-engine/core'
import { computeFlowField } from '@sub-engine/core'
import { movementSystem, combatSystem } from '@sub-engine/core'

const POS = 'Position'
const VEL = 'Velocity'
const HP = 'Health'
const TARGET = 'TargetScanner'

const TICK_LIMIT = 20
const SPEED = 1.5
const ALTAR_HP = 50
const SCANNER_RANGE = 3
const DAMAGE_PER_TICK = 10

registerSchema('Label', {
  value: { type: 'string', required: true },
})

const MAP_MATRIX: number[][] = [
  [0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0],
  [0, 0, 1, 0, 0],
  [0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0],
]

function navigateWithFlowField(
  registry: ReturnType<typeof createRegistry>,
  flowField: ReturnType<typeof computeFlowField>,
  seekerId: number,
  speed: number,
): void {
  const pos = registry.getComponent(seekerId, POS)!
  const gx = Math.round(pos.x)
  const gy = Math.round(pos.y)
  const vec = flowField.getVector(gx, gy)
  registry.addComponent(seekerId, VEL, {
    x: vec.x * speed,
    y: vec.y * speed,
  })
}

describe('Headless Simulation (Flow Field Navigation)', () => {
  it('automaton reaches and destroys altar', () => {
    const registry = createRegistry()
    const map = createMapFromMatrix(MAP_MATRIX)

    const altar = registry.createEntity()
    registry.addComponent(altar, POS, { x: 4, y: 2 })
    registry.addComponent(altar, HP, { current: ALTAR_HP, max: ALTAR_HP })
    registry.addComponent(altar, 'Label', { value: 'Altar' })

    const automaton = registry.createEntity()
    registry.addComponent(automaton, POS, { x: 0, y: 2 })
    registry.addComponent(automaton, VEL, { x: 0, y: 0 })
    registry.addComponent(automaton, HP, { current: 100, max: 100 })
    registry.addComponent(automaton, TARGET, {
      range: SCANNER_RANGE,
      targetEntity: altar,
    })
    registry.addComponent(automaton, 'Label', { value: 'Automaton' })

    const flowField = computeFlowField(map, 4, 2)

    let finished = false
    for (let tick = 1; tick <= TICK_LIMIT && !finished; tick++) {
      navigateWithFlowField(registry, flowField, automaton, SPEED)
      movementSystem(registry, 16)
      combatSystem(registry, 16)

      const pos = registry.getComponent(automaton, POS)!
      expect(pos.x).toBeGreaterThanOrEqual(0)
      expect(pos.y).toBeGreaterThanOrEqual(0)

      const hp = registry.getComponent(altar, HP)!
      if (hp.current <= 0) {
        finished = true
      }
    }

    const finalHp = registry.getComponent(altar, HP)!
    expect(finalHp.current).toBeLessThanOrEqual(0)
  })
})

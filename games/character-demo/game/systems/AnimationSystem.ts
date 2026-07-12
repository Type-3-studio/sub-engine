import { SCHEMA } from '../contract.js'
import type { Registry } from '@sub-engine/core'
import type { CharacterComponents } from '../contract.js'

export type AnimType = 'idle' | 'idle_blinking' | 'run' | 'walk' | 'attack' | 'hurt' | 'dying'
export type Direction = 'front' | 'back' | 'left' | 'right'

export function animationSystem(registry: Registry<CharacterComponents>): Registry<CharacterComponents> {
  const entities = registry.getEntitiesWith([SCHEMA.ANIM_STATE, SCHEMA.INPUT_STATE, SCHEMA.VELOCITY])

  for (const { id } of entities) {
    const anim = registry.getComponent(id, SCHEMA.ANIM_STATE)
    const input = registry.getComponent(id, SCHEMA.INPUT_STATE)
    if (!anim || !input) continue

    let nextAnim: AnimType = anim.anim as AnimType
    let nextDir: Direction = anim.dir as Direction
    let nextPlaying = true
    let nextLoop = true

    const dx = (input.right ? 1 : 0) - (input.left ? 1 : 0)
    const dy = (input.down ? 1 : 0) - (input.up ? 1 : 0)
    const moving = dx !== 0 || dy !== 0

    if (dy < 0) nextDir = 'back'
    else if (dy > 0) nextDir = 'front'
    else if (dx < 0) nextDir = 'left'
    else if (dx > 0) nextDir = 'right'

    if (anim.anim === 'attack') {
      if (anim.playing) {
        registry.addComponent(id, SCHEMA.VELOCITY, { x: 0, y: 0 })
        continue
      }
      if (input.attack) {
        nextAnim = 'attack'
        nextPlaying = true
        nextLoop = false
      } else {
        nextAnim = moving ? (input.walk ? 'walk' : 'run') : 'idle'
      }
    } else if (input.attack) {
      nextAnim = 'attack'
      nextPlaying = true
      nextLoop = false
    } else if (moving) {
      nextAnim = input.walk ? 'walk' : 'run'
    } else {
      nextAnim = 'idle'
    }

    registry.addComponent(id, SCHEMA.ANIM_STATE, {
      anim: nextAnim,
      dir: nextDir,
      frameRate: anim.frameRate,
      playing: nextPlaying,
      loop: nextLoop,
    })
  }

  return registry
}

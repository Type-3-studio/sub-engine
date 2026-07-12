import { registerSchema } from '@sub-engine/core'

export const SCHEMA = {
  POSITION: 'Position',
  VELOCITY: 'Velocity',
  LABEL: 'Label',
  ANIM_STATE: 'AnimState',
  INPUT_STATE: 'InputState',
} as const

export interface CharacterComponents {
  'Position': { x: number; y: number }
  'Velocity': { x: number; y: number }
  'Label': { value: string }
  'AnimState': {
    anim: string
    dir: string
    frameRate: number
    playing: boolean
    loop: boolean
  }
  'InputState': {
    up: boolean
    down: boolean
    left: boolean
    right: boolean
    attack: boolean
    walk: boolean
    interact: boolean
  }
}

registerSchema(SCHEMA.ANIM_STATE, {
  anim: { type: 'string', required: true },
  dir: { type: 'string', required: true },
  frameRate: { type: 'number', required: true },
  playing: { type: 'boolean', required: true },
  loop: { type: 'boolean', required: true },
})

registerSchema(SCHEMA.INPUT_STATE, {
  up: { type: 'boolean', required: true },
  down: { type: 'boolean', required: true },
  left: { type: 'boolean', required: true },
  right: { type: 'boolean', required: true },
  attack: { type: 'boolean', required: true },
  walk: { type: 'boolean', required: true },
  interact: { type: 'boolean', required: true },
})

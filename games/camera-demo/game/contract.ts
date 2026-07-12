import { registerSchema } from '../../../src/engine/index.js'

export const SCHEMA = {
  POSITION: 'Position',
  VELOCITY: 'Velocity',
  LABEL: 'Label',
  CAMERA: 'Camera',
  COLLIDER: 'Collider',
  ZORDER: 'ZOrder',
} as const

export interface CameraDemoComponents {
  'Position': { x: number; y: number }
  'Velocity': { x: number; y: number }
  'Label': { value: string }
  'Camera': {
    x: number
    y: number
    width: number
    height: number
    zoom: number
    targetEntity?: number
    minX?: number
    minY?: number
    maxX?: number
    maxY?: number
  }
  'Collider': {
    width: number
    height: number
    offsetX?: number
    offsetY?: number
    solid?: boolean
    group?: number
    mask?: number
  }
  'ZOrder': {
    layer: number
    order: number
  }
}

registerSchema(SCHEMA.LABEL, {
  value: { type: 'string', required: true },
})

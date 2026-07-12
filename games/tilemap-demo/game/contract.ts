import { registerSchema } from '@sub-engine/core'

export const SCHEMA = {
  POSITION: 'Position',
  VELOCITY: 'Velocity',
  TILE_MAP: 'TileMap',
  GAME_STATE: 'GameState',
} as const

export interface TilemapComponents {
  'Position': { x: number; y: number }
  'Velocity': { x: number; y: number }
  'TileMap': {
    width: number
    height: number
    tileWidth: number
    tileHeight: number
    layers: Array<{
      name: string
      data: number[]
      width: number
      height: number
      visible: boolean
      opacity: number
    }>
    tilesets: Array<{
      firstGid: number
      name?: string
      tileWidth: number
      tileHeight: number
      tileCount: number
      columns: number
      image?: string
      imageWidth?: number
      imageHeight?: number
      tiles?: Array<{ id: number; image: string }>
    }>
  }
  'GameState': {
    phase: string
    info: string
    tileCount: number
  }
}

registerSchema(SCHEMA.TILE_MAP, {
  width: { type: 'number', required: true },
  height: { type: 'number', required: true },
  tileWidth: { type: 'number', required: true },
  tileHeight: { type: 'number', required: true },
  layers: { type: 'array', required: true },
  tilesets: { type: 'array', required: true },
})

registerSchema(SCHEMA.GAME_STATE, {
  phase: { type: 'string', required: true },
  info: { type: 'string', required: true },
  tileCount: { type: 'number', required: true },
})

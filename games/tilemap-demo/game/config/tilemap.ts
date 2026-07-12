// Native pixel size of the tile PNG assets (256x256 from the PNG Tiles folder)
export const TILE_SIZE = 256

// Render scale factor: renders tiles at TILE_SIZE * RENDER_SCALE pixels.
// 0.25 = 256 → 64px per tile (good for a 12x10 map fitting 768x640).
// Change this without touching the source PNGs or Tiled files.
export const RENDER_SCALE = 0.25
export const RENDER_TILE = TILE_SIZE * RENDER_SCALE // 64

export const MAP_COLS = 12
export const MAP_ROWS = 10
export const GAME_WIDTH = Math.ceil(MAP_COLS * RENDER_TILE)
export const GAME_HEIGHT = Math.ceil(MAP_ROWS * RENDER_TILE)

export const TILED_MAP_URL = './assets/demo-map.tmj'

export enum TileGID {
  EMPTY = 0,
  GROUND_START = 1,
}

export enum GroundTile {
  GRASS_01 = 1,
  GRASS_02 = 2,
  GRASS_03 = 3,
  GRASS_04 = 4,
  GRASS_05 = 5,
  DIRT_01 = 18,
  DIRT_02 = 19,
  DIRT_03 = 20,
  DIRT_04 = 21,
  SAND_01 = 42,
  SAND_02 = 43,
  WATER_01 = 49,
  WATER_02 = 50,
  FLOWERS_01 = 7,
  FLOWERS_02 = 8,
  PATH_01 = 13,
  PATH_02 = 14,
}

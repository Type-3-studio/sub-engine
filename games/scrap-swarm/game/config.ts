export const TILE_SIZE = 64
export const MAP_COLS = 30
export const MAP_ROWS = 20
export const MAP_W = MAP_COLS * TILE_SIZE
export const MAP_H = MAP_ROWS * TILE_SIZE
export const HUD_H = 50
export const GAME_W = 1024
export const GAME_H = 768

export const BASE_X = 2
export const BASE_Y = 10

export const WORKER_COUNT = 3
export const WORKER_SPEED = 0.12
export const WORKER_CARGO_CAPACITY = 5
export const MINE_THRESHOLD = 500
export const MINE_RATE = 1

export const FIGHTER_COUNT = 2
export const FIGHTER_SPEED = 0.14
export const FIGHTER_DAMAGE = 25
export const FIGHTER_RANGE = 6
export const FIGHTER_FIRE_RATE = 400
export const FIGHTER_HP = 120

export const ENEMY_SPEED = 0.08
export const ENEMY_DAMAGE = 6
export const ENEMY_HP = 30
export const ENEMY_REWARD = 10

export const WAVE_DEFS: Array<{ count: number; speedMult: number; hpMult: number; spawnInterval: number }> = [
  { count: 5, speedMult: 1, hpMult: 1, spawnInterval: 2000 },
  { count: 8, speedMult: 1.2, hpMult: 1.5, spawnInterval: 1800 },
  { count: 12, speedMult: 1.5, hpMult: 2, spawnInterval: 1500 },
  { count: 16, speedMult: 1.8, hpMult: 2.5, spawnInterval: 1200 },
  { count: 20, speedMult: 2, hpMult: 3, spawnInterval: 1000 },
]

export const WAVE_START_DELAY = 2000

export const RESOURCE_TYPES = ['scrap', 'crystal', 'fuel'] as const

export const RESOURCE_NODES: Array<{ x: number; y: number; type: string; amount: number }> = [
  { x: 5, y: 3, type: 'scrap', amount: 120 },
  { x: 8, y: 2, type: 'crystal', amount: 80 },
  { x: 12, y: 5, type: 'scrap', amount: 100 },
  { x: 18, y: 3, type: 'fuel', amount: 60 },
  { x: 22, y: 4, type: 'scrap', amount: 90 },
  { x: 27, y: 2, type: 'crystal', amount: 70 },
  { x: 4, y: 8, type: 'scrap', amount: 110 },
  { x: 10, y: 10, type: 'fuel', amount: 50 },
  { x: 15, y: 7, type: 'crystal', amount: 100 },
  { x: 20, y: 9, type: 'scrap', amount: 80 },
  { x: 25, y: 8, type: 'fuel', amount: 70 },
  { x: 6, y: 15, type: 'scrap', amount: 90 },
  { x: 14, y: 14, type: 'crystal', amount: 60 },
  { x: 19, y: 16, type: 'scrap', amount: 100 },
  { x: 26, y: 14, type: 'fuel', amount: 80 },
  { x: 8, y: 18, type: 'scrap', amount: 70 },
  { x: 22, y: 17, type: 'crystal', amount: 90 },
]

export const WORKER_SPAWN_POSITIONS: Array<{ x: number; y: number }> = [
  { x: BASE_X + 1, y: BASE_Y },
  { x: BASE_X + 1, y: BASE_Y + 1 },
  { x: BASE_X, y: BASE_Y + 1 },
]

export const FIGHTER_SPAWN_POSITIONS: Array<{ x: number; y: number }> = [
  { x: BASE_X, y: BASE_Y - 1 },
  { x: BASE_X + 1, y: BASE_Y - 1 },
]

export const MAP_COLS = 16
export const MAP_ROWS = 12
export const TILE_SIZE = 64

export const GRID_W = MAP_COLS * TILE_SIZE
export const GRID_H = MAP_ROWS * TILE_SIZE

export const HUD_H = 50
export const MENU_H = 64

export const STARTING_SILICON = 0
export const STARTING_IRON = 20
export const STARTING_COPPER = 0

export const DRONE_SPEED = 2.5
export const DRONE_CARGO_CAPACITY = 10
export const DRONE_MAX_CARGO_SLOTS = 3

export const CRAWLER_DAMAGE = 15
export const CRAWLER_RANGE = 4
export const CRAWLER_FIRE_RATE = 800

export const BEETLE_DAMAGE = 5
export const BEETLE_SPEED = 1.8
export const BEETLE_HEALTH = 20

export const STORM_INTENSITY = 3
export const STORM_DURATION = 3000
export const STORM_RADIUS = 3

export const RESOURCE_DEPOSITS = [
  { x: 2, y: 2, type: 'silicon' as const, units: 100 },
  { x: 13, y: 2, type: 'silicon' as const, units: 80 },
  { x: 8, y: 6, type: 'iron' as const, units: 150 },
  { x: 3, y: 9, type: 'copper' as const, units: 60 },
  { x: 12, y: 10, type: 'iron' as const, units: 120 },
  { x: 6, y: 3, type: 'copper' as const, units: 90 },
  { x: 10, y: 7, type: 'silicon' as const, units: 70 },
]

export const WALL_TILES = [
  { x: 4, y: 4 }, { x: 4, y: 5 }, { x: 4, y: 6 },
  { x: 7, y: 8 }, { x: 8, y: 8 },
  { x: 11, y: 3 }, { x: 11, y: 4 },
  { x: 5, y: 0 }, { x: 5, y: 1 },
  { x: 14, y: 7 }, { x: 14, y: 8 },
]

export const STORAGE_X = 0
export const STORAGE_Y = 5

export const DRONE_RETURN_POSITIONS = [
  { x: 0, y: 5 },
  { x: 0, y: 6 },
  { x: 1, y: 5 },
]

export const CRAWLER_COST_SILICON = 30
export const CRAWLER_COST_IRON = 20
export const CRAWLER_COST_COPPER = 10

export function buildGridMap(): number[][] {
  const grid: number[][] = []
  for (let y = 0; y < MAP_ROWS; y++) {
    const row: number[] = []
    for (let x = 0; x < MAP_COLS; x++) {
      let tile = 0
      for (const w of WALL_TILES) {
        if (w.x === x && w.y === y) { tile = 1; break }
      }
      row.push(tile)
    }
    grid.push(row)
  }
  return grid
}

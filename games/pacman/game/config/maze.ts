import { TILE_SIZE, HALF_TILE } from '../contract.js'

export const MAZE_COLS = 21
export const MAZE_ROWS = 16

export const MAZE_TEMPLATE: number[][] = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,3,2,2,2,2,2,2,2,2,1,2,2,2,2,2,2,2,2,3,1],
  [1,2,1,1,1,2,1,1,1,2,1,2,1,1,1,2,1,1,1,2,1],
  [1,2,1,1,1,2,1,1,1,2,1,2,1,1,1,2,1,1,1,2,1],
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,2,1,1,1,2,1,2,1,1,1,1,1,2,1,2,1,1,1,2,1],
  [1,2,2,2,2,2,1,2,2,2,1,2,2,2,1,2,2,2,2,2,1],
  [1,1,1,1,1,2,1,1,1,0,1,0,1,1,1,2,1,1,1,1,1],
  [0,0,0,0,1,2,1,0,0,0,5,0,0,0,1,2,1,0,0,0,0],
  [1,1,1,1,1,2,1,0,1,4,4,4,1,0,1,2,1,1,1,1,1],
  [0,0,0,0,1,2,1,0,1,4,4,4,1,0,1,2,1,0,0,0,0],
  [1,1,1,1,1,2,1,0,1,4,4,4,1,0,1,2,1,1,1,1,1],
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,2,1,1,1,2,1,1,1,1,1,1,1,1,1,2,1,1,1,2,1],
  [1,3,2,2,2,2,2,2,2,2,6,2,2,2,2,2,2,2,2,3,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
]

export const TUNNEL_ROWS = [8, 10]

export function isWalkable(col: number, row: number): boolean {
  if (row < 0 || row >= MAZE_TEMPLATE.length) return false
  if (col < 0 || col >= MAZE_TEMPLATE[0]!.length) {
    if (TUNNEL_ROWS.includes(row)) return true
    return false
  }
  const tile = MAZE_TEMPLATE[row]![col]!
  return tile !== 1
}

export function isWalkableForGhost(col: number, row: number): boolean {
  if (row < 0 || row >= MAZE_TEMPLATE.length) return false
  if (col < 0 || col >= MAZE_TEMPLATE[0]!.length) {
    if (TUNNEL_ROWS.includes(row)) return true
    return false
  }
  const tile = MAZE_TEMPLATE[row]![col]!
  return tile !== 1 && tile !== 4
}

export function wrapCol(col: number, row: number): number {
  if (!TUNNEL_ROWS.includes(row)) return col
  if (col < 0) return MAZE_COLS - 1
  if (col >= MAZE_COLS) return 0
  return col
}

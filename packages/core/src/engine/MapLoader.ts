import type { GameMap } from './types.js'

export function createMapFromMatrix(matrix: number[][]): GameMap {
  if (!Array.isArray(matrix) || !matrix.length || !Array.isArray(matrix[0]) || !matrix[0].length) {
    throw new Error('Map data must be a non-empty 2D array')
  }

  const height = matrix.length
  const width = matrix[0]!.length

  for (let y = 0; y < height; y++) {
    if (!Array.isArray(matrix[y]) || matrix[y]!.length !== width) {
      throw new Error(`Row ${y} has inconsistent width`)
    }
  }

  function getTile(x: number, y: number): number {
    if (x < 0 || x >= width || y < 0 || y >= height) return 1
    return matrix[y]![x]!
  }

  function isWalkable(x: number, y: number): boolean {
    return getTile(x, y) === 0
  }

  return {
    width,
    height,
    getTile,
    isWalkable,
    serialize() {
      return matrix.map(row => [...row])
    },
  }
}

export function loadMapFromJSON(jsonString: string): GameMap {
  const data = JSON.parse(jsonString) as number[][]
  return createMapFromMatrix(data)
}

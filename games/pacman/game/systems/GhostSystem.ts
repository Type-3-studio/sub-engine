import type { Registry } from '@sub-engine/core'
import { SCHEMA, TILE_SIZE, tileCenter, posToTile, dirToVec, OPPOSITE, distToTileCenter } from '../contract.js'
import type { PacComponents } from '../contract.js'
import { isWalkableForGhost, wrapCol, TUNNEL_ROWS } from '../config/maze.js'

export const GHOST_SPEED = 84
export const GHOST_FRIGHTENED_SPEED = 48
export const GHOST_TUNNEL_SPEED = 32
export const GHOST_EATEN_SPEED = 160

const DIR_VALUES = ['up', 'down', 'left', 'right']

export function ghostSystem(registry: Registry<PacComponents>, dt: number): Registry<PacComponents> {
  const ghosts = registry.getEntitiesWith([SCHEMA.GHOST, SCHEMA.POSITION, SCHEMA.DIRECTION])
  if (ghosts.length === 0) return registry

  const stateEnt = registry.getEntitiesWith([SCHEMA.GAME_STATE])
  const gameState = stateEnt.length > 0 ? stateEnt[0]!.GameState : null
  const ghostMode = gameState?.ghostMode ?? 'scatter'

  const pacEnt = registry.getEntitiesWith([SCHEMA.PACMAN, SCHEMA.POSITION, SCHEMA.DIRECTION])
  const pacPos = pacEnt.length > 0 ? pacEnt[0]!.Position : null
  const pacDir = pacEnt.length > 0 ? pacEnt[0]!.Direction : null

  for (const entity of ghosts) {
    const id = entity.id
    const ghost = entity.Ghost
    const pos = entity.Position
    const dir = entity.Direction

    if (!ghost.released && gameState && gameState.dotsEaten >= getReleaseDots(ghost.type)) {
      registry.addComponent(id, SCHEMA.GHOST, { ...ghost, released: true })
    }

    if (ghost.state === 'eaten') {
      const step = GHOST_EATEN_SPEED * (dt / 1000)
      moveGhost(pos, dir.current, step, true)
    } else if (ghost.frightenedTimer > 0 && ghost.state !== 'home') {
      ghost.frightenedTimer -= dt
      if (ghost.frightenedTimer <= 0) {
        registry.addComponent(id, SCHEMA.GHOST, { ...ghost, frightenedTimer: 0, state: 'chase' })
      }
    }

    const speed = getGhostSpeed(ghost, pos)
    const step = speed * (dt / 1000)
    const { col, row } = posToTile(pos.x, pos.y)
    const atCenter = distToTileCenter(pos.x, pos.y) < step + 1

    if (atCenter) {
      const center = tileCenter(col, row)
      pos.x = center.x
      pos.y = center.y

      let nextDir = ''
      if (ghost.state === 'eaten') {
        const home = tileCenter(ghost.homeX, ghost.homeY)
        if (Math.abs(pos.x - home.x) < step + 1 && Math.abs(pos.y - home.y) < step + 1) {
          pos.x = home.x
          pos.y = home.y
          registry.addComponent(id, SCHEMA.GHOST, { ...ghost, state: 'chase', frightenedTimer: 0 })
        } else {
          nextDir = chooseDirectionToward(pos, dir.current, home.x, home.y)
        }
      } else if (ghost.state === 'home') {
        const doorCol = 10
        const doorRow = 8
        const door = tileCenter(doorCol, doorRow)
        nextDir = chooseDirectionToward(pos, dir.current, door.x, door.y)
        if (col === doorCol && row === doorRow) {
          registry.addComponent(id, SCHEMA.GHOST, { ...ghost, state: ghost.frightenedTimer > 0 ? 'frightened' : 'chase' })
        }
      } else if (ghost.frightenedTimer > 0 || ghost.state === 'frightened') {
        nextDir = chooseRandomDirection(dir.current, col, row)
      } else {
        const target = getTarget(registry, ghost, ghostMode, pacPos, pacDir, pos)
        nextDir = chooseDirectionToward(pos, dir.current, target.x, target.y)
      }

      if (nextDir) {
        dir.current = nextDir
      }
    }

    moveGhost(pos, dir.current, step, ghost.state === 'eaten')

    registry.addComponent(id, SCHEMA.POSITION, { x: pos.x, y: pos.y })
    registry.addComponent(id, SCHEMA.DIRECTION, { ...dir })
    registry.addComponent(id, SCHEMA.GHOST, { ...ghost })
  }

  return registry
}

function getReleaseDots(type: string): number {
  switch (type) {
    case 'pink': return 0
    case 'cyan': return 30
    case 'orange': return 60
    default: return 0
  }
}

function getGhostSpeed(
  ghost: { state: string; speed: number; frightenedTimer: number },
  pos: { x: number; y: number },
): number {
  if (ghost.state === 'eaten') return GHOST_EATEN_SPEED
  if (ghost.state === 'home') return GHOST_SPEED
  if (ghost.frightenedTimer > 0 || ghost.state === 'frightened') return GHOST_FRIGHTENED_SPEED
  const { row } = posToTile(pos.x, pos.y)
  if (TUNNEL_ROWS.includes(row)) return GHOST_TUNNEL_SPEED
  return GHOST_SPEED
}

function moveGhost(
  pos: { x: number; y: number },
  dir: string,
  step: number,
  _canEnterHouse: boolean,
): void {
  if (!dir) return
  const vec = dirToVec(dir)
  const { col, row } = posToTile(pos.x, pos.y)
  const nextCol = wrapCol(col + vec.x, row)
  const nextRow = row + vec.y

  if (isWalkableForGhost(nextCol, nextRow)) {
    pos.x += vec.x * step
    pos.y += vec.y * step
  } else {
    const center = tileCenter(col, row)
    pos.x = center.x
    pos.y = center.y
  }
}

function getTarget(
  registry: Registry<PacComponents>,
  ghost: { type: string; state: string; scatterX: number; scatterY: number },
  ghostMode: string,
  pacPos: { x: number; y: number } | null,
  pacDir: { current: string } | null,
  pos: { x: number; y: number },
): { x: number; y: number } {
  const effectiveMode = ghost.type === 'clyde' ? customClydeMode(pos, pacPos, ghost) : ghostMode

  if (effectiveMode === 'scatter') {
    return tileCenter(ghost.scatterX, ghost.scatterY)
  }

  if (!pacPos) return tileCenter(ghost.scatterX, ghost.scatterY)

  switch (ghost.type) {
    case 'blinky':
      return { x: pacPos.x, y: pacPos.y }

    case 'pinky': {
      const vec = dirToVec(pacDir?.current ?? 'up')
      return {
        x: pacPos.x + vec.x * 4 * TILE_SIZE,
        y: pacPos.y + vec.y * 4 * TILE_SIZE,
      }
    }

    case 'inky': {
      const vec = dirToVec(pacDir?.current ?? 'up')
      const aheadX = pacPos.x + vec.x * 2 * TILE_SIZE
      const aheadY = pacPos.y + vec.y * 2 * TILE_SIZE
      const blinky = findBlinkyPosition(registry)
      return {
        x: aheadX + (aheadX - blinky.x),
        y: aheadY + (aheadY - blinky.y),
      }
    }

    case 'clyde':
      return tileCenter(ghost.scatterX, ghost.scatterY)

    default:
      return { x: pacPos.x, y: pacPos.y }
  }
}

function customClydeMode(
  pos: { x: number; y: number },
  pacPos: { x: number; y: number } | null,
  ghost: { scatterX: number; scatterY: number },
): string {
  if (!pacPos) return 'scatter'
  const dist = Math.abs(pos.x - pacPos.x) + Math.abs(pos.y - pacPos.y)
  return dist > 8 * TILE_SIZE ? 'chase' : 'scatter'
}

function findBlinkyPosition(registry: Registry<PacComponents>): { x: number; y: number } {
  const blinkies = registry.getEntitiesWith([SCHEMA.GHOST, SCHEMA.POSITION])
  for (const g of blinkies) {
    if (g.Ghost.type === 'blinky') return { x: g.Position.x, y: g.Position.y }
  }
  return { x: 0, y: 0 }
}

function chooseDirectionToward(
  pos: { x: number; y: number },
  currentDir: string,
  targetX: number,
  targetY: number,
): string {
  const { col, row } = posToTile(pos.x, pos.y)
  const opposite = OPPOSITE[currentDir]

  let bestDir = currentDir
  let bestDist = Infinity

  for (const d of DIR_VALUES) {
    if (d === opposite) continue
    const vec = dirToVec(d)
    const nc = wrapCol(col + vec.x, row)
    const nr = row + vec.y
    if (!isWalkableForGhost(nc, nr)) continue

    const c = tileCenter(nc, nr)
    const dist = Math.abs(c.x - targetX) + Math.abs(c.y - targetY)
    if (dist < bestDist) {
      bestDist = dist
      bestDir = d
    }
  }

  return bestDir
}

function chooseRandomDirection(
  currentDir: string,
  col: number,
  row: number,
): string {
  const opposite = OPPOSITE[currentDir]
  const options: string[] = []

  for (const d of DIR_VALUES) {
    if (d === opposite) continue
    const vec = dirToVec(d)
    const nc = wrapCol(col + vec.x, row)
    const nr = row + vec.y
    if (!isWalkableForGhost(nc, nr)) continue
    options.push(d)
  }

  if (options.length === 0) return currentDir
  return options[Math.floor(Math.random() * options.length)]!
}

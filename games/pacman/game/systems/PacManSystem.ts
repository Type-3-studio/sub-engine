import type { Registry } from '@sub-engine/core'
import { SCHEMA, TILE_SIZE, HALF_TILE, posToTile, tileCenter, dirToVec, OPPOSITE } from '../contract.js'
import type { PacComponents } from '../contract.js'
import { isWalkable, wrapCol } from '../config/maze.js'

let _inputDirection = ''
export function getInputDirection(): string { return _inputDirection }
export function setInputDirection(dir: string): void { _inputDirection = dir }

export const PACMAN_SPEED = 96

export function pacmanSystem(registry: Registry<PacComponents>, dt: number): Registry<PacComponents> {
  const pacEntities = registry.getEntitiesWith([SCHEMA.PACMAN, SCHEMA.POSITION, SCHEMA.DIRECTION])
  if (pacEntities.length === 0) return registry

  for (const entity of pacEntities) {
    const id = entity.id
    const pac = entity.PacMan
    const pos = entity.Position
    const dir = entity.Direction

    if (pac.invincible > 0) {
      registry.addComponent(id, SCHEMA.PACMAN, { ...pac, invincible: pac.invincible - dt })
      if (pac.invincible > 0) return registry
    }

    const step = pac.speed * (dt / 1000)

    if (pac.powerTimer > 0) {
      registry.addComponent(id, SCHEMA.PACMAN, { ...pac, powerTimer: pac.powerTimer - dt })
    }

    tryDirectionChange(pos, dir, pac.speed, dt)

    const newPos = moveInDirection(pos, dir.current, step)
    pos.x = newPos.x
    pos.y = newPos.y

    let mouthOpen = pac.mouthOpen
    const mouthTimer = pac.moveTimer + dt
    if (mouthTimer > 120) {
      mouthOpen = !mouthOpen
      registry.addComponent(id, SCHEMA.PACMAN, { ...pac, mouthOpen, moveTimer: 0 })
    } else {
      registry.addComponent(id, SCHEMA.PACMAN, { ...pac, moveTimer: mouthTimer })
    }

    registry.addComponent(id, SCHEMA.POSITION, { x: pos.x, y: pos.y })
    registry.addComponent(id, SCHEMA.DIRECTION, { ...dir })
  }

  return registry
}

function tryDirectionChange(
  pos: { x: number; y: number },
  dir: { current: string; next: string },
  speed: number,
  dt: number,
): void {
  if (!dir.next || dir.next === dir.current) return

  const step = speed * (dt / 1000)
  const { col, row } = posToTile(pos.x, pos.y)
  const center = tileCenter(col, row)

  const isHorizontal = dir.next === 'left' || dir.next === 'right'
  const alignOk = isHorizontal
    ? Math.abs(pos.y - center.y) < step + 1
    : Math.abs(pos.x - center.x) < step + 1

  if (!alignOk) return

  if (dir.next === OPPOSITE[dir.current]) {
    dir.current = dir.next
    dir.next = ''
    if (isHorizontal) pos.y = center.y
    else pos.x = center.x
    return
  }

  const vec = dirToVec(dir.next)
  const tCol = wrapCol(col + vec.x, row)
  const tRow = row + vec.y

  if (isWalkable(tCol, tRow)) {
    dir.current = dir.next
    dir.next = ''
    if (isHorizontal) pos.y = center.y
    else pos.x = center.x
  }
}

function moveInDirection(
  pos: { x: number; y: number },
  dir: string,
  step: number,
): { x: number; y: number } {
  if (!dir) return { x: pos.x, y: pos.y }

  const { col, row } = posToTile(pos.x, pos.y)
  const vec = dirToVec(dir)

  const nextCol = wrapCol(col + vec.x, row)
  const nextRow = row + vec.y

  if (!isWalkable(nextCol, nextRow)) {
    const center = tileCenter(col, row)
    return { x: center.x, y: center.y }
  }

  return {
    x: pos.x + vec.x * step,
    y: pos.y + vec.y * step,
  }
}

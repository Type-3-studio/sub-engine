import type { Registry } from '@sub-engine/core'
import { SCHEMA, TILE_SIZE } from '../contract.js'
import type { PacComponents } from '../contract.js'

export function pelletSystem(registry: Registry<PacComponents>, _dt: number): Registry<PacComponents> {
  const pacEnt = registry.getEntitiesWith([SCHEMA.PACMAN, SCHEMA.POSITION])
  if (pacEnt.length === 0) return registry

  const pacPos = pacEnt[0]!.Position
  const pacMan = pacEnt[0]!.PacMan
  const pellets = registry.getEntitiesWith([SCHEMA.PELLET, SCHEMA.POSITION])

  const col = Math.floor(pacPos.x / TILE_SIZE)
  const row = Math.floor(pacPos.y / TILE_SIZE)

  let score = pacMan.score
  let powerTimer = pacMan.powerTimer
  let dotsEaten = 0
  let combo = 0
  let message = ''
  let messageTimer = 0

  const toRemove: number[] = []

  for (const pellet of pellets) {
    const pPos = pellet.Position
    const pCol = Math.floor(pPos.x / TILE_SIZE)
    const pRow = Math.floor(pPos.y / TILE_SIZE)

    if (pCol === col && pRow === row) {
      score += pellet.Pellet.value
      dotsEaten++

      if (pellet.Pellet.isPowerUp) {
        powerTimer = 8000
        combo = 0
        message = 'POWER UP!'
        messageTimer = 2000
      }

      toRemove.push(pellet.id)
    }
  }

  for (const id of toRemove) {
    registry.removeEntity(id)
  }

  registry.addComponent(pacEnt[0]!.id, SCHEMA.PACMAN, { ...pacMan, score, powerTimer })

  const stateEnt = registry.getEntitiesWith([SCHEMA.GAME_STATE])
  if (stateEnt.length > 0) {
    const s = stateEnt[0]!.GameState
    registry.addComponent(stateEnt[0]!.id, SCHEMA.GAME_STATE, {
      ...s,
      score,
      dotsEaten: s.dotsEaten + dotsEaten,
      combo,
      message: message || s.message,
      messageTimer: messageTimer || s.messageTimer,
    })
  }

  return registry
}

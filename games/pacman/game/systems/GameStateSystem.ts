import type { Registry } from '@sub-engine/core'
import { SCHEMA, TILE_SIZE } from '../contract.js'
import type { PacComponents } from '../contract.js'

export function gameStateSystem(registry: Registry<PacComponents>, dt: number): Registry<PacComponents> {
  const stateEnt = registry.getEntitiesWith([SCHEMA.GAME_STATE])
  if (stateEnt.length === 0) return registry

  const state = stateEnt[0]!.GameState

  if (state.phase === 'dying' || state.phase === 'gameover' || state.phase === 'win') return registry

  if (state.messageTimer > 0) {
    registry.addComponent(stateEnt[0]!.id, SCHEMA.GAME_STATE, {
      ...state,
      messageTimer: state.messageTimer - dt,
      message: state.messageTimer - dt <= 0 ? '' : state.message,
    })
  }

  const ghosts = registry.getEntitiesWith([SCHEMA.GHOST, SCHEMA.POSITION])
  const pacEnt = registry.getEntitiesWith([SCHEMA.PACMAN, SCHEMA.POSITION])
  if (pacEnt.length === 0) return registry

  const pacPos = pacEnt[0]!.Position
  const pacMan = pacEnt[0]!.PacMan

  for (const ghost of ghosts) {
    const gPos = ghost.Position
    const gGhost = ghost.Ghost
    const dx = Math.abs(pacPos.x - gPos.x)
    const dy = Math.abs(pacPos.y - gPos.y)

    if (dx < TILE_SIZE && dy < TILE_SIZE) {
      if ((gGhost.frightenedTimer > 0 || gGhost.state === 'frightened') && gGhost.state !== 'eaten') {
        const combo = state.combo + 1
        const points = 200 * Math.pow(2, combo - 1)
        const score = state.score + points
        registry.addComponent(pacEnt[0]!.id, SCHEMA.PACMAN, { ...pacMan, score })

        registry.addComponent(ghost.id, SCHEMA.GHOST, {
          ...gGhost,
          state: 'eaten',
          frightenedTimer: 0,
        })

        registry.addComponent(stateEnt[0]!.id, SCHEMA.GAME_STATE, {
          ...state,
          score,
          combo,
          message: `${points}`,
          messageTimer: 1000,
        })
      } else if (gGhost.state !== 'eaten' && gGhost.state !== 'home') {
        if (pacMan.invincible <= 0) {
          const lives = pacMan.lives - 1
          registry.addComponent(pacEnt[0]!.id, SCHEMA.PACMAN, {
            ...pacMan,
            lives,
            invincible: 2000,
          })
          registry.addComponent(stateEnt[0]!.id, SCHEMA.GAME_STATE, {
            ...state,
            lives,
            phase: lives <= 0 ? 'gameover' : 'dying',
            message: lives <= 0 ? 'GAME OVER' : 'OUCH!',
            messageTimer: 3000,
          })
        }
      }
    }
  }

  const pellets = registry.getEntitiesWith([SCHEMA.PELLET])
  if (pellets.length === 0 && state.phase === 'playing') {
    registry.addComponent(stateEnt[0]!.id, SCHEMA.GAME_STATE, {
      ...state,
      phase: 'win',
      message: 'YOU WIN!',
      messageTimer: 5000,
    })
  }

  state.ghostModeTimer -= dt
  if (state.ghostModeTimer <= 0) {
    let nextMode: string
    let nextTimer: number
    if (state.ghostMode === 'scatter') {
      nextMode = 'chase'
      nextTimer = 20000
    } else {
      nextMode = 'scatter'
      nextTimer = 7000
    }
    registry.addComponent(stateEnt[0]!.id, SCHEMA.GAME_STATE, {
      ...state,
      ghostMode: nextMode,
      ghostModeTimer: nextTimer,
    })
  }

  return registry
}

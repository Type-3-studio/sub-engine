import type { PngSequenceDef } from '@sub-engine/pixi'
import { createPlaceholderAnimManager } from '@sub-engine/pixi'
import type { PlaceholderSpriteManager } from '@sub-engine/pixi'
import { TILE_SIZE } from '../contract.js'

export const ASSET_DEFS: PngSequenceDef[] = [
  { name: 'pacman_right', directory: 'frames/pacman', frameCount: 2, frameRate: 8, loop: true },
  { name: 'pacman_left', directory: 'frames/pacman', frameCount: 2, frameRate: 8, loop: true },
  { name: 'pacman_up', directory: 'frames/pacman', frameCount: 2, frameRate: 8, loop: true },
  { name: 'pacman_down', directory: 'frames/pacman', frameCount: 2, frameRate: 8, loop: true },
  { name: 'pacman_death', directory: 'frames/pacman', frameCount: 8, frameRate: 12, loop: false },
  { name: 'ghost_red', directory: 'frames/ghosts', frameCount: 2, frameRate: 6, loop: true },
  { name: 'ghost_pink', directory: 'frames/ghosts', frameCount: 2, frameRate: 6, loop: true },
  { name: 'ghost_cyan', directory: 'frames/ghosts', frameCount: 2, frameRate: 6, loop: true },
  { name: 'ghost_orange', directory: 'frames/ghosts', frameCount: 2, frameRate: 6, loop: true },
  { name: 'ghost_frightened', directory: 'frames/ghosts', frameCount: 2, frameRate: 6, loop: true },
  { name: 'ghost_frightened_end', directory: 'frames/ghosts', frameCount: 2, frameRate: 8, loop: true },
  { name: 'ghost_eyes', directory: 'frames/ghosts', frameCount: 1, frameRate: 1, loop: true },
  { name: 'pellet', directory: 'frames/pellets', frameCount: 1, frameRate: 1, loop: true },
  { name: 'power_pellet', directory: 'frames/pellets', frameCount: 4, frameRate: 5, loop: true },
  { name: 'wall', directory: 'frames/tiles', frameCount: 1, frameRate: 1, loop: true },
  { name: 'empty', directory: 'frames/tiles', frameCount: 1, frameRate: 1, loop: true },
  { name: 'ghost_door', directory: 'frames/tiles', frameCount: 1, frameRate: 1, loop: true },
]

export async function loadSprites(): Promise<PlaceholderSpriteManager> {
  return createPlaceholderAnimManager(ASSET_DEFS, {
    frameWidth: TILE_SIZE,
    frameHeight: TILE_SIZE,
  })
}

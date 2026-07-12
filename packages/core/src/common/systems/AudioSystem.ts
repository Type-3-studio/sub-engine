import type { Registry, ComponentMap } from '../../engine/types.js'
import { AudioManager } from '../AudioManager.js'

export interface AudioSourceDef {
  src: string
  volume: number
  loop: boolean
  spatial: boolean
}

export interface AudioComponents {
  'AudioSource': AudioSourceDef
  'Position': { x: number; y: number }
  'Camera': { x: number; y: number }
}

let _manager: AudioManager | null = null

function ensureManager(): AudioManager {
  if (!_manager) {
    _manager = new AudioManager()
  }
  return _manager
}

export function setAudioManager(mgr: AudioManager): void {
  _manager = mgr
}

export function getAudioManager(): AudioManager {
  return ensureManager()
}

export function initAudioSystem(): void {
}

export async function preloadAudio(srcs: string[]): Promise<void> {
  const mgr = ensureManager()
  for (const src of srcs) {
    await mgr.load(src)
  }
}

export function audioSystem<M extends ComponentMap>(
  registry: Registry<M>,
  manager?: AudioManager,
): Registry<M> {
  const mgr = manager ?? ensureManager()

  const sources = registry.getEntitiesWith(['AudioSource'] as any)

  for (const raw of sources) {
    const e = raw as any
    const as = e.AudioSource as AudioSourceDef
    const pos = e.Position as { x: number; y: number } | undefined

    if (!mgr.isPlaying(`entity_${e.id}`)) {
      mgr.play(as.src, as.volume, as.loop, as.spatial, `entity_${e.id}`)
    }

    if (as.spatial && pos) {
      let camX = 0
      let camY = 0
      const cameras = registry.getEntitiesWith(['Camera'] as any)
      if (cameras.length > 0) {
        const cam = (cameras[0] as any).Camera as { x: number; y: number }
        camX = cam.x + (cam as any).width / 2
        camY = cam.y + (cam as any).height / 2
      }
      mgr.setListenerPosition(camX, camY)
      mgr.updateSpatial(`entity_${e.id}`, pos.x, pos.y)
    }
  }

  return registry
}

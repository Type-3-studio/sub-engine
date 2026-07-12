import { describe, it, expect, beforeEach } from 'vitest'
import { createRegistry, schemaExists } from '@sub-engine/core'
import { audioSystem, getAudioManager, initAudioSystem } from '@sub-engine/core'

describe('AudioSource Schema', () => {
  it('AudioSource schema is registered', () => {
    expect(schemaExists('AudioSource')).toBe(true)
  })
})

describe('AudioManager', () => {
  it('returns the same singleton instance', () => {
    const a = getAudioManager()
    const b = getAudioManager()
    expect(a).toBe(b)
  })

  it('play returns empty string when Web Audio unavailable', () => {
    const am = getAudioManager()
    const id = am.play('test.mp3', 1, false, false)
    expect(id).toBe('')
  })

  it('isPlaying returns false for unknown id', () => {
    const am = getAudioManager()
    expect(am.isPlaying('nonexistent')).toBe(false)
  })

  it('stop does not throw for unknown id', () => {
    const am = getAudioManager()
    expect(() => am.stop('nonexistent')).not.toThrow()
  })

  it('stopAll does not throw when nothing playing', () => {
    const am = getAudioManager()
    expect(() => am.stopAll()).not.toThrow()
  })

  it('setVolume does not throw for unknown id', () => {
    const am = getAudioManager()
    expect(() => am.setVolume('nonexistent', 0.5)).not.toThrow()
  })

  it('destroy does not throw', () => {
    const am = getAudioManager()
    expect(() => am.destroy()).not.toThrow()
  })
})

describe('AudioSystem', () => {
  beforeEach(() => {
    initAudioSystem()
  })

  it('adds AudioSource component without error', () => {
    const registry = createRegistry()
    const e = registry.createEntity()
    expect(() =>
      registry.addComponent(e, 'AudioSource', {
        src: 'step.ogg',
        volume: 0.5,
        loop: false,
        spatial: false,
      })
    ).not.toThrow()
  })

  it('runs without error on entities with AudioSource', () => {
    const registry = createRegistry()
    const e = registry.createEntity()
    registry.addComponent(e, 'AudioSource', {
      src: 'step.ogg',
      volume: 0.5,
      loop: false,
      spatial: false,
    })
    expect(() => audioSystem(registry)).not.toThrow()
  })

  it('runs without error on empty registry', () => {
    const registry = createRegistry()
    expect(() => audioSystem(registry)).not.toThrow()
  })

  it('runs without error with spatial audio source', () => {
    const registry = createRegistry()
    const e = registry.createEntity()
    registry.addComponent(e, 'AudioSource', {
      src: 'ambient.ogg',
      volume: 0.3,
      loop: true,
      spatial: true,
    })
    registry.addComponent(e, 'Position', { x: 100, y: 200 })
    expect(() => audioSystem(registry)).not.toThrow()
  })

  it('runs without error with camera + spatial audio', () => {
    const registry = createRegistry()
    const cam = registry.createEntity()
    registry.addComponent(cam, 'Camera', {
      x: 50, y: 50,
      width: 800, height: 600,
      zoom: 1,
    })
    const e = registry.createEntity()
    registry.addComponent(e, 'AudioSource', {
      src: 'ambient.ogg',
      volume: 0.3,
      loop: true,
      spatial: true,
    })
    registry.addComponent(e, 'Position', { x: 200, y: 300 })
    expect(() => audioSystem(registry)).not.toThrow()
  })

  it('handles multiple audio entities', () => {
    const registry = createRegistry()
    for (let i = 0; i < 5; i++) {
      const e = registry.createEntity()
      registry.addComponent(e, 'AudioSource', {
        src: 'step.ogg',
        volume: 0.5,
        loop: false,
        spatial: false,
      })
    }
    expect(() => audioSystem(registry)).not.toThrow()
  })
})

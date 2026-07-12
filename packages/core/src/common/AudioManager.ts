interface PlayingSound {
  buffer: AudioBuffer
  source: AudioBufferSourceNode
  gain: GainNode
  panner: StereoPannerNode | null
  src: string
  loop: boolean
}

export class AudioManager {
  private ctx: AudioContext | null = null
  private buffers = new Map<string, AudioBuffer>()
  private playing = new Map<string, PlayingSound>()
  private masterGain: GainNode | null = null
  private listenerX = 0
  private listenerY = 0

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      const Ctor = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext
      this.ctx = new Ctor()
      this.masterGain = this.ctx.createGain()
      this.masterGain.connect(this.ctx.destination)
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume()
    }
    return this.ctx
  }

  private ctxAvailable(): boolean {
    return typeof window !== 'undefined' && (!!window.AudioContext || !!(window as any).webkitAudioContext)
  }

  async load(src: string): Promise<void> {
    if (this.buffers.has(src)) return
    if (!this.ctxAvailable()) return
    const ctx = this.ensureContext()
    const response = await fetch(src)
    const arrayBuffer = await response.arrayBuffer()
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer)
    this.buffers.set(src, audioBuffer)
  }

  play(src: string, volume: number, loop: boolean, spatial: boolean, followId?: string): string {
    if (!this.ctxAvailable()) return ''
    const ctx = this.ensureContext()
    const buffer = this.buffers.get(src)
    if (!buffer) return ''

    const id = followId || `${src}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`

    const existing = this.playing.get(id)
    if (existing) {
      existing.source.stop()
      existing.source.disconnect()
      this.playing.delete(id)
    }

    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.loop = loop

    const gain = ctx.createGain()
    gain.gain.value = volume

    let panner: StereoPannerNode | null = null
    if (spatial) {
      panner = ctx.createStereoPanner()
      panner.pan.value = 0
      source.connect(gain).connect(panner).connect(this.masterGain!)
    } else {
      source.connect(gain).connect(this.masterGain!)
    }

    source.start(0)
    this.playing.set(id, { buffer: buffer, source, gain, panner, src, loop })

    return id
  }

  stop(id: string): void {
    const entry = this.playing.get(id)
    if (!entry) return
    try { entry.source.stop() } catch { /* already stopped */ }
    entry.source.disconnect()
    entry.gain.disconnect()
    if (entry.panner) entry.panner.disconnect()
    this.playing.delete(id)
  }

  stopAll(): void {
    for (const id of this.playing.keys()) {
      this.stop(id)
    }
  }

  setVolume(id: string, volume: number): void {
    const entry = this.playing.get(id)
    if (!entry) return
    entry.gain.gain.value = volume
  }

  setListenerPosition(x: number, y: number): void {
    this.listenerX = x
    this.listenerY = y
  }

  updateSpatial(id: string, worldX: number, worldY: number, maxDist = 500): void {
    const entry = this.playing.get(id)
    if (!entry || !entry.panner) return

    const dx = worldX - this.listenerX
    const dy = worldY - this.listenerY
    const dist = Math.sqrt(dx * dx + dy * dy)

    const pan = Math.max(-1, Math.min(1, dx / maxDist))
    entry.panner.pan.value = pan

    const vol = Math.max(0, 1 - dist / maxDist)
    entry.gain.gain.value = vol
  }

  isPlaying(id: string): boolean {
    return this.playing.has(id)
  }

  destroy(): void {
    this.stopAll()
    if (this.ctx) {
      this.ctx.close()
      this.ctx = null
    }
  }
}

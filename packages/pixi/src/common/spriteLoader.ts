import { Assets, Texture, AnimatedSprite } from 'pixi.js'

export interface PngSequenceDef {
  name: string
  directory: string
  frameCount: number
  frameRate: number
  loop: boolean
}

export interface SpriteManager {
  anims: Map<string, PngSequenceDef>
  textures: Map<string, Texture[]>
  createSprite(animName: string, initialFrame?: number): AnimatedSprite
  destroy(): void
}

function pad(n: number, digits: number): string {
  return String(n).padStart(digits, '0')
}

function prefixFromDir(dir: string): string {
  return dir.replace(/\/$/, '').split('/').pop() ?? ''
}

export async function createAnimManager(defs: PngSequenceDef[]): Promise<SpriteManager> {
  const textures = new Map<string, Texture[]>()
  const allTextures: Texture[] = []

  for (const def of defs) {
    const prefix = prefixFromDir(def.directory)
    const frames: Texture[] = []
    for (let i = 0; i < def.frameCount; i++) {
      const url = `${def.directory}/${prefix}_${pad(i, 3)}.png`
      const tex = await Assets.load<Texture>(url)
      frames.push(tex)
    }
    textures.set(def.name, frames)
    allTextures.push(...frames)
  }

  const animsMap = new Map(defs.map(a => [a.name, a]))

  function createSprite(animName: string, initialFrame = 0): AnimatedSprite {
    const def = animsMap.get(animName)
    const tex = textures.get(animName)
    if (!def || !tex) throw new Error(`Animation "${animName}" not loaded`)
    const sprite = new AnimatedSprite({
      textures: tex,
      autoUpdate: true,
    })
    sprite.currentFrame = initialFrame
    sprite.animationSpeed = def.frameRate / 60
    sprite.loop = def.loop
    sprite.play()
    return sprite
  }

  function destroy(): void {
    for (const tex of allTextures) tex.destroy(true)
    textures.clear()
  }

  return { anims: animsMap, textures, createSprite, destroy }
}

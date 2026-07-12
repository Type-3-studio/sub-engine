import { Texture, AnimatedSprite } from 'pixi.js'
import type { PngSequenceDef, SpriteManager } from './spriteLoader.js'
import { createAnimManager } from './spriteLoader.js'

export interface PlaceholderOptions {
  frameWidth: number
  frameHeight: number
}

export interface AssetFrame {
  index: number
  filename: string
  path: string
  width: number
  height: number
}

export interface AssetAnimation {
  name: string
  directory: string
  frameCount: number
  frameRate: number
  loop: boolean
  frames: AssetFrame[]
}

export interface AssetManifest {
  frameWidth: number
  frameHeight: number
  animations: AssetAnimation[]
}

export interface PlaceholderSpriteManager extends SpriteManager {
  manifest: AssetManifest
}

export interface AdaptiveSpriteManager extends SpriteManager {
  manifest: AssetManifest
  realAssets: string[]
  placeholderAssets: string[]
  exportManifestJson(): string
}

function hashStr(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h) + s.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h)
}

function prefixFromDir(dir: string): string {
  return dir.replace(/\/$/, '').split('/').pop() ?? ''
}

function pad(n: number, digits: number): string {
  return String(n).padStart(digits, '0')
}

const SHAPES = [
  'circle', 'roundedRect', 'diamond', 'triangleUp',
  'triangleDown', 'star', 'hexagon', 'cross',
] as const

function drawShape(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, size: number, shape: string,
): void {
  ctx.beginPath()
  switch (shape) {
    case 'circle':
      ctx.arc(cx, cy, size / 2, 0, Math.PI * 2)
      break
    case 'roundedRect':
      ctx.roundRect(cx - size / 2, cy - size / 2, size, size, size * 0.2)
      break
    case 'diamond':
      ctx.moveTo(cx, cy - size / 2)
      ctx.lineTo(cx + size / 2, cy)
      ctx.lineTo(cx, cy + size / 2)
      ctx.lineTo(cx - size / 2, cy)
      ctx.closePath()
      break
    case 'triangleUp':
      ctx.moveTo(cx, cy - size / 2)
      ctx.lineTo(cx + size / 2, cy + size / 2)
      ctx.lineTo(cx - size / 2, cy + size / 2)
      ctx.closePath()
      break
    case 'triangleDown':
      ctx.moveTo(cx, cy + size / 2)
      ctx.lineTo(cx + size / 2, cy - size / 2)
      ctx.lineTo(cx - size / 2, cy - size / 2)
      ctx.closePath()
      break
    case 'star':
      drawStar(ctx, cx, cy, 5, size / 2, size / 4)
      break
    case 'hexagon': {
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i - Math.PI / 6
        const px = cx + (size / 2) * Math.cos(a)
        const py = cy + (size / 2) * Math.sin(a)
        if (i === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
      ctx.closePath()
      break
    }
    case 'cross': {
      const w = size * 0.25
      const h2 = size * 0.4
      ctx.moveTo(cx - w, cy - h2)
      ctx.lineTo(cx + w, cy - h2)
      ctx.lineTo(cx + w, cy - w)
      ctx.lineTo(cx + h2, cy - w)
      ctx.lineTo(cx + h2, cy + w)
      ctx.lineTo(cx + w, cy + w)
      ctx.lineTo(cx + w, cy + h2)
      ctx.lineTo(cx - w, cy + h2)
      ctx.lineTo(cx - w, cy + w)
      ctx.lineTo(cx - h2, cy + w)
      ctx.lineTo(cx - h2, cy - w)
      ctx.lineTo(cx - w, cy - w)
      ctx.closePath()
      break
    }
  }
}

function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, points: number,
  outerR: number, innerR: number,
): void {
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR
    const a = (Math.PI / points) * i - Math.PI / 2
    const px = cx + r * Math.cos(a)
    const py = cy + r * Math.sin(a)
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
}

function generateFrame(
  animName: string,
  frameIndex: number,
  frameCount: number,
  width: number,
  height: number,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  const hash = hashStr(animName)
  const hue = hash % 360
  const shapeIdx = hash % SHAPES.length
  const shape = SHAPES[shapeIdx]!
  const cx = width / 2
  const cy = height / 2

  ctx.clearRect(0, 0, width, height)

  const shapeSize = Math.min(width, height) * 0.35
  ctx.fillStyle = `hsla(${hue}, 60%, 40%, 0.3)`
  ctx.strokeStyle = `hsla(${hue}, 70%, 55%, 0.7)`
  ctx.lineWidth = 3
  drawShape(ctx, cx, cy, shapeSize, shape)
  ctx.fill()
  ctx.stroke()

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'
  ctx.lineWidth = 1
  ctx.strokeRect(0.5, 0.5, width - 1, height - 1)

  const markLen = Math.min(15, Math.min(width, height) * 0.05)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'
  ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(0, markLen); ctx.lineTo(0, 0); ctx.lineTo(markLen, 0); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(width - markLen, 0); ctx.lineTo(width, 0); ctx.lineTo(width, markLen); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(width, height - markLen); ctx.lineTo(width, height); ctx.lineTo(width - markLen, height); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(markLen, height); ctx.lineTo(0, height); ctx.lineTo(0, height - markLen); ctx.stroke()

  const titleSize = Math.max(14, Math.round(width * 0.05))
  ctx.fillStyle = '#ffffff'
  ctx.font = `bold ${titleSize}px monospace`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(animName, cx, height * 0.15)

  const frameSize = Math.max(12, Math.round(width * 0.035))
  ctx.font = `${frameSize}px monospace`
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
  ctx.fillText(`frame ${frameIndex + 1} / ${frameCount}`, cx, cy + shapeSize * 0.7)

  const dimSize = Math.max(10, Math.round(width * 0.03))
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'
  ctx.font = `${dimSize}px monospace`
  ctx.fillText(`${width}\u00d7${height} px`, cx, height * 0.85)

  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)'
  ctx.font = `${Math.max(8, Math.round(width * 0.02))}px monospace`
  ctx.fillText('PLACEHOLDER', cx, height * 0.95)

  return canvas
}

function buildManifest(defs: PngSequenceDef[], options: PlaceholderOptions): AssetManifest {
  const animations: AssetAnimation[] = defs.map(def => {
    const prefix = prefixFromDir(def.directory)
    const frames: AssetFrame[] = []
    for (let i = 0; i < def.frameCount; i++) {
      const filename = `${prefix}_${pad(i, 3)}.png`
      frames.push({
        index: i,
        filename,
        path: `${def.directory}/${filename}`,
        width: options.frameWidth,
        height: options.frameHeight,
      })
    }
    return {
      name: def.name,
      directory: def.directory,
      frameCount: def.frameCount,
      frameRate: def.frameRate,
      loop: def.loop,
      frames,
    }
  })
  return { frameWidth: options.frameWidth, frameHeight: options.frameHeight, animations }
}

function printManifest(manifest: AssetManifest): void {
  const sep = '\u2501'.repeat(60)
  console.log(`%c${sep}`, 'color: #888')
  console.log('%c  Placeholder Assets Required', 'font-weight: bold; font-size: 14px')
  console.log(`%c  Frame size: ${manifest.frameWidth}\u00d7${manifest.frameHeight}`, 'color: #aaa')
  console.log(`%c${sep}`, 'color: #888')
  for (const anim of manifest.animations) {
    console.log(`%c  ${anim.name}`, 'font-weight: bold; color: #4af')
    console.log(`%c    ${anim.frameCount} frames \u00b7 ${anim.frameRate} fps \u00b7 ${anim.loop ? 'looping' : 'once'} \u00b7 ${anim.directory}/`, 'color: #888')
    const firstFew = anim.frames.slice(0, 3)
    for (const f of firstFew) {
      console.log(`%c    \u2192 ${f.path}`, 'color: #666')
    }
    if (anim.frames.length > 4) {
      console.log(`%c    \u2026 (${anim.frames.length - 3} more)`, 'color: #555')
    }
    if (anim.frames.length > 3) {
      const last = anim.frames[anim.frames.length - 1]
      if (last) console.log(`%c    \u2192 ${last.path}`, 'color: #666')
    }
  }
  console.log(`%c${sep}`, 'color: #888')
  console.log('%c  Replace these with real PNGs, then switch to createAnimManager().', 'color: #aaa')
  console.log('%c  Access the full manifest via spriteManager.manifest', 'color: #888')
  console.log(`%c${sep}`, 'color: #888')
}

export async function createPlaceholderAnimManager(
  defs: PngSequenceDef[],
  options: PlaceholderOptions,
): Promise<PlaceholderSpriteManager> {
  const textures = new Map<string, Texture[]>()
  const allTextures: Texture[] = []
  const manifest = buildManifest(defs, options)

  for (const def of defs) {
    const frames: Texture[] = []
    for (let i = 0; i < def.frameCount; i++) {
      const canvas = generateFrame(def.name, i, def.frameCount, options.frameWidth, options.frameHeight)
      const tex = Texture.from(canvas)
      frames.push(tex)
    }
    textures.set(def.name, frames)
    allTextures.push(...frames)
  }

  const animsMap = new Map(defs.map(a => [a.name, a]))

  function createSprite(animName: string, initialFrame = 0): AnimatedSprite {
    const def = animsMap.get(animName)
    const tex = textures.get(animName)
    if (!def || !tex) throw new Error(`Animation "${animName}" not found`)
    const sprite = new AnimatedSprite({ textures: tex, autoUpdate: true })
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

  printManifest(manifest)

  return { anims: animsMap, textures, createSprite, destroy, manifest }
}

function buildFrames(def: PngSequenceDef): { filename: string; path: string; url: string }[] {
  const prefix = prefixFromDir(def.directory)
  const frames: { filename: string; path: string; url: string }[] = []
  for (let i = 0; i < def.frameCount; i++) {
    const filename = `${prefix}_${pad(i, 3)}.png`
    frames.push({ filename, path: `${def.directory}/${filename}`, url: `${def.directory}/${filename}` })
  }
  return frames
}

export async function createAdaptiveAnimManager(
  defs: PngSequenceDef[],
  options: PlaceholderOptions,
): Promise<AdaptiveSpriteManager> {
  const realDefs: PngSequenceDef[] = []
  const placeholderDefs: PngSequenceDef[] = []
  const realAssets: string[] = []
  const placeholderAssets: string[] = []

  for (const def of defs) {
    try {
      const single = await createAnimManager([def])
      single.destroy()
      realDefs.push(def)
      realAssets.push(def.name)
    } catch {
      placeholderDefs.push(def)
      placeholderAssets.push(def.name)
    }
  }

  let realManager: SpriteManager
  let placeholderManager: PlaceholderSpriteManager

  if (realDefs.length > 0) {
    realManager = await createAnimManager(realDefs)
  } else {
    realManager = { anims: new Map(), textures: new Map(), createSprite: () => { throw new Error('No real assets') }, destroy: () => {} }
  }

  if (placeholderDefs.length > 0) {
    placeholderManager = await createPlaceholderAnimManager(placeholderDefs, options)
  } else {
    const empty = { frameWidth: options.frameWidth, frameHeight: options.frameHeight, animations: [] }
    placeholderManager = { anims: new Map(), textures: new Map(), createSprite: () => { throw new Error('No placeholders') }, destroy: () => {}, manifest: empty }
  }

  const allAnims = new Map([...realManager.anims, ...placeholderManager.anims])
  const allTextures = new Map([...realManager.textures, ...placeholderManager.textures])

  const sep = '\u2501'.repeat(60)
  console.log(`%c${sep}`, 'color: #888')
  console.log('%c  Adaptive Asset Manager', 'font-weight: bold; font-size: 14px')
  if (realAssets.length > 0) {
    console.log(`%c  Real PNGs: ${realAssets.join(', ')}`, 'color: #4f4')
  }
  if (placeholderAssets.length > 0) {
    console.log(`%c  Placeholders: ${placeholderAssets.join(', ')}`, 'color: #fa4')
  }
  console.log(`%c${sep}`, 'color: #888')

  function createSprite(animName: string, initialFrame = 0): AnimatedSprite {
    if (realManager.anims.has(animName)) {
      return realManager.createSprite(animName, initialFrame)
    }
    return placeholderManager.createSprite(animName, initialFrame)
  }

  function destroy(): void {
    realManager.destroy()
    placeholderManager.destroy()
  }

  const manifest: AssetManifest = {
    frameWidth: options.frameWidth,
    frameHeight: options.frameHeight,
    animations: defs.map(def => {
      const frames = buildFrames(def)
      return {
        name: def.name,
        directory: def.directory,
        frameCount: def.frameCount,
        frameRate: def.frameRate,
        loop: def.loop,
        frames: frames.map((f, i) => ({
          index: i,
          filename: f.filename,
          path: f.path,
          width: options.frameWidth,
          height: options.frameHeight,
        })),
      }
    }),
  }

  function exportManifestJson(): string {
    const hints: Record<string, { description: string; visualHint: string }> =
      (globalThis as any).__ASSET_HINTS__ ?? {}
    const entries = manifest.animations.map(a => ({
      name: a.name,
      directory: a.directory,
      frameCount: a.frameCount,
      frameRate: a.frameRate,
      loop: a.loop,
      status: realAssets.includes(a.name) ? 'fulfilled' : 'placeholder',
      description: hints[a.name]?.description ?? '',
      visualHint: hints[a.name]?.visualHint ?? '',
      frames: a.frames.map(f => ({ index: f.index, filename: f.filename })),
    }))
    return JSON.stringify({ $schema: 'https://sub-engine.dev/asset-manifest-v1.json', frameWidth: options.frameWidth, frameHeight: options.frameHeight, animations: entries }, null, 2)
  }

  return { anims: allAnims, textures: allTextures, createSprite, destroy, manifest, realAssets, placeholderAssets, exportManifestJson }
}

export function generateAssetManifestJson(
  defs: PngSequenceDef[],
  options: PlaceholderOptions,
  hints?: Record<string, { description: string; visualHint: string }>,
): string {
  const entries = defs.map(def => {
    const frames = buildFrames(def)
    const h = hints?.[def.name]
    return {
      name: def.name,
      directory: def.directory,
      frameCount: def.frameCount,
      frameRate: def.frameRate,
      loop: def.loop,
      description: h?.description ?? '',
      visualHint: h?.visualHint ?? '',
      frames: frames.map((f, i) => ({ index: i, filename: f.filename })),
    }
  })
  return JSON.stringify({ $schema: 'https://sub-engine.dev/asset-manifest-v1.json', frameWidth: options.frameWidth, frameHeight: options.frameHeight, animations: entries }, null, 2)
}

import { Container, Sprite, Texture, Rectangle } from 'pixi.js'

interface TiledTilesetRef {
  firstGid: number
  name?: string
  tileWidth: number
  tileHeight: number
  tileCount: number
  columns: number
  image?: string
  imageWidth?: number
  imageHeight?: number
  tiles?: Array<{ id: number; image: string }>
}

interface TiledLayerData {
  name: string
  data: number[]
  width: number
  height: number
  visible: boolean
  opacity: number
}

interface TiledMapData {
  width: number
  height: number
  tileWidth: number
  tileHeight: number
  layers: TiledLayerData[]
  tilesets: TiledTilesetRef[]
  infinite?: boolean
  orientation?: string
  renderOrder?: string
}

export interface TileTextureCache {
  getTileTexture(tilesetIndex: number, tileId: number): Texture | undefined
  destroy(): void
}

async function loadImageTexture(url: string): Promise<Texture> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`)
  const blob = await res.blob()
  const bitmap = await createImageBitmap(blob)
  return Texture.from(bitmap)
}

export async function createTiledMapRenderer(
  mapData: TiledMapData,
  scale = 1
): Promise<{ container: Container; cache: TileTextureCache; destroy: () => void }> {
  const layerContainers: Container[] = []
  const tileTextures: Map<string, Texture>[] = []
  const layerTextures: Map<number, Texture>[] = []
  const allSprites: Sprite[] = []

  for (let ti = 0; ti < mapData.tilesets.length; ti++) {
    const ts = mapData.tilesets[ti]!
    const textureMap = new Map<string, Texture>()
    const idMap = new Map<number, Texture>()

    if (ts.tiles) {
      const loadPromises: Promise<void>[] = []
      for (const tile of ts.tiles) {
        const tileUrl = tile.image
        loadPromises.push(
          loadImageTexture(tileUrl).then(tex => {
            idMap.set(tile.id, tex)
            textureMap.set(tileUrl, tex)
          })
        )
      }
      await Promise.all(loadPromises)
    } else if (ts.image) {
      const sheetTex = await loadImageTexture(ts.image)
      const cols = ts.columns
      const rows = Math.ceil(ts.tileCount / cols)
      const totalTiles = ts.tileCount

      for (let i = 0; i < totalTiles; i++) {
        const sx = (i % cols) * ts.tileWidth
        const sy = Math.floor(i / cols) * ts.tileHeight
        const frame = new Texture({
          source: sheetTex.source,
          frame: new Rectangle(sx, sy, ts.tileWidth, ts.tileHeight),
        })
        idMap.set(i, frame)
      }
    }

    tileTextures.push(textureMap)
    layerTextures.push(idMap)
  }

  function getTileTexture(tilesetIndex: number, tileId: number): Texture | undefined {
    return layerTextures[tilesetIndex]?.get(tileId)
  }

  for (const layer of mapData.layers) {
    if (!layer.visible) continue

    const layerContainer = new Container()
    layerContainer.alpha = layer.opacity

    for (let y = 0; y < layer.height; y++) {
      for (let x = 0; x < layer.width; x++) {
        const gid: number = layer.data[y * layer.width + x]!
        if (gid === 0) continue

        const localId = gid - 1
        let tsIndex = -1
        for (let t = mapData.tilesets.length - 1; t >= 0; t--) {
          if ((mapData.tilesets[t]?.firstGid ?? 0) <= gid) {
            tsIndex = t
            break
          }
        }

        if (tsIndex < 0) continue

        const tileId = localId - (mapData.tilesets[tsIndex]!.firstGid - 1)
        const texture = getTileTexture(tsIndex, tileId)
        if (!texture) continue

        const sprite = new Sprite(texture)
        sprite.scale.set(scale)
        sprite.x = x * mapData.tileWidth * scale
        sprite.y = y * mapData.tileHeight * scale
        layerContainer.addChild(sprite)
        allSprites.push(sprite)
      }
    }

    layerContainers.push(layerContainer)
  }

  const rootContainer = new Container()
  for (const c of layerContainers) {
    rootContainer.addChild(c)
  }

  const cache: TileTextureCache = {
    getTileTexture(tilesetIndex: number, tileId: number): Texture | undefined {
      return layerTextures[tilesetIndex]?.get(tileId)
    },
    destroy(): void {
      for (const map of tileTextures) {
        map.clear()
      }
      for (const map of layerTextures) {
        map.clear()
      }
    },
  }

  return {
    container: rootContainer,
    cache,
    destroy: () => {
      for (const sprite of allSprites) {
        sprite.destroy({ texture: false, children: false })
      }
      for (const c of layerContainers) {
        c.destroy({ children: false })
      }
      rootContainer.destroy({ children: false })
      cache.destroy()
    },
  }
}

export function createProceduralMap(
  width: number,
  height: number,
  tileSize: number,
  fillFn: (x: number, y: number) => number,
  tilesets?: TiledTilesetRef[]
): TiledMapData {
  const data: number[] = []
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      data.push(fillFn(x, y))
    }
  }

  return {
    width,
    height,
    tileWidth: tileSize,
    tileHeight: tileSize,
    layers: [
      {
        name: 'ground',
        data,
        width,
        height,
        visible: true,
        opacity: 1,
      },
    ],
    tilesets: tilesets ?? [],
  }
}

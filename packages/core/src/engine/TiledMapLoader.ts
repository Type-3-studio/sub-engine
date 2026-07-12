import { createMapFromMatrix } from './MapLoader.js'
import type { TiledMapData, TiledTilesetRef, TiledLayerData, GameMap } from './types.js'

function resolveRelativePath(filePath: string, basePath: string): string {
  if (!basePath) return filePath
  if (filePath.startsWith('..')) {
    const parts = basePath.split('/')
    let up = 0
    let rest = filePath
    while (rest.startsWith('..')) {
      up++
      rest = rest.slice(3)
    }
    rest = rest.replace(/^\//, '')
    const base = parts.slice(0, parts.length - up).join('/')
    return encodeURI(base ? `${base}/${rest}` : rest)
  }
  if (filePath.startsWith('./')) {
    return encodeURI(`${basePath}/${filePath.slice(2)}`)
  }
  return encodeURI(`${basePath}/${filePath}`)
}

async function fetchJSON(url: string): Promise<Record<string, unknown>> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`)
  return res.json()
}

function getColumnCount(raw: Record<string, unknown>): number {
  if (typeof raw.columns === 'number' && raw.columns > 0) return raw.columns
  if (raw.image) {
    const imgW = raw.imagewidth as number
    const tw = raw.tilewidth as number
    if (imgW && tw) return Math.floor(imgW / tw)
  }
  if (raw.tiles && Array.isArray(raw.tiles)) return raw.tiles.length
  return 1
}

function parseTileset(raw: Record<string, unknown>, basePath: string): TiledTilesetRef {
  const ref: TiledTilesetRef = {
    firstGid: raw.firstgid as number ?? 1,
    name: raw.name as string,
    tileWidth: raw.tilewidth as number,
    tileHeight: raw.tileheight as number,
    tileCount: raw.tilecount as number ?? 0,
    columns: getColumnCount(raw),
  }

  if (raw.image) {
    ref.image = resolveRelativePath(raw.image as string, basePath)
    ref.imageWidth = raw.imagewidth as number
    ref.imageHeight = raw.imageheight as number
  }

  if (raw.tiles && Array.isArray(raw.tiles)) {
    ref.tiles = (raw.tiles as Array<Record<string, unknown>>).map(t => ({
      id: t.id as number,
      image: resolveRelativePath(t.image as string, basePath),
    }))
  }

  return ref
}

function parseTiledMapRaw(raw: Record<string, unknown>, basePath?: string): TiledMapData {
  const rawTilesets = (raw.tilesets ?? []) as Record<string, unknown>[]
  const tilesets: TiledTilesetRef[] = rawTilesets.map((ts: Record<string, unknown>) => {
    if (ts.source) {
      return {
        firstGid: ts.firstgid as number,
        name: ts.name as string,
        tileWidth: 0,
        tileHeight: 0,
        tileCount: 0,
        columns: 1,
      }
    }
    return parseTileset(ts, basePath ?? '')
  })

  const rawLayers = (raw.layers ?? []) as Record<string, unknown>[]
  const layers: TiledLayerData[] = rawLayers
    .filter((l: Record<string, unknown>) => l.type === 'tilelayer')
    .map((l: Record<string, unknown>) => ({
      name: l.name as string,
      data: (l.data as number[]) ?? [],
      width: l.width as number,
      height: l.height as number,
      visible: l.visible as boolean ?? true,
      opacity: l.opacity as number ?? 1,
    }))

  return {
    width: raw.width as number,
    height: raw.height as number,
    tileWidth: raw.tilewidth as number,
    tileHeight: raw.tileheight as number,
    layers,
    tilesets,
    infinite: raw.infinite as boolean ?? false,
    orientation: raw.orientation as string ?? 'orthogonal',
    renderOrder: raw.renderorder as string ?? 'right-down',
  }
}

export function parseTiledMap(json: string, basePath?: string): TiledMapData {
  const raw = JSON.parse(json)
  return parseTiledMapRaw(raw, basePath)
}

export function tiledMapToGameMap(tiledMap: TiledMapData, layerName?: string): GameMap {
  const targetLayer = layerName
    ? tiledMap.layers.find(l => l.name === layerName)
    : tiledMap.layers[0]

  if (!targetLayer) {
    throw new Error(
      layerName
        ? `Layer "${layerName}" not found in Tiled map`
        : 'No tile layers found in Tiled map'
    )
  }

  const matrix: number[][] = []
  for (let y = 0; y < targetLayer.height; y++) {
    const row: number[] = []
    for (let x = 0; x < targetLayer.width; x++) {
      const gid = targetLayer.data[y * targetLayer.width + x] ?? 0
      row.push(gid > 0 ? 1 : 0)
    }
    matrix.push(row)
  }

  return createMapFromMatrix(matrix)
}

export async function loadTiledMap(url: string): Promise<TiledMapData> {
  const urlParts = url.split('/')
  urlParts.pop()
  const basePath = urlParts.join('/')

  const raw = await fetchJSON(url)

  const tilesets: TiledTilesetRef[] = []
  const rawTilesets = (raw.tilesets ?? []) as Array<Record<string, unknown>>
  for (const ts of rawTilesets) {
    if (ts.source) {
      const tsUrl = resolveRelativePath(ts.source as string, basePath)
      const tsParts = tsUrl.split('/')
      tsParts.pop()
      const tsBasePath = tsParts.join('/')
      const tsData = await fetchJSON(tsUrl) as Record<string, unknown>
      tilesets.push(parseTileset({ firstgid: ts.firstgid, ...tsData }, tsBasePath))
    } else {
      tilesets.push(parseTileset(ts, basePath))
    }
  }

  const result = parseTiledMapRaw(raw, basePath)
  result.tilesets = tilesets
  return result
}

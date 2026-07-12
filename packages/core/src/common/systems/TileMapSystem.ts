import type { Registry, TiledMapData } from '../../engine/types.js'

export interface TileMapComponents {
  'TileMap': {
    width: number
    height: number
    tileWidth: number
    tileHeight: number
    layers: Array<{
      name: string
      data: number[]
      width: number
      height: number
      visible: boolean
      opacity: number
    }>
    tilesets: Array<{
      firstGid: number
      name?: string
      tileWidth: number
      tileHeight: number
      tileCount: number
    }>
  }
}

export function getTileAt(
  layers: TileMapComponents['TileMap']['layers'],
  layerName: string,
  x: number,
  y: number
): number {
  const layer = layers.find(l => l.name === layerName)
  if (!layer) return 0
  if (x < 0 || x >= layer.width || y < 0 || y >= layer.height) return 0
  return layer.data[y * layer.width + x] ?? 0
}

export function setTileAt(
  layers: TileMapComponents['TileMap']['layers'],
  layerName: string,
  x: number,
  y: number,
  gid: number
): void {
  const layer = layers.find(l => l.name === layerName)
  if (!layer) return
  if (x < 0 || x >= layer.width || y < 0 || y >= layer.height) return
  layer.data[y * layer.width + x] = gid
}

export function tileMapSystem(
  registry: Registry<TileMapComponents>,
  dt: number
): Registry<TileMapComponents> {
  return registry
}

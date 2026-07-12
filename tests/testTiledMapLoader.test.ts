import { describe, it, expect } from 'vitest'
import { parseTiledMap, tiledMapToGameMap } from '@sub-engine/core'

const MINIMAL_TMJ = JSON.stringify({
  width: 10,
  height: 8,
  tilewidth: 64,
  tileheight: 64,
  orientation: 'orthogonal',
  renderorder: 'right-down',
  layers: [
    {
      id: 1,
      name: 'ground',
      type: 'tilelayer',
      width: 10,
      height: 8,
      visible: true,
      opacity: 1,
      data: [
        1,1,1,1,1,1,1,1,1,1,
        1,0,0,0,0,0,0,0,0,1,
        1,0,1,1,1,1,1,1,0,1,
        1,0,1,0,0,0,0,1,0,1,
        1,0,1,0,0,0,0,1,0,1,
        1,0,1,1,1,1,1,1,0,1,
        1,0,0,0,0,0,0,0,0,1,
        1,1,1,1,1,1,1,1,1,1,
      ],
    },
  ],
  tilesets: [
    {
      firstgid: 1,
      name: 'test-tiles',
      tilewidth: 64,
      tileheight: 64,
      tilecount: 4,
      columns: 2,
      image: 'tileset.png',
      imagewidth: 128,
      imageheight: 128,
    },
  ],
})

describe('Parse minimal Tiled JSON', () => {
  const map = parseTiledMap(MINIMAL_TMJ)

  it('width and height', () => {
    expect(map.width).toBe(10)
    expect(map.height).toBe(8)
  })

  it('tile dimensions', () => {
    expect(map.tileWidth).toBe(64)
    expect(map.tileHeight).toBe(64)
  })

  it('layers', () => {
    expect(map.layers.length).toBe(1)
    expect(map.layers[0]!.name).toBe('ground')
    expect(map.layers[0]!.data.length).toBe(80)
    expect(map.layers[0]!.visible).toBe(true)
    expect(map.layers[0]!.opacity).toBe(1)
  })

  it('tilesets', () => {
    expect(map.tilesets.length).toBe(1)
    expect(map.tilesets[0]!.firstGid).toBe(1)
    expect(map.tilesets[0]!.tileCount).toBe(4)
    expect(map.tilesets[0]!.image).toBe('tileset.png')
  })

  it('metadata', () => {
    expect(map.orientation).toBe('orthogonal')
    expect(map.renderOrder).toBe('right-down')
  })
})

describe('Collection-of-images tileset', () => {
  const TMJ = JSON.stringify({
    width: 5,
    height: 5,
    tilewidth: 256,
    tileheight: 256,
    layers: [
      { id: 1, name: 'ground', type: 'tilelayer', width: 5, height: 5, visible: true, opacity: 1, data: [1,0,0,0,0, 0,0,0,0,0, 0,0,0,0,0, 0,0,0,0,0, 0,0,0,0,0] },
    ],
    tilesets: [
      {
        firstgid: 1,
        name: 'summer-ground',
        tilewidth: 256,
        tileheight: 256,
        tilecount: 56,
        columns: 1,
        tiles: [
          { id: 0, image: 'ground_01.png' },
          { id: 1, image: 'ground_02.png' },
        ],
      },
    ],
  })
  const map = parseTiledMap(TMJ)

  it('has tiles array', () => {
    expect(map.tilesets[0]!.tiles).toBeDefined()
  })

  it('tiles content', () => {
    expect(map.tilesets[0]!.tiles!.length).toBe(2)
    expect(map.tilesets[0]!.tiles![0]!.id).toBe(0)
    expect(map.tilesets[0]!.tiles![0]!.image).toBe('ground_01.png')
    expect(map.tilesets[0]!.tiles![1]!.id).toBe(1)
    expect(map.tilesets[0]!.tiles![1]!.image).toBe('ground_02.png')
  })
})

describe('External source reference', () => {
  const TMJ = JSON.stringify({
    width: 5,
    height: 5,
    tilewidth: 256,
    tileheight: 256,
    layers: [
      { id: 1, name: 'ground', type: 'tilelayer', width: 5, height: 5, visible: true, opacity: 1, data: [0,0,0,0,0, 0,0,0,0,0, 0,0,0,0,0, 0,0,0,0,0, 0,0,0,0,0] },
    ],
    tilesets: [
      { firstgid: 1, source: 'external-tileset.tsj' },
    ],
  })
  const map = parseTiledMap(TMJ)

  it('tileset present with firstGid', () => {
    expect(map.tilesets.length).toBe(1)
    expect(map.tilesets[0]!.firstGid).toBe(1)
  })

  it('external tileset is placeholder (no tileWidth)', () => {
    expect(map.tilesets[0]!.tileWidth).toBe(0)
  })
})

describe('tiledMapToGameMap', () => {
  const map = parseTiledMap(MINIMAL_TMJ)
  const gameMap = tiledMapToGameMap(map)

  it('dimensions match', () => {
    expect(gameMap.width).toBe(10)
    expect(gameMap.height).toBe(8)
  })

  it('corner (tile>0) is wall, empty cell is walkable', () => {
    expect(gameMap.isWalkable(0, 0)).toBe(false)
    expect(gameMap.isWalkable(1, 1)).toBe(true)
  })

  it('tile values', () => {
    expect(gameMap.getTile(0, 0)).toBe(1)
    expect(gameMap.getTile(1, 1)).toBe(0)
  })
})

describe('tiledMapToGameMap with specific layer', () => {
  const TMJ = JSON.stringify({
    width: 3,
    height: 3,
    tilewidth: 64,
    tileheight: 64,
    layers: [
      { id: 1, name: 'walls', type: 'tilelayer', width: 3, height: 3, visible: true, opacity: 1, data: [1,1,1, 1,0,1, 1,1,1] },
      { id: 2, name: 'decor', type: 'tilelayer', width: 3, height: 3, visible: true, opacity: 1, data: [0,0,0, 0,1,0, 0,0,0] },
    ],
    tilesets: [],
  })
  const map = parseTiledMap(TMJ)

  it('walls layer', () => {
    const wallsMap = tiledMapToGameMap(map, 'walls')
    expect(wallsMap.isWalkable(1, 1)).toBe(true)
    expect(wallsMap.isWalkable(0, 0)).toBe(false)
  })

  it('decor layer', () => {
    const decorMap = tiledMapToGameMap(map, 'decor')
    expect(decorMap.isWalkable(1, 1)).toBe(false)
    expect(decorMap.isWalkable(0, 0)).toBe(true)
  })
})

describe('Path resolution', () => {
  it('resolves relative image path', () => {
    const TMJ = JSON.stringify({
      width: 3,
      height: 3,
      tilewidth: 64,
      tileheight: 64,
      layers: [],
      tilesets: [
        {
          firstgid: 1,
          name: 'test',
          tilewidth: 64,
          tileheight: 64,
          tilecount: 1,
          columns: 1,
          image: '../images/tile.png',
        },
      ],
    })
    const map = parseTiledMap(TMJ, '/some/base/path')
    expect(map.tilesets[0]!.image).toBe('/some/base/images/tile.png')
  })

  it('resolves tile image paths for collection of images', () => {
    const TMJ = JSON.stringify({
      width: 3,
      height: 3,
      tilewidth: 64,
      tileheight: 64,
      layers: [],
      tilesets: [
        {
          firstgid: 1,
          name: 'test',
          tilewidth: 64,
          tileheight: 64,
          tilecount: 2,
          columns: 1,
          tiles: [
            { id: 0, image: '../tiles/first.png' },
            { id: 1, image: '../tiles/second.png' },
          ],
        },
      ],
    })
    const map = parseTiledMap(TMJ, '/game/maps')
    expect(map.tilesets[0]!.tiles![0]!.image).toBe('/game/tiles/first.png')
    expect(map.tilesets[0]!.tiles![1]!.image).toBe('/game/tiles/second.png')
  })
})

describe('Empty map', () => {
  const TMJ = JSON.stringify({
    width: 0,
    height: 0,
    tilewidth: 64,
    tileheight: 64,
    layers: [],
    tilesets: [],
  })
  const map = parseTiledMap(TMJ)

  it('properties', () => {
    expect(map.width).toBe(0)
    expect(map.layers.length).toBe(0)
    expect(map.tilesets.length).toBe(0)
  })
})

describe('tiledMapToGameMap throws on missing layer', () => {
  const map = parseTiledMap(MINIMAL_TMJ)

  it('throws on nonexistent layer name', () => {
    expect(() => tiledMapToGameMap(map, 'nonexistent')).toThrow()
  })
})

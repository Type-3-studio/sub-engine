export type ComponentMap = Record<string, any>

export type EntityWith<M extends ComponentMap, K extends (keyof M & string)[]> =
  { id: number } & {
    [P in K[number]]: M[P]
  }

export type Entity<M extends ComponentMap> =
  { id: number } & {
    [P in keyof M & string]?: M[P]
  }

export interface Vec2 {
  x: number
  y: number
}

export interface SchemaFieldDef {
  type: 'number' | 'string' | 'boolean' | 'integer' | 'array'
  required: boolean
}

export interface RegisteredSchema {
  name: string
  fields: Record<string, SchemaFieldDef>
}

export type EventType = 'entity:created' | 'entity:removed' | 'component:added' | 'component:removed' | 'component:changed'

export interface RegistryEvent {
  type: EventType
  entityId: number
  componentName?: string
  data?: Record<string, unknown>
}

export type EventCallback = (event: RegistryEvent) => void

export interface SerializedEntity {
  id: number
  components: Record<string, Record<string, unknown>>
}

export interface SerializedRegistry {
  version: number
  entities: SerializedEntity[]
  nextId: number
}

export interface Registry<M extends ComponentMap = Record<string, any>> {
  createEntity(): number
  removeEntity(entityId: number): void
  entityExists(entityId: number): boolean
  addComponent<K extends keyof M & string>(entityId: number, componentName: K, data: M[K]): void
  removeComponent<K extends keyof M & string>(entityId: number, componentName: K): void
  hasComponent<K extends keyof M & string>(entityId: number, componentName: K): boolean
  getComponent<K extends keyof M & string>(entityId: number, componentName: K): M[K] | undefined
  /** Returns internal reference — no copy. Mutating the returned object corrupts registry state. Use only in read-only hot paths. */
  getComponentReadonly<K extends keyof M & string>(entityId: number, componentName: K): Readonly<M[K]> | undefined
  getEntitiesWith<K extends keyof M & string>(componentNames: K): EntityWith<M, [K]>[]
  getEntitiesWith<K extends (keyof M & string)[]>(componentNames: K): EntityWith<M, K>[]
  getAllEntities(): Entity<M>[]
  clear(): void
  entityCount(): number
  on(type: EventType, callback: EventCallback): void
  off(type: EventType, callback: EventCallback): void
  serialize(): SerializedRegistry
  deserialize(data: SerializedRegistry): void
}

export interface GameMap {
  width: number
  height: number
  getTile(x: number, y: number): number
  isWalkable(x: number, y: number): boolean
  serialize(): number[][]
}

export interface FlowField {
  width: number
  height: number
  getVector(x: number, y: number): Vec2
  getCost(x: number, y: number): number
  serialize(): Vec2[][]
}

export interface TiledTilesetRef {
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

export interface TiledLayerData {
  name: string
  data: number[]
  width: number
  height: number
  visible: boolean
  opacity: number
}

export interface TiledMapData {
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

// Sub-Engine v2 — I2.5 app assembly: world + fixed system set + events + time.
//
// One API drives the world. `step(dt)` runs the scheduled systems once, then
// delivers queued events at the tick boundary. In strict mode, every component
// access is checked against the system's contract (I2.4, Article 5).

import { createWorld } from './world.js'
import { createRng } from './rng.js'
import { orderSystems } from './scheduler.js'
import { withDeterminismGuard } from './guard.js'
import type {
  App,
  AppOptions,
  ComponentData,
  EntityId,
  EventHandler,
  EventWriter,
  GameEvent,
  JsonObject,
  Rng,
  SimTime,
  SystemContext,
  SystemDef,
  World,
} from './types.js'
import { SchemaError } from './errors.js'

function accessMessage(
  system: SystemDef,
  type: string,
  kind: 'read' | 'write',
): string {
  const declared = kind === 'write' ? system.writes : system.reads
  const verb = kind === 'write' ? 'wrote' : 'read'
  const field = kind === 'write' ? 'writes' : 'reads'
  return (
    `System "${system.name}" ${verb} "${type}" which is not in its contract.\n` +
    `  declares ${field}: ${JSON.stringify(declared)}\n` +
    `  did you mean? add "${type}" to ${field}, or move the mutation to a ` +
    `system that owns it.`
  )
}

function restrict(world: World, system: SystemDef): World {
  const allowsRead = (type: string): boolean =>
    system.reads.includes(type) || system.writes.includes(type)
  const allowsWrite = (type: string): boolean => system.writes.includes(type)

  return new Proxy(world, {
    get(target, prop, receiver) {
      switch (prop) {
        case 'add':
          return (id: EntityId, type: string, data: ComponentData) => {
            if (!allowsWrite(type)) throw new SchemaError(accessMessage(system, type, 'write'))
            target.add(id, type, data)
          }
        case 'set':
          return (id: EntityId, type: string, data: ComponentData) => {
            if (!allowsWrite(type)) throw new SchemaError(accessMessage(system, type, 'write'))
            target.set(id, type, data)
          }
        case 'remove':
          return (id: EntityId, type: string) => {
            if (!allowsWrite(type)) throw new SchemaError(accessMessage(system, type, 'write'))
            target.remove(id, type)
          }
        case 'read':
          return (id: EntityId, type: string) => {
            if (!allowsRead(type)) throw new SchemaError(accessMessage(system, type, 'read'))
            return target.read(id, type)
          }
        case 'get':
          return (id: EntityId, type: string) => {
            if (!allowsRead(type)) throw new SchemaError(accessMessage(system, type, 'read'))
            return target.get(id, type)
          }
        case 'has':
          return (id: EntityId, type: string) => {
            if (!allowsRead(type)) throw new SchemaError(accessMessage(system, type, 'read'))
            return target.has(id, type)
          }
        case 'query':
          return (...types: string[]) => {
            for (const type of types) {
              if (!allowsRead(type)) throw new SchemaError(accessMessage(system, type, 'read'))
            }
            return target.query(...types)
          }
        default:
          return Reflect.get(target, prop, receiver)
      }
    },
  })
}

export function createApp(options: AppOptions = {}): App {
  const strict = options.strict ?? true
  const baseSeed = options.seed ?? 0
  const world = createWorld({ schemas: options.schemas, seed: baseSeed })

  const systems: SystemDef[] = []
  const handlers = new Map<string, EventHandler[]>()
  const streams = new Map<string, Rng>()
  let order: SystemDef[] | null = null
  let tick = 0

  function streamFor(label: string): Rng {
    let stream = streams.get(label)
    if (!stream) {
      stream = createRng(baseSeed, label)
      streams.set(label, stream)
    }
    return stream
  }

  function ensureOrder(): SystemDef[] {
    if (!order) order = orderSystems(systems)
    return order
  }

  function tickEvents(queue: GameEvent[]): void {
    for (const event of queue) {
      const list = handlers.get(event.type)
      if (!list) continue
      list.forEach((handler, index) => {
        const ctx: SystemContext = {
          world,
          rng: streamFor(`event:${event.type}:${index}`),
          events: { emit: () => {} },
          time: { tick: tick - 1, dt: 0 },
        }
        handler(ctx, event)
      })
    }
  }

  return {
    world,

    get tick(): number {
      return tick
    },

    use(system: SystemDef): void {
      if (order) throw new SchemaError('Cannot add systems after the first step')
      if (systems.some((s) => s.name === system.name)) {
        throw new SchemaError(`System "${system.name}" is already registered`)
      }
      systems.push(system)
    },

    on(type: string, handler: EventHandler): void {
      const list = handlers.get(type) ?? []
      list.push(handler)
      handlers.set(type, list)
    },

    step(dt: number): void {
      const scheduled = ensureOrder()
      const time: SimTime = { tick, dt }
      const queue: GameEvent[] = []

      for (const system of scheduled) {
        const events: EventWriter = {
          emit(type: string, payload?: JsonObject) {
            if (strict && !system.emits.includes(type)) {
              throw new SchemaError(
                `System "${system.name}" emitted undeclared event "${type}"`,
              )
            }
            queue.push({ type, payload: payload ?? {} })
          },
        }
        const ctx: SystemContext = {
          world: strict ? restrict(world, system) : world,
          rng: streamFor(system.name),
          events,
          time,
        }
        if (strict) withDeterminismGuard(system.name, () => system.run(ctx, dt))
        else system.run(ctx, dt)
      }

      tick++
      tickEvents(queue)
    },

    systemOrder(): string[] {
      return ensureOrder().map((s) => s.name)
    },

    systems(): readonly SystemDef[] {
      return ensureOrder()
    },

    hash(): string {
      return world.hash()
    },
  }
}

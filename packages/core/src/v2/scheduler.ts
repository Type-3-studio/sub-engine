// Sub-Engine v2 — I2.2 deterministic scheduler.
//
// Builds a dependency graph from system contracts and topologically sorts it.
// Ties are broken by registration index, so the order is reproducible. Cycles
// throw with the cycle printed.

import type { SystemDef } from './types.js'
import { SchemaError } from './errors.js'

function intersects(a: ReadonlySet<string>, b: ReadonlySet<string>): boolean {
  const [small, large] = a.size <= b.size ? [a, b] : [b, a]
  for (const item of small) if (large.has(item)) return true
  return false
}

function buildGraph(systems: readonly SystemDef[]): Set<number>[] {
  const n = systems.length
  const writes = systems.map((s) => new Set(s.writes))
  const reads = systems.map((s) => new Set(s.reads))
  const adj: Set<number>[] = Array.from({ length: n }, () => new Set<number>())
  const addEdge = (from: number, to: number): void => {
    if (from !== to) adj[from]!.add(to)
  }

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (intersects(writes[i]!, writes[j]!)) {
        // Write-write conflict: deterministic registration order, and do not
        // also add the read edge (that is what makes two read+write systems
        // cycle in a naive scheduler).
        addEdge(i, j)
      } else {
        if (intersects(writes[i]!, reads[j]!)) addEdge(i, j)
        if (intersects(writes[j]!, reads[i]!)) addEdge(j, i)
      }
    }
  }
  return adj
}

function findCycle(adj: Set<number>[], n: number): number[] | null {
  const state = new Uint8Array(n) // 0=unvisited 1=visiting 2=done
  const stack: number[] = []
  let found: number[] | null = null
  const visit = (u: number): boolean => {
    state[u] = 1
    stack.push(u)
    for (const v of adj[u]!) {
      if (state[v] === 1) {
        found = stack.slice(stack.indexOf(v))
        return true
      }
      if (state[v] === 0 && visit(v)) return true
    }
    stack.pop()
    state[u] = 2
    return false
  }
  for (let i = 0; i < n; i++) if (state[i] === 0 && visit(i)) break
  return found
}

/**
 * Return systems in deterministic execution order. A dependency A → B is added
 * when A writes a component B reads. Write-write conflicts use registration
 * order. Throws on a cycle.
 */
export function orderSystems<T extends SystemDef>(systems: readonly T[]): T[] {
  const n = systems.length
  const adj = buildGraph(systems)
  const indegree = new Array<number>(n).fill(0)
  for (const targets of adj) for (const t of targets) indegree[t] = (indegree[t] ?? 0) + 1

  const order: T[] = []
  const done = new Array<boolean>(n).fill(false)
  for (let step = 0; step < n; step++) {
    let next = -1
    for (let i = 0; i < n; i++) {
      if (!done[i] && indegree[i] === 0) {
        next = i
        break // smallest index ⇒ deterministic tie-break
      }
    }
    if (next === -1) break
    done[next] = true
    order.push(systems[next]!)
    for (const t of adj[next]!) indegree[t] = (indegree[t] ?? 0) - 1
  }

  if (order.length !== n) {
    const cycle = findCycle(adj, n) ?? []
    const names = cycle.map((i) => systems[i]!.name).join(' → ')
    throw new SchemaError(
      `System dependency cycle detected: ${names} → ${systems[cycle[0]!]!.name ?? ''}`.trim(),
    )
  }
  return order
}

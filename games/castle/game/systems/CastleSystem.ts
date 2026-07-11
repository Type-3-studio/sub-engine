import { SCHEMA } from '../contract.js'
import type { Registry } from '../../../../src/engine/types.js'
import type { CastleComponents } from '../contract.js'
import { BUILDING_DEFS, FOOD_CONSUMPTION_RATES, HAPPINESS_RATION_BONUSES } from '../config/castle.js'
import type { BuildingDef } from '../config/castle.js'

export function castleSystem(registry: Registry<CastleComponents>): Registry<CastleComponents> {
  const states = registry.getEntitiesWith([SCHEMA.GAME_STATE])
  if (!states.length) return registry
  const gsId = states[0]!.id
  const gs = registry.getComponent(gsId, SCHEMA.GAME_STATE)
  if (!gs) return registry

  const buildings = registry.getEntitiesWith([SCHEMA.BUILDING, SCHEMA.POSITION])

  let maxPopulation = 0
  let totalFarmWorkerSlots = 0
  let totalProductionPerFarmWorker = 0
  let totalMineWorkerSlots = 0
  let totalProductionPerMineWorker = 0
  let gardenHappiness = 0
  let maxSoldiers = 0
  let castlePrestige = 0

  const defMap: Record<string, BuildingDef> = {}
  for (const def of BUILDING_DEFS) {
    defMap[def.type] = def
  }

  for (const b of buildings) {
    const def = defMap[b.Building.type]
    if (!def) continue
    const lv = b.Building.level
    if (def.type === 'home') maxPopulation += (def.capacityPerLevel?.[lv] ?? 0)
    if (def.type === 'farm') {
      totalFarmWorkerSlots += (def.workerSlotsPerLevel?.[lv] ?? 0)
      totalProductionPerFarmWorker = def.productionPerWorker?.[lv] ?? 0
    }
    if (def.type === 'mine') {
      totalMineWorkerSlots += (def.workerSlotsPerLevel?.[lv] ?? 0)
      totalProductionPerMineWorker = def.productionPerWorker?.[lv] ?? 0
    }
    if (def.type === 'garden') gardenHappiness += (def.happinessPerLevel?.[lv] ?? 0)
    if (def.type === 'barracks') maxSoldiers += (def.soldierCapacityPerLevel?.[lv] ?? 0)
    if (def.type === 'castle') castlePrestige += (def.prestigePerLevel?.[lv] ?? 0)
  }

  const workers = Math.max(0, gs.population - gs.soldiers)
  const farmWorkers = Math.min(workers, totalFarmWorkerSlots)
  const mineWorkers = Math.min(workers - farmWorkers, totalMineWorkerSlots)

  const foodProduction = farmWorkers * totalProductionPerFarmWorker
  const goldMining = mineWorkers * totalProductionPerMineWorker
  const rationMult = FOOD_CONSUMPTION_RATES[gs.foodRations] ?? 1.0
  const foodConsumption = Math.round(gs.population * rationMult * 10) / 10

  let newFood = gs.food + foodProduction - foodConsumption
  let starved = false
  if (newFood < 0) {
    newFood = 0
    starved = true
  }

  const taxGold = Math.round(gs.population * (gs.taxRate / 100) * 2 * 10) / 10
  const newGold = Math.round((gs.gold + goldMining + taxGold) * 10) / 10

  const overcrowding = gs.population > maxPopulation && maxPopulation > 0
  const foodBonus = starved ? -20 : (gs.food >= foodConsumption ? 15 : 5)
  const taxPenalty = -(gs.taxRate / 50) * 20
  const overcrowdingPenalty = overcrowding ? -20 : 0
  const rationBonus = HAPPINESS_RATION_BONUSES[gs.foodRations] ?? 0

  let happiness = 50 + foodBonus + taxPenalty + gardenHappiness + overcrowdingPenalty + castlePrestige + rationBonus
  happiness = Math.max(0, Math.min(100, Math.round(happiness)))

  let newPopulation = gs.population
  if (happiness < 50) {
    const leaving = Math.max(1, Math.floor(gs.population * 0.03))
    newPopulation = Math.max(1, gs.population - leaving)
  } else if (gs.food >= foodConsumption && gs.population < maxPopulation) {
    if (Math.random() < 0.3) {
      newPopulation = Math.min(maxPopulation, gs.population + 1)
    }
  }

  let newSoldiers = gs.soldiers
  if (newPopulation < gs.soldiers) {
    newSoldiers = Math.max(0, gs.soldiers - (gs.soldiers - newPopulation))
  }

  registry.addComponent(gsId, SCHEMA.GAME_STATE, {
    population: newPopulation,
    maxPopulation,
    soldiers: newSoldiers,
    maxSoldiers,
    happiness,
    food: newFood,
    gold: newGold,
    taxRate: gs.taxRate,
    foodRations: gs.foodRations,
    day: gs.day + 1,
    workers,
    farmWorkers,
    mineWorkers,
    foodProduction,
    foodConsumption,
    goldMining,
    taxGold,
    starved,
    totalFarmWorkerSlots,
    totalMineWorkerSlots,
  })

  return registry
}

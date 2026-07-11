import { SCHEMA } from '../contract.js'
import type { Registry } from '../../../../src/engine/types.js'
import type { CastleComponents } from '../contract.js'
import { BUILDING_DEFS, FOOD_CONSUMPTION_RATES, HAPPINESS_RATION_BONUSES } from '../config/castle.js'
import type { BuildingDef } from '../config/castle.js'

export function castleSystem(registry: Registry<CastleComponents>): Registry<CastleComponents> {
  const ents = registry.getEntitiesWith([SCHEMA.ECONOMY, SCHEMA.POPULATION, SCHEMA.HAPPINESS])
  if (!ents.length) return registry
  const eid = ents[0]!.id

  const economy = registry.getComponent(eid, SCHEMA.ECONOMY)
  const population = registry.getComponent(eid, SCHEMA.POPULATION)
  const happinessComp = registry.getComponent(eid, SCHEMA.HAPPINESS)
  if (!economy || !population || !happinessComp) return registry

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

  const workers = Math.max(0, population.population - population.soldiers)
  const farmWorkers = Math.min(workers, totalFarmWorkerSlots)
  const mineWorkers = Math.min(workers - farmWorkers, totalMineWorkerSlots)

  const foodProduction = farmWorkers * totalProductionPerFarmWorker
  const goldMining = mineWorkers * totalProductionPerMineWorker
  const rationMult = FOOD_CONSUMPTION_RATES[economy.foodRations] ?? 1.0
  const foodConsumption = Math.round(population.population * rationMult * 10) / 10

  let newFood = economy.food + foodProduction - foodConsumption
  let starved = false
  if (newFood < 0) {
    newFood = 0
    starved = true
  }

  const taxGold = Math.round(population.population * (economy.taxRate / 100) * 2 * 10) / 10
  const newGold = Math.round((economy.gold + goldMining + taxGold) * 10) / 10

  const overcrowding = population.population > maxPopulation && maxPopulation > 0
  const foodBonus = starved ? -20 : (economy.food >= foodConsumption ? 15 : 5)
  const taxPenalty = -(economy.taxRate / 50) * 20
  const overcrowdingPenalty = overcrowding ? -20 : 0
  const rationBonus = HAPPINESS_RATION_BONUSES[economy.foodRations] ?? 0

  let newHappiness = 50 + foodBonus + taxPenalty + gardenHappiness + overcrowdingPenalty + castlePrestige + rationBonus
  newHappiness = Math.max(0, Math.min(100, Math.round(newHappiness)))

  let newPopulation = population.population
  if (newHappiness < 50) {
    const leaving = Math.max(1, Math.floor(population.population * 0.03))
    newPopulation = Math.max(1, population.population - leaving)
  } else if (economy.food >= foodConsumption && population.population < maxPopulation) {
    if (Math.random() < 0.3) {
      newPopulation = Math.min(maxPopulation, population.population + 1)
    }
  }

  let newSoldiers = population.soldiers
  if (newPopulation < population.soldiers) {
    newSoldiers = Math.max(0, population.soldiers - (population.soldiers - newPopulation))
  }

  registry.addComponent(eid, SCHEMA.ECONOMY, {
    food: newFood,
    gold: newGold,
    taxRate: economy.taxRate,
    foodRations: economy.foodRations,
    workers,
    farmWorkers,
    mineWorkers,
    foodProduction,
    foodConsumption,
    goldMining,
    taxGold,
    starved,
  })

  registry.addComponent(eid, SCHEMA.POPULATION, {
    population: newPopulation,
    maxPopulation,
    soldiers: newSoldiers,
    maxSoldiers,
    totalFarmWorkerSlots,
    totalMineWorkerSlots,
  })

  registry.addComponent(eid, SCHEMA.HAPPINESS, {
    happiness: newHappiness,
    day: happinessComp.day + 1,
  })

  return registry
}

import { map, mergeArray } from "@most/core"
import { ARBITRUM_CONTRACTS, gambitContract } from "gambit-middleware"
import { dto } from ".."
import { BaseEntity } from "../dto/BaseEntity"
import { AggregatedTrade, AggregatedTradeSettled, PositionDecrease, PositionIncrease, PositionUpdate } from "../dto/Vault"
import { provider } from "../rpc"
import { EM } from "../server"


export const openPositions = new Map<string, AggregatedTrade>()


export async function initAggTrades() {

  const increaseQuery = EM.find(dto.PositionIncrease, {})
  const closeQuery = EM.find(dto.PositionClose, {})
  const liquidatedQuery = EM.find(dto.PositionLiquidated, {})
  const decreaseQuery = EM.find(dto.PositionDecrease, {})
  const updateQuery = EM.find(dto.PositionUpdate, {})

  const initList = await increaseQuery
  const closedList = await closeQuery
  const liquidatedList = await liquidatedQuery
  const decreaseList = await decreaseQuery
  const updateList = await updateQuery
  
  const positionTimeline = [...initList, ...closedList, ...liquidatedList, ...decreaseList, ...updateList]
    // .filter(p => p.key === '0x9c51eeea864909c115164d2ad805346ef5575b4673a6695f48c1351a795e8a60')
    .sort((a: BaseEntity, b: BaseEntity): number => a.createdAt.getTime() - b.createdAt.getTime() + (a instanceof PositionUpdate ? 350 : a instanceof PositionDecrease ? -350 : 0))
  
  const abstractPositions = positionTimeline.reduce((seed, pos) => {
    let aggtrade = seed.open.get(pos.key)

    if (aggtrade) {
      if (pos instanceof PositionIncrease) {
        aggtrade.increases.add(pos)
      } else if (pos instanceof PositionDecrease) {
        aggtrade.decreases.add(pos)
      } else if (pos instanceof PositionUpdate) {
        aggtrade.updates.add(pos)
      } else {
        EM.remove(aggtrade)
        seed.open.delete(pos.key)
        seed.settled.push(new AggregatedTradeSettled(pos, aggtrade))
      }
    } else if (pos instanceof PositionIncrease) {
      aggtrade = new AggregatedTrade(pos)

      seed.open.set(pos.key, aggtrade)
    }

    return seed

  }, { open: openPositions, settled: [] as AggregatedTradeSettled[] })
  // .filter(x => x instanceof AggregatedTrade)
  
  // console.log(`Initiated Aggregated trades Total - ${allList.length}`)
  console.log(`Initiated Aggregated trades open - ${openPositions.size}`)

  EM.persist([...abstractPositions.open.values(), ...abstractPositions.settled])

  return abstractPositions
}


const vaultActions = gambitContract(provider)

export const modelChanges = mergeArray([

  map(pos => {
    const model = new dto.PositionIncrease(
      pos.price.toBigInt(),
      pos.collateralDelta.toBigInt(),
      pos.sizeDelta.toBigInt(),
      pos.fee.toBigInt(),
      pos.account,
      pos.isLong,
      pos.indexToken as ARBITRUM_CONTRACTS,
      pos.collateralToken,
      pos.key,
    )


    const aggTrade = openPositions.get(pos.key)

    if (!aggTrade) {
      const newAggTrade = new dto.AggregatedTrade(model)
      openPositions.set(pos.key, newAggTrade)
      return [model, newAggTrade]
    }
    
    aggTrade.increases.add(model)

    return [model, aggTrade]
  }, vaultActions.increasePosition),
  
  map(pos => {
    const model = new dto.PositionDecrease(
      pos.price.toBigInt(),
      pos.collateralDelta.toBigInt(),
      pos.sizeDelta.toBigInt(),
      pos.fee.toBigInt(),
      pos.account,
      pos.isLong,
      pos.indexToken as ARBITRUM_CONTRACTS,
      pos.collateralToken,
      pos.key,
    )


    const aggTrade = openPositions.get(pos.key)
    

    if (aggTrade) {
      aggTrade.decreases.add(model)
      return [model, aggTrade]
    }

    return [model]
  }, vaultActions.decreasePosition),

  map(pos => {
    const model = new dto.PositionUpdate(
      pos.averagePrice.toBigInt(),
      pos.entryFundingRate.toBigInt(),
      pos.reserveAmount.toBigInt(),
      pos.realisedPnl.toBigInt(),
      pos.collateral.toBigInt(),
      pos.size.toBigInt(),
      pos.key
    )

    const aggTrade = openPositions.get(pos.key)

    if (aggTrade) {
      aggTrade.updates.add(model)
      return [model, aggTrade]
    }

    return [model]
  }, vaultActions.updatePosition),

  
  // Settle aggregation
  map(pos => {
    const model = new dto.PositionLiquidated(
      pos.markPrice.toBigInt(),
      pos.reserveAmount.toBigInt(),
      pos.realisedPnl.toBigInt(),
      pos.collateral.toBigInt(),
      pos.size.toBigInt(),
      pos.account,
      pos.isLong,
      pos.indexToken as ARBITRUM_CONTRACTS,
      pos.collateralToken,
      pos.key,
    )

    const aggTrade = openPositions.get(pos.key)

    if (aggTrade) {
      const settled = new AggregatedTradeSettled(model, aggTrade)
      openPositions.delete(pos.key)
      EM.remove(aggTrade)

      return [model, settled]
    }

    return [model]
  }, vaultActions.liquidatePosition),

  map(pos => {
    const model = new dto.PositionClose(
      pos.averagePrice.toBigInt(),
      pos.entryFundingRate.toBigInt(),
      pos.reserveAmount.toBigInt(),
      pos.realisedPnl.toBigInt(),
      pos.collateral.toBigInt(),
      pos.size.toBigInt(),
      pos.key,
    )

    const aggTrade = openPositions.get(pos.key)

    if (aggTrade) {
      const settled = new AggregatedTradeSettled(model, aggTrade)
      openPositions.delete(pos.key)
      EM.remove(aggTrade)

      return [model, settled]
    }

    return [model]
  }, vaultActions.closePosition),

])


import { O } from "@aelea/core"
import { IAggregatedTradeAll } from "."
import { toAggregatedOpenTradeSummary, toAggregatedTradeSettledSummary } from "./gambit"
import {
  IAccountAggregationMap, IAggregatedAccountSummary, IAggregatedOpenPositionSummary, IAggregatedPositionSettledSummary, IAggregatedTradeClosed,
  IAggregatedTradeLiquidated, IAggregatedTradeOpen, IAggregatedTradeSettledAll, IAggregatedTradeSettledListMap,
  IAggregatedTradeSummary, IIdentifiableEntity, IPositionClose, IPositionDecrease,
  IPositionIncrease, IPositionLiquidated, IPositionUpdate
} from "./types"



function baseEntityJson<T extends  IIdentifiableEntity>(json: T): T {
  return { ...json }
}

function positonCloseJson(json: IPositionClose) {
  const realisedPnl = BigInt(json?.realisedPnl)
  const collateral = BigInt(json?.collateral)
  const entryFundingRate = BigInt(json?.entryFundingRate)
  const averagePrice = BigInt(json?.averagePrice)
  const size = BigInt(json?.size)

  return { ...baseEntityJson(json), size, collateral, entryFundingRate, realisedPnl, averagePrice }
}

function positionLiquidatedJson(json: IPositionLiquidated): IPositionLiquidated {
  const collateral = BigInt(json?.collateral)
  const markPrice = BigInt(json?.markPrice)
  const size = BigInt(json?.size)
  const realisedPnl = BigInt(json?.realisedPnl)
  const reserveAmount = BigInt(json?.reserveAmount)

  return { ...baseEntityJson(json), size, markPrice, realisedPnl, collateral, reserveAmount, }
}

function positionIncreaseJson(json: IPositionIncrease): IPositionIncrease {
  const fee = BigInt(json?.fee)
  const price = BigInt(json?.price)
  const sizeDelta = BigInt(json?.sizeDelta)
  const collateralDelta = BigInt(json?.collateralDelta)

  return { ...json, fee, price, sizeDelta, collateralDelta, }
}

function positionDecreaseJson(json: IPositionDecrease): IPositionDecrease {
  const fee = BigInt(json?.fee)
  const price = BigInt(json?.price)
  const sizeDelta = BigInt(json?.sizeDelta)
  const collateralDelta = BigInt(json?.collateralDelta)

  return { ...json, fee, price, sizeDelta, collateralDelta, }
}



function positionUpdateJson(json: IPositionUpdate): IPositionUpdate {
  const collateral = BigInt(json?.collateral)
  const averagePrice = BigInt(json?.averagePrice)
  const size = BigInt(json?.size)
  const entryFundingRate = BigInt(json?.entryFundingRate)
  const realisedPnl = BigInt(json?.realisedPnl)
  const reserveAmount = BigInt(json?.reserveAmount)

  return { ...json, collateral, averagePrice, size, entryFundingRate, realisedPnl, reserveAmount }
}

function accountSummaryJson(json: IAggregatedAccountSummary): IAggregatedAccountSummary {
  const pnl = BigInt(json?.pnl)
  const fee = BigInt(json?.fee)
  const collateral = BigInt(json?.collateral)
  const size = BigInt(json?.size)

  return { ...json, collateral, pnl, fee, size, }
}


function toAggregatedTradeOpenJson<T extends IAggregatedTradeOpen>(json: T): T {
  const decreaseList = json.decreaseList?.map(positionDecreaseJson).sort((a, b) => a.indexedAt - b.indexedAt) || []
  const increaseList = json.increaseList?.map(positionIncreaseJson).sort((a, b) => a.indexedAt - b.indexedAt) || []
  const updateList = json.updateList?.map(positionUpdateJson).sort((a, b) => a.indexedAt - b.indexedAt) || []
  const initialPosition = positionIncreaseJson(json.initialPosition)

  return { ...json, decreaseList, increaseList, updateList, initialPosition }
}

function toAggregatedTradeClosedJson(json: IAggregatedTradeClosed): IAggregatedTradeClosed {
  const settledPosition = positonCloseJson(json.settledPosition)

  return { ...toAggregatedTradeOpenJson(json), settledPosition }
}

function toAggregatedTradeLiquidatedJson(json: IAggregatedTradeLiquidated): IAggregatedTradeLiquidated {
  const settledPosition = positionLiquidatedJson(json.settledPosition)

  return { ...toAggregatedTradeOpenJson(json), settledPosition, }
}

function toAggregatedTradeListJson<T extends IAggregatedTradeSettledListMap>(json: T): T {
  const aggregatedTradeCloseds = json.aggregatedTradeCloseds?.map(toAggregatedTradeClosedJson) || []
  const aggregatedTradeLiquidateds = json.aggregatedTradeLiquidateds?.map(toAggregatedTradeLiquidatedJson) || []
  // const aggregatedTradeOpens = json.aggregatedTradeOpens?.map(toAggregatedTradeOpenJson) || []

  return { ...json, aggregatedTradeCloseds, aggregatedTradeLiquidateds }
}

function toAccountAggregationJson(json: IAccountAggregationMap): IAccountAggregationMap {
  const totalRealisedPnl = BigInt(json?.totalRealisedPnl)

  return { ...toAggregatedTradeListJson(json), totalRealisedPnl  }
}

function toAggregatedTradeSummary<T extends IAggregatedTradeSummary>(json: T): T {
  const size = BigInt(json.size)
  const collateral = BigInt(json.collateral)
  const fee = BigInt(json.fee)

  return { ...json, size, collateral, fee  }
}

function toAggregatedPositionSummary<T extends IAggregatedOpenPositionSummary>(json: T): IAggregatedOpenPositionSummary {
  const averagePrice = BigInt(json.averagePrice)

  return { ...toAggregatedTradeSummary(json), averagePrice  }
}

function toAggregatedPositionSettledSummary<T extends IAggregatedPositionSettledSummary<IAggregatedTradeSettledAll>>(json: T): T {
  const averagePrice = BigInt(json.averagePrice)
  const pnl = BigInt(json.pnl)
  const realisedPnl = BigInt(json.realisedPnl)

  const jsonTrade = json.trade
  const settledPosition = jsonTrade.settledPosition

  // @ts-ignore
  const trade =  'markPrice' in settledPosition ? toAggregatedTradeLiquidatedJson(json.trade) : toAggregatedTradeClosedJson(json.trade)

  return { ...toAggregatedTradeSummary(json), trade, averagePrice, pnl, realisedPnl  }
}

function toAggregatedSettledTrade<T extends IAggregatedTradeClosed | IAggregatedTradeLiquidated>(json: T): T {
  // @ts-ignore
  return 'markPrice' in json.settledPosition ? toAggregatedTradeLiquidatedJson(json) : toAggregatedTradeClosedJson(json)
}

function toAggregatedTradeAllSummary<T extends IAggregatedTradeAll>(json: T): IAggregatedOpenPositionSummary | IAggregatedPositionSettledSummary {
  // @ts-ignore
  if (json.settledPosition) {  // @ts-ignore
    if ('markPrice' in json.settledPosition) {
      // @ts-ignore
      return toAggregatedTradeSettledSummary(toAggregatedTradeLiquidatedJson(json))
    } else {
      // @ts-ignore
      return toAggregatedTradeSettledSummary(toAggregatedTradeClosedJson(json))
    }
  } else {
    return toAggregatedOpenTradeSummary(toAggregatedTradeOpenJson(json))
  }

  // @ts-ignore
  return trade
}





export const fromJson = {
  positonCloseJson,
  positionLiquidatedJson,
  positionIncreaseJson,
  positionDecreaseJson,
  positionUpdateJson,
  accountSummaryJson,
  toAggregatedTradeOpenJson,
  toAggregatedTradeClosedJson,
  toAggregatedTradeLiquidatedJson,
  toAggregatedTradeListJson,
  toAccountAggregationJson,
  toAggregatedTradeSummary,
  toAggregatedPositionSummary,
  toAggregatedPositionSettledSummary,
  toAggregatedSettledTrade,
  toAggregatedOpenTradeSummary: O(toAggregatedTradeOpenJson, toAggregatedOpenTradeSummary),
  toAggregatedTradeSettledSummary: O(toAggregatedSettledTrade, toAggregatedTradeSettledSummary),
  toAggregatedTradeAllSummary,
}
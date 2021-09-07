/* eslint-disable prefer-const */
import { ethereum, store } from "@graphprotocol/graph-ts"
import * as contract from "../generated/gmxVault/gmxVault"

import {
  ClosePosition,
  DecreasePosition,
  IncreasePosition, LiquidatePosition, UpdatePosition, AggregatedTradeOpen, AggregatedTradeClosed, AggregatedTradeLiquidated
} from "../generated/schema"



const txId = (ev: ethereum.Event, key: string): string => key + "-" + ev.logIndex.toString()




export function handleIncreasePosition(event: contract.IncreasePosition): void {
  let tradeKey = event.params.key.toHex()
  let entity = new IncreasePosition(txId(event, tradeKey)) // we prevent 

  // BigInt and BigDecimal math are supported
  entity.key = event.params.key.toHex()
  entity.account = event.params.account.toHex()
  entity.collateralToken = event.params.collateralToken.toHex()
  entity.indexToken = event.params.indexToken.toHex()

  entity.isLong = event.params.isLong

  entity.collateralDelta = event.params.collateralDelta.toBigDecimal()
  entity.sizeDelta = event.params.sizeDelta.toBigDecimal()
  entity.price = event.params.price.toBigDecimal()
  entity.fee = event.params.fee.toBigDecimal()

  // Entities can be written to the store with `.save()`
  entity.save()

  let aggTradeOpen = AggregatedTradeOpen.load(tradeKey)

  if (aggTradeOpen === null) {
    aggTradeOpen = new AggregatedTradeOpen(tradeKey)

    aggTradeOpen.initialPositionBlockTimestamp = event.block.timestamp.toBigDecimal()
    aggTradeOpen.initialPosition = entity.id
    aggTradeOpen.increaseList = []
    aggTradeOpen.decreaseList = []
    aggTradeOpen.updateList = []
  }

  let increaseList = aggTradeOpen.increaseList
  increaseList.push(entity.id)
  aggTradeOpen.increaseList = increaseList


  aggTradeOpen.save()
}

export function handleDecreasePosition(event: contract.DecreasePosition): void {
  let tradeKey = event.params.key.toHex()
  let tradeId = txId(event, tradeKey)
  let entity = new DecreasePosition(tradeId)


  entity.key = event.params.key.toHex()
  entity.account = event.params.account.toHex()
  entity.collateralToken = event.params.collateralToken.toHex()
  entity.indexToken = event.params.indexToken.toHex()

  entity.isLong = event.params.isLong

  entity.collateralDelta = event.params.collateralDelta.toBigDecimal()
  entity.sizeDelta = event.params.sizeDelta.toBigDecimal()
  entity.price = event.params.price.toBigDecimal()
  entity.fee = event.params.fee.toBigDecimal()

  // Entities can be written to the store with `.save()`
  entity.save()


  let aggTradeOpen = AggregatedTradeOpen.load(tradeKey)

  if (aggTradeOpen) {
    let decreaseList = aggTradeOpen.decreaseList
    decreaseList.push(entity.id)
    aggTradeOpen.decreaseList = decreaseList
    aggTradeOpen.save()
  }

}

export function handleUpdatePosition(event: contract.UpdatePosition): void {
  let tradeKey = event.params.key.toHex()
  let tradeId = txId(event, tradeKey)
  let entity = new UpdatePosition(tradeId)

  entity.key = event.params.key.toHex()

  entity.size = event.params.size.toBigDecimal()
  entity.collateral = event.params.collateral.toBigDecimal()
  entity.reserveAmount = event.params.reserveAmount.toBigDecimal()
  entity.realisedPnl = event.params.realisedPnl.toBigDecimal()
  entity.averagePrice = event.params.averagePrice.toBigDecimal()
  entity.entryFundingRate = event.params.entryFundingRate.toBigDecimal()

  entity.save()

  let aggTradeOpen = AggregatedTradeOpen.load(tradeKey)

  if (aggTradeOpen) {
    let updates = aggTradeOpen.updateList
    updates.push(entity.id)

    aggTradeOpen.updateList = updates
    aggTradeOpen.save()
  }

}
export function handleClosePosition(event: contract.ClosePosition): void {
  let tradeKey = event.params.key.toHex()
  let tradeId = txId(event, tradeKey)
  let entity = new ClosePosition(tradeId)

  // BigInt and BigDecimal math are supported
  entity.key = event.params.key.toHex()


  entity.size = event.params.size.toBigDecimal()
  entity.collateral = event.params.collateral.toBigDecimal()
  entity.reserveAmount = event.params.reserveAmount.toBigDecimal()
  entity.realisedPnl = event.params.realisedPnl.toBigDecimal()
  entity.averagePrice = event.params.averagePrice.toBigDecimal()
  entity.entryFundingRate = event.params.entryFundingRate.toBigDecimal()

  // Entities can be written to the store with `.save()`
  entity.save()

  let aggTradeOpen = AggregatedTradeOpen.load(tradeKey)

  if (aggTradeOpen) {
    let settled = new AggregatedTradeClosed(txId(event, tradeKey))
    settled.initialPositionBlockTimestamp = event.block.timestamp.toBigDecimal()

    settled.initialPosition = aggTradeOpen.initialPosition
    settled.settledPosition = entity.id

    settled.decreaseList = aggTradeOpen.decreaseList
    settled.increaseList = aggTradeOpen.increaseList
    settled.updateList = aggTradeOpen.updateList

    settled.settledBlockTimestamp = event.block.timestamp.toBigDecimal()

    settled.save()
    store.remove('AggregatedTradeOpen', aggTradeOpen.id)
  }

}

export function handleLiquidatePosition(event: contract.LiquidatePosition): void {
  let tradeKey = event.params.key.toHex()
  let tradeId = txId(event, tradeKey)
  let entity = new LiquidatePosition(tradeId)

  // BigInt and BigDecimal math are supported
  entity.key = event.params.key.toHex()
  entity.account = event.params.account.toHex()
  entity.collateralToken = event.params.collateralToken.toHex()
  entity.indexToken = event.params.indexToken.toHex()

  entity.isLong = event.params.isLong

  entity.size = event.params.size.toBigDecimal()
  entity.collateral = event.params.collateral.toBigDecimal()
  entity.reserveAmount = event.params.reserveAmount.toBigDecimal()
  entity.realisedPnl = event.params.realisedPnl.toBigDecimal()
  entity.markPrice = event.params.markPrice.toBigDecimal()

  // Entities can be written to the store with `.save()`
  entity.save()

  let aggTradeOpen = AggregatedTradeOpen.load(tradeKey)

  if (aggTradeOpen) {
    let settled = new AggregatedTradeLiquidated(txId(event, tradeKey))
    settled.initialPositionBlockTimestamp = event.block.timestamp.toBigDecimal()

    settled.initialPosition = aggTradeOpen.initialPosition
    settled.settledPosition = entity.id

    settled.decreaseList = aggTradeOpen.decreaseList
    settled.increaseList = aggTradeOpen.increaseList
    settled.updateList = aggTradeOpen.updateList

    settled.settledBlockTimestamp = event.block.timestamp.toBigDecimal()

    settled.save()
    store.remove('AggregatedTradeOpen', aggTradeOpen.id)
  }

}


// export function handleCollectMarginFees(event: CollectMarginFees): void {}

// export function handleCollectSwapFees(event: CollectSwapFees): void {}

// export function handleDecreaseGuaranteedUsd(
//   event: DecreaseGuaranteedUsd
// ): void {}

// export function handleDecreasePoolAmount(event: DecreasePoolAmount): void {}


// export function handleDecreaseReservedAmount(
//   event: DecreaseReservedAmount
// ): void {}

// export function handleDecreaseUsdgAmount(event: DecreaseUsdgAmount): void {}

// export function handleDirectPoolDeposit(event: DirectPoolDeposit): void {}

// export function handleIncreaseGuaranteedUsd(
//   event: IncreaseGuaranteedUsd
// ): void {}

// export function handleIncreasePoolAmount(event: IncreasePoolAmount): void {}


// export function handleIncreaseReservedAmount(
//   event: IncreaseReservedAmount
// ): void {}

// export function handleIncreaseUsdgAmount(event: IncreaseUsdgAmount): void {}


// export function handleSellUSDG(event: SellUSDG): void {}

// export function handleSwap(event: Swap): void {}

// export function handleUpdateFundingRate(event: UpdateFundingRate): void {}

// export function handleUpdatePnl(event: UpdatePnl): void {}


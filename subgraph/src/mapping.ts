/* eslint-disable prefer-const */
import { ethereum, store, log, BigDecimal, BigInt } from "@graphprotocol/graph-ts"
import * as contract from "../generated/gmxVault/gmxVault"
import * as glpManager from "../generated/glpManager/glpManager"

import {
  ClosePosition,
  DecreasePosition,
  IncreasePosition, LiquidatePosition, UpdatePosition, AggregatedTradeOpen, AggregatedTradeClosed, AggregatedTradeLiquidated,
  AddLiquidity, RemoveLiquidity, AccountAggregation
} from "../generated/schema"


const eventId = (ev: ethereum.Event): string => ev.transaction.hash.toHex() + "-" + ev.logIndex.toString()

export function handleAddLiquidity(event: glpManager.AddLiquidity): void {
  let id = eventId(event)

  let entity = new AddLiquidity(id)

  entity.account = event.params.account.toHex()
  entity.token = event.params.token.toHex()

  entity.amount = event.params.amount.toBigDecimal()
  entity.aumInUsdg = event.params.aumInUsdg.toBigDecimal()
  entity.glpSupply = event.params.glpSupply.toBigDecimal()
  entity.usdgAmount = event.params.usdgAmount.toBigDecimal()
  entity.mintAmount = event.params.mintAmount.toBigDecimal()

  entity.save()
}

export function handleRemoveLiquidity(event: glpManager.RemoveLiquidity): void {
  let id = eventId(event)

  let entity = new RemoveLiquidity(id)

  entity.account = event.params.account.toHex()
  entity.token = event.params.token.toHex()
  entity.glpAmount = event.params.glpAmount.toBigDecimal()
  entity.aumInUsdg = event.params.aumInUsdg.toBigDecimal()
  entity.glpSupply = event.params.glpSupply.toBigDecimal()
  entity.usdgAmount = event.params.usdgAmount.toBigDecimal()
  entity.amountOut = event.params.amountOut.toBigDecimal()

  entity.save()
}

export function handleIncreasePosition(event: contract.IncreasePosition): void {
  let tradeKey = event.params.key.toHex()
  let entity = new IncreasePosition(eventId(event)) // we prevent 

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

  entity.save()
  

  let aggTradeOpen = AggregatedTradeOpen.load(tradeKey)
  let accountAgg = AccountAggregation.load(entity.account)

  if (aggTradeOpen === null) {

    aggTradeOpen = new AggregatedTradeOpen(tradeKey)
    aggTradeOpen.account = event.params.account.toHex()

    aggTradeOpen.initialPositionBlockTimestamp = event.block.timestamp.toBigDecimal()
    aggTradeOpen.initialPosition = entity.id
    aggTradeOpen.increaseList = []
    aggTradeOpen.decreaseList = []
    aggTradeOpen.updateList = []

    if (accountAgg === null) {
      accountAgg = accountAgg = new AccountAggregation(aggTradeOpen.account)

      accountAgg.totalRealisedPnl = BigDecimal.fromString('0')
      accountAgg.aggregatedTradeOpens = []
      accountAgg.aggregatedTradeCloseds = []
      accountAgg.aggregatedTradeLiquidateds = []
    }

    let newAcctOpen = accountAgg.aggregatedTradeOpens
    newAcctOpen.push(aggTradeOpen.id)
    accountAgg.aggregatedTradeOpens = newAcctOpen
  }

  if (accountAgg) {
    accountAgg.totalRealisedPnl = accountAgg.totalRealisedPnl.minus(entity.fee)
    accountAgg.save()
  }
  

  let increaseList = aggTradeOpen.increaseList
  increaseList.push(entity.id)
  aggTradeOpen.increaseList = increaseList

  aggTradeOpen.save()

}

export function handleDecreasePosition(event: contract.DecreasePosition): void {
  let tradeKey = event.params.key.toHex()
  let tradeId = eventId(event)
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


  entity.save()


  let aggTradeOpen = AggregatedTradeOpen.load(tradeKey)

  if (aggTradeOpen) {
    let decreaseList = aggTradeOpen.decreaseList
    decreaseList.push(entity.id)
    aggTradeOpen.decreaseList = decreaseList
    aggTradeOpen.save()

    let accountAgg = AccountAggregation.load(aggTradeOpen.account)

    if (accountAgg) {
      accountAgg.totalRealisedPnl = accountAgg.totalRealisedPnl.minus(entity.fee)
      accountAgg.save()
    } else {
      log.error('unable deduct paid fees into account aggregation #{}', [entity.id])
    }
    

  } else {
    log.error('unable to attach entity to account aggregation: aggregatedId #{}', [entity.id])
  }

}

export function handleUpdatePosition(event: contract.UpdatePosition): void {
  let tradeKey = event.params.key.toHex()
  let tradeId = eventId(event)
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
  } else {
    log.error('unable to attach entity to account aggregation: aggregatedId #{}', [entity.id])
  }

}

export function handleClosePosition(event: contract.ClosePosition): void {
  let tradeKey = event.params.key.toHex()
  let tradeId = eventId(event)
  let entity = new ClosePosition(tradeId)

  // BigInt and BigDecimal math are supported
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
    let settled = new AggregatedTradeClosed(eventId(event))
    settled.account = aggTradeOpen.account
    settled.initialPositionBlockTimestamp = aggTradeOpen.initialPositionBlockTimestamp

    settled.initialPosition = aggTradeOpen.initialPosition
    settled.settledPosition = entity.id

    settled.decreaseList = aggTradeOpen.decreaseList
    settled.increaseList = aggTradeOpen.increaseList
    settled.updateList = aggTradeOpen.updateList

    settled.settledBlockTimestamp = event.block.timestamp.toBigDecimal()

    settled.save()


    let accountAgg = AccountAggregation.load(aggTradeOpen.account)

    if (accountAgg) {
      let openidx = accountAgg.aggregatedTradeOpens.indexOf(aggTradeOpen.id)
      accountAgg.aggregatedTradeOpens.splice(openidx, 1)
      let newarr = accountAgg.aggregatedTradeOpens
      accountAgg.aggregatedTradeOpens = newarr

      let newClosedArr = accountAgg.aggregatedTradeCloseds
      newClosedArr.push(settled.id)
      accountAgg.aggregatedTradeCloseds = newClosedArr
      accountAgg.totalRealisedPnl = accountAgg.totalRealisedPnl.plus(entity.realisedPnl)

      accountAgg.save()

    } else {
      log.error('unable to attach entity to account aggregation: aggregatedId #{}', [entity.id])
    }

    store.remove('AggregatedTradeOpen', aggTradeOpen.id)
  }

}

export function handleLiquidatePosition(event: contract.LiquidatePosition): void {
  let tradeKey = event.params.key.toHex()
  let tradeId = eventId(event)
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


  entity.save()

  let aggTradeOpen = AggregatedTradeOpen.load(tradeKey)

  if (aggTradeOpen) {
    let settled = new AggregatedTradeLiquidated(eventId(event))
    settled.account = aggTradeOpen.account
    settled.initialPositionBlockTimestamp = aggTradeOpen.initialPositionBlockTimestamp

    settled.initialPosition = aggTradeOpen.initialPosition
    settled.settledPosition = entity.id

    settled.decreaseList = aggTradeOpen.decreaseList
    settled.increaseList = aggTradeOpen.increaseList
    settled.updateList = aggTradeOpen.updateList

    settled.settledBlockTimestamp = event.block.timestamp.toBigDecimal()

    settled.save()

    let accountAgg = AccountAggregation.load(aggTradeOpen.account)

    if (accountAgg) {
      let openidx = accountAgg.aggregatedTradeOpens.indexOf(aggTradeOpen.id)
      accountAgg.aggregatedTradeOpens.splice(openidx, 1)
      let newarr = accountAgg.aggregatedTradeOpens
      accountAgg.aggregatedTradeOpens = newarr

      let newLiqArr = accountAgg.aggregatedTradeLiquidateds
      newLiqArr.push(settled.id)
      accountAgg.aggregatedTradeLiquidateds = newLiqArr
      accountAgg.totalRealisedPnl = accountAgg.totalRealisedPnl.minus(entity.collateral)

      accountAgg.save()

    } else {
      log.error('unable to attach entity to account aggregation: aggregatedId #{}', [entity.id])
    }

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


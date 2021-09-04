import * as contract from "../generated/gmxVault/gmxVault"

import {
  ClosePosition,
  DecreasePosition,
  IncreasePosition, LiquidatePosition, UpdatePosition
} from "../generated/schema"

export function handleIncreasePosition(event: contract.IncreasePosition): void {
  let entity = new IncreasePosition(event.transaction.hash.toHex())

  // BigInt and BigDecimal math are supported
  entity.key = event.params.key.toHexString()
  entity.account = event.params.account.toHex()
  entity.collateralToken = event.params.collateralToken.toHex()
  entity.indexToken = event.params.indexToken.toString()

  entity.isLong = event.params.isLong

  entity.collateralDelta = event.params.collateralDelta.toBigDecimal()
  entity.sizeDelta = event.params.sizeDelta.toBigDecimal()
  entity.price = event.params.price.toBigDecimal()
  entity.fee = event.params.fee.toBigDecimal()

  // Entities can be written to the store with `.save()`
  entity.save()
}

export function handleDecreasePosition(event: contract.DecreasePosition): void {
  let entity = new DecreasePosition(event.transaction.hash.toHex())

  // BigInt and BigDecimal math are supported
  entity.key = event.params.key.toHexString()
  entity.account = event.params.account.toHex()
  entity.collateralToken = event.params.collateralToken.toHex()
  entity.indexToken = event.params.indexToken.toString()

  entity.isLong = event.params.isLong

  entity.collateralDelta = event.params.collateralDelta.toBigDecimal()
  entity.sizeDelta = event.params.sizeDelta.toBigDecimal()
  entity.price = event.params.price.toBigDecimal()
  entity.fee = event.params.fee.toBigDecimal()

  // Entities can be written to the store with `.save()`
  entity.save()
}

export function handleLiquidatePosition(event: contract.LiquidatePosition): void {

  let entity = new LiquidatePosition(event.transaction.hash.toHex())

  // BigInt and BigDecimal math are supported
  entity.key = event.params.key.toHexString()
  entity.account = event.params.account.toHex()
  entity.collateralToken = event.params.collateralToken.toHex()
  entity.indexToken = event.params.indexToken.toString()

  entity.isLong = event.params.isLong

  entity.size = event.params.size.toBigDecimal()
  entity.collateral = event.params.collateral.toBigDecimal()
  entity.reserveAmount = event.params.reserveAmount.toBigDecimal()
  entity.realisedPnl = event.params.realisedPnl.toBigDecimal()
  entity.markPrice = event.params.markPrice.toBigDecimal()

  // Entities can be written to the store with `.save()`
  entity.save()
}

export function handleClosePosition(event: contract.ClosePosition): void {
  let entity = new ClosePosition(event.transaction.hash.toHex())

  // BigInt and BigDecimal math are supported
  entity.key = event.params.key.toHexString()


  entity.size = event.params.size.toBigDecimal()
  entity.collateral = event.params.collateral.toBigDecimal()
  entity.reserveAmount = event.params.reserveAmount.toBigDecimal()
  entity.realisedPnl = event.params.realisedPnl.toBigDecimal()
  entity.averagePrice = event.params.averagePrice.toBigDecimal()
  entity.entryFundingRate = event.params.entryFundingRate.toBigDecimal()

  // Entities can be written to the store with `.save()`
  entity.save()
}

export function handleUpdatePosition(event: contract.UpdatePosition): void {
  let entity = new UpdatePosition(event.transaction.hash.toHex())

  // BigInt and BigDecimal math are supported
  entity.key = event.params.key.toHexString()


  entity.size = event.params.size.toBigDecimal()
  entity.collateral = event.params.collateral.toBigDecimal()
  entity.reserveAmount = event.params.reserveAmount.toBigDecimal()
  entity.realisedPnl = event.params.realisedPnl.toBigDecimal()
  entity.averagePrice = event.params.averagePrice.toBigDecimal()
  entity.entryFundingRate = event.params.entryFundingRate.toBigDecimal()

  // Entities can be written to the store with `.save()`
  entity.save()
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


import { BaseProvider } from "@ethersproject/providers"
import { BSC_CONTRACTS } from "./address"
import { BASIS_POINTS_DIVISOR, FUNDING_RATE_PRECISION, MARGIN_FEE_BASIS_POINTS } from "./constant"
import { listen } from "./contract"
import { BscVault__factory } from "./contract/ethers-contracts"

export const gambitContract = (jsonProvider: BaseProvider) => {
  const vaultContract = BscVault__factory.connect(BSC_CONTRACTS.Vault, jsonProvider)
  const vaultEvent = listen(vaultContract)

  return {
    address: BSC_CONTRACTS.Vault,
    increasePosition: vaultEvent('IncreasePosition'),
    decreasePosition: vaultEvent('DecreasePosition'),
    updatePosition: vaultEvent('UpdatePosition'),
    closePosition: vaultEvent('ClosePosition'),
    liquidatePosition: vaultEvent('LiquidatePosition'),
    buyUSDG: vaultEvent('BuyUSDG'),
    swap: vaultEvent('Swap'),
    pnl: vaultEvent('UpdatePnl'),
  }
}

function getPositionCumulativeFundingFee(size: bigint, entryFundingRate: bigint, cumulativeFundingRate: bigint) {
  return size * (cumulativeFundingRate - entryFundingRate) / FUNDING_RATE_PRECISION
}

export function getPositionMarginFee(size: bigint) {
  return size - size * (BASIS_POINTS_DIVISOR - MARGIN_FEE_BASIS_POINTS) / BASIS_POINTS_DIVISOR
}


export function getPositionFee(size: bigint, entryFundingRate: bigint, cumulativeFundingRate: bigint) {
  const fundingFee = getPositionCumulativeFundingFee(size, entryFundingRate, cumulativeFundingRate)
  const marginFee = getPositionMarginFee(size)

  return marginFee + fundingFee
}



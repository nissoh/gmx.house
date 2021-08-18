import { BaseProvider } from "@ethersproject/providers"
import { ARBITRUM_CONTRACTS, groupByMapMany } from "./address"
import { BASIS_POINTS_DIVISOR, FUNDING_RATE_PRECISION, MARGIN_FEE_BASIS_POINTS } from "./constant"
import { Vault__factory } from "./contract/index"
import { listen } from "./contract"
import { IAccountAggregatedSummary, IAggregateSettledTrade } from "./types"


export const gambitContract = (jsonProvider: BaseProvider) => {
  const contract = Vault__factory.connect(ARBITRUM_CONTRACTS.Vault, jsonProvider)
  const vaultEvent = listen(contract)


  return {
    contract,
    address: ARBITRUM_CONTRACTS.Vault,
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

function getPositionCumulativeFundingFee(size: bigint, fundingRate: bigint) {
  return size * fundingRate / FUNDING_RATE_PRECISION
}

export function getPositionMarginFee(size: bigint) {
  return size - size * (BASIS_POINTS_DIVISOR - MARGIN_FEE_BASIS_POINTS) / BASIS_POINTS_DIVISOR // TODO properly calculate cumulative fees
}

export function getPositionFee(size: bigint, fundingRate: bigint) {
  const fundingFee = getPositionCumulativeFundingFee(size, fundingRate)
  const marginFee = getPositionMarginFee(size)

  return marginFee + fundingFee
}

export function getLeverage (size = 0n, collateral = 0n, fundingRate = 0n) {
  const fundingFee = getPositionCumulativeFundingFee(size, fundingRate)
  const realised = collateral - fundingFee

  return size * BASIS_POINTS_DIVISOR / realised
}

export function priceDelta(positionPrice: bigint, price: bigint, collateral: bigint, size: bigint) {
  const priceDelta = positionPrice > price ? positionPrice - price : price - positionPrice
  const delta = size * priceDelta / positionPrice

  return delta * BASIS_POINTS_DIVISOR / collateral
}

export function priceDeltaPercentage(positionPrice: bigint, price: bigint, collateral: bigint, size: bigint) {
  const delta = priceDelta(positionPrice, price, collateral, size)
  return delta * BASIS_POINTS_DIVISOR / collateral
}

export function toAggregatedSummary(list: IAggregateSettledTrade[]): IAccountAggregatedSummary[] {

  // const sortByCreartion = (a: BaseEntity, b: BaseEntity): number => a.createdAt.getTime() - b.createdAt.getTime()
  // const initPositionsMap = groupByMapMany(initPositions.sort(sortByCreartion), a => a.account)
  const aggTradeAccountMap = groupByMapMany(list, a => a.account)

  const topMap = Object.entries(aggTradeAccountMap).reduce((seed, [address, aggTradeList]) => {

    const [closedList, liquidatedList] = aggTradeList.reduce((seed, next) => {
      const slot = 'markPrice' in next.settlement ? 1 : 0
      seed[slot].push(next)
      return seed
    }, [[], []] as [IAggregateSettledTrade[], IAggregateSettledTrade[]])

    const account: IAccountAggregatedSummary = {
      address: address,
      settledPositionCount: closedList.length,
      profitablePositionsCount: 0,
      leverage: 0n,
      openPnl: null,
      claim: null,
      realisedPnl: 0n,
      openSize: 0n,
      aggTradeList
    }


    liquidatedList.forEach((liqAgg) => {
      account.realisedPnl -= liqAgg.settlement.collateral
    })

    closedList.forEach((agg) => {
      const updateList = agg.updates
      const settlement = agg.settlement
      const increaseList = agg.increases


      const cumulative = increaseList.reduce((seed, pos, idx) => ({
        size: seed.size + pos.sizeDelta,
        leverage: getLeverage(pos.sizeDelta, pos.collateralDelta, 0n),
        collateral: seed.collateral + pos.collateralDelta,
        fee: seed.fee + getPositionFee(pos.sizeDelta, 0n)
      }), { size: 0n, collateral: 0n, leverage: 0n, fee: 0n })

      if (settlement?.size) {
        cumulative.fee += getPositionFee(BigInt(settlement.size), 0n)
      }

      account.leverage += cumulative.leverage
      account.realisedPnl += (settlement?.realisedPnl || 0n) - cumulative.fee

      if (agg.settlement!.realisedPnl > 0n) {
        account.profitablePositionsCount++
      }
    })

    if (closedList.length) {
      account.leverage = account.leverage / BigInt(closedList.length)
    }
    

    seed.push(account)

    return seed
  }, [] as IAccountAggregatedSummary[])

  return topMap.sort((a, b) => Number(b.realisedPnl) - Number(a.realisedPnl))
}
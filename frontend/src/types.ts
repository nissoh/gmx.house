import { BigNumber } from "@ethersproject/bignumber"




// export type UsdgBuyEvent = {
//   account: string;
//   token: string;
//   tokenAmount: BigNumber;
//   usdgAmount: BigNumber;
// }


// export type ProfitLoss = {
//   key: string;
//   hasProfit: boolean;
//   delta: BigNumber;
// }

export type PositionEvent = {
  key: string
  account: string
  collateralToken: string
  isLong: boolean
  indexToken: string

  sizeDelta: BigNumber
  price: BigNumber
  collateralDelta: BigNumber

}

export type PositionSettledEvent = {
  key: string;
  size: BigNumber;
  collateral: BigNumber;
  averagePrice: BigNumber;
  entryFundingRate: BigNumber;
  reserveAmount: BigNumber;
  realisedPnl: BigNumber;
}

export type LiquidatedPositionEvent = {
  key: string
  account: string
  collateralToken: string
  indexToken: string
  isLong: boolean

  size: BigNumber
  collateral: BigNumber
  reserveAmount: BigNumber
  realisedPnl: BigNumber
  markPrice: BigNumber
}


export type Trader = {
  account: string
  realisedPnl: BigNumber
}


  
import { BigNumber } from "ethers"


export type Address = string


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
  indexToken: string
  collateralDelta: BigNumber
  sizeDelta: BigNumber
  isLong: boolean
  price: BigNumber
  time: number
}

export type PositionSettledEvent = {
  key: string;
  size: BigNumber;
  collateral: BigNumber;
  averagePrice: BigNumber;
  entryFundingRate: BigNumber;
  reserveAmount: BigNumber;
  realisedPnl: BigNumber;
  time: number
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
  time: number
}


export type Trader = {
  account: string
  realisedPnl: BigNumber
}


  
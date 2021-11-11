// import { $node, $text, Behavior, component, style, styleBehavior, StyleCSS } from "@aelea/dom"
// import { $column, $row, $TextField, InputType, layoutSheet } from "@aelea/ui-components"
// import { theme } from "@aelea/ui-components-theme"
// import { combine, constant, map, now, sample, startWith, switchLatest } from "@most/core"
// import { BigNumber, Contract } from "ethers"
// import { combineMap } from "../common/utils"
// import { $ButtonToggle } from "../common/$ButtonToggle"
// import { account, network } from "../api/account"
// import { $ButtonNegative, $ButtonPositive, $ButtonPrimary } from "./$Button"
// import { CHAIN } from "../api/provider"
// import { Address } from "../api/types"

// const USD_DECIMALS = 30
// const PRECISION = expandDecimals(1, 30)
// const BASIS_POINTS_DIVISOR = 10000
// const SWAP_FEE_BASIS_POINTS = 20
// const STABLE_SWAP_FEE_BASIS_POINTS = 4
// const MARGIN_FEE_BASIS_POINTS = 10
// const FUNDING_RATE_PRECISION = 1000000
// const LIQUIDATION_FEE = expandDecimals(5, USD_DECIMALS)
// const MAX_LEVERAGE = 50 * 10000


// export function expandDecimals(n: number, decimals: number) {
//   return BigNumber.from(n).mul(BigNumber.from(10).pow(decimals))
// }

// function getPositionFee(size: BigNumber) {
//   const afterFeeUsd = size.mul(BASIS_POINTS_DIVISOR - MARGIN_FEE_BASIS_POINTS).div(BASIS_POINTS_DIVISOR)
//   return size.sub(afterFeeUsd)
// }

// function getLiquidationPriceFromDelta({ liquidationAmount, size, collateral, averagePrice, isLong }: any) {
//   if (!size || size.eq(0)) { return }
//   if (liquidationAmount.gt(collateral)) { return }

//   const liquidationDelta = collateral.sub(liquidationAmount)
//   const priceDelta = liquidationDelta.mul(averagePrice).div(size)

//   if (isLong) {
//     return averagePrice.sub(priceDelta)
//   }

//   return averagePrice.add(priceDelta)
// }



// function getLiquidationPrice({
//   isLong, size, collateral, averagePrice, entryFundingRate,
//   cumulativeFundingRate, sizeDelta, collateralDelta, increaseCollateral, increaseSize
// }: Position & {isLong: boolean, averagePrice: BigNumber}) {
//   if (!size || !collateral || !averagePrice) { return }

//   let nextSize = size ? size : BigNumber.from(0)
//   if (sizeDelta) {
//     if (increaseSize) {
//       nextSize = size.add(sizeDelta)
//     } else {
//       if (sizeDelta.gte(size)) {
//         return
//       }
//       nextSize = size.sub(sizeDelta)
//     }
//   }

//   let remainingCollateral = collateral
//   if (collateralDelta) {
//     if (increaseCollateral) {
//       remainingCollateral = remainingCollateral.add(collateralDelta)
//     } else {
//       if (collateralDelta.gte(remainingCollateral)) {
//         return
//       }
//       remainingCollateral = remainingCollateral.sub(collateralDelta)
//     }
//   }

//   const marginFee = getPositionFee(size).add(LIQUIDATION_FEE)
//   if (entryFundingRate && cumulativeFundingRate) {
//     const fundingFee = size.mul(cumulativeFundingRate.sub(entryFundingRate)).div(FUNDING_RATE_PRECISION)
//     marginFee.add(fundingFee)
//   }

//   const liquidationPriceForFees = getLiquidationPriceFromDelta({
//     liquidationAmount: marginFee, size: nextSize, collateral: remainingCollateral, averagePrice, isLong
//   })

//   const liquidationPriceForMaxLeverage = getLiquidationPriceFromDelta({
//     liquidationAmount: nextSize.mul(BASIS_POINTS_DIVISOR).div(MAX_LEVERAGE), size: nextSize, collateral: remainingCollateral, averagePrice, isLong
//   })

//   if (!liquidationPriceForFees) { return liquidationPriceForMaxLeverage }
//   if (!liquidationPriceForMaxLeverage) { return liquidationPriceForFees }

//   if (isLong) {
//     // return the higher price
//     return liquidationPriceForFees.gt(liquidationPriceForMaxLeverage) ? liquidationPriceForFees : liquidationPriceForMaxLeverage
//   }

//   // return the lower price
//   return liquidationPriceForFees.lt(liquidationPriceForMaxLeverage) ? liquidationPriceForFees : liquidationPriceForMaxLeverage
// }



// interface Position {
//   size: BigNumber
//   sizeDelta?: BigNumber
//   increaseSize: BigNumber
//   collateral: BigNumber
//   collateralDelta?: BigNumber
//   increaseCollateral?: BigNumber
//   entryFundingRate?: BigNumber
//   cumulativeFundingRate: BigNumber
// }

// function getLeverage ({ size, sizeDelta, increaseSize, collateral, collateralDelta, increaseCollateral, entryFundingRate, cumulativeFundingRate }: Position) {
//   if (!size && !sizeDelta) { return }

//   let nextSize = size ? size : BigNumber.from(0)
//   if (sizeDelta) {
//     if (increaseSize) {
//       nextSize = size.add(sizeDelta)
//     } else {
//       if (sizeDelta.gte(size)) {
//         return
//       }
//       nextSize = size.sub(sizeDelta)
//     }
//   }

//   let remainingCollateral = collateral ? collateral : BigNumber.from(0)
//   if (collateralDelta) {
//     if (increaseCollateral) {
//       remainingCollateral = collateral.add(collateralDelta)
//     } else {
//       if (collateralDelta.gte(collateral)) {
//         return
//       }
//       remainingCollateral = collateral.sub(collateralDelta)
//     }
//   }

//   if (remainingCollateral.eq(0)) { return }

//   remainingCollateral = sizeDelta ? remainingCollateral.mul(BASIS_POINTS_DIVISOR - MARGIN_FEE_BASIS_POINTS).div(BASIS_POINTS_DIVISOR) : remainingCollateral
//   if (entryFundingRate && cumulativeFundingRate) {
//     const fundingFee = size.mul(cumulativeFundingRate.sub(entryFundingRate)).div(FUNDING_RATE_PRECISION)
//     remainingCollateral = remainingCollateral.sub(fundingFee)
//   }

//   return nextSize.mul(BASIS_POINTS_DIVISOR).div(remainingCollateral)
// }


// export interface ISwap<T extends Contract> {
//   address: Address
//   amount: BigNumber
//   contract: T
//   from: Address
// }

// export interface ISend {
//   address: Address
// //   amount: BigNumber
// //   from: Address
// }

// export const $Send = <T extends Contract>(config: ISend) => component((
//   [selectCoin, sampleSelectCoin]: Behavior<ISwap<T>, ISwap<T>>,
//   [divideByPercentage, sampleDivideByPercentage]: Behavior<any, { value: number; label: string;}>,
//   [sendInput, sampleSendInput]: Behavior<any, string>,
//   [destination, sampleDestination]: Behavior<any, string>,
//   [send, sampleSend]: Behavior<any, ISwap<T>>,
// ) => {

//   const selectedCoin = startWith(config, selectCoin)

//   const amountPercentageOptions = [10, 25, 50, 75, 100].map(value => ({ value: value, label: value + '%' }))

//   //   const selectedCoinBalance = switchLatest(map(coin => coin.contract.ge, selectedCoin))
//   //   const selectedCoinBalanceReadable = switchLatest(map(coin => coin.balanceReadable, selectedCoin))



//   const swapState = combineMap({
//     swap: selectedCoin,
//     amount: sendInput,
//     from: account,
//     destination: destination
//   })

//   const disableStyle: StyleCSS = { opacity: '.25!important', pointerEvents: 'none' }

//   const disableSendStyle = styleBehavior(
//     startWith(disableStyle, combine((account, network) => {
//       return account && network.chainId === CHAIN.BSC_TESTNET ? null : disableStyle
//     }, account, network))
//   )


//   return [
//     $column(layoutSheet.spacingBig, disableSendStyle)(
//     //   $text(style({ fontWeight: 'bold', textAlign: 'center', fontSize: '38px' }))('SEND'),

//       // $column(layoutSheet.spacingSmall)(
//       // $text('Asset:'),

//       // $ButtonToggle({
//       //   selected: selectedCoin,
//       //   options: config.coinList,
//       //   $option: map(coin => $coin(coin))
//       // })({
//       //   select: sampleSelectCoin()
//       // }),

//       // $node(style({ color: theme.system, fontSize: '13px' }))(
//       //   $text('Available Balance: '),
//       //   $text(selectedCoinBalanceReadable),
//       //   $text(map(coin => ' ' + coin.label, selectedCoin)),
//       // ),
//       // ),

//       $column(layoutSheet.spacing)(
//         $TextField({ value: now('0'), label: 'Amount:', type: InputType.NUMBER })({
//           change: sampleSendInput()
//         }),
//         // $ButtonToggle({
//         //   selected: constant(null, sendInput), //skipRepeats(),
//         //   options: amountPercentageOptions,
//         //   $option: map(a => $text(style({ color: theme.secondary, fontSize: '13px', lineHeight: '30px' }))(a.label))
//         // })({
//         //   select: sampleDivideByPercentage()
//         // }),
//       ),

//       //   $column(layoutSheet.spacingSmall)(
//       //     $TextField({ value: now(config.destination), placeholder: 'Type or Paste address', label: 'Send To:' })({
//       //       change: sampleDestination()
//       //     }),
//       //   ),

//       $row(layoutSheet.spacingSmall, style({ placeContent: 'center' }))(
//         $ButtonNegative({
//           $content: $text('Short') })({
//           click: sampleSend(
//             // sample(swapState)
//           )
//         }),
//         $ButtonPositive({
//           $content: $text('Long') })({
//           click: sampleSend(
//             // sample(swapState)
//           )
//         })
//       )

//     ),
//     { send }
//   ]
// })
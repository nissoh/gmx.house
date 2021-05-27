// import { $text, Behavior, component, style } from "@aelea/core"
// import { $column, $row, layoutSheet } from "@aelea/ui-components"
// import { awaitPromises, snapshot } from "@most/core"
// import { awaitProvider } from "../api/provider"
// import { combineMap } from "../common/utils"
// import { account } from "../api/account"
// import { ISwap } from "./$Send"
// import { utils } from "ethers"
// import { $ButtonPrimary } from "./$Button"


// export const $Confirmation = (swapState: ISwap) => component((
//   [sampleConfirm, confirm]: Behavior<any, any>,
// ) => {

//   const $textMiddleground = $text(style({ textAlign: 'center', fontSize: '19px', textTransform: 'uppercase' }))
//   return [
//     $column(layoutSheet.spacingBig)(
//       $text(style({ textAlign: 'center', fontSize: '25px' }))(
//         'Review Transaction'
//       ),

//       $column(layoutSheet.spacingSmall)(
//         style({ paddingTop: '22px' }, $textMiddleground('Send')),
//         $textMiddleground(`${utils.formatUnits(swapState.amount)} ${swapState.swap.label}`),
//       ),

//       $column(layoutSheet.spacingSmall)(
//         $text(`from:`),
//         $text(style({ fontSize: '13px' }))(swapState.from),
//         $text(`to:`),
//         $text(style({ fontSize: '13px' }))(swapState.destination),
//       ),

//       $row(style({ placeContent: 'center', paddingTop: '25px' }))(
//         $ButtonPrimary({ $content: $text('confirm') })({
//           click: sampleConfirm(
//             snapshot(async (w3) => {
//             // txHash is a hex string
//             // As with any RPC call, it may throw an error
//               const txHash = await w3.awaitProvider.metamask.request({
//                 method: 'eth_sendTransaction',
//                 params: [
//                   {
//                     from: w3.account,
//                     to: '0x04d52e150E49c1bbc9Ddde258060A3bF28D9fD70',
//                     value: swapState.amount.toHexString(),
//                   // gasPrice: '0x09184e72a000',
//                   // gas: '0x2710',
//                   },
//                 ],
//               })


//               return txHash
//             }, combineMap({ awaitProvider, account })),
//             awaitPromises
//           )
//         })
//       )

//     ),
//     { confirm }
//   ]
// })
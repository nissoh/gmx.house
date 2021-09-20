// import { O } from "@aelea/dom"
// import { $element, $text, attr, Behavior, component, style } from "@aelea/dom"
// import { $column, $NumberTicker, $row, layoutSheet } from "@aelea/ui-components"
// import { pallete, theme } from "@aelea/ui-components-theme"
// import { TransactionReceipt } from "@ethersproject/providers"
// import { filter } from "@most/core"
// import { map, skipRepeats, startWith, switchLatest } from "@most/core"
// import { getTxDetails } from "../api/contract"
// import { $spinner } from "../common/$spinner"
// import { $ButtonPrimary } from "./$Button"




// const $status = $text(style({ color: pallete.foreground, fontStyle: 'italic', fontSize: '19px', padding: '3px 0' }))

// const $success = $column(
//   $element('img')(style({ margin: '0 auto' }), attr({
//     // use as static instead data-uri
//     src: 'data:image/png;base64,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',
//     width: '55px',
//     height: '55px'
//   }))(),
//   $status(`Success`)
// )

// const $pending = $column(
//   $spinner,
//   $status(`Pending`)
// )

// const $failed = $status(style({ color: pallete.negative }))()


// export const $Transaction = (txHash: string) => component((
//   [close, sampleClose]: Behavior<any, any>,
// ) => {

//   const txDetails = getTxDetails(txHash)
//   const confirmations = map(details => details?.confirmations ?? 0, txDetails)

//   const $status = O(
//     map((details: TransactionReceipt) => details?.status),
//     skipRepeats,
//     filter(status => Number.isInteger(status)),
//     map(status => {
//       return status === 1 ? $success : $failed
//     }),
//     startWith($pending),
//     switchLatest
//   )(txDetails)


//   return [
//     $column(layoutSheet.spacingBig, style({ alignItems: 'center' }))(
//       $text(style({ fontSize: '25px' }))(
//         'Transaction Details'
//       ),

//       $status,

//       $row(layoutSheet.spacingTiny)(
//         $text('Confirmations: '),
//         $NumberTicker({ incrementColor: pallete.middleground, decrementColor: pallete.message, value$: confirmations })
//       ),

//       $row(layoutSheet.spacing)(
//         $text('Tx Hash: '),
//         $element('a')(style({ color: pallete.primary }), attr({ href: 'https://ropsten.etherscan.io/tx/' + txHash }))(
//           $text(txHash.slice(0, 10) + '...' + txHash.slice(-10))
//         )
//       ),

//       $ButtonPrimary({ $content: $text('Close') })({
//         click: sampleClose()
//       })

//     ),
//     { close }
//   ]
// })